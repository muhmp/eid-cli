import pc from "picocolors";
import {
  DEFAULT_CALENDAR,
  DEFAULT_METHOD,
  EVENT_CONFIG,
  HIJRI_CALENDAR_OPTIONS,
  METHOD_OPTIONS,
  MONTH_NAMES,
  type EidEventKey,
  type HijriCalendar
} from "../constants.js";
import {
  applyRecommendedMethodIfUnset,
  getStoredLocation,
  getStoredSettings,
  hasStoredLocation
} from "../eid-config.js";
import { canPromptInteractively, findCalendarLabel, findMethodLabel, runFirstRunSetup } from "../setup.js";
import { getBanner } from "../ui/banner.js";

export interface EidCommandOptions {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
  readonly timezone?: string | undefined;
  readonly method?: number | undefined;
  readonly calendar?: HijriCalendar | undefined;
  readonly eid?: EidEventKey | "auto" | undefined;
  readonly date?: string | undefined;
  readonly plain?: boolean | undefined;
  readonly json?: boolean | undefined;
  readonly status?: boolean | undefined;
}

interface ResolvedSettings {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
  readonly timezone?: string | undefined;
  readonly method: number;
  readonly calendar: HijriCalendar;
}

interface HijriParts {
  readonly day: number;
  readonly month: number;
  readonly year: number;
  readonly monthName: string;
  readonly calendar: HijriCalendar;
}

interface EidLocation {
  readonly city: string | null;
  readonly country: string | null;
  readonly label: string;
  readonly timezone: string;
}

interface EidOutput {
  readonly mode: "pre-eid" | "eid-days" | "post-eid";
  readonly event: EidEventKey;
  readonly eventLabel: string;
  readonly phase: string;
  readonly label: string;
  readonly detail: string;
  readonly statusLine: string;
  readonly nextLine: string;
  readonly gregorianDate: string;
  readonly prettyGregorianDate: string;
  readonly hijriDate: {
    readonly year: number;
    readonly month: number;
    readonly monthName: string;
    readonly day: number;
    readonly calendar: HijriCalendar;
  };
  readonly location: EidLocation;
  readonly settings: {
    readonly method: number;
    readonly methodLabel: string;
    readonly calendar: HijriCalendar;
    readonly calendarLabel: string;
  };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const exitJsonError = (message: string): never => {
  const payload = {
    ok: false,
    error: {
      code: "runtime_error",
      message
    }
  };
  console.error(JSON.stringify(payload));
  process.exit(1);
};

const exitTextError = (message: string): never => {
  throw new Error(message);
};

const exitForMode = (message: string, jsonMode: boolean): never => {
  if (jsonMode) {
    return exitJsonError(message);
  }

  return exitTextError(message);
};

const normalizeToNoon = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);

const detectTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const getCurrentDateInTimezone = (timeZone: string): Date => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (![year, month, day].every(Number.isFinite)) {
    return normalizeToNoon(new Date());
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const parseInputDate = (value: string | undefined, timeZone: string, jsonMode: boolean): Date => {
  if (!value) {
    return getCurrentDateInTimezone(timeZone);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return exitForMode('Expected "--date" in YYYY-MM-DD format', jsonMode);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return exitForMode(`Invalid date: ${value}`, jsonMode);
  }

  return date;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return normalizeToNoon(next);
};

const diffDays = (laterDate: Date, earlierDate: Date): number =>
  Math.round((normalizeToNoon(laterDate).getTime() - normalizeToNoon(earlierDate).getTime()) / ONE_DAY_MS);

const formatGregorian = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatPrettyGregorian = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);

export const getHijriParts = (date: Date, preferredCalendar: HijriCalendar): HijriParts => {
  const calendars = [
    preferredCalendar,
    ...HIJRI_CALENDAR_OPTIONS.map((calendar) => calendar.value).filter((calendar) => calendar !== preferredCalendar)
  ];

  for (const calendar of calendars) {
    try {
      const formatter = new Intl.DateTimeFormat("en", {
        calendar,
        day: "numeric",
        month: "numeric",
        year: "numeric"
      });
      const parts = formatter.formatToParts(date);
      const day = Number(parts.find((part) => part.type === "day")?.value);
      const month = Number(parts.find((part) => part.type === "month")?.value);
      const year = Number(parts.find((part) => part.type === "year")?.value);

      if ([day, month, year].every(Number.isFinite)) {
        return {
          day,
          month,
          year,
          monthName: MONTH_NAMES[month] ?? `Month ${month}`,
          calendar
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error("This Node runtime does not support an Islamic calendar via Intl.");
};

const findNextEventDate = (eventKey: EidEventKey, fromDate: Date, calendar: HijriCalendar): Date | null => {
  const event = EVENT_CONFIG[eventKey];

  for (let offset = 0; offset <= 400; offset += 1) {
    const candidate = addDays(fromDate, offset);
    const hijri = getHijriParts(candidate, calendar);
    if (hijri.month === event.month && hijri.day === event.day) {
      return candidate;
    }
  }

  return null;
};

const findPreviousEventDate = (eventKey: EidEventKey, fromDate: Date, calendar: HijriCalendar): Date | null => {
  const event = EVENT_CONFIG[eventKey];

  for (let offset = 0; offset <= 400; offset += 1) {
    const candidate = addDays(fromDate, -offset);
    const hijri = getHijriParts(candidate, calendar);
    if (hijri.month === event.month && hijri.day === event.day) {
      return candidate;
    }
  }

  return null;
};

const selectAutoEvent = (hijri: HijriParts): EidEventKey => (hijri.month <= 10 ? "al-fitr" : "al-adha");

const locationLabel = (settings: ResolvedSettings): string => {
  if (settings.city && settings.country) {
    return `${settings.city}, ${settings.country}`;
  }

  if (settings.city) {
    return settings.city;
  }

  if (settings.country) {
    return settings.country;
  }

  return "Unconfigured location";
};

const buildResponse = (
  eventKey: EidEventKey,
  hijri: HijriParts,
  date: Date,
  settings: ResolvedSettings
): EidOutput => {
  const event = EVENT_CONFIG[eventKey];
  const previous = findPreviousEventDate(eventKey, date, settings.calendar);
  const next = findNextEventDate(eventKey, date, settings.calendar);
  const daysSincePrevious = previous ? diffDays(date, previous) : null;
  const daysUntilNext = next ? diffDays(next, date) : null;
  const inEventWindow = daysSincePrevious !== null && daysSincePrevious >= 0 && daysSincePrevious <= 2;

  let mode: EidOutput["mode"];
  let phase: string;
  let label: string;
  let detail: string;
  let statusLine: string;
  let nextLine: string;

  if (inEventWindow) {
    const dayNumber = daysSincePrevious + 1;
    mode = "eid-days";
    phase = `Day ${dayNumber} of 3`;
    label = `${event.label} Day ${dayNumber}`;
    detail = `${event.label} is being observed. Day ${dayNumber} of 3.`;
    statusLine = "Status: Active Eid day";
    nextLine =
      dayNumber < 3
        ? `Up next: ${event.label} Day ${dayNumber + 1} in 1 day`
        : `Up next: ${event.postMonthName} ${hijri.day + 1} tomorrow`;
  } else if (daysUntilNext !== null && daysUntilNext > 0) {
    mode = "pre-eid";
    phase = "Countdown";
    label = `${hijri.monthName} ${hijri.day}`;
    detail = `${event.label} is in ${daysUntilNext} day${daysUntilNext === 1 ? "" : "s"}.`;
    statusLine = "Status: Before Eid";
    nextLine = next
      ? `Up next: ${event.label} on ${formatPrettyGregorian(next, settings.timezone ?? detectTimezone())}`
      : `Up next: ${event.label} soon`;
  } else {
    mode = "post-eid";
    phase = "After Eid";
    label = `${event.postMonthName} ${hijri.day}`;
    detail = `${event.label} has passed. Today is ${label}.`;
    statusLine = "Status: After Eid";
    nextLine = next
      ? `Up next: ${event.label} on ${formatPrettyGregorian(next, settings.timezone ?? detectTimezone())}`
      : "Up next: next Hijri cycle";
  }

  return {
    mode,
    event: eventKey,
    eventLabel: event.label,
    phase,
    label,
    detail,
    statusLine,
    nextLine,
    gregorianDate: formatGregorian(date),
    prettyGregorianDate: formatPrettyGregorian(date, settings.timezone ?? detectTimezone()),
    hijriDate: {
      year: hijri.year,
      month: hijri.month,
      monthName: hijri.monthName,
      day: hijri.day,
      calendar: hijri.calendar
    },
    location: {
      city: settings.city ?? null,
      country: settings.country ?? null,
      label: locationLabel(settings),
      timezone: settings.timezone ?? detectTimezone()
    },
    settings: {
      method: settings.method,
      methodLabel: findMethodLabel(settings.method),
      calendar: settings.calendar,
      calendarLabel: findCalendarLabel(settings.calendar)
    }
  };
};

export const buildEidResponse = (
  eventKey: EidEventKey | "auto",
  date: Date,
  settings: ResolvedSettings
): EidOutput => {
  const hijri = getHijriParts(date, settings.calendar);
  const actualEvent = eventKey === "auto" ? selectAutoEvent(hijri) : eventKey;
  const response = buildResponse(actualEvent, hijri, date, settings);

  if (eventKey === "auto" && hijri.month === 10 && hijri.day > 3) {
    return {
      ...response,
      mode: "post-eid",
      phase: "After Eid",
      label: `Shawwal ${hijri.day}`,
      detail: `Eid al-Fitr has passed. Today is Shawwal ${hijri.day}.`,
      statusLine: "Status: After Eid"
    };
  }

  if (eventKey === "auto" && hijri.month === 12 && hijri.day > 12) {
    return {
      ...response,
      mode: "post-eid",
      phase: "After Eid",
      label: `Dhu al-Hijjah ${hijri.day}`,
      detail: `Eid al-Adha has passed. Today is Dhu al-Hijjah ${hijri.day}.`,
      statusLine: "Status: After Eid"
    };
  }

  return response;
};

const renderStatusLine = (response: EidOutput): void => {
  const line = response.statusLine.replace(/^Status:\s*/, "");
  const next = response.nextLine.replace(/^Up next:\s*/, "");
  console.log(`${line} • ${next}`);
};

const repeat = (char: string, length: number): string => char.repeat(Math.max(length, 0));
const pad = (value: string, width: number): string => value.padEnd(width, " ");

const renderText = (response: EidOutput, plain: boolean): void => {
  if (!plain) {
    process.stdout.write(getBanner());
  }

  const eventValue = response.eventLabel;
  const phaseValue = response.phase;
  const dateValue = response.prettyGregorianDate;
  const hijriValue = `${response.hijriDate.day} ${response.hijriDate.monthName} ${response.hijriDate.year}`;

  const widths = {
    event: Math.max("Event".length, eventValue.length) + 2,
    phase: Math.max("Phase".length, phaseValue.length) + 2,
    date: Math.max("Date".length, dateValue.length) + 2,
    hijri: Math.max("Hijri".length, hijriValue.length) + 2
  };

  const header =
    pad("Event", widths.event) +
    pad("Phase", widths.phase) +
    pad("Date", widths.date) +
    pad("Hijri", widths.hijri);
  const row =
    pad(eventValue, widths.event) +
    pad(phaseValue, widths.phase) +
    pad(dateValue, widths.date) +
    pad(hijriValue, widths.hijri);

  console.log(pc.bold("Eid Status"));
  console.log(pc.dim(`• ${response.location.label} • ${response.location.timezone}`));
  console.log(pc.dim(`• ${response.settings.methodLabel} • ${response.settings.calendarLabel}`));
  console.log("");
  console.log(pc.dim(header));
  console.log(pc.dim(repeat("-", header.length)));
  console.log(row);
  console.log("Eid Mubarak. May Allah accept from you and bless you with peace, mercy, and joy.");
};

const resolveSettings = async (options: EidCommandOptions): Promise<ResolvedSettings> => {
  if (!hasStoredLocation() && canPromptInteractively() && !options.json && !options.status) {
    const didSetup = await runFirstRunSetup();
    if (!didSetup) {
      process.exit(1);
    }
  }

  const storedLocation = getStoredLocation();
  const storedSettings = getStoredSettings();
  const country = options.country ?? storedLocation.country;

  if (!options.method && country) {
    applyRecommendedMethodIfUnset(country);
  }

  const refreshedSettings = getStoredSettings();

  return {
    city: options.city ?? storedLocation.city,
    country,
    timezone: options.timezone ?? refreshedSettings.timezone ?? detectTimezone(),
    method: options.method ?? refreshedSettings.method ?? DEFAULT_METHOD,
    calendar: options.calendar ?? refreshedSettings.calendar ?? DEFAULT_CALENDAR
  };
};

export const eidCommand = async (options: EidCommandOptions): Promise<void> => {
  const settings = await resolveSettings(options);
  const date = parseInputDate(options.date, settings.timezone ?? detectTimezone(), Boolean(options.json));
  const response = buildEidResponse(options.eid ?? "auto", date, settings);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (options.status) {
    renderStatusLine(response);
    return;
  }

  renderText(response, Boolean(options.plain));
};
