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
  X,
  Shield,
  User,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

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
  {
    name: "My Profile",
    icon: User,
    href: "/profile",
  },
];

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <>
      <div>
        {/* Brand Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs tracking-wider shadow-xs">
              CI
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-slate-900">CaseIntel</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200/60">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-tight">
                Investigation Intelligence
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Section Label */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Investigation Suite
        </p>

        {/* Navigation Items */}
        <nav className="space-y-1">
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
                onClick={() => onClose?.()}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status & Links */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
          <Link href="/privacy" onClick={() => onClose?.()} className="hover:text-slate-900 hover:underline transition">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/terms" onClick={() => onClose?.()} className="hover:text-slate-900 hover:underline transition">
            Terms
          </Link>
          <span>·</span>
          <Link href="/login" onClick={() => onClose?.()} className="hover:text-slate-900 hover:underline transition">
            Switch ID
          </Link>
        </div>

        {/* System Integrity Badge */}
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 flex items-center gap-1.5 font-medium text-[11px]">
              <Cpu size={13} className="text-emerald-600" /> AI OCR Pipeline
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Ready
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Envelope Vault</span>
            <span className="font-mono text-slate-700 font-medium">AES-256</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 min-h-screen border-r border-slate-200/80 bg-white p-5 flex-col justify-between shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />

          {/* Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full p-5 flex flex-col justify-between shadow-xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}