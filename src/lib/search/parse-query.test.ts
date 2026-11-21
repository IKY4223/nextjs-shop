import { describe, expect, test } from "vitest";
import { categories } from "@/lib/catalog/categories";
import { parseQuery, type ParsedQuery } from "./parse-query";

const K500 = 500_000;
const M1 = 1_000_000;
const M2 = 2_000_000;
const M2_5 = 2_500_000;
const M3 = 3_000_000;
const M4_5 = 4_500_000;
const M5 = 5_000_000;

const p = (q: string): ParsedQuery => parseQuery(q, categories);

describe("parseQuery", () => {
  test.each<[string, Partial<ParsedQuery>]>([
    [
      "видеокарта б/у до 5 млн",
      { categorySlug: "gpu", condition: "used", priceMax: M5, text: "" },
    ],
    ["от 1 до 2 млн", { priceMin: M1, priceMax: M2, text: "" }],
    ["1 mlndan 2 mlngacha", { priceMin: M1, priceMax: M2, text: "" }],
    ["3 mln gacha", { priceMax: M3, text: "" }],
    ["500 тыс", { priceMax: K500, text: "" }],
    ["4,5 млн", { priceMax: M4_5, text: "" }],
    ["дешевле 3 млн", { priceMax: M3 }],
    ["дороже 2 млн", { priceMin: M2, priceMax: null }],
    ["rtx 4070 2500000", { priceMax: M2_5, text: "rtx 4070" }],
    ["rtx 5070", { priceMax: null, text: "rtx 5070" }],
    ["ryzen 7 9800 x3d", { priceMax: null, priceMin: null }],
    ["kingston 6000", { priceMax: null, text: "kingston 6000" }],
    ["core ultra 7 265k", { priceMax: null, text: "core ultra 7 265k" }],
    ["процесор", { categorySlug: "cpu", text: "" }],
    // user feedback 2026-11-21: currency words, plural units, grouped digits
    ["до 5000000 сум", { priceMax: M5, text: "" }],
    ["rtx до 5 млн сум", { priceMax: M5, text: "rtx" }],
    ["до 5000000so'm", { priceMax: M5, text: "" }],
    ["5 миллионов", { priceMax: M5, text: "" }],
    ["до 2 миллионов", { priceMax: M2, text: "" }],
    ["от 1 миллиона до 3 миллионов", { priceMin: M1, priceMax: M3, text: "" }],
    ["до 4 500 000 сум", { priceMax: M4_5, text: "" }],
    ["rtx 4 500 000", { priceMax: M4_5, text: "rtx" }],
    ["500 тысяч", { priceMax: K500, text: "" }],
    ["rtx сум", { priceMax: null, text: "rtx" }],
    ["i5 12400", { priceMax: null, text: "i5 12400" }],
    ["видеокарты", { categorySlug: "gpu" }],
    ["мать z890", { categorySlug: "motherboard", text: "z890" }],
    ["ona plata am4", { categorySlug: "motherboard", text: "am4" }],
    ["yangi ryzen 5 9600x", { condition: "new", text: "ryzen 5 9600x" }],
    ["бу 5600x", { condition: "used", text: "5600x" }],
    ["бывший в употреблении rtx", { condition: "used", text: "rtx" }],
  ])("parseQuery(%j)", (query, expected) => {
    expect(p(query)).toMatchObject(expected);
  });

  test("empty query", () => {
    expect(p("")).toEqual({
      text: "",
      categorySlug: null,
      condition: null,
      priceMin: null,
      priceMax: null,
    });
  });

  test("two categories in one query leave categorySlug null", () => {
    expect(p("процессор видеокарта").categorySlug).toBeNull();
  });

  test("tiny keyword-marked amounts are not prices, and leave no stray words", () => {
    expect(p("до 5")).toMatchObject({ priceMax: null, text: "" });
    expect(p("rtx до 5")).toMatchObject({ priceMax: null, text: "rtx" });
  });

  test("amounts beyond a safe integer are not prices", () => {
    expect(p("99999999999999999999 сум").priceMax).toBeNull();
  });
});
