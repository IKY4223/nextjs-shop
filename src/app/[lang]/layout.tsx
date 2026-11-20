import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { DemoBanner } from "@/components/demo-banner";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { fontVariables } from "@/lib/fonts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, locales } from "@/lib/i18n/locales";
import { themeInitScript } from "@/lib/theme";
import "../globals.css";

const DEFAULT_SITE_URL = "http://localhost:3000";

export async function generateStaticParams(): Promise<{ lang: string }[]> {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await rootLang();
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL),
    title: {
      default: dict.meta.siteName,
      template: `%s — ${dict.meta.siteName}`,
    },
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: LayoutProps<"/[lang]">): Promise<React.JSX.Element> {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  // suppressHydrationWarning: themeInitScript sets data-theme on <html> before React hydrates
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg font-sans text-text">
        <DemoBanner text={dict.demo.banner} />
        <Header lang={lang} dict={dict} />
        <main className="flex-1">{children}</main>
        <Footer lang={lang} dict={dict} />
      </body>
    </html>
  );
}
