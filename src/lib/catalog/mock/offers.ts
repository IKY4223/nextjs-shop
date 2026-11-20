/* eslint-disable ts-patterns/no-magic-numbers -- mock prices are data (≈ USD × 12 800, rounded to 10 000 UZS) */
import type { Localized } from "@/lib/i18n/locales";
import type { Condition, Offer, OfferSourceType } from "../types";

interface Seller {
  readonly type: OfferSourceType;
  readonly name: string;
}

/** [product slug, new-offer prices, used-offer prices] in whole UZS. */
type PriceRow = readonly [
  slug: string,
  newPrices: readonly number[],
  usedPrices: readonly number[],
];

// Invented sellers only: no real platform or store names before release (spec §4).
const NEW_SELLERS: readonly Seller[] = [
  { type: "store", name: "TechPoint" },
  { type: "telegram", name: "@kompyuter_bozor" },
  { type: "store", name: "MegaByte Shop" },
  { type: "store", name: "PC Zone" },
  { type: "telegram", name: "@pc_market_toshkent" },
];

const USED_SELLERS: readonly Seller[] = [
  { type: "classified", name: "Javlon S." },
  { type: "telegram", name: "@b_u_texnika" },
  { type: "classified", name: "Aziz K." },
  { type: "classified", name: "Dilshod R." },
  { type: "telegram", name: "@second_hand_pc" },
];

const CITIES: readonly Localized[] = [
  { uz: "Toshkent", ru: "Ташкент" },
  { uz: "Samarqand", ru: "Самарканд" },
  { uz: "Buxoro", ru: "Бухара" },
  { uz: "Namangan", ru: "Наманган" },
];

const PRICES: readonly PriceRow[] = [
  // CPUs
  ["amd-ryzen-7-9800x3d", [6_130_000, 6_290_000, 6_450_000], [4_690_000]],
  ["amd-ryzen-9-9950x", [8_310_000, 8_490_000], []],
  ["amd-ryzen-5-9600x", [2_930_000, 3_050_000], [2_290_000]],
  ["amd-ryzen-7-7800x3d", [5_110_000, 5_250_000], [3_990_000]],
  ["amd-ryzen-5-7600", [2_420_000], [1_790_000]],
  ["amd-ryzen-5-5600x", [1_650_000, 1_720_000], [1_190_000, 1_250_000]],
  ["amd-ryzen-7-5700x3d", [2_930_000], []],
  ["intel-core-ultra-7-265k", [3_830_000, 3_990_000], []],
  ["intel-core-ultra-5-245k", [2_800_000], [2_150_000]],
  ["intel-core-i5-14600kf", [2_800_000, 2_890_000], [2_050_000]],
  ["intel-core-i5-12400f", [1_400_000, 1_450_000], [990_000, 1_050_000]],
  // GPUs
  ["asus-dual-geforce-rtx-5070", [7_030_000, 7_190_000], [5_490_000]],
  ["msi-geforce-rtx-5080-gaming-trio", [15_350_000, 15_790_000], []],
  ["gigabyte-geforce-rtx-5060-ti-windforce", [5_490_000], [4_290_000]],
  ["asus-tuf-geforce-rtx-4070-super", [7_670_000], [5_690_000, 5_990_000]],
  ["msi-geforce-rtx-4060-ventus", [3_830_000, 3_950_000], [2_790_000]],
  ["sapphire-pulse-radeon-rx-9070-xt", [8_950_000, 9_190_000], []],
  ["powercolor-hellhound-radeon-rx-9060-xt", [4_470_000], []],
  ["sapphire-pulse-radeon-rx-7800-xt", [6_130_000], [4_590_000]],
  ["xfx-speedster-radeon-rx-7600", [3_320_000], [2_390_000]],
  ["asrock-intel-arc-b580-challenger", [3_190_000, 3_290_000], []],
  // Motherboards
  ["asus-tuf-gaming-b650-plus-wifi", [2_550_000, 2_650_000], [1_890_000]],
  ["msi-mag-x870-tomahawk-wifi", [3_830_000], []],
  ["gigabyte-b650m-aorus-elite-ax", [2_420_000], [1_790_000]],
  ["asrock-b650i-lightning-wifi", [3_570_000], []],
  ["msi-mag-b550-tomahawk", [2_160_000, 2_250_000], [1_490_000, 1_590_000]],
  ["asus-prime-z890-p", [3_060_000], []],
  ["gigabyte-b860m-ds3h", [1_650_000], []],
  ["msi-pro-b760m-a-ddr4", [1_780_000], [1_290_000]],
  ["asus-rog-strix-z790-e", [5_750_000], [4_190_000]],
  // RAM
  ["kingston-fury-beast-ddr5-32gb-6000", [1_270_000, 1_320_000], [920_000]],
  ["gskill-trident-z5-rgb-ddr5-32gb-6400", [1_650_000], []],
  ["corsair-vengeance-ddr5-64gb-6000", [2_420_000, 2_490_000], []],
  ["kingston-fury-beast-ddr5-16gb-5600", [760_000], [560_000]],
  ["teamgroup-t-force-delta-ddr5-32gb-6000", [1_400_000], []],
  ["corsair-vengeance-lpx-ddr4-16gb-3200", [580_000, 610_000], [410_000]],
  ["kingston-fury-beast-ddr4-32gb-3600", [1_010_000], [740_000]],
  ["gskill-ripjaws-v-ddr4-16gb-3600", [630_000], [450_000]],
  ["crucial-pro-ddr5-96gb-5600", [3_320_000], []],
];

const DAYS_IN_RANGE = 19; // updatedAt spans 2026-11-01 … 2026-11-19
const DAY_STEP = 7; // coprime with 19, so consecutive offers get different days
const ID_DIGITS = 3;
const DAY_DIGITS = 2;

const pick = <TItem>(items: readonly TItem[], index: number): TItem =>
  items[index % items.length] as TItem; // index % length is always in range

function updatedAtFor(index: number): string {
  const day = 1 + ((index * DAY_STEP) % DAYS_IN_RANGE);
  return `2026-11-${String(day).padStart(DAY_DIGITS, "0")}`;
}

interface Draft {
  readonly productId: string;
  readonly condition: Condition;
  readonly priceUzs: number;
}

const drafts: readonly Draft[] = PRICES.flatMap(
  ([productId, newPrices, usedPrices]) => [
    ...newPrices.map((priceUzs) => ({
      productId,
      condition: "new" as const,
      priceUzs,
    })),
    ...usedPrices.map((priceUzs) => ({
      productId,
      condition: "used" as const,
      priceUzs,
    })),
  ],
);

/** Deterministic: sellers, cities and dates rotate by position, so every build yields the same data. */
export const mockOffers: readonly Offer[] = drafts.map((draft, index) => ({
  id: `o-${String(index + 1).padStart(ID_DIGITS, "0")}`,
  productId: draft.productId,
  source: pick(draft.condition === "new" ? NEW_SELLERS : USED_SELLERS, index),
  condition: draft.condition,
  priceUzs: draft.priceUzs,
  city: pick(CITIES, index),
  updatedAt: updatedAtFor(index),
}));
