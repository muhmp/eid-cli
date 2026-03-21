import { describe, expect, it } from "vitest";
import { getRecommendedMethod } from "../recommendations.js";

describe("getRecommendedMethod", () => {
  it("returns MWL for Japan", () => {
    expect(getRecommendedMethod("Japan")).toBe(3);
  });

  it("is case-insensitive", () => {
    expect(getRecommendedMethod("japan")).toBe(3);
  });
});
