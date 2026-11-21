import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

// Characters a Unicode-cleaning editor hook may strip; dictionaries must hold them as \u escapes (plan Global Constraints).
const MODIFIER_TURNED_COMMA = 0x02bb; // \u02BB in o\u02BB, g\u02BB
const MODIFIER_APOSTROPHE = 0x02bc; // \u02BC in e\u02BClon
const NO_BREAK_SPACE = 0x00a0;
const NARROW_NO_BREAK_SPACE = 0x202f;
const HEX = 16;
const FRAGILE_CODES = [
  MODIFIER_TURNED_COMMA,
  MODIFIER_APOSTROPHE,
  NO_BREAK_SPACE,
  NARROW_NO_BREAK_SPACE,
];

const raw = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`./dictionaries/${name}`, import.meta.url)),
    "utf8",
  );

describe("dictionary files", () => {
  test.each(["uz.json", "ru.json"])(
    "%s stores fragile characters only as escapes",
    (name) => {
      const text = raw(name);
      const literal = FRAGILE_CODES.filter((code) =>
        text.includes(String.fromCharCode(code)),
      ).map((code) => code.toString(HEX));
      expect(literal).toEqual([]);
    },
  );
});
