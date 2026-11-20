/* eslint-disable ts-patterns/no-magic-numbers -- mock catalog: spec values are data, checked against the facet config */
import {
  cpuCategory,
  gpuCategory,
  motherboardCategory,
  ramCategory,
} from "../categories";
import type { Product, SpecsFor } from "../types";

type CpuSpecs = SpecsFor<typeof cpuCategory.facets>;
type GpuSpecs = SpecsFor<typeof gpuCategory.facets>;
type MotherboardSpecs = SpecsFor<typeof motherboardCategory.facets>;
type RamSpecs = SpecsFor<typeof ramCategory.facets>;

/** Builds a product of one category; `specs` is type-checked against that category's facets. */
function productOf<TSpecs extends Product["specs"]>(categorySlug: string) {
  return (
    slug: string,
    brand: string,
    name: string,
    specs: TSpecs,
  ): Product => ({
    id: slug,
    slug,
    categorySlug,
    brand,
    name,
    specs,
    image: null,
  });
}

const cpu = productOf<CpuSpecs>(cpuCategory.slug);
const gpu = productOf<GpuSpecs>(gpuCategory.slug);
const board = productOf<MotherboardSpecs>(motherboardCategory.slug);
const ram = productOf<RamSpecs>(ramCategory.slug);

/** Stage-1 catalog: real model names, invented offers (see ./offers.ts). */
export const mockProducts: readonly Product[] = [
  // CPUs
  cpu("amd-ryzen-7-9800x3d", "AMD", "Ryzen 7 9800X3D", {
    socket: "AM5",
    series: "ryzen-9000",
    cores: 8,
    igpu: true,
  }),
  cpu("amd-ryzen-9-9950x", "AMD", "Ryzen 9 9950X", {
    socket: "AM5",
    series: "ryzen-9000",
    cores: 16,
    igpu: true,
  }),
  cpu("amd-ryzen-5-9600x", "AMD", "Ryzen 5 9600X", {
    socket: "AM5",
    series: "ryzen-9000",
    cores: 6,
    igpu: true,
  }),
  cpu("amd-ryzen-7-7800x3d", "AMD", "Ryzen 7 7800X3D", {
    socket: "AM5",
    series: "ryzen-7000",
    cores: 8,
    igpu: true,
  }),
  cpu("amd-ryzen-5-7600", "AMD", "Ryzen 5 7600", {
    socket: "AM5",
    series: "ryzen-7000",
    cores: 6,
    igpu: true,
  }),
  cpu("amd-ryzen-5-5600x", "AMD", "Ryzen 5 5600X", {
    socket: "AM4",
    series: "ryzen-5000",
    cores: 6,
    igpu: false,
  }),
  cpu("amd-ryzen-7-5700x3d", "AMD", "Ryzen 7 5700X3D", {
    socket: "AM4",
    series: "ryzen-5000",
    cores: 8,
    igpu: false,
  }),
  cpu("intel-core-ultra-7-265k", "Intel", "Core Ultra 7 265K", {
    socket: "LGA1851",
    series: "core-ultra-200s",
    cores: 20,
    igpu: true,
  }),
  cpu("intel-core-ultra-5-245k", "Intel", "Core Ultra 5 245K", {
    socket: "LGA1851",
    series: "core-ultra-200s",
    cores: 14,
    igpu: true,
  }),
  cpu("intel-core-i5-14600kf", "Intel", "Core i5-14600KF", {
    socket: "LGA1700",
    series: "core-14",
    cores: 14,
    igpu: false,
  }),
  cpu("intel-core-i5-12400f", "Intel", "Core i5-12400F", {
    socket: "LGA1700",
    series: "core-12",
    cores: 6,
    igpu: false,
  }),

  // GPUs (brand = board partner; gpuVendor = chip maker)
  gpu("asus-dual-geforce-rtx-5070", "ASUS", "Dual GeForce RTX 5070 12GB", {
    gpuVendor: "NVIDIA",
    series: "rtx-50",
    vram: 12,
  }),
  gpu(
    "msi-geforce-rtx-5080-gaming-trio",
    "MSI",
    "GeForce RTX 5080 Gaming Trio OC 16GB",
    { gpuVendor: "NVIDIA", series: "rtx-50", vram: 16 },
  ),
  gpu(
    "gigabyte-geforce-rtx-5060-ti-windforce",
    "Gigabyte",
    "GeForce RTX 5060 Ti Windforce 16GB",
    { gpuVendor: "NVIDIA", series: "rtx-50", vram: 16 },
  ),
  gpu(
    "asus-tuf-geforce-rtx-4070-super",
    "ASUS",
    "TUF Gaming GeForce RTX 4070 Super 12GB",
    { gpuVendor: "NVIDIA", series: "rtx-40", vram: 12 },
  ),
  gpu("msi-geforce-rtx-4060-ventus", "MSI", "GeForce RTX 4060 Ventus 2X 8GB", {
    gpuVendor: "NVIDIA",
    series: "rtx-40",
    vram: 8,
  }),
  gpu(
    "sapphire-pulse-radeon-rx-9070-xt",
    "Sapphire",
    "Pulse Radeon RX 9070 XT 16GB",
    { gpuVendor: "AMD", series: "rx-9000", vram: 16 },
  ),
  gpu(
    "powercolor-hellhound-radeon-rx-9060-xt",
    "PowerColor",
    "Hellhound Radeon RX 9060 XT 16GB",
    { gpuVendor: "AMD", series: "rx-9000", vram: 16 },
  ),
  gpu(
    "sapphire-pulse-radeon-rx-7800-xt",
    "Sapphire",
    "Pulse Radeon RX 7800 XT 16GB",
    { gpuVendor: "AMD", series: "rx-7000", vram: 16 },
  ),
  gpu(
    "xfx-speedster-radeon-rx-7600",
    "XFX",
    "Speedster SWFT 210 Radeon RX 7600 8GB",
    { gpuVendor: "AMD", series: "rx-7000", vram: 8 },
  ),
  gpu(
    "asrock-intel-arc-b580-challenger",
    "ASRock",
    "Intel Arc B580 Challenger OC 12GB",
    { gpuVendor: "Intel", series: "arc", vram: 12 },
  ),

  // Motherboards
  board("asus-tuf-gaming-b650-plus-wifi", "ASUS", "TUF Gaming B650-Plus WiFi", {
    socket: "AM5",
    chipset: "B650",
    formFactor: "atx",
    memoryType: "DDR5",
  }),
  board("msi-mag-x870-tomahawk-wifi", "MSI", "MAG X870 Tomahawk WiFi", {
    socket: "AM5",
    chipset: "X870",
    formFactor: "atx",
    memoryType: "DDR5",
  }),
  board("gigabyte-b650m-aorus-elite-ax", "Gigabyte", "B650M Aorus Elite AX", {
    socket: "AM5",
    chipset: "B650",
    formFactor: "micro-atx",
    memoryType: "DDR5",
  }),
  board("asrock-b650i-lightning-wifi", "ASRock", "B650I Lightning WiFi", {
    socket: "AM5",
    chipset: "B650",
    formFactor: "mini-itx",
    memoryType: "DDR5",
  }),
  board("msi-mag-b550-tomahawk", "MSI", "MAG B550 Tomahawk", {
    socket: "AM4",
    chipset: "B550",
    formFactor: "atx",
    memoryType: "DDR4",
  }),
  board("asus-prime-z890-p", "ASUS", "Prime Z890-P", {
    socket: "LGA1851",
    chipset: "Z890",
    formFactor: "atx",
    memoryType: "DDR5",
  }),
  board("gigabyte-b860m-ds3h", "Gigabyte", "B860M DS3H", {
    socket: "LGA1851",
    chipset: "B860",
    formFactor: "micro-atx",
    memoryType: "DDR5",
  }),
  board("msi-pro-b760m-a-ddr4", "MSI", "PRO B760M-A DDR4", {
    socket: "LGA1700",
    chipset: "B760",
    formFactor: "micro-atx",
    memoryType: "DDR4",
  }),
  board("asus-rog-strix-z790-e", "ASUS", "ROG Strix Z790-E Gaming WiFi", {
    socket: "LGA1700",
    chipset: "Z790",
    formFactor: "atx",
    memoryType: "DDR5",
  }),

  // RAM kits
  ram(
    "kingston-fury-beast-ddr5-32gb-6000",
    "Kingston",
    "Fury Beast DDR5 32GB (2×16) 6000",
    { memoryType: "DDR5", capacity: 32, speed: 6000, modules: 2 },
  ),
  ram(
    "gskill-trident-z5-rgb-ddr5-32gb-6400",
    "G.Skill",
    "Trident Z5 RGB DDR5 32GB (2×16) 6400",
    { memoryType: "DDR5", capacity: 32, speed: 6400, modules: 2 },
  ),
  ram(
    "corsair-vengeance-ddr5-64gb-6000",
    "Corsair",
    "Vengeance DDR5 64GB (2×32) 6000",
    { memoryType: "DDR5", capacity: 64, speed: 6000, modules: 2 },
  ),
  ram(
    "kingston-fury-beast-ddr5-16gb-5600",
    "Kingston",
    "Fury Beast DDR5 16GB 5600",
    { memoryType: "DDR5", capacity: 16, speed: 5600, modules: 1 },
  ),
  ram(
    "teamgroup-t-force-delta-ddr5-32gb-6000",
    "TeamGroup",
    "T-Force Delta RGB DDR5 32GB (2×16) 6000",
    { memoryType: "DDR5", capacity: 32, speed: 6000, modules: 2 },
  ),
  ram(
    "corsair-vengeance-lpx-ddr4-16gb-3200",
    "Corsair",
    "Vengeance LPX DDR4 16GB (2×8) 3200",
    { memoryType: "DDR4", capacity: 16, speed: 3200, modules: 2 },
  ),
  ram(
    "kingston-fury-beast-ddr4-32gb-3600",
    "Kingston",
    "Fury Beast DDR4 32GB (2×16) 3600",
    { memoryType: "DDR4", capacity: 32, speed: 3600, modules: 2 },
  ),
  ram(
    "gskill-ripjaws-v-ddr4-16gb-3600",
    "G.Skill",
    "Ripjaws V DDR4 16GB (2×8) 3600",
    { memoryType: "DDR4", capacity: 16, speed: 3600, modules: 2 },
  ),
  ram("crucial-pro-ddr5-96gb-5600", "Crucial", "Pro DDR5 96GB (2×48) 5600", {
    memoryType: "DDR5",
    capacity: 96,
    speed: 5600,
    modules: 2,
  }),
];
