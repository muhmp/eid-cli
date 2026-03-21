import pc from "picocolors";

export const STAR_EMOJI = "✦";

const EID_ORANGE_RGB = "38;2;255;170;72";
const ANSI_RESET = "\u001B[0m";

const supportsTrueColor = (): boolean => {
  const colorTerm = process.env.COLORTERM?.toLowerCase() ?? "";
  return colorTerm.includes("truecolor") || colorTerm.includes("24bit");
};

export const eidOrange = (value: string): string => {
  if (!pc.isColorSupported) {
    return value;
  }

  if (!supportsTrueColor()) {
    return pc.yellow(value);
  }

  return `\u001B[${EID_ORANGE_RGB}m${value}${ANSI_RESET}`;
};
