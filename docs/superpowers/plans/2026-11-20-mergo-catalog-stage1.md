# Mergo Catalog Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Mergo tech-aggregator catalog (4 categories, facet filters, offers new/used, Ctrl+K search, uz/ru, dark/light) on mock data in the existing Next.js app.

**Architecture:** Pure TypeScript modules in `src/lib/` hold all logic (i18n, catalog config, mock data, filters, search) and are unit-tested with Vitest. Pages under `src/app/[lang]/` read data only through the async data-access layer `src/lib/catalog/data.ts`, so swapping mocks for Prisma later touches one file. Next 16 Cache Components is on: pages are prerendered via `generateStaticParams`; anything reading `searchParams` sits inside `<Suspense>`.

**Tech Stack:** Next.js 16.4.6 (App Router, Cache Components, `proxy.ts`, `next/root-params`), React 19.3.1 (`<ViewTransition>`), Tailwind CSS 4.3.5, TypeScript 6, Prisma 7.10.1 (schema only), Fuse.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-mergo-catalog-design.md` — read it before starting; this plan argues from it.

## Global Constraints

- Before writing any Next.js code, read the matching guide in `node_modules/next/dist/docs/` (`AGENTS.md`). Already confirmed for this plan: `proxy.ts` replaces `middleware.ts`; `import { lang } from 'next/root-params'`; with Cache Components every dynamic route's `generateStaticParams` must return ≥ 1 entry; `dynamicParams` is unavailable; `PageProps<'/route'>` / `LayoutProps<'/route'>` are global types; `searchParams` / `cookies()` reads must be inside `<Suspense>`.
- New dependencies only: `fuse.js`, `vitest` (dev). Pin exact versions (`--save-exact`). No `next-intl`, no `server-only`, no UI kits, no state libraries.
- `tsconfig.json`: `"allowJs": false`, `"noUncheckedIndexedAccess": true`.
- Locales: `uz` (Latin script, default) and `ru`. URLs `/{lang}/...`, identical slugs in both languages. Uzbek text uses `ʻ` (U+02BB) in `oʻ`, `gʻ`.
- Money: integer UZS in `number`; Prisma `BigInt`. Prices render as `4 500 000 soʻm` (uz) / `4 500 000 сум` (ru) with U+00A0 between digit groups and before the currency word.
- Theme tokens (exact): dark — bg `#0A0E1A`, surface `#111729`, border `#1F2740`, text `#E6ECFA`, muted `#98A2BD`, accent `#60A5FA`, on-accent `#0A0E1A`, used `#F472B6`, chip `#1A2236`; light — bg `#F8FAFF`, surface `#FFFFFF`, border `#DFE5F5`, text `#0E1530`, muted `#4A5578`, accent `#1D4ED8`, on-accent `#FFFFFF`, used `#BE185D`, chip `#EEF2FC`.
- No component branches on a category slug; all per-category knowledge lives in `src/lib/catalog/categories.ts`.
- Mock data: real model names, invented sellers; no real platform or store names (OLX, Uzum, Texnomart, Mediapark, Asaxiy…); seller links go to the internal `/[lang]/go/[offerId]` stub.
- Photos: only CC0 / CC BY / CC BY-SA of the exact model; otherwise the category placeholder SVG. No captions; credits only on `/[lang]/credits`.
- Every commit passes `npm run format:check`, `npm run lint`, `npm test`, `npm run build`. Work on branch `feat/mergo-catalog-stage1`; `main` is protected.

## Review Focus

- **Hand-edited or stale URLs** (`?cores=abc&socket=NOPE&priceMin=-5&priceMax=1e30&sort=evil`): page renders, invalid values are dropped, nothing throws → test in Task 4.
- **Unknown lang / category / product / offer slug** (`/de/c/cpu`, `/uz/c/phones`, `/uz/p/nope`): 404 page, never a 500 → data-layer null tests in Task 6, `notFound()` in Tasks 8–10, proxy test in Task 7.
- **Filters that match nothing**: empty state with a "reset filters" link, not a blank grid → test in Task 4 (`applyFilters` returns `[]`), UI in Task 8.
- **Odd search input** (500-char string, emoji, mixed scripts `rtx5070видюха`, only spaces, only punctuation): no throw, bounded work → tests in Task 5.
- **Product whose offers are all filtered out, or which has no offers at all**: hidden from listings; its product page still shows every offer, or "no offers yet" → tests in Task 4 and Task 6.

---

### Task 1: Tooling, locales and formatting

**Files:**

- Modify: `package.json` (add `fuse.js`, `vitest`; script `"test": "vitest run"`)
- Modify: `tsconfig.json` (`allowJs: false`, `noUncheckedIndexedAccess: true`)
- Modify: `.github/workflows/ci.yml` (add `- run: npm test` after `npm run lint`)
- Create: `vitest.config.ts`
- Create: `src/lib/i18n/locales.ts`, `src/lib/i18n/negotiate.ts`, `src/lib/i18n/format.ts`
- Create: `src/lib/i18n/dictionaries/uz.json`, `src/lib/i18n/dictionaries/ru.json`, `src/lib/i18n/dictionaries.ts`
- Test: `src/lib/i18n/negotiate.test.ts`, `src/lib/i18n/format.test.ts`

**Interfaces:**

- Produces:
  - `type Locale = 'uz' | 'ru'`; `const locales: readonly Locale[] = ['uz', 'ru']`; `const defaultLocale: Locale = 'uz'`; `function isLocale(value: string): value is Locale`; `type Localized = Record<Locale, string>`
  - `function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale`
  - `function formatPrice(amountUzs: number, lang: Locale): string`
  - `function pluralize(lang: Locale, n: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }): string`
  - `type Dictionary = typeof import('./dictionaries/uz.json')`; `function getDictionary(lang: Locale): Promise<Dictionary>`

- [ ] **Step 1: Install and configure**

Run: `npm install --save-exact fuse.js && npm install --save-dev --save-exact vitest`
Create `vitest.config.ts` with `test.include: ['src/**/*.test.ts']`, `environment: 'node'`, and `resolve.alias` `'@'` → `fileURLToPath(new URL('./src', import.meta.url))` (use `fileURLToPath`, not `.pathname`, so Windows paths work). Do **not** enable `globals`: every test file in this plan starts with `import { describe, test, expect } from 'vitest'` (the snippets below omit that line). `next build` type-checks test files too, so globals without types would break the build. Apply the `tsconfig.json` and CI changes listed above.
In source code, write `ʻ` as `ʻ` and the non-breaking space as ` ` (escapes, not literal characters): a Unicode-cleaning editor hook on this machine could otherwise rewrite `soʻm` or the price separators unnoticed. JSON dictionaries may use the escapes too.

- [ ] **Step 2: Write the failing tests**

```ts
// negotiate.test.ts
expect(pickLocale("ru", "uz-UZ,uz;q=0.9")).toBe("ru"); // cookie wins
expect(pickLocale("de", "ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru"); // bad cookie ignored
expect(pickLocale(undefined, "en-US,ru;q=0.5")).toBe("ru"); // first supported by q-order
expect(pickLocale(undefined, "uz-Cyrl-UZ")).toBe("uz");
expect(pickLocale(undefined, "en-US,en;q=0.9")).toBe("uz"); // default
expect(pickLocale(undefined, null)).toBe("uz");
expect(pickLocale(undefined, ";;;q=,,")).toBe("uz"); // garbage header

// format.test.ts
expect(formatPrice(4_500_000, "uz")).toBe("4 500 000 soʻm");
expect(formatPrice(4_500_000, "ru")).toBe("4 500 000 сум");
expect(formatPrice(0, "ru")).toBe("0 сум");
expect(formatPrice(2_800_000_000, "uz")).toBe("2 800 000 000 soʻm");
const f = { one: "товар", few: "товара", many: "товаров", other: "товара" };
expect(pluralize("ru", 1, f)).toBe("товар");
expect(pluralize("ru", 3, f)).toBe("товара");
expect(pluralize("ru", 11, f)).toBe("товаров");
expect(pluralize("uz", 5, { other: "ta mahsulot" })).toBe("ta mahsulot");
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL (modules not found).

- [ ] **Step 4: Implement**

`pickLocale`: cookie if `isLocale`; else parse `Accept-Language` entries, sort by `q` (default 1), take the first whose primary subtag is `uz` or `ru`; else `defaultLocale`. `formatPrice`: `Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })`, then replace every whitespace character with U+00A0 (ICU versions differ between Node and browsers; a fixed separator prevents hydration mismatches), then append U+00A0 + `soʻm` or `сум`. Do not use `style: 'currency'`: its output varies between ICU versions. `pluralize`: `new Intl.PluralRules(lang).select(n)`, fall back to `forms.other`. `dictionaries.ts`: dynamic `import()` per locale; `const ru: Dictionary = ruJson` makes `next build` fail if `ru.json` misses a key. Start both JSON files with the keys the shell needs (`demo.banner`, `nav.search`, `nav.searchHint`, `theme.toggle`, `lang.switch`, `footer.credits`); later tasks add their keys to both files.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .github/workflows/ci.yml src/lib/i18n
git commit -m "feat(i18n): add locales, negotiation, price formatting and Vitest"
```

