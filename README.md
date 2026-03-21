# eid-cli

`eid-cli` is a small terminal tool for Eid al-Fitr, Eid al-Adha, and post-Eid Hijri status.

## Goals

- Show a polished Eid-focused CLI output
- Save user config for location, timezone, method, and Hijri calendar
- Support first-run interactive setup
- Keep a modular TypeScript codebase instead of a single runtime file

## Usage

```bash
npx eid-cli
npx eid-cli --status
npx eid-cli --json
npx eid-cli --eid al-fitr
npx eid-cli --date 2026-03-21
npx eid-cli config --show
```

## Config

```bash
eid-cli config --city Fukuoka --country Japan --timezone Asia/Tokyo --method 3 --calendar islamic-umalqura
eid-cli config --show
eid-cli reset
```

## Development

```bash
pnpm install
pnpm build
node dist/cli.js
```

## Architecture

- `src/cli.ts`: Commander entrypoint
- `src/commands/eid.ts`: main Eid command flow and rendering
- `src/commands/config.ts`: config command
- `src/eid-config.ts`: persisted config
- `src/setup.ts`: first-run setup prompts
- `src/recommendations.ts`: country-based method recommendations
- `src/ui/*`: banner and theme
