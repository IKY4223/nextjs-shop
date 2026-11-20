import type { Locale } from "./locales";
import type uzJson from "./dictionaries/uz.json";
import ruJson from "./dictionaries/ru.json";

/** uz.json is the reference shape; every other locale must have the same keys. */
export type Dictionary = typeof uzJson;

// Compile-time key parity: `next build` fails here if ru.json misses a key from uz.json.
const ruParity: Dictionary = ruJson;
void ruParity;

const loaders: Readonly<Record<Locale, () => Promise<Dictionary>>> = {
  uz: async () => (await import("./dictionaries/uz.json")).default,
  ru: async () => (await import("./dictionaries/ru.json")).default,
};

export async function getDictionary(lang: Locale): Promise<Dictionary> {
  return loaders[lang]();
}
