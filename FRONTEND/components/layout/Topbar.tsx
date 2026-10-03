"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Shield, LogOut, Menu } from "lucide-react";

interface TopbarProps {
  onOpenSidebar?: () => void;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const [user, setUser] = useState<any>({
    name: "Inspector Rajesh Verma",
    username: "investigator",
    role: "INVESTIGATOR",
    department: "Cyber Crime",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("caseintel_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("caseintel_token");
    localStorage.removeItem("caseintel_user");
    window.location.href = "/login";
  };

  const isAdmin = (user.role || "").toUpperCase() === "ADMIN";
  const userInitials = (user.name || user.username || "IV")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white flex items-center justify-between px-4 sm:px-8 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Toggle */}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={19} />
          </button>
        )}

        {/* Global Evidence Search Bar */}
        <div className="hidden sm:flex items-center gap-2 border border-slate-200/80 rounded-lg px-3 py-1.5 w-60 md:w-80 bg-slate-50/50 focus-within:bg-white focus-within:border-slate-400 transition-colors">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search cases, dossiers, SHA-256..."
            className="outline-none text-xs w-full placeholder:text-slate-400 bg-transparent text-slate-800"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase border ${
            isAdmin
              ? "bg-purple-50 text-purple-700 border-purple-200/70"
              : "bg-indigo-50 text-indigo-700 border-indigo-200/70"
          }`}
        >
          <Shield size={11} />
          {user.role || "INVESTIGATOR"}
        </span>

        {/* User Identity Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
            {userInitials}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-tight">
              {user.name || user.username || "Investigator"}
            </p>
            <p className="text-[11px] text-slate-500 leading-tight">
              {user.department || "Cyber Crime"}
            </p>
          </div>
        </div>

        {/* Quick Sign Out Action */}
        <button
          onClick={handleLogout}
          title="Sign out or switch role"
          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}