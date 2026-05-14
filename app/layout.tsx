import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Graduation Gown Rental Manager",
  description: "Orders, payments, weekly settlement and inventory.",
  icons: {
    icon: "/icon.svg"
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
