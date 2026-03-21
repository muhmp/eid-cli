import { Command, InvalidArgumentError, program } from "commander";
import { createRequire } from "node:module";
import { configCommand } from "./commands/config.js";
import { eidCommand } from "./commands/eid.js";
import { clearEidConfig } from "./eid-config.js";
import { type HijriCalendar } from "./constants.js";

interface RootOptions {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
  readonly timezone?: string | undefined;
  readonly method?: number | undefined;
  readonly calendar?: HijriCalendar | undefined;
  readonly eid?: "al-fitr" | "al-adha" | "auto" | undefined;
  readonly date?: string | undefined;
  readonly plain?: boolean | undefined;
  readonly json?: boolean | undefined;
  readonly status?: boolean | undefined;
}

interface ConfigOptions {
  readonly city?: string | undefined;
  readonly country?: string | undefined;
  readonly method?: string | undefined;
  readonly timezone?: string | undefined;
  readonly calendar?: string | undefined;
  readonly show?: boolean | undefined;
  readonly clear?: boolean | undefined;
}

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { readonly version: string };

const parseMethod = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 23) {
    throw new InvalidArgumentError("Method must be an integer between 0 and 23.");
  }

  return parsed;
};

const parseCalendar = (value: string): HijriCalendar => {
  if (value === "islamic-umalqura" || value === "islamic" || value === "islamic-civil") {
    return value;
  }

  throw new InvalidArgumentError("Calendar must be islamic-umalqura, islamic, or islamic-civil.");
};

const parseEid = (value: string): "al-fitr" | "al-adha" | "auto" => {
  if (value === "al-fitr" || value === "al-adha" || value === "auto") {
    return value;
  }

  throw new InvalidArgumentError('Eid must be "al-fitr", "al-adha", or "auto".');
};

program
  .enablePositionalOptions()
  .name("eid-cli")
  .description("Eid CLI for Eid day status and post-Eid Hijri context")
  .version(pkg.version, "-v, --version")
  .argument("[city]", "City name")
  .option("-c, --city <city>", "City")
  .option("--country <country>", "Country")
  .option("--timezone <timezone>", "Timezone")
  .option("--method <id>", "Calculation method (0-23)", parseMethod)
  .option("--calendar <id>", "Hijri calendar", parseCalendar)
  .option("-e, --eid <eid>", "Target Eid: al-fitr | al-adha | auto", parseEid)
  .option("-d, --date <YYYY-MM-DD>", "Gregorian date override")
  .option("-p, --plain", "Plain text output")
  .option("-j, --json", "JSON output")
  .option("-s, --status", "Status line output")
  .action(async (cityArg: string | undefined, _opts: RootOptions, command: Command) => {
    const resolvedOptions = command.opts<RootOptions>();
    await eidCommand({
      city: cityArg || resolvedOptions.city,
      country: resolvedOptions.country,
      timezone: resolvedOptions.timezone,
      method: resolvedOptions.method,
      calendar: resolvedOptions.calendar,
      eid: resolvedOptions.eid,
      date: resolvedOptions.date,
      plain: resolvedOptions.plain,
      json: resolvedOptions.json,
      status: resolvedOptions.status
    });
  });

program
  .command("reset")
  .description("Clear saved Eid CLI configuration")
  .action(() => {
    clearEidConfig();
    console.log("Configuration reset.");
  });

program
  .command("config")
  .description("Configure saved Eid CLI settings")
  .option("--city <city>", "Save city")
  .option("--country <country>", "Save country")
  .option("--method <id>", "Save calculation method (0-23)")
  .option("--timezone <timezone>", "Save timezone")
  .option("--calendar <id>", "Save Hijri calendar")
  .option("--show", "Show current configuration")
  .option("--clear", "Clear saved configuration")
  .action(async (_opts: ConfigOptions, command: Command) => {
    await configCommand(command.opts<ConfigOptions>());
  });

program.parse();
