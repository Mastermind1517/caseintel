import type { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
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
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Topbar />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
