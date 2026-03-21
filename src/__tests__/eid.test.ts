import { describe, expect, it } from "vitest";
import { buildEidResponse } from "../commands/eid.js";

describe("buildEidResponse", () => {
  it("shows Shawwal after Eid al-Fitr window", () => {
    const response = buildEidResponse("auto", new Date(2026, 2, 24, 12, 0, 0, 0), {
      city: "Fukuoka",
      country: "Japan",
      timezone: "Asia/Tokyo",
      method: 3,
      calendar: "islamic-umalqura"
    });

    expect(response.label).toBe("Shawwal 5");
    expect(response.mode).toBe("post-eid");
  });
});
