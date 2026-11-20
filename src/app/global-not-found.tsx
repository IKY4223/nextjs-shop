import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "@/lib/fonts";
import ruJson from "@/lib/i18n/dictionaries/ru.json";
import uzJson from "@/lib/i18n/dictionaries/uz.json";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: `${uzJson.notFound.title} / ${ruJson.notFound.title}`,
};

/**
 * URLs that match no route at all. It renders without any layout (the root layout sits under
 * app/[lang]), so it brings its own styles, fonts and theme script, and speaks both languages.
 */
export default function GlobalNotFound(): React.JSX.Element {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${fontVariables} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full items-center justify-center bg-bg font-sans text-text">
        <div className="grid gap-10 px-4 py-24 text-center sm:grid-cols-2">
          <section lang="uz">
            <h1 className="text-2xl font-bold">{uzJson.notFound.title}</h1>
            <p className="mt-3 text-muted">{uzJson.notFound.text}</p>
            <Link
              href="/uz"
              className="mt-6 inline-block text-accent underline"
            >
              {uzJson.notFound.home}
            </Link>
          </section>
          <section lang="ru">
            <h1 className="text-2xl font-bold">{ruJson.notFound.title}</h1>
            <p className="mt-3 text-muted">{ruJson.notFound.text}</p>
            <Link
              href="/ru"
              className="mt-6 inline-block text-accent underline"
            >
              {ruJson.notFound.home}
            </Link>
          </section>
        </div>
      </body>
    </html>
  );
}
