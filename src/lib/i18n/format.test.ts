import { describe, expect, test } from "vitest";
import { formatDate, formatPrice, pluralize } from "./format";

const PRICE_4_5_MLN = 4_500_000;
const PRICE_ZERO = 0;
const PRICE_2_8_BLN = 2_800_000_000;
const COUNT_ONE = 1;
const COUNT_FEW = 3;
const COUNT_MANY = 11;
const COUNT_TWENTY_ONE = 21;
const COUNT_FIVE = 5;

describe("formatPrice", () => {
  test("uz uses so\u02BBm with non-breaking spaces", () => {
    expect(formatPrice(PRICE_4_5_MLN, "uz")).toBe(
      "4\u00A0500\u00A0000\u00A0so\u02BBm",
    );
  });

  test("ru uses сум with non-breaking spaces", () => {
    expect(formatPrice(PRICE_4_5_MLN, "ru")).toBe(
      "4\u00A0500\u00A0000\u00A0сум",
    );
  });

  test("zero", () => {
    expect(formatPrice(PRICE_ZERO, "ru")).toBe("0\u00A0сум");
  });

  test("billions (car prices) do not overflow", () => {
    expect(formatPrice(PRICE_2_8_BLN, "uz")).toBe(
      "2\u00A0800\u00A0000\u00A0000\u00A0so\u02BBm",
    );
  });
});

describe("pluralize", () => {
  const forms = {
    one: "товар",
    few: "товара",
    many: "товаров",
    other: "товара",
  };

  test("russian plural categories", () => {
    expect(pluralize("ru", COUNT_ONE, forms)).toBe("товар");
    expect(pluralize("ru", COUNT_FEW, forms)).toBe("товара");
    expect(pluralize("ru", COUNT_MANY, forms)).toBe("товаров");
    expect(pluralize("ru", COUNT_TWENTY_ONE, forms)).toBe("товар");
  });

  test("uzbek falls back to other", () => {
    expect(pluralize("uz", COUNT_FIVE, { other: "ta mahsulot" })).toBe(
      "ta mahsulot",
    );
  });
});

describe("formatDate", () => {
  test("long month, no time zone drift", () => {
    const ru = formatDate("2026-11-12", "ru");
    expect(
      ru.includes("12") && ru.includes("ноябр") && ru.includes("2026"),
    ).toBe(true);
    const uz = formatDate("2026-11-01", "uz");
    expect(
      uz.includes("1") && uz.includes("noyabr") && uz.includes("2026"),
    ).toBe(true);
  });

  test("an invalid date is shown as given", () => {
    expect(formatDate("not-a-date", "ru")).toBe("not-a-date");
  });
});
