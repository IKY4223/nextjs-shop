import { Geist, Geist_Mono } from "next/font/google";

// latin-ext + cyrillic: Uzbek oʻ/gʻ and Russian text render in the same face as the Latin UI
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
