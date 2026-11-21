import { describe, expect, test } from "vitest";
import { themeFromCookie } from "./theme";

describe("themeFromCookie", () => {
  test.each<[string, boolean, "dark" | "light"]>([
    ["theme=light", false, "light"],
    ["lang=ru; theme=light", false, "light"],
    ["theme=dark", true, "dark"],
    ["", true, "light"],
    ["", false, "dark"],
    ["theme=purple", false, "dark"],
    ["mytheme=light", false, "dark"],
  ])("cookie %j, OS light %s → %s", (cookie, prefersLight, expected) => {
    expect(themeFromCookie(cookie, prefersLight)).toBe(expected);
  });
});