---

### Task 2: Catalog types, category config and Prisma schema

**Files:**

- Create: `src/lib/catalog/types.ts`, `src/lib/catalog/categories.ts`
- Create: `public/categories/cpu.svg`, `gpu.svg`, `motherboard.svg`, `ram.svg`, `pc-components.svg`, `electronics.svg` (simple single-colour line icons using `currentColor`)
- Modify: `prisma/schema.prisma`
- Test: `src/lib/catalog/categories.test.ts`

**Interfaces:**

- Consumes: `Locale`, `Localized` (Task 1).
- Produces (in `types.ts`):

```ts
export type FacetOption = { value: string; label?: Localized }; // no label → show value as is ("AM5")
export type Facet =
  | {
      key: string;
      label: Localized;
      type: "enum";
      options: readonly FacetOption[];
    }
  | {
      key: string;
      label: Localized;
      type: "number";
      unit?: Localized;
      options: readonly number[];
    }
  | { key: string; label: Localized; type: "boolean" };
export type Category = {
  slug: string;
  name: Localized;
  parentSlug: string | null;
  icon: string; // path under /public, e.g. "/categories/cpu.svg"
  facets: readonly Facet[];
  cardFacets: readonly string[]; // facet keys shown as chips on cards, max 3
  searchSynonyms: readonly string[]; // written naturally (ru, uz, slang); normalized at runtime
};
export type SpecValue = string | number | boolean;
// Maps a facet list to the specs object it allows — used with `satisfies` in mocks.
export type SpecsFor<F extends readonly Facet[]> = {
  [K in F[number] as K["key"]]: K extends {
    type: "enum";
    options: readonly (infer O)[];
  }
    ? O extends { value: infer V }
      ? V
      : never
    : K extends { type: "number"; options: readonly (infer N)[] }
      ? N
      : boolean;
};
export type ProductImage = {
  src: string;
  alt: string;
  author: string;
  license: "CC0" | "CC BY" | "CC BY-SA";
  licenseUrl: string;
  sourceUrl: string;
};
export type Product = {
  id: string;
  slug: string;
  categorySlug: string;
  brand: string;
  name: string;
  specs: Record<string, SpecValue>;
  image: ProductImage | null;
};
export type Condition = "new" | "used";
export type OfferSourceType = "store" | "telegram" | "classified";
export type Offer = {
  id: string;
  productId: string;
  source: { type: OfferSourceType; name: string };
  condition: Condition;
  priceUzs: number;
  city: Localized;
  updatedAt: string; // ISO date "2026-11-12"
};
```

(`Offer` has no `url` field in stage 1: every seller link is `/{lang}/go/{offer.id}`. Add `url` with the import stage.)

- `categories.ts` exports each category `as const satisfies Category` (`cpuCategory`, `gpuCategory`, `motherboardCategory`, `ramCategory`, plus parents `electronicsCategory` slug `electronics`, `pcComponentsCategory` slug `pc-components`) and `export const categories: readonly Category[]`.
- `const RESERVED_PARAMS = ['brand', 'condition', 'priceMin', 'priceMax', 'sort', 'q'] as const` (exported; facet keys must not collide).

Facets (keys, types, options) — exact values from spec §8 and §12.9:

| Category      | Facets                                                                                                                                                                                                                                                                     | cardFacets                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `cpu`         | `socket` enum `AM5, AM4, LGA1851, LGA1700`; `series` enum `ryzen-9000, ryzen-7000, ryzen-5000, core-ultra-200s, core-14, core-12` (labels "Ryzen 9000", …, "Core Ultra 200S", "Core 14-го поколения" / "Core 14-avlod"); `cores` number `6, 8, 14, 16, 20`; `igpu` boolean | `socket`, `cores`                 |
| `gpu`         | `gpuVendor` enum `NVIDIA, AMD, Intel`; `series` enum `rtx-50, rtx-40, rx-9000, rx-7000, arc` (labels "GeForce RTX 50", …, "Arc"); `vram` number `8, 12, 16`, unit "GB"                                                                                                     | `series`, `vram`                  |
| `motherboard` | `socket` enum `AM5, AM4, LGA1851, LGA1700`; `chipset` enum `B650, X870, B550, Z890, B860, B760, Z790`; `formFactor` enum `atx, micro-atx, mini-itx` (labels "ATX", "Micro-ATX", "Mini-ITX"); `memoryType` enum `DDR4, DDR5`                                                | `socket`, `chipset`, `formFactor` |
| `ram`         | `memoryType` enum `DDR4, DDR5`; `capacity` number `16, 32, 64, 96`, unit "GB"; `speed` number `3200, 3600, 5600, 6000, 6400`, unit "MT/s"; `modules` number `1, 2`                                                                                                         | `memoryType`, `capacity`, `speed` |

`searchSynonyms` (minimum): cpu — `процессор, проц, protsessor, cpu, processor`; gpu — `видеокарта, видюха, videokarta, gpu, видео карта`; motherboard — `материнская плата, материнка, мать, ona plata, motherboard, mat plata`; ram — `оперативная память, оперативка, озу, ozu, ram, operativ xotira`. Parents have empty facets and synonyms `техника, texnika` / `комплектующие, butlovchi qismlar`.

- [ ] **Step 1: Write the failing test** (`categories.test.ts`)

