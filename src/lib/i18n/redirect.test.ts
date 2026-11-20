import { describe, expect, test } from "vitest";
import { localeRedirectPath, swapLocalePath } from "./redirect";

describe("swapLocalePath", () => {
  test.each([
    ["/uz/c/cpu", "ru", "/ru/c/cpu"],
    ["/uz", "ru", "/ru"],
    ["/ru/p/amd-ryzen-5-7600", "uz", "/uz/p/amd-ryzen-5-7600"],
    ["/", "ru", "/ru"],
    ["/c/cpu", "uz", "/uz/c/cpu"],
  ] as const)("%s → %s = %s", (path, lang, out) => {
    expect(swapLocalePath(path, lang)).toBe(out);
  });
});

describe("localeRedirectPath", () => {
  test.each<[string, string, string | undefined, string | null, string | null]>(
    [
      ["/uz/c/cpu", "", undefined, null, null],
      ["/ru", "", undefined, null, null],
      ["/uz", "?q=x", "ru", "ru-RU", null],
      ["/", "", undefined, "ru-RU", "/ru"],
      ["/", "", undefined, null, "/uz"],
      ["/c/cpu", "?socket=AM5", "ru", null, "/ru/c/cpu?socket=AM5"],
      ["/de/c/cpu", "", undefined, null, "/uz/de/c/cpu"],
      ["/uzbek", "", undefined, null, "/uz/uzbek"],
      ["/russia", "", "ru", null, "/ru/russia"],
    ],
  )("%s%s (cookie %s, header %s) → %s", (path, search, cookie, header, out) => {
    expect(localeRedirectPath(path, search, cookie, header)).toBe(out);
  });
});
