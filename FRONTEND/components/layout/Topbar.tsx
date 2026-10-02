"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserCheck, Shield, LogOut } from "lucide-react";

export default function Topbar() {
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
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 w-80">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search dossiers, SHA-256 hashes..."
          className="outline-none text-xs w-full placeholder:text-gray-400"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isAdmin
              ? "bg-purple-100 text-purple-800 border border-purple-200"
              : "bg-blue-100 text-blue-800 border border-blue-200"
          }`}
        >
          <Shield size={12} />
          {user.role || "INVESTIGATOR"}
        </span>

        {/* User Info */}
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-900">{user.name || user.username || "Investigator"}</p>
          <p className="text-[11px] text-gray-500">{user.department || "Cyber Crime"}</p>
        </div>

        {/* Quick Link to Switch Role or Logout */}
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