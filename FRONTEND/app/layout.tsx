import type { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "CASEINTEL - Legal DMS & AI Intelligence",
  description:
    "Secure Legal Document Management System with Indic OCR, Multi-lingual Translation, and Case Investigation Knowledge Graph",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-gray-50 text-gray-900 antialiased font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
