import Conf from "conf";
import { z } from "zod";
import { DEFAULT_CALENDAR, DEFAULT_METHOD, type HijriCalendar } from "./constants.js";
import { getRecommendedMethod } from "./recommendations.js";

interface EidConfigStore {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
  readonly timezone?: string | undefined;
  readonly method?: number | undefined;
  readonly calendar?: HijriCalendar | undefined;
}

export interface StoredLocation {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
}

export interface StoredSettings {
  readonly method: number;
  readonly calendar: HijriCalendar;
  readonly timezone?: string | undefined;
}

const SharedConfigSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  method: z.number().int().min(0).max(23).optional(),
  calendar: z.enum(["islamic-umalqura", "islamic", "islamic-civil"]).optional()
});

const getConfigCwd = (): string | undefined => {
  const configuredPath = process.env.EID_CLI_CONFIG_DIR;
  if (configuredPath) {
    return configuredPath;
  }

  const isTestRuntime = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  if (isTestRuntime) {
    return "/tmp";
  }

  return undefined;
};

const configCwd = getConfigCwd();

const sharedConfig = new Conf<EidConfigStore>({
  projectName: "eid-cli",
  ...(configCwd ? { cwd: configCwd } : {}),
  defaults: {
    method: DEFAULT_METHOD,
    calendar: DEFAULT_CALENDAR
  }
});

const getValidatedStore = (): EidConfigStore => {
  const parsed = SharedConfigSchema.safeParse(sharedConfig.store as unknown);
  if (!parsed.success) {
    return {
      method: DEFAULT_METHOD,
      calendar: DEFAULT_CALENDAR
    };
  }

  return parsed.data;
};

export const getStoredLocation = (): StoredLocation => {
  const store = getValidatedStore();
  return {
    city: store.city,
    country: store.country
  };
};

export const hasStoredLocation = (): boolean => {
  const location = getStoredLocation();
  return Boolean(location.city || location.country);
};

export const getStoredSettings = (): StoredSettings => {
  const store = getValidatedStore();
  return {
    method: store.method ?? DEFAULT_METHOD,
    calendar: store.calendar ?? DEFAULT_CALENDAR,
    timezone: store.timezone
  };
};

export const setStoredLocation = (location: StoredLocation): void => {
  if (location.city) {
    sharedConfig.set("city", location.city);
  }

  if (location.country) {
    sharedConfig.set("country", location.country);
  }
};

export const setStoredTimezone = (timezone?: string): void => {
  if (!timezone) {
    return;
  }

  sharedConfig.set("timezone", timezone);
};

export const setStoredMethod = (method: number): void => {
  sharedConfig.set("method", method);
};

export const setStoredCalendar = (calendar: HijriCalendar): void => {
  sharedConfig.set("calendar", calendar);
};

export const clearEidConfig = (): void => {
  sharedConfig.clear();
};

export const applyRecommendedMethodIfUnset = (country: string): void => {
  const recommendedMethod = getRecommendedMethod(country);
  if (recommendedMethod === null) {
    return;
  }

  const currentMethod = sharedConfig.get("method") ?? DEFAULT_METHOD;
  if (currentMethod !== DEFAULT_METHOD && currentMethod !== recommendedMethod) {
    return;
  }

  sharedConfig.set("method", recommendedMethod);
};
