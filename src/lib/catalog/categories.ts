import type { Localized } from "@/lib/i18n/locales";
import type { Category } from "./types";

/** URL params used by common filters; a facet key must never take one of these names. */
export const RESERVED_PARAMS = [
  "brand",
  "condition",
  "priceMin",
  "priceMax",
  "sort",
  "q",
] as const;

const same = (text: string): Localized => ({ uz: text, ru: text });

const GB: Localized = { uz: "GB", ru: "ГБ" };
const MTS: Localized = same("MT/s");

/* eslint-disable ts-patterns/no-magic-numbers -- facet option values are data, not logic */
// Facet option values (the only selectable values; mocks are type-checked against them).
const CPU_CORE_COUNTS = [6, 8, 14, 16, 20] as const;
const GPU_VRAM_GB = [8, 12, 16] as const;
const RAM_KIT_CAPACITY_GB = [16, 32, 64, 96] as const;
const RAM_SPEED_MTS = [3200, 3600, 5600, 6000, 6400] as const;
const RAM_MODULE_COUNTS = [1, 2] as const;
/* eslint-enable ts-patterns/no-magic-numbers */

const socketFacet = {
  key: "socket",
  label: { uz: "Soket", ru: "Сокет" },
  type: "enum",
  options: [
    { value: "AM5" },
    { value: "AM4" },
    { value: "LGA1851" },
    { value: "LGA1700" },
  ],
} as const;

const memoryTypeFacet = {
  key: "memoryType",
  label: { uz: "Xotira turi", ru: "Тип памяти" },
  type: "enum",
  options: [{ value: "DDR4" }, { value: "DDR5" }],
} as const;

export const electronicsCategory = {
  slug: "electronics",
  name: { uz: "Texnika", ru: "Техника" },
  parentSlug: null,
  icon: "/categories/electronics.svg",
  facets: [],
  cardFacets: [],
  searchSynonyms: ["техника", "texnika", "электроника", "elektronika"],
} as const satisfies Category;

export const pcComponentsCategory = {
  slug: "pc-components",
  name: { uz: "Butlovchi qismlar", ru: "Комплектующие" },
  parentSlug: "electronics",
  icon: "/categories/pc-components.svg",
  facets: [],
  cardFacets: [],
  searchSynonyms: ["комплектующие", "butlovchi qismlar", "pc components"],
} as const satisfies Category;

export const cpuCategory = {
  slug: "cpu",
  name: { uz: "Protsessorlar", ru: "Процессоры" },
  parentSlug: "pc-components",
  icon: "/categories/cpu.svg",
  facets: [
    socketFacet,
    {
      key: "series",
      label: { uz: "Avlod / seriya", ru: "Поколение / серия" },
      type: "enum",
      options: [
        { value: "ryzen-9000", label: same("Ryzen 9000") },
        { value: "ryzen-7000", label: same("Ryzen 7000") },
        { value: "ryzen-5000", label: same("Ryzen 5000") },
        { value: "core-ultra-200s", label: same("Core Ultra 200S") },
        {
          value: "core-14",
          label: { uz: "Core 14-avlod", ru: "Core 14-го поколения" },
        },
        {
          value: "core-12",
          label: { uz: "Core 12-avlod", ru: "Core 12-го поколения" },
        },
      ],
    },
    {
      key: "cores",
      label: { uz: "Yadrolar soni", ru: "Количество ядер" },
      type: "number",
      options: CPU_CORE_COUNTS,
    },
    {
      key: "igpu",
      label: { uz: "O\u02BBrnatilgan grafika", ru: "Встроенная графика" },
      type: "boolean",
    },
  ],
  cardFacets: ["socket", "cores"],
  searchSynonyms: ["процессор", "проц", "protsessor", "cpu", "processor"],
} as const satisfies Category;

export const gpuCategory = {
  slug: "gpu",
  name: { uz: "Videokartalar", ru: "Видеокарты" },
  parentSlug: "pc-components",
  icon: "/categories/gpu.svg",
  facets: [
    {
      key: "gpuVendor",
      label: { uz: "GPU ishlab chiqaruvchisi", ru: "Производитель GPU" },
      type: "enum",
      options: [{ value: "NVIDIA" }, { value: "AMD" }, { value: "Intel" }],
    },
    {
      key: "series",
      label: { uz: "Seriya", ru: "Серия" },
      type: "enum",
      options: [
        { value: "rtx-50", label: same("GeForce RTX 50") },
        { value: "rtx-40", label: same("GeForce RTX 40") },
        { value: "rx-9000", label: same("Radeon RX 9000") },
        { value: "rx-7000", label: same("Radeon RX 7000") },
        { value: "arc", label: same("Arc") },
      ],
    },
    {
      key: "vram",
      label: { uz: "Video xotira", ru: "Видеопамять" },
      type: "number",
      unit: GB,
      options: GPU_VRAM_GB,
    },
  ],
  cardFacets: ["series", "vram"],
  searchSynonyms: ["видеокарта", "видюха", "videokarta", "gpu", "видео карта"],
} as const satisfies Category;

export const motherboardCategory = {
  slug: "motherboard",
  name: { uz: "Ona platalar", ru: "Материнские платы" },
  parentSlug: "pc-components",
  icon: "/categories/motherboard.svg",
  facets: [
    socketFacet,
    {
      key: "chipset",
      label: { uz: "Chipset", ru: "Чипсет" },
      type: "enum",
      options: [
        { value: "B650" },
        { value: "X870" },
        { value: "B550" },
        { value: "Z890" },
        { value: "B860" },
        { value: "B760" },
        { value: "Z790" },
      ],
    },
    {
      key: "formFactor",
      label: { uz: "Form-faktor", ru: "Форм-фактор" },
      type: "enum",
      options: [
        { value: "atx", label: same("ATX") },
        { value: "micro-atx", label: same("Micro-ATX") },
        { value: "mini-itx", label: same("Mini-ITX") },
      ],
    },
    memoryTypeFacet,
  ],
  cardFacets: ["socket", "chipset", "formFactor"],
  searchSynonyms: [
    "материнская плата",
    "материнка",
    "мать",
    "ona plata",
    "motherboard",
    "mat plata",
  ],
} as const satisfies Category;

export const ramCategory = {
  slug: "ram",
  name: { uz: "Operativ xotira", ru: "Оперативная память" },
  parentSlug: "pc-components",
  icon: "/categories/ram.svg",
  facets: [
    memoryTypeFacet,
    {
      key: "capacity",
      label: { uz: "To\u02BBplam hajmi", ru: "Объём комплекта" },
      type: "number",
      unit: GB,
      options: RAM_KIT_CAPACITY_GB,
    },
    {
      key: "speed",
      label: { uz: "Chastota", ru: "Частота" },
      type: "number",
      unit: MTS,
      options: RAM_SPEED_MTS,
    },
    {
      key: "modules",
      label: { uz: "Modullar soni", ru: "Количество модулей" },
      type: "number",
      options: RAM_MODULE_COUNTS,
    },
  ],
  cardFacets: ["memoryType", "capacity", "speed"],
  searchSynonyms: [
    "оперативная память",
    "оперативка",
    "озу",
    "ozu",
    "ram",
    "operativ xotira",
  ],
} as const satisfies Category;

/** All categories, parents first. The only list components iterate; no component branches on a slug. */
export const categories: readonly Category[] = [
  electronicsCategory,
  pcComponentsCategory,
  cpuCategory,
  gpuCategory,
  motherboardCategory,
  ramCategory,
];
