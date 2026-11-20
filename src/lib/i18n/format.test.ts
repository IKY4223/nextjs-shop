import { describe, expect, test } from "vitest";
import { formatPrice, pluralize } from "./format";

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
    expect(formatPrice(PRICE_4_5_MLN, "uz")).toBe("4\u00A0500\u00A0000\u00A0so\u02BBm");
  });

  test("ru uses сум with non-breaking spaces", () => {
    expect(formatPrice(PRICE_4_5_MLN, "ru")).toBe("4\u00A0500\u00A0000\u00A0сум");
  });

  test("zero", () => {
    expect(formatPrice(PRICE_ZERO, "ru")).toBe("0\u00A0сум");
  });

  test("billions (car prices) do not overflow", () => {
    expect(formatPrice(PRICE_2_8_BLN, "uz")).toBe("2\u00A0800\u00A0000\u00A0000\u00A0so\u02BBm");
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
