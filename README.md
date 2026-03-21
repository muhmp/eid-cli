# eid-cli

Eid CLI is a terminal tool for Eid information and Hijri-aware Eid status.
It supports first-run setup, saved config, and script-friendly output.

## Install

```sh
npx eid-cli

# or install globally
npm install -g eid-cli@latest
eid-cli
```

## Usage

```sh
# Default Eid status for today.
npx eid-cli
eid-cli

# Explicit Eid mode.
eid-cli --eid al-fitr
eid-cli --eid al-adha

# Script-friendly output.
eid-cli --json
eid-cli --status
eid-cli --status --eid al-adha

# Plain text without banner styling.
eid-cli --plain

# Saved config.
eid-cli config --city "<city>" --country "<country>" --timezone "<timezone>" --method 3 --calendar islamic
eid-cli config --show
eid-cli config --clear

# Reset saved config.
eid-cli reset
```

## First Run

On first run in an interactive terminal:

1. `eid-cli` tries to detect your approximate network location
2. it asks for your city
3. it resolves that city to a country and timezone when possible
4. it asks for calculation method and Hijri calendar
5. it saves your config for later runs

Important:

- IP-based detection is approximate and may return a nearby city or network exit city
- if the detected city is wrong, just type your actual city
- `--json` and `--status` skip interactive setup

## CLI Surface

```sh
eid-cli [city] [options]
eid-cli reset
eid-cli config [options]
```

Notes:

- Default run is the current Eid status view
- Passing a city is one-off and does not overwrite saved default location

## Flags and Arguments

Main command flags (`eid-cli [city]`):

| Flag | Type | Default | Behavior |
| --- | --- | --- | --- |
| `[city]` | `string` | saved location | One-off city lookup; does not overwrite saved default |
| `-c, --city <city>` | `string` | none | Same as city arg |
| `--country <country>` | `string` | saved config | One-off country override |
| `--timezone <timezone>` | `string` | saved/detected | One-off timezone override |
| `--method <id>` | `number` | saved/recommended | One-off calculation method override |
| `--calendar <id>` | `string` | saved config | One-off Hijri calendar override |
| `-e, --eid <eid>` | `string` | `auto` | `al-fitr`, `al-adha`, or `auto` |
| `-d, --date <YYYY-MM-DD>` | `string` | today | Gregorian date override |
| `-p, --plain` | `boolean` | `false` | Plain text output without banner styling |
| `-j, --json` | `boolean` | `false` | JSON-only output for scripts |
| `-s, --status` | `boolean` | `false` | Single-line status output |
| `-v, --version` | `boolean` | n/a | Print version only |
| `-h, --help` | `boolean` | n/a | Show help |

Config flags (`eid-cli config`):

| Flag | Type | Behavior |
| --- | --- | --- |
| `--city <city>` | `string` | Save city |
| `--country <country>` | `string` | Save country |
| `--timezone <timezone>` | `string` | Save timezone |
| `--method <id>` | `number` | Save calculation method (`0..23`) |
| `--calendar <id>` | `string` | Save Hijri calendar |
| `--show` | `boolean` | Print saved config |
| `--clear` | `boolean` | Clear saved config |

Reset command:

- `eid-cli reset` clears saved location, method, timezone, and Hijri calendar.

## I/O Contract

- `stdout`:
  - primary output (styled/plain/json/status)
  - version output (`-v`) prints version only
- `stderr`:
  - runtime and validation errors
- `--json`:
  - prints structured JSON to `stdout` on success
  - prints structured JSON error payload to `stderr` on failure
- Exit codes:
  - `0` success
  - `1` runtime/validation/network/data failure

## Config and Precedence

Data sources:

- flags and args for the current invocation
- saved config from first-run setup or `eid-cli config`
- detected network location as suggestion during setup

Resolution behavior:

- one-off city arg/flag wins for that invocation but is not persisted
- saved config is used when no one-off input is provided
- `EID_CLI_CONFIG_DIR` controls where config is stored
