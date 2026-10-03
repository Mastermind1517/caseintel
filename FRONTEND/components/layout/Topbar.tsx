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

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-3 sm:px-6 shrink-0">
      <div className="flex items-center gap-2">
        {/* Mobile Hamburger Menu Toggle */}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Search Bar - Responsive width */}
        <div className="hidden sm:flex items-center gap-2 border rounded-lg px-3 py-1.5 w-44 sm:w-64 md:w-80">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search dossiers, SHA-256..."
            className="outline-none text-xs w-full placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
            isAdmin
              ? "bg-purple-100 text-purple-800 border border-purple-200"
              : "bg-blue-100 text-blue-800 border border-blue-200"
          }`}
        >
          <Shield size={11} />
          {user.role || "INVESTIGATOR"}
        </span>

        {/* User Info */}
        <div className="text-right max-w-[130px] sm:max-w-none truncate">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {user.name || user.username || "Investigator"}
          </p>
          <p className="hidden sm:block text-[11px] text-gray-500 truncate">
            {user.department || "Cyber Crime"}
          </p>
        </div>

        {/* Quick Link to Logout */}
        <button
          onClick={handleLogout}
          title="Sign out or switch role"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}