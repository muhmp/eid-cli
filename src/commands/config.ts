import pc from "picocolors";
import { z } from "zod";
import {
  clearEidConfig,
  getStoredLocation,
  getStoredSettings,
  setStoredCalendar,
  setStoredLocation,
  setStoredMethod,
  setStoredTimezone
} from "../eid-config.js";
import { type HijriCalendar } from "../constants.js";
import { findCalendarLabel, findMethodLabel } from "../setup.js";

export interface ConfigCommandOptions {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
  readonly method?: string | undefined;
  readonly timezone?: string | undefined;
  readonly calendar?: string | undefined;
  readonly show?: boolean | undefined;
  readonly clear?: boolean | undefined;
}

interface ParsedConfigUpdates {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
  readonly method?: number | undefined;
  readonly timezone?: string | undefined;
  readonly calendar?: HijriCalendar | undefined;
}

const MethodSchema = z.coerce.number().int().min(0).max(23);
const CalendarSchema = z.enum(["islamic-umalqura", "islamic", "islamic-civil"]);

const parseOptionalWithSchema = <T>(
  value: string | undefined,
  schema: z.ZodType<T>,
  label: string
): T | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid ${label}.`);
  }

  return parsed.data;
};

const parseConfigUpdates = (options: ConfigCommandOptions): ParsedConfigUpdates => ({
  ...(options.city ? { city: options.city.trim() } : {}),
  ...(options.country ? { country: options.country.trim() } : {}),
  ...(options.method !== undefined
    ? { method: parseOptionalWithSchema(options.method, MethodSchema, "method") }
    : {}),
  ...(options.timezone ? { timezone: options.timezone.trim() } : {}),
  ...(options.calendar !== undefined
    ? { calendar: parseOptionalWithSchema(options.calendar, CalendarSchema, "calendar") }
    : {})
});

const hasConfigUpdateFlags = (options: ConfigCommandOptions): boolean =>
  Boolean(
    options.city ||
      options.country ||
      options.method !== undefined ||
      options.timezone ||
      options.calendar !== undefined
  );

const printCurrentConfig = (): void => {
  const location = getStoredLocation();
  const settings = getStoredSettings();

  console.log(pc.dim("Current configuration:"));
  if (location.city) {
    console.log(`  City: ${location.city}`);
  }
  if (location.country) {
    console.log(`  Country: ${location.country}`);
  }
  console.log(`  Method: ${findMethodLabel(settings.method)}`);
  console.log(`  Calendar: ${findCalendarLabel(settings.calendar)}`);
  if (settings.timezone) {
    console.log(`  Timezone: ${settings.timezone}`);
  }
};

export const configCommand = async (options: ConfigCommandOptions): Promise<void> => {
  if (options.clear) {
    clearEidConfig();
    console.log(pc.green("Configuration cleared."));
    return;
  }

  if (options.show) {
    printCurrentConfig();
    return;
  }

  if (!hasConfigUpdateFlags(options)) {
    console.log(pc.dim("No config updates provided. Use `eid-cli config --show` to inspect."));
    return;
  }

  const updates = parseConfigUpdates(options);
  const currentLocation = getStoredLocation();

  setStoredLocation({
    city: updates.city ?? currentLocation.city,
    country: updates.country ?? currentLocation.country
  });

  if (updates.method !== undefined) {
    setStoredMethod(updates.method);
  }

  if (updates.calendar !== undefined) {
    setStoredCalendar(updates.calendar);
  }

  if (updates.timezone) {
    setStoredTimezone(updates.timezone);
  }

  console.log(pc.green("Configuration updated."));
}
