import * as p from "@clack/prompts";
import {
  DEFAULT_CALENDAR,
  DEFAULT_METHOD,
  HIJRI_CALENDAR_OPTIONS,
  METHOD_OPTIONS,
  type HijriCalendar
} from "./constants.js";
import { guessCityCountry, guessLocation } from "./geo.js";
import {
  setStoredCalendar,
  setStoredLocation,
  setStoredMethod,
  setStoredTimezone
} from "./eid-config.js";
import { getRecommendedMethod } from "./recommendations.js";
import { STAR_EMOJI, eidOrange } from "./ui/theme.js";

type TimezoneChoice = "detected" | "custom" | "skip";

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const toNumberSelection = (value: unknown): number | null => {
  return typeof value === "number" ? value : null;
};

const toCalendarSelection = (value: unknown): HijriCalendar | null => {
  if (
    value === "islamic-umalqura" ||
    value === "islamic" ||
    value === "islamic-civil"
  ) {
    return value;
  }

  return null;
};

const toTimezoneChoice = (value: unknown, hasDetectedOption: boolean): TimezoneChoice | null => {
  if (value === "custom") {
    return "custom";
  }

  if (value === "skip") {
    return "skip";
  }

  if (hasDetectedOption && value === "detected") {
    return "detected";
  }

  return null;
};

export const findMethodLabel = (method: number): string => {
  const option = METHOD_OPTIONS.find((entry) => entry.value === method);
  return option ? option.label : `Method ${method}`;
};

export const findCalendarLabel = (calendar: HijriCalendar): string => {
  const option = HIJRI_CALENDAR_OPTIONS.find((entry) => entry.value === calendar);
  return option ? option.label : calendar;
};

export const canPromptInteractively = (): boolean =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY && process.env.CI !== "true");

const detectedTimezone = (): string | null => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone || null;
};

const handleCancelledPrompt = (): false => {
  p.cancel("Setup cancelled");
  return false;
};

export const runFirstRunSetup = async (): Promise<boolean> => {
  p.intro(eidOrange(`${STAR_EMOJI} Eid CLI Setup`));

  const ipSpinner = p.spinner();
  ipSpinner.start("Detecting your location...");
  const ipGuess = await guessLocation();
  ipSpinner.stop(ipGuess ? `Detected: ${ipGuess.city}, ${ipGuess.country}` : "Could not detect location");
  const cityAnswer = await p.text({
    message: "Enter your city",
    placeholder: ipGuess?.city ? `e.g., ${ipGuess.city}` : "e.g., your city",
    validate: (value) => (value.trim() ? undefined : "City is required.")
  });

  if (p.isCancel(cityAnswer)) {
    return handleCancelledPrompt();
  }

  const enteredCity = toNonEmptyString(cityAnswer);
  if (!enteredCity) {
    p.log.error("Invalid city value.");
    return false;
  }

  const citySpinner = p.spinner();
  citySpinner.start("Resolving city details...");
  const cityGuess = await guessCityCountry(enteredCity);
  citySpinner.stop(
    cityGuess
      ? `Resolved: ${cityGuess.city}, ${cityGuess.country}`
      : "Could not resolve city automatically"
  );

  let city: string;
  let country: string;
  let detectedCityTimezone: string | undefined;

  if (cityGuess) {
    city = cityGuess.city;
    country = cityGuess.country;
    detectedCityTimezone = cityGuess.timezone;
  } else {
    p.log.error("Could not determine country from that city. Try a more specific city name.");
    return false;
  }

  const recommendedMethod = getRecommendedMethod(country);

  const methodAnswer = await p.select({
    message: "Choose calculation method",
    initialValue: recommendedMethod ?? DEFAULT_METHOD,
    options: METHOD_OPTIONS.map((option) => ({
      value: option.value,
      label:
        option.value === recommendedMethod
          ? `${option.label} (Recommended)`
          : option.label
    }))
  });

  if (p.isCancel(methodAnswer)) {
    return handleCancelledPrompt();
  }

  const method = toNumberSelection(methodAnswer);
  if (method === null) {
    p.log.error("Invalid method selection.");
    return false;
  }

  const timezone = detectedCityTimezone ?? detectedTimezone();
  const timezoneAnswer = await p.select({
    message: "Choose timezone handling",
    initialValue: timezone ? "detected" : "skip",
    options: [
      ...(timezone
        ? [
            {
              value: "detected",
              label: `Use detected timezone (${timezone})`
            }
          ]
        : []),
      {
        value: "custom",
        label: "Enter a custom timezone"
      },
      {
        value: "skip",
        label: "Skip timezone for now"
      }
    ]
  });

  if (p.isCancel(timezoneAnswer)) {
    return handleCancelledPrompt();
  }

  const timezoneChoice = toTimezoneChoice(timezoneAnswer, Boolean(timezone));
  if (!timezoneChoice) {
    p.log.error("Invalid timezone selection.");
    return false;
  }

  let selectedTimezone: string | undefined;
  if (timezoneChoice === "detected" && timezone) {
    selectedTimezone = timezone;
  }

  if (timezoneChoice === "custom") {
    const customTimezoneAnswer = await p.text({
      message: "Enter timezone",
      placeholder: "e.g., Asia/Tokyo",
      validate: (value) => (value.trim() ? undefined : "Timezone is required.")
    });

    if (p.isCancel(customTimezoneAnswer)) {
      return handleCancelledPrompt();
    }

    const customTimezone = toNonEmptyString(customTimezoneAnswer);
    if (!customTimezone) {
      p.log.error("Invalid timezone value.");
      return false;
    }

    selectedTimezone = customTimezone;
  }

  const calendarAnswer = await p.select({
    message: "Choose Hijri calendar",
    initialValue: DEFAULT_CALENDAR,
    options: HIJRI_CALENDAR_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label
    }))
  });

  if (p.isCancel(calendarAnswer)) {
    return handleCancelledPrompt();
  }

  const calendar = toCalendarSelection(calendarAnswer);
  if (!calendar) {
    p.log.error("Invalid calendar selection.");
    return false;
  }

  setStoredLocation({ city, country });
  setStoredMethod(method);
  setStoredCalendar(calendar);
  setStoredTimezone(selectedTimezone);

  p.outro(eidOrange("Saved Eid CLI configuration."));
  return true;
};