```ts
test("slugs unique and parents exist", () => {
  const slugs = categories.map((c) => c.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
  for (const c of categories)
    if (c.parentSlug) expect(slugs).toContain(c.parentSlug);
});
test("facet keys unique per category and not reserved", () => {
  for (const c of categories) {
    const keys = c.facets.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(RESERVED_PARAMS).not.toContain(k);
  }
});
test("cardFacets reference existing facets, max 3", () => {
  for (const c of categories) {
    expect(c.cardFacets.length).toBeLessThanOrEqual(3);
    for (const k of c.cardFacets)
      expect(c.facets.map((f) => f.key)).toContain(k);
  }
});
test("every leaf has 3-5 facets", () => {
  const leaves = categories.filter(
    (c) => !categories.some((x) => x.parentSlug === c.slug),
  );
  expect(leaves.map((c) => c.slug).sort()).toEqual([
    "cpu",
    "gpu",
    "motherboard",
    "ram",
  ]);
  for (const c of leaves) {
    expect(c.facets.length).toBeGreaterThanOrEqual(3);
    expect(c.facets.length).toBeLessThanOrEqual(5);
  }
});
test("no cycles in the tree", () => {
  for (const c of categories) {
    const seen = new Set<string>();
    let cur: Category | undefined = c;
    while (cur?.parentSlug) {
      expect(seen.has(cur.slug)).toBe(false);
      seen.add(cur.slug);
      cur = categories.find((x) => x.slug === cur!.parentSlug);
    }
  }
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL (module missing).
- [ ] **Step 3: Implement `types.ts` and `categories.ts`** as specified above.
- [ ] **Step 4: Update `prisma/schema.prisma`**: remove `Order`, `OrderItem`, `OrderStatus`, `User.orders`, `Product.orderItems`, `Product.stock`; on `Product` add `categorySlug String`, `brand String`, `specs Json`, `imageSrc String?`, `imageAlt String?`, `imageAuthor String?`, `imageLicense String?`, `imageLicenseUrl String?`, `imageSourceUrl String?`, `offers Offer[]`, `@@index([categorySlug])`; remove `Product.description` and `Product.priceCents` (prices live on offers). Add `enum Condition { NEW USED }`, `enum OfferSourceType { STORE TELEGRAM CLASSIFIED }`, and `model Offer { id String @id @default(cuid()); product Product @relation(fields: [productId], references: [id], onDelete: Cascade); productId String; sourceType OfferSourceType; sourceName String; condition Condition; priceUzs BigInt; cityUz String; cityRu String; url String?; updatedAt DateTime; createdAt DateTime @default(now()); @@index([productId]) @@index([condition, priceUzs]) }`.
- [ ] **Step 5: Verify** — `npm test` → PASS; `npx prisma format && git diff --stat prisma/` (formatted), `npx prisma validate` → "is valid", `npx prisma generate` → "Generated Prisma Client".
- [ ] **Step 6: Commit** — `git commit -m "feat(catalog): add category config and aggregator schema"` (types, categories, test, SVGs, schema).

---

### Task 3: Mock products and offers

**Files:**

- Create: `src/lib/catalog/mock/products.ts`, `src/lib/catalog/mock/offers.ts`
- Test: `src/lib/catalog/mock/mock.test.ts`

**Interfaces:**

- Consumes: types and category constants (Task 2).
- Produces: `export const mockProducts: readonly Product[]`, `export const mockOffers: readonly Offer[]`. Only `data.ts` (Task 6) and tests import these.

Write specs with `satisfies SpecsFor<typeof cpuCategory.facets>` (per category) so a wrong key or value fails the build. `image: null` for all products in this task (Task 12 adds photos). Exactly these 39 products (slug = id; brand; name; specs):

- **cpu:** `amd-ryzen-7-9800x3d` AMD "Ryzen 7 9800X3D" AM5 ryzen-9000 8 igpu✓ · `amd-ryzen-9-9950x` AMD "Ryzen 9 9950X" AM5 ryzen-9000 16 ✓ · `amd-ryzen-5-9600x` AMD "Ryzen 5 9600X" AM5 ryzen-9000 6 ✓ · `amd-ryzen-7-7800x3d` AMD "Ryzen 7 7800X3D" AM5 ryzen-7000 8 ✓ · `amd-ryzen-5-7600` AMD "Ryzen 5 7600" AM5 ryzen-7000 6 ✓ · `amd-ryzen-5-5600x` AMD "Ryzen 5 5600X" AM4 ryzen-5000 6 ✗ · `amd-ryzen-7-5700x3d` AMD "Ryzen 7 5700X3D" AM4 ryzen-5000 8 ✗ · `intel-core-ultra-7-265k` Intel "Core Ultra 7 265K" LGA1851 core-ultra-200s 20 ✓ · `intel-core-ultra-5-245k` Intel "Core Ultra 5 245K" LGA1851 core-ultra-200s 14 ✓ · `intel-core-i5-14600kf` Intel "Core i5-14600KF" LGA1700 core-14 14 ✗ · `intel-core-i5-12400f` Intel "Core i5-12400F" LGA1700 core-12 6 ✗
- **gpu:** `asus-dual-geforce-rtx-5070` ASUS "Dual GeForce RTX 5070 12GB" NVIDIA rtx-50 12 · `msi-geforce-rtx-5080-gaming-trio` MSI "GeForce RTX 5080 Gaming Trio OC 16GB" NVIDIA rtx-50 16 · `gigabyte-geforce-rtx-5060-ti-windforce` Gigabyte "GeForce RTX 5060 Ti Windforce 16GB" NVIDIA rtx-50 16 · `asus-tuf-geforce-rtx-4070-super` ASUS "TUF Gaming GeForce RTX 4070 Super 12GB" NVIDIA rtx-40 12 · `msi-geforce-rtx-4060-ventus` MSI "GeForce RTX 4060 Ventus 2X 8GB" NVIDIA rtx-40 8 · `sapphire-pulse-radeon-rx-9070-xt` Sapphire "Pulse Radeon RX 9070 XT 16GB" AMD rx-9000 16 · `powercolor-hellhound-radeon-rx-9060-xt` PowerColor "Hellhound Radeon RX 9060 XT 16GB" AMD rx-9000 16 · `sapphire-pulse-radeon-rx-7800-xt` Sapphire "Pulse Radeon RX 7800 XT 16GB" AMD rx-7000 16 · `xfx-speedster-radeon-rx-7600` XFX "Speedster SWFT 210 Radeon RX 7600 8GB" AMD rx-7000 8 · `asrock-intel-arc-b580-challenger` ASRock "Intel Arc B580 Challenger OC 12GB" Intel arc 12
- **motherboard:** `asus-tuf-gaming-b650-plus-wifi` ASUS "TUF Gaming B650-Plus WiFi" AM5 B650 atx DDR5 · `msi-mag-x870-tomahawk-wifi` MSI "MAG X870 Tomahawk WiFi" AM5 X870 atx DDR5 · `gigabyte-b650m-aorus-elite-ax` Gigabyte "B650M Aorus Elite AX" AM5 B650 micro-atx DDR5 · `asrock-b650i-lightning-wifi` ASRock "B650I Lightning WiFi" AM5 B650 mini-itx DDR5 · `msi-mag-b550-tomahawk` MSI "MAG B550 Tomahawk" AM4 B550 atx DDR4 · `asus-prime-z890-p` ASUS "Prime Z890-P" LGA1851 Z890 atx DDR5 · `gigabyte-b860m-ds3h` Gigabyte "B860M DS3H" LGA1851 B860 micro-atx DDR5 · `msi-pro-b760m-a-ddr4` MSI "PRO B760M-A DDR4" LGA1700 B760 micro-atx DDR4 · `asus-rog-strix-z790-e` ASUS "ROG Strix Z790-E Gaming WiFi" LGA1700 Z790 atx DDR5
- **ram:** `kingston-fury-beast-ddr5-32gb-6000` Kingston "Fury Beast DDR5 32GB (2×16) 6000" DDR5 32 6000 2 · `gskill-trident-z5-rgb-ddr5-32gb-6400` G.Skill "Trident Z5 RGB DDR5 32GB (2×16) 6400" DDR5 32 6400 2 · `corsair-vengeance-ddr5-64gb-6000` Corsair "Vengeance DDR5 64GB (2×32) 6000" DDR5 64 6000 2 · `kingston-fury-beast-ddr5-16gb-5600` Kingston "Fury Beast DDR5 16GB 5600" DDR5 16 5600 1 · `teamgroup-t-force-delta-ddr5-32gb-6000` TeamGroup "T-Force Delta RGB DDR5 32GB (2×16) 6000" DDR5 32 6000 2 · `corsair-vengeance-lpx-ddr4-16gb-3200` Corsair "Vengeance LPX DDR4 16GB (2×8) 3200" DDR4 16 3200 2 · `kingston-fury-beast-ddr4-32gb-3600` Kingston "Fury Beast DDR4 32GB (2×16) 3600" DDR4 32 3600 2 · `gskill-ripjaws-v-ddr4-16gb-3600` G.Skill "Ripjaws V DDR4 16GB (2×8) 3600" DDR4 16 3600 2 · `crucial-pro-ddr5-96gb-5600` Crucial "Pro DDR5 96GB (2×48) 5600" DDR5 96 5600 2

Offers: 1–5 per product, ≥ 1 `new` each; about half the products also get `used` offers priced 15–35 % below their cheapest new offer; prices are plausible UZS (≈ USD × 12 800, rounded to 10 000); mix all three source types; invented seller names (e.g. "TechPoint", "@kompyuter_bozor", "Javlon S."); cities from Toshkent/Ташкент, Samarqand/Самарканд, Buxoro/Бухара, Namangan/Наманган; `updatedAt` within 2026-11-01…2026-11-19; ids `o-001`…

- [ ] **Step 1: Write the failing test** (`mock.test.ts`)

```ts
test("39 products, unique ids and slugs, valid categories", () => {
  expect(mockProducts).toHaveLength(39);
  expect(new Set(mockProducts.map((p) => p.slug)).size).toBe(39);
  const leafSlugs = ["cpu", "gpu", "motherboard", "ram"];
  for (const p of mockProducts) expect(leafSlugs).toContain(p.categorySlug);
});
test("specs match category facets at runtime", () => {
  for (const p of mockProducts) {
    const cat = categories.find((c) => c.slug === p.categorySlug)!;
    expect(Object.keys(p.specs).sort()).toEqual(
      cat.facets.map((f) => f.key).sort(),
    );
    for (const f of cat.facets) {
      const v = p.specs[f.key];
      if (f.type === "enum") expect(f.options.map((o) => o.value)).toContain(v);
      if (f.type === "number") expect(f.options).toContain(v);
      if (f.type === "boolean") expect(typeof v).toBe("boolean");
    }
  }
});
test("offers reference products, every product has a new offer", () => {
  const ids = new Set(mockProducts.map((p) => p.id));
  for (const o of mockOffers) {
    expect(ids.has(o.productId)).toBe(true);
    expect(Number.isSafeInteger(o.priceUzs) && o.priceUzs > 0).toBe(true);
  }
  for (const p of mockProducts)
    expect(
      mockOffers.some((o) => o.productId === p.id && o.condition === "new"),
    ).toBe(true);
  expect(mockOffers.some((o) => o.condition === "used")).toBe(true);
});
test("no real platform or store names in mock sellers", () => {
  for (const o of mockOffers)
    expect(o.source.name).not.toMatch(
      /olx|uzum|texnomart|mediapark|asaxiy|wildberries|yandex/i,
    );
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL.
- [ ] **Step 3: Write `products.ts` and `offers.ts`** per the list and rules above.
- [ ] **Step 4: Run tests** — `npm test` → PASS; `npm run build` → succeeds (the `satisfies` checks run here).
- [ ] **Step 5: Commit** — `git commit -m "feat(catalog): add mock products and offers"`.

---

### Task 4: Filters

**Files:**

- Create: `src/lib/catalog/filters.ts`
- Test: `src/lib/catalog/filters.test.ts`

**Interfaces:**

- Consumes: `Category`, `Product`, `Offer`, `Condition`, `RESERVED_PARAMS` (Task 2).
- Produces:

```ts
export type SortKey = "relevance" | "price-asc" | "price-desc";
export type Filters = {
  facets: Record<string, readonly SpecValue[]>; // facet key → selected values (OR within a facet)
  brands: readonly string[];
  conditions: readonly Condition[]; // [] = any
  priceMin: number | null;
  priceMax: number | null;
  sort: SortKey;
  q: string;
};
export type OfferSummary = { count: number; minPriceUzs: number };
export type ProductListing = {
  product: Product;
  new: OfferSummary | null;
  used: OfferSummary | null;
};
export type SearchParamsRecord = Record<string, string | string[] | undefined>;
export function parseFilters(
  category: Category | null,
  params: SearchParamsRecord,
): Filters;
export function filtersToSearchParams(
  filters: Filters,
  category: Category | null,
): URLSearchParams;
export function summarizeOffers(offers: readonly Offer[]): {
  new: OfferSummary | null;
  used: OfferSummary | null;
};
export function applyFilters(
  products: readonly Product[],
  offers: readonly Offer[],
  filters: Filters,
): ProductListing[];
```

URL format: facet values comma-separated under the facet key (`socket=AM5,AM4`, `cores=8`, `igpu=1`); `brand=AMD,Intel`; `condition=used`; `priceMin`, `priceMax` (integers); `sort`; `q`. Rules: unknown keys, unknown values, non-integer or negative prices, `priceMin > priceMax` (swap them), and values outside a facet's options are dropped silently; a repeated param (`string[]`) is merged. Default sort: `relevance` when `q` is non-empty, else `price-asc`. `filtersToSearchParams` emits keys in a stable order (facets in config order, then `brand, condition, priceMin, priceMax, sort, q`) and omits defaults and empty values, so equal filters produce equal URLs. Semantics (spec §12.8): AND across facets/brand, OR within one; condition and price select **offers**; a product is listed only if it has ≥ 1 matching offer; its summaries count only matching offers; price sorts use the cheapest matching offer; `relevance` keeps input order.

- [ ] **Step 1: Write the failing tests** — fixtures built inline in the test (do not import mocks): `cpu` = `cpuCategory` from config; `p1`, `p2` = minimal cpu `Product`s; `newAt(p, price)` / `usedAt(p, price)` = helpers returning an `Offer` for `p` with that condition and price.

```ts
test("parses facets, brands, condition, price", () => {
  const f = parseFilters(cpu, {
    socket: "AM5,AM4",
    cores: "8",
    igpu: "1",
    brand: "AMD",
    condition: "used",
    priceMax: "3000000",
  });
  expect(f.facets).toEqual({
    socket: ["AM5", "AM4"],
    cores: [8],
    igpu: [true],
  });
  expect(f.brands).toEqual(["AMD"]);
  expect(f.conditions).toEqual(["used"]);
  expect(f.priceMax).toBe(3_000_000);
  expect(f.sort).toBe("price-asc");
});
test("drops hostile input without throwing", () => {
  const f = parseFilters(cpu, {
    cores: "abc,8",
    socket: "NOPE",
    priceMin: "-5",
    priceMax: "1e30",
    sort: "evil",
    foo: "bar",
    condition: "broken",
  });
  expect(f.facets).toEqual({ cores: [8] });
  expect(f.priceMin).toBeNull();
  expect(f.priceMax).toBeNull();
  expect(f.sort).toBe("price-asc");
  expect(f.conditions).toEqual([]);
});
test("swaps inverted price range", () => {
  const f = parseFilters(null, { priceMin: "5000000", priceMax: "1000000" });
  expect([f.priceMin, f.priceMax]).toEqual([1_000_000, 5_000_000]);
});
test("round-trips through search params in stable order", () => {
  const f = parseFilters(cpu, { brand: "AMD", socket: "AM4,AM5", q: "x3d" });
  expect(filtersToSearchParams(f, cpu).toString()).toBe(
    "socket=AM4%2CAM5&brand=AMD&q=x3d",
  );
  expect(
    parseFilters(cpu, Object.fromEntries(filtersToSearchParams(f, cpu))),
  ).toEqual(f);
});
test("used + max 3M lists product by its used offer only (spec §12.8)", () => {
  const listings = applyFilters(
    [p1],
    [newAt(p1, 4_000_000), usedAt(p1, 2_800_000)],
    parseFilters(cpu, { condition: "used", priceMax: "3000000" }),
  );
  expect(listings).toHaveLength(1);
  expect(listings[0]!.new).toBeNull();
  expect(listings[0]!.used).toEqual({ count: 1, minPriceUzs: 2_800_000 });
});
test("product with no matching or no offers is hidden; empty result is []", () => {
  expect(applyFilters([p1], [], parseFilters(cpu, {}))).toEqual([]);
  expect(
    applyFilters(
      [p1],
      [newAt(p1, 4_000_000)],
      parseFilters(cpu, { priceMax: "1000000" }),
    ),
  ).toEqual([]);
});
test("price-desc sorts by cheapest matching offer", () => {
  const out = applyFilters(
    [p1, p2],
    [newAt(p1, 1_000_000), newAt(p2, 2_000_000)],
    parseFilters(cpu, { sort: "price-desc" }),
  );
  expect(out.map((l) => l.product.id)).toEqual([p2.id, p1.id]);
});
```

- [ ] **Step 2: Run to verify they fail** — `npm test` → FAIL.
- [ ] **Step 3: Implement `filters.ts`.**
- [ ] **Step 4: Run tests** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(catalog): add URL filters with offer-level semantics"`.

---

### Task 5: Search core

**Files:**

- Create: `src/lib/search/normalize.ts`, `src/lib/search/synonyms.ts`, `src/lib/search/parse-query.ts`, `src/lib/search/search.ts`
- Test: `src/lib/search/normalize.test.ts`, `src/lib/search/parse-query.test.ts`, `src/lib/search/search.eval.test.ts`

**Interfaces:**

- Consumes: `Category`, `Product`, `Offer`, `Condition` (Task 2); `Locale` (Task 1).
- Produces:

```ts
// normalize.ts
export function normalize(text: string): string; // matching form
export function compact(text: string): string; // normalize() without spaces
// parse-query.ts
export type ParsedQuery = {
  text: string; // normalized words left after removing recognised phrases
  categorySlug: string | null;
  condition: Condition | null;
  priceMin: number | null;
  priceMax: number | null;
};
export function parseQuery(
  raw: string,
  categories: readonly Category[],
): ParsedQuery;
// search.ts
export type SearchDoc = {
  slug: string;
  categorySlug: string;
  name: string;
  brand: string;
  keywords: string;
  minPriceUzs: number | null;
};
export function buildSearchIndex(
  products: readonly Product[],
  offers: readonly Offer[],
  categories: readonly Category[],
): SearchDoc[];
export function searchProducts(
  index: readonly SearchDoc[],
  parsed: ParsedQuery,
  limit?: number,
): SearchDoc[]; // default limit 20
export function buildSearchUrl(
  lang: Locale,
  parsed: ParsedQuery,
  hits: readonly SearchDoc[],
): string;
```

`normalize` algorithm: truncate input to 200 characters; NFKC; lowercase; delete every apostrophe-like character (`ʻ ʼ ' ‘ ’ \``); `ё→e`; insert a space at every boundary between a run of **3 or more** Cyrillic letters and a Latin letter or digit (so `rtx5070видюха`splits, but`12400ф`, `265к`, `9800х3д`stay one token); transliterate Cyrillic (Russian and Uzbek) to Latin with this table — а a, б b, в v, г g, д d, е e, ж j, з z, и i, й y, к k, л l, м m, н n, о o, п p, р r, с s, т t, у u, ф f, х x, ц ts, ч ch, ш sh, щ sh, ъ (drop), ы i, ь (drop), э e, ю yu, я ya, ў o, қ q, ғ g, ҳ h; replace`,`between digits with`.`; replace every character that is not a Latin letter, digit or `.`-between-digits with a space; collapse spaces; trim. The table only needs to be consistent: query and index pass through the same function.

`synonyms.ts`: `const termSynonyms: Record<string, readonly string[]>` mapping a canonical term to its variants (minimum: `geforce` ← `джифорс, жифорс, geforse`; `radeon` ← `радеон, redeon`; `ryzen` ← `райзен, rayzen`; `intel` ← `интел`; `nvidia` ← `нвидиа, nvidea`; `gskill` ← `g.skill, g skill, джискилл`; `x3d` ← `х3д`); `export function applyTermSynonyms(normalized: string): string` replaces whole-word variants (after normalizing the variant lists once at module load) with the canonical term. Condition lists: new ← `новый, новая, новое, новые, yangi, new`; used ← `б/у, бу, б у, бывший в употреблении, ishlatilgan, used`.

`parseQuery` algorithm, in order, on `applyTermSynonyms(normalize(raw))`. All word lists below are written naturally in the source and normalized once at module load. (1) Price. An amount is a number with optional decimal, optionally followed by a unit: `млн`, `mln`, `million` ×1 000 000; `тыс`, `ming`, `k` ×1 000. The Uzbek suffixes `dan` / `gacha` may be attached to the unit (`2 mlngacha`, `1 mlndan`). Range: `от A до B`, `A dan B gacha` → min and max; in a range, a unitless A inherits B's unit (`от 1 до 2 млн` → 1 000 000…2 000 000). Max: `до A`, `A gacha`, `дешевле A`. Min: `от A`, `A dan`, `дороже A`. A keyword-marked amount needs ≥ 1 000 after the unit is applied. An amount with a unit and no keyword is a max (`500 тыс`, `4,5 млн`). A bare number with no unit and no keyword is a price **only if ≥ 100 000**, so model numbers and specs (`9800`, `6000`, `5070`) stay in the text. (2) Condition: phrases of 1–3 words from the condition lists, longest first (`б/у` normalizes to two words, `b u`). (3) Category: a 1–3-word phrase equal to a normalized `searchSynonyms` entry, or a single word within Levenshtein distance 1 of one when the word has ≥ 6 letters; set `categorySlug` only if exactly one category matches. (4) Remove the recognised words; the rest is `text`.

`buildSearchIndex`: `name` = `applyTermSynonyms(normalize(brand + ' ' + name))`; `keywords` = the same treatment of brand, both category names, the category's synonyms, the enum option values and labels of the product's specs, and its number spec values with and without their unit (`32`, `32gb`, `6000`, `6000mts`). Index and query must go through the same functions. `searchProducts`: restrict to `categorySlug` when set; empty `text` → all docs of that category by `minPriceUzs`, or `[]` when there is no category either; otherwise Fuse.js (`ignoreLocation: true`, `includeScore: true`, keys `name` weight 3, `keywords` weight 1) run once with `text` and once with `compact(text)` against a compact copy of `name`, merged by best score. Tune the threshold until the eval passes; the eval decides. `buildSearchUrl` (spec §12.10): put `condition`, `priceMin`, `priceMax` and `q` (= `parsed.text`) into the query string; target `/{lang}/c/{slug}` if `parsed.categorySlug` is set, or if there is **at least one** hit and all `hits` share one category; else `/{lang}/search` (zero hits → `/{lang}/search`).

- [ ] **Step 1: Write failing unit tests**

```ts
// normalize.test.ts
expect(normalize("Процессор")).toBe("protsessor");
expect(normalize("Oʻzbekiston")).toBe(normalize("O'zbekiston"));
expect(normalize("o‘zu")).toBe("ozu");
expect(normalize("i5-12400F")).toBe("i5 12400f");
expect(normalize("12400ф")).toBe("12400f");
expect(normalize("4,5 млн")).toBe("4.5 mln");
expect(compact("i5 12400f")).toBe("i512400f");
expect(normalize("   ")).toBe("");
expect(normalize("!!!???")).toBe("");
expect(normalize("🔥rtx5070видюха")).toBe("rtx5070 vidyuxa");
expect(normalize("9800х3д")).toBe("9800x3d");
expect(normalize("a".repeat(5000)).length).toBeLessThanOrEqual(200);

// parse-query.test.ts
const p = (q: string) => parseQuery(q, categories);
expect(p("видеокарта б/у до 5 млн")).toMatchObject({
  categorySlug: "gpu",
  condition: "used",
  priceMax: 5_000_000,
  text: "",
});
expect(p("от 1 до 2 млн")).toMatchObject({
  priceMin: 1_000_000,
  priceMax: 2_000_000,
});
expect(p("3 mln gacha")).toMatchObject({ priceMax: 3_000_000 });
expect(p("500 тыс")).toMatchObject({ priceMax: 500_000 });
expect(p("4,5 млн")).toMatchObject({ priceMax: 4_500_000 });
expect(p("rtx 5070")).toMatchObject({ priceMax: null, text: "rtx 5070" });
expect(p("ryzen 7 9800 x3d")).toMatchObject({ priceMax: null, priceMin: null });
expect(p("kingston 6000")).toMatchObject({ priceMax: null });
expect(p("1 mlndan 2 mlngacha")).toMatchObject({
  priceMin: 1_000_000,
  priceMax: 2_000_000,
});
expect(p("rtx 4070 2500000")).toMatchObject({
  priceMax: 2_500_000,
  text: "rtx 4070",
});
expect(p("процесор")).toMatchObject({ categorySlug: "cpu" }); // typo, distance 1
expect(p("yangi ryzen 5 9600x")).toMatchObject({ condition: "new" });
expect(p("")).toEqual({
  text: "",
  categorySlug: null,
  condition: null,
  priceMin: null,
  priceMax: null,
});
```

- [ ] **Step 2: Write the search eval** (`search.eval.test.ts`, builds the index from `mockProducts`/`mockOffers`/`categories`). Each row: query → expected top-1 slug, or expected slug within top 3, or expected parse result, or expected target URL path:

| #   | Query                     | Expectation                                          |
| --- | ------------------------- | ---------------------------------------------------- |
| 1   | `9800x3d`                 | top1 `amd-ryzen-7-9800x3d`                           |
| 2   | `ryzen 7 9800 x3d`        | top1 `amd-ryzen-7-9800x3d`                           |
| 3   | `райзен 9800х3д`          | top3 `amd-ryzen-7-9800x3d`                           |
| 4   | `i5 12400f`               | top1 `intel-core-i5-12400f`                          |
| 5   | `i5-12400F`               | top1 `intel-core-i5-12400f`                          |
| 6   | `12400ф`                  | top1 `intel-core-i5-12400f`                          |
| 7   | `core ultra 7`            | top3 `intel-core-ultra-7-265k`                       |
| 8   | `интел 265к`              | top1 `intel-core-ultra-7-265k`                       |
| 9   | `rtx 5070`                | top1 `asus-dual-geforce-rtx-5070`                    |
| 10  | `ртх 5070`                | top1 `asus-dual-geforce-rtx-5070`                    |
| 11  | `джифорс 4060`            | top1 `msi-geforce-rtx-4060-ventus`                   |
| 12  | `радеон 9070 xt`          | top1 `sapphire-pulse-radeon-rx-9070-xt`              |
| 13  | `rx 7800xt`               | top1 `sapphire-pulse-radeon-rx-7800-xt`              |
| 14  | `arc b580`                | top1 `asrock-intel-arc-b580-challenger`              |
| 15  | `видюха`                  | parse `categorySlug: 'gpu'`; all hits in gpu         |
| 16  | `videokarta`              | parse `categorySlug: 'gpu'`                          |
| 17  | `видеокарта б/у до 5 млн` | parse gpu, used, max 5 000 000; URL path `/uz/c/gpu` |
| 18  | `проц`                    | parse `cpu`                                          |
| 19  | `protsessor am5`          | parse `cpu`; top3 all have socket AM5                |
| 20  | `процесор`                | parse `cpu`                                          |
| 21  | `оперативка ddr5 32`      | parse `ram`; top1 is a DDR5 32 GB kit                |
| 22  | `ozu ddr4`                | parse `ram`; top3 all DDR4                           |
| 23  | `материнка b650`          | parse `motherboard`; top1 chipset B650               |
| 24  | `ona plata am4`           | parse `motherboard`; top1 `msi-mag-b550-tomahawk`    |
| 25  | `мать z890`               | top1 `asus-prime-z890-p`                             |
| 26  | `ishlatilgan rtx 4070`    | parse used; top1 `asus-tuf-geforce-rtx-4070-super`   |
| 27  | `yangi ryzen 5 9600x`     | parse new; top1 `amd-ryzen-5-9600x`                  |
| 28  | `бу 5600x`                | parse used; top1 `amd-ryzen-5-5600x`                 |
| 29  | `kingston 6000`           | top3 `kingston-fury-beast-ddr5-32gb-6000`            |
| 30  | `g.skill trident`         | top1 `gskill-trident-z5-rgb-ddr5-32gb-6400`          |
| 31  | `джискилл ripjaws`        | top1 `gskill-ripjaws-v-ddr4-16gb-3600`               |
| 32  | `asus`                    | hits in ≥ 2 categories; URL path `/uz/search`        |
| 33  | `sapphire`                | all hits gpu; URL path `/uz/c/gpu`                   |
| 34  | `` (empty)                | no hits, no throw                                    |
| 35  | `zzzzqqqq`                | no hits; URL path `/uz/search`                       |
| 36  | `rtx5070видюха`           | parse gpu; top3 `asus-dual-geforce-rtx-5070`         |
| 37  | `a` repeated 500 times    | no throw, returns ≤ 20 hits                          |

- [ ] **Step 3: Run to verify they fail** — `npm test` → FAIL.
- [ ] **Step 4: Implement** `normalize.ts`, `synonyms.ts`, `parse-query.ts`, `search.ts` (Levenshtein: small iterative DP in `parse-query.ts`).
- [ ] **Step 5: Run until green** — `npm test` → PASS for all unit tests and all 37 eval rows. Adjust synonyms and the Fuse threshold, never the expectations; if a row looks wrong, stop and flag it in the PR instead of editing it.
- [ ] **Step 6: Commit** — `git commit -m "feat(search): add normalization, phrase parsing and search eval"`.

---

### Task 6: Data-access layer

**Files:**

- Create: `src/lib/catalog/data.ts`
- Test: `src/lib/catalog/data.test.ts`

**Interfaces:**

- Consumes: Tasks 2–5.
- Produces (all `async`, so the Prisma version keeps the same signatures; the only module importing `mock/*`):

```ts
export async function getCategories(): Promise<readonly Category[]>;
export async function getCategory(slug: string): Promise<Category | null>;
export async function getChildCategories(
  parentSlug: string | null,
): Promise<Category[]>; // null → roots
export async function getLeafCategories(): Promise<Category[]>;
export async function getBreadcrumbs(slug: string): Promise<Category[]>; // root … self; [] if unknown
export async function listProducts(
  categorySlug: string | null,
  filters: Filters,
): Promise<ProductListing[]>;
export async function getProduct(
  slug: string,
): Promise<{ product: Product; category: Category; offers: Offer[] } | null>; // offers by price asc
export async function getOffer(
  id: string,
): Promise<{ offer: Offer; product: Product } | null>;
export async function getSearchIndex(): Promise<SearchDoc[]>;
export async function getProductSlugs(): Promise<string[]>;
export async function getOfferIds(): Promise<string[]>;
export async function getCategoryBrands(slug: string): Promise<string[]>; // all brands in the category, unfiltered, sorted
export async function getPhotoCredits(): Promise<
  { product: Product; image: ProductImage }[]
>;
```

`listProducts`: products of `categorySlug` (all products when `null`); if `filters.q` is non-empty, let `parsed = parseQuery(filters.q, categories)` and keep only `searchProducts(index, { ...parsed, categorySlug: categorySlug ?? parsed.categorySlug }, 200)` hits, in hit order; then `applyFilters`. Unknown `categorySlug` → `[]`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(await getCategory("phones")).toBeNull();
expect(await getProduct("nope")).toBeNull();
expect(await getOffer("nope")).toBeNull();
expect((await getBreadcrumbs("cpu")).map((c) => c.slug)).toEqual([
  "electronics",
  "pc-components",
  "cpu",
]);
expect((await getChildCategories(null)).map((c) => c.slug)).toEqual([
  "electronics",
]);
expect((await getLeafCategories()).map((c) => c.slug).sort()).toEqual([
  "cpu",
  "gpu",
  "motherboard",
  "ram",
]);
const cpu = (await getCategory("cpu"))!;
const am4 = await listProducts("cpu", parseFilters(cpu, { socket: "AM4" }));
expect(am4.map((l) => l.product.slug).sort()).toEqual([
  "amd-ryzen-5-5600x",
  "amd-ryzen-7-5700x3d",
]);
const q = await listProducts("cpu", parseFilters(cpu, { q: "9800x3d" }));
expect(q[0]!.product.slug).toBe("amd-ryzen-7-9800x3d");
const detail = (await getProduct("amd-ryzen-7-9800x3d"))!;
const prices = detail.offers.map((o) => o.priceUzs);
expect(prices).toEqual([...prices].sort((a, b) => a - b));
expect(await listProducts("phones", parseFilters(null, {}))).toEqual([]);
expect(await getCategoryBrands("cpu")).toEqual(["AMD", "Intel"]);
expect(await getCategoryBrands("phones")).toEqual([]);
```

- [ ] **Step 2: Run to verify they fail** — `npm test` → FAIL.
- [ ] **Step 3: Implement `data.ts`.**
- [ ] **Step 4: Run tests** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(catalog): add async data-access layer"`.

---

### Task 7: App shell — proxy, root layout, theme, header, footer, home

**Files:**

- Create: `src/proxy.ts`
- Delete: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`, `src/app/[lang]/not-found.tsx`, `src/app/global-not-found.tsx`
- Modify: `next.config.ts` (`experimental: { globalNotFound: true }`, keep the existing options)
- Modify: `src/app/globals.css`
- Create: `src/lib/theme.ts`, `src/lib/i18n/alternates.ts`
- Create: `src/components/header.tsx`, `demo-banner.tsx`, `footer.tsx`, `theme-toggle.tsx` (client), `lang-switch.tsx` (client), `category-tile.tsx`
- Create: `src/lib/i18n/redirect.ts`
- Test: `src/lib/i18n/redirect.test.ts`

**Interfaces:**

- Consumes: `pickLocale`, `isLocale`, `locales`, `getDictionary` (Task 1); `getChildCategories`, `getLeafCategories`, `getSearchIndex` (Task 6).
- Produces:
  - `export function localeRedirectPath(pathname: string, search: string, cookieLang: string | undefined, acceptLanguage: string | null): string | null` in `src/lib/i18n/redirect.ts` (`null` = path already has a locale; kept out of `proxy.ts` so the test does not import `next/server`), used by `proxy(request)` in `src/proxy.ts`.
  - `export const THEME_COOKIE = 'theme'`, `export const LANG_COOKIE = 'lang'`, `export const themeInitScript: string` in `src/lib/theme.ts`.
  - `export function localeAlternates(lang: Locale, path: string): Metadata['alternates']` → `{ canonical: '/{lang}{path}', languages: { uz: '/uz{path}', ru: '/ru{path}', 'x-default': '/uz{path}' } }`; root layout sets `metadataBase` from `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`.
  - `<Header lang dict />` renders a search button with `data-search-trigger` (Task 10 attaches the dialog to it).
  - Tailwind colour utilities from tokens: `bg-bg`, `bg-surface`, `border-border`, `text-text`, `text-muted`, `bg-accent`, `text-accent`, `text-on-accent`, `text-used`, `bg-chip`.

- [ ] **Step 1: Write the failing test** (`src/lib/i18n/redirect.test.ts`)

```ts
expect(localeRedirectPath("/uz/c/cpu", "", undefined, null)).toBeNull();
expect(localeRedirectPath("/ru", "", undefined, null)).toBeNull();
expect(localeRedirectPath("/", "", undefined, "ru-RU")).toBe("/ru");
expect(localeRedirectPath("/c/cpu", "?socket=AM5", "ru", null)).toBe(
  "/ru/c/cpu?socket=AM5",
);
expect(localeRedirectPath("/de/c/cpu", "", undefined, null)).toBe(
  "/uz/de/c/cpu",
); // then 404s inside /uz
expect(localeRedirectPath("/uzbek", "", undefined, null)).toBe("/uz/uzbek"); // "uz" prefix must be a full segment
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → FAIL.
- [ ] **Step 3: Implement `src/lib/i18n/redirect.ts` and `src/proxy.ts`** — `proxy(request)` redirects (307) to `localeRedirectPath(...)` when non-null, reading cookie `LANG_COOKIE` and header `accept-language`; `config.matcher: ['/((?!_next|favicon.ico|.*\\..*).*)']`.
- [ ] **Step 4: Run test** — `npm test` → PASS.
- [ ] **Step 5: Root layout and theme.** `src/app/[lang]/layout.tsx`: `generateStaticParams()` → `locales.map((lang) => ({ lang }))`; `const l = await lang()` from `next/root-params`, `notFound()` unless `isLocale(l)`; `<html lang={l} suppressHydrationWarning>`; `<head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>`; Geist and Geist Mono with `subsets: ['latin', 'latin-ext', 'cyrillic']`; body = `DemoBanner`, `Header`, `{children}`, `Footer`. `themeInitScript` is exactly:

```js
(function () {
  try {
    var m = document.cookie.match(/(?:^|; )theme=(dark|light)/);
    var t = m
      ? m[1]
      : matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
```

`globals.css`: raw tokens on `:root, [data-theme='dark']` (dark values) and `[data-theme='light']` (light values) plus `@media (prefers-color-scheme: light) { :root:not([data-theme]) { …light… } }` for no-JS; `@theme inline` maps them to `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`, `--color-accent`, `--color-on-accent`, `--color-used`, `--color-chip`, `--font-sans`, `--font-mono`; `@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));`; the reduced-motion block and `.morph` rules from `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`; remove the template's Arial `font-family`. `ThemeToggle` flips `document.documentElement.dataset.theme` and writes `theme=<value>; path=/; max-age=31536000; samesite=lax`. `LangSwitch` links to the same path under the other locale (swap the first segment; read `location.search` at click time, so no `useSearchParams`) and writes `lang=<value>` the same way. `DemoBanner` text from the dictionary (uz: "Demo-sayt: mahsulotlar sotilmaydi, narxlar oʻylab topilgan.", ru: "Демо-сайт: товары не продаются, цены выдуманные."). `Footer` holds a small muted link to `/{lang}/credits`. Home page: big search button (also `data-search-trigger`) and leaf category tiles under their parent's name. `[lang]/not-found.tsx`: localized "page not found" with a link home (shown for `notFound()` calls). `app/global-not-found.tsx` (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`): the root layout sits under a dynamic segment, so URLs matching no route render this file without any layout. It imports `globals.css` and the fonts itself, runs `themeInitScript`, and shows the message in both languages with links to `/uz` and `/ru`. Every page in this and later tasks exports `generateMetadata` with a localized `title` and `alternates: localeAlternates(lang, path)`.

- [ ] **Step 6: Verify** — `npm run lint && npm run build` → success; build output lists `/uz` and `/ru` as prerendered. `npm run dev`, open `http://localhost:3000/` → redirects to `/uz`; reload with each theme → no flash; toggle the language → same page in Russian.
- [ ] **Step 7: Commit** — `git commit -m "feat(app): add locale proxy, root layout, theme and shell"`.

---

### Task 8: Catalog page

**Files:**

- Create: `src/app/[lang]/c/[category]/page.tsx`
- Create: `src/components/product-card.tsx`, `src/components/filter-panel.tsx` (client), `src/components/sort-select.tsx` (client), `src/components/breadcrumbs.tsx`, `src/components/empty-state.tsx`
- Modify: dictionaries (catalog keys in both files)

**Interfaces:**

- Consumes: `getCategory`, `getChildCategories`, `getBreadcrumbs`, `listProducts`, `getCategories`, `getCategoryBrands` (Task 6); `parseFilters`, `filtersToSearchParams`, `ProductListing` (Task 4); `formatPrice`, `pluralize` (Task 1).
- Produces: `<ProductCard lang listing category dict />` (reused by Task 10); the image wrapper `<ViewTransition name={`product-image-${slug}`} share="morph" default="none">` (Task 9 uses the same name).

- [ ] **Step 1: Page** — `generateStaticParams` returns every category slug (one entry per slug; the root layout supplies `lang`). Unknown slug → `notFound()`. A parent category renders breadcrumbs and child tiles. A leaf renders breadcrumbs, title and, inside `<Suspense fallback={<GridSkeleton />}>`, an async component that awaits `searchParams`, calls `parseFilters` and `listProducts`, and renders `FilterPanel`, `SortSelect`, the result count via `pluralize`, and the grid.
- [ ] **Step 2: FilterPanel** (client) — from `category.facets` only (no slug checks): enum and number facets as checkbox groups (number labels with `unit`), boolean as one checkbox, plus brand (options from `getCategoryBrands(slug)`, passed as a prop — never from the filtered listings, or ticking one brand would hide the others), condition (new/used) and price min/max inputs (submit on blur or Enter). Every change builds the URL with `filtersToSearchParams` and calls `router.replace(url, { scroll: false })`. At widths below `md` the panel lives in a native `<dialog>` opened by a "Filters (n)" button.
- [ ] **Step 3: ProductCard** — category placeholder icon when `image` is null (`next/image` with `unoptimized` for SVG), brand + name, chips for `category.cardFacets` (monospace, `bg-chip`), the "Новый · N · от X" line in `text-accent` and the "Б/у · N · от Y" line in `text-used` only when the summary is non-null, and a link to `/{lang}/p/{slug}` labelled "Сравнить предложения" / "Takliflarni solishtirish". Wrap each card in `<ViewTransition name={`card-${slug}`} update="auto" enter="auto" exit="auto" default="none">` so the grid reflows smoothly when filters change.
- [ ] **Step 4: Empty state** — zero listings → message plus a link to `/{lang}/c/{slug}` (no params) labelled "Сбросить фильтры" / "Filtrlarni tozalash".
- [ ] **Step 5: Verify** — `npm run build` succeeds with `/uz/c/cpu` etc. prerendered with a streamed listing; in `npm run dev`: `/uz/c/cpu?socket=AM4` shows exactly the 2 AM4 CPUs; `?cores=abc&priceMin=-5` renders all CPUs; `?priceMax=1` shows the empty state; `/uz/c/phones` → 404; `/uz/c/pc-components` shows 4 tiles; at 375 px width there is no horizontal scroll and the filter dialog opens and closes with `Esc`.
- [ ] **Step 6: Commit** — `git commit -m "feat(app): add catalog page with facet filters"`.

---

### Task 9: Product page, seller stub and credits

**Files:**

- Create: `src/app/[lang]/p/[slug]/page.tsx`, `src/app/[lang]/go/[offerId]/page.tsx`, `src/app/[lang]/credits/page.tsx`
- Create: `src/components/offer-list.tsx`, `src/components/spec-table.tsx`
- Modify: dictionaries

**Interfaces:**

- Consumes: `getProduct`, `getProductSlugs`, `getOffer`, `getOfferIds`, `getPhotoCredits`, `getBreadcrumbs` (Task 6); `ProductCard`'s image `ViewTransition` name (Task 8).

- [ ] **Step 1: Product page** — `generateStaticParams` from `getProductSlugs()`; unknown slug → `notFound()`. Image in the same `<ViewTransition name={`product-image-${slug}`} share="morph" default="none">` as the card. `SpecTable` lists every facet of the category with localized label and value (boolean → yes/no, number → value + unit). `OfferList` shows all offers sorted by price: source-type badge ("Магазин" / "Doʻkon", "Telegram", "Объявление" / "Eʼlon"), seller name, condition (used in `text-used`), `formatPrice`, city, the fixed `updatedAt` date via `Intl.DateTimeFormat(lang)`, and a "Перейти к продавцу" / "Sotuvchiga oʻtish" link to `/{lang}/go/{offer.id}`. No offers → "Предложений пока нет" / "Hozircha takliflar yoʻq". Do not call `Date.now()` or `new Date()` in server components (no "N days ago" labels): Cache Components fails the prerender on current-time reads.
- [ ] **Step 2: Seller stub** — `generateStaticParams` from `getOfferIds()`; unknown → `notFound()`; text exactly ru «Это демо: здесь будет переход к объявлению у продавца», uz «Bu demo: bu yerda sotuvchining eʼloniga oʻtiladi»; back link to the product.
- [ ] **Step 3: Credits page** — each `getPhotoCredits()` entry: product name, author, license linked to `licenseUrl`, source link. Empty → ru «Пока все изображения — собственные иллюстрации Mergo.», uz «Hozircha barcha rasmlar — Mergoning oʻz chizmalari.»
- [ ] **Step 4: Verify** — `npm run build` → product, go and credits routes prerendered for both locales; in dev: clicking a card on `/uz/c/gpu` morphs the image into the product page in Chrome; `/uz/p/nope` and `/uz/go/nope` → 404.
- [ ] **Step 5: Commit** — `git commit -m "feat(app): add product page, seller stub and photo credits"`.

---

### Task 10: Ctrl+K search dialog and search page

**Files:**

- Create: `src/components/search-dialog.tsx` (client), `src/app/[lang]/search/page.tsx`, `src/components/query-chips.tsx`
- Modify: `src/app/[lang]/layout.tsx` (mount `SearchDialog`), dictionaries

**Interfaces:**

- Consumes: `getSearchIndex`, `getCategories`, `listProducts` (Task 6); `parseQuery`, `searchProducts`, `buildSearchUrl`, `SearchDoc` (Task 5); `ProductCard` (Task 8); `parseFilters` (Task 4).
- Produces: `<SearchDialog lang index categories dict />` where `categories` is `{ slug: string; name: Localized }[]`.

- [ ] **Step 1: SearchDialog** — native `<dialog>` opened with `showModal()` on `Ctrl+K` / `⌘K` (call `preventDefault`) and on click of any `[data-search-trigger]`; `Esc` closes (native). Input autofocused. On each input: `parseQuery` → `searchProducts(index, parsed, 8)`; render recognised parts as removable chips (category name, condition, price via `formatPrice`) above the results; a removed chip sets that part of `parsed` to `null` for this query. Results show name, category name and "от X" when `minPriceUzs` exists, each linking to `/{lang}/p/{slug}`; arrow keys move the selection; `Enter` on a selected result opens it; `Enter` with no selection navigates to `buildSearchUrl(lang, parsed, hits)`.
- [ ] **Step 2: Search page** — inside `<Suspense>`: await `searchParams`, `parseFilters(null, params)`, `listProducts(null, filters)`; `QueryChips` renders each active `condition`, `priceMin`, `priceMax` and `q` as a link to the same URL without that param; grid of `ProductCard` (each card gets its own category from `getCategories()`); empty state as in Task 8.
- [ ] **Step 3: Verify** — in dev: `Ctrl+K`, type `видюха б/у до 5 млн` → chips "Видеокарты", "Б/у", "до 5 000 000 сум", Enter → `/ru/c/gpu?condition=used&priceMax=5000000`; type `asus`, Enter → `/ru/search?q=asus` with GPUs and motherboards; Tab and Shift+Tab stay inside the dialog; `npm run build` succeeds.
- [ ] **Step 4: Commit** — `git commit -m "feat(search): add Ctrl+K dialog and search page"`.

---

### Task 11: Polish, accessibility and docs

**Files:**

- Modify: components as needed for the findings; `README.md` (stack line: add Fuse.js, Vitest; scripts table: add `npm test`; a short "Mergo" description and the demo notice)

- [ ] **Step 1: Accessibility review** — run the `design:accessibility-review` skill on the running dev site (catalog, product page, search dialog, both themes); fix every issue it rates serious or critical.
- [ ] **Step 2: Manual checklist (spec §10)** — both locales on every page; both themes without flash after a hard reload; `prefers-reduced-motion: reduce` (DevTools rendering panel) disables transitions; card → product morph in Chromium; 375 px width without horizontal scroll on every page; keyboard-only path: open search, pick a result, go to a seller stub.
- [ ] **Step 3: Full verification** — `npm run format:check && npm run lint && npm test && npx prisma validate && npm run build` → all succeed.
- [ ] **Step 4: Commit and PR** — commit, push `feat/mergo-catalog-stage1`, `gh pr create`; wait for `ci` and CodeQL to pass.

---

### Task 12 (optional, can run any time after Task 9): Real photos

**Files:**

- Create: `public/products/<slug>.jpg` (≤ 200 KB, ≤ 1200 px wide)
- Modify: `src/lib/catalog/mock/products.ts` (`image` field)

- [ ] **Step 1:** For each product, search Wikimedia Commons, then Flickr filtered to CC0 / CC BY / CC BY-SA, for a photo of **exactly** that model. Record author, license, license URL and source page URL from the file's own page. No exact match → leave `image: null`.
- [ ] **Step 2:** `npm test` (mock tests still pass) and `npm run build`; open `/uz/credits` and check every entry links to its source.
- [ ] **Step 3: Commit** — `git commit -m "feat(catalog): add freely licensed product photos"`.
