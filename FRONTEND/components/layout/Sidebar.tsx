"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  ShieldCheck,
  Clock3,
  Network,
  ClipboardList,
  Cpu,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    name: "Cases",
    icon: FolderOpen,
    href: "/cases",
  },
  {
    name: "Documents",
    icon: FileText,
    href: "/documents",
  },
  {
    name: "Verification",
    icon: ShieldCheck,
    href: "/verification",
  },
  {
    name: "Timeline",
    icon: Clock3,
    href: "/timeline",
  },
  {
    name: "Connections",
    icon: Network,
    href: "/connections",
  },
  {
    name: "Audit Logs",
    icon: ClipboardList,
    href: "/audit",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r bg-white p-5 flex flex-col justify-between shrink-0">
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm">
              CI
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CASEINTEL</h1>
              <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
                Legal DMS & AI Suite
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-3.5 rounded-xl bg-gray-50 border text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1.5 font-medium">
            <Cpu size={14} className="text-green-600" /> AI OCR Engine
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
            Active
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>KMS Vault</span>
          <span className="text-gray-600 font-mono">AES-256</span>
        </div>
      </div>
    </aside>
  );
}