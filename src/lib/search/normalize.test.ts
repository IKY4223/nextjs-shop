import { describe, expect, test } from "vitest";
import { compact, normalize } from "./normalize";

const MAX_LENGTH = 200;
const HUGE_INPUT_LENGTH = 5000;

describe("normalize", () => {
  test.each([
    ["Процессор", "protsessor"],
    ["o\u2018zu", "ozu"],
    ["i5-12400F", "i5 12400f"],
    ["12400ф", "12400f"],
    ["4,5 млн", "4.5 mln"],
    ["   ", ""],
    ["!!!???", ""],
    ["\u{1F525}rtx5070видюха", "rtx5070 vidyuxa"],
    ["9800х3д", "9800x3d"],
    ["265к", "265k"],
    ["ёлка", "elka"],
    ["Ғўза қўл ҳа", "goza qol ha"],
    ["G.Skill", "g skill"],
    ["1,5,7", "1.5.7"],
    ["a , b", "a b"],
  ])("normalize(%j) = %j", (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  test("all apostrophe variants are equivalent", () => {
    const variants = [
      "O\u02BBzbekiston",
      "O\u02BCzbekiston",
      "O'zbekiston",
      "O\u2018zbekiston",
      "O\u2019zbekiston",
      "O`zbekiston",
      "Ozbekiston",
    ];
    expect(new Set(variants.map(normalize))).toEqual(new Set(["ozbekiston"]));
  });

  test("bounded output for huge input", () => {
    expect(normalize("a".repeat(HUGE_INPUT_LENGTH)).length).toBeLessThanOrEqual(
      MAX_LENGTH,
    );
  });
});

describe("compact", () => {
  test("drops spaces", () => {
    expect(compact("i5 12400f")).toBe("i512400f");
    expect(compact("Core i5-12400F")).toBe("corei512400f");
  });
});
