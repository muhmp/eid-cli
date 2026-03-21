export interface MethodOption {
  readonly value: number;
  readonly label: string;
}

export interface CalendarOption {
  readonly value: HijriCalendar;
  readonly label: string;
}

export interface EidEventDefinition {
  readonly label: string;
  readonly month: number;
  readonly day: number;
  readonly postMonthName: string;
}

export type EidEventKey = "al-fitr" | "al-adha";
export type HijriCalendar = "islamic-umalqura" | "islamic" | "islamic-civil";

export const MONTH_NAMES: Readonly<Record<number, string>> = {
  1: "Muharram",
  2: "Safar",
  3: "Rabi al-Awwal",
  4: "Rabi al-Thani",
  5: "Jumada al-Awwal",
  6: "Jumada al-Thani",
  7: "Rajab",
  8: "Sha'ban",
  9: "Ramadan",
  10: "Shawwal",
  11: "Dhu al-Qi'dah",
  12: "Dhu al-Hijjah"
};

export const METHOD_OPTIONS: ReadonlyArray<MethodOption> = [
  { value: 0, label: "Jafari (Shia Ithna-Ashari)" },
  { value: 1, label: "Karachi (Pakistan)" },
  { value: 2, label: "ISNA (North America)" },
  { value: 3, label: "MWL (Muslim World League)" },
  { value: 4, label: "Makkah (Umm al-Qura)" },
  { value: 5, label: "Egypt" },
  { value: 7, label: "Tehran (Shia)" },
  { value: 8, label: "Gulf Region" },
  { value: 9, label: "Kuwait" },
  { value: 10, label: "Qatar" },
  { value: 11, label: "Singapore" },
  { value: 12, label: "France" },
  { value: 13, label: "Turkey" },
  { value: 14, label: "Russia" },
  { value: 15, label: "Moonsighting Committee" },
  { value: 16, label: "Dubai" },
  { value: 17, label: "Malaysia (JAKIM)" },
  { value: 18, label: "Tunisia" },
  { value: 19, label: "Algeria" },
  { value: 20, label: "Indonesia" },
  { value: 21, label: "Morocco" },
  { value: 22, label: "Portugal" },
  { value: 23, label: "Jordan" }
];

export const HIJRI_CALENDAR_OPTIONS: ReadonlyArray<CalendarOption> = [
  { value: "islamic", label: "Islamic calendar" },
  { value: "islamic-umalqura", label: "Umm al-Qura calendar" },
  { value: "islamic-civil", label: "Islamic civil calendar" }
];

export const DEFAULT_METHOD = 2;
export const DEFAULT_CALENDAR: HijriCalendar = "islamic";

export const EVENT_CONFIG: Readonly<Record<EidEventKey, EidEventDefinition>> = {
  "al-fitr": {
    label: "Eid al-Fitr",
    month: 10,
    day: 1,
    postMonthName: "Shawwal"
  },
  "al-adha": {
    label: "Eid al-Adha",
    month: 12,
    day: 10,
    postMonthName: "Dhu al-Hijjah"
  }
};
