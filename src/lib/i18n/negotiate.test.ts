import { describe, expect, test } from "vitest";
import { pickLocale } from "./negotiate";

describe("pickLocale", () => {
  test("a valid cookie wins over the header", () => {
    expect(pickLocale("ru", "uz-UZ,uz;q=0.9")).toBe("ru");
  });

  test("an unsupported cookie is ignored", () => {
    expect(pickLocale("de", "ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
  });

  test("picks the first supported language by q-order", () => {
    expect(pickLocale(undefined, "en-US,ru;q=0.5")).toBe("ru");
    expect(pickLocale(undefined, "ru;q=0.3,uz;q=0.8")).toBe("uz");
  });

  test("matches by primary subtag", () => {
    expect(pickLocale(undefined, "uz-Cyrl-UZ")).toBe("uz");
  });

  test("falls back to uz", () => {
    expect(pickLocale(undefined, "en-US,en;q=0.9")).toBe("uz");
    expect(pickLocale(undefined, null)).toBe("uz");
  });

  test("survives a garbage header", () => {
    expect(pickLocale(undefined, ";;;q=,,")).toBe("uz");
  });
});
