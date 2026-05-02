import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { I18nProvider, type Language } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.eduh.app"),
  title: "Eduh",
  description: "Estude menos. Estude melhor. Com IA.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getInitialLanguage();

  return (
    <html lang={language}>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <I18nProvider initialLanguage={language}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

async function getInitialLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return cookieStore.get("eduh_language")?.value === "en" ? "en" : "pt-BR";
}
