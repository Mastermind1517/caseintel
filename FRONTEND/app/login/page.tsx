"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (idValue: string, pwValue: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: idValue, password: pwValue }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed.");
      }

      // Store token and user
      if (typeof window !== "undefined") {
        localStorage.setItem("caseintel_token", data.token);
        localStorage.setItem("caseintel_user", JSON.stringify(data.user));
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please enter both username/email and password.");
      return;
    }
    handleLogin(identifier, password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black text-white mb-4 shadow-md">
          <Shield size={28} />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">CaseIntel</h2>
        <p className="mt-2 text-sm text-gray-500">
          Digital Evidence Chain of Custody & Document Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                Username or Official Email
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. investigator or admin"
                  className="block w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-black hover:bg-gray-800 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Portal"}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
              Quick 1-Click Demo Logins
            </p>

            <button
              type="button"
              onClick={() => handleLogin("investigator", "Investigator123!")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition cursor-pointer"
            >
              <div>
                <p className="text-xs font-semibold text-blue-900">Investigator Session</p>
                <p className="text-[11px] text-blue-700">Inspector Rajesh Verma · Cyber Crime</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md uppercase">
                INVESTIGATOR
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleLogin("admin", "Admin123!")}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition cursor-pointer"
            >
              <div>
                <p className="text-xs font-semibold text-purple-900">Administrator Session</p>
                <p className="text-[11px] text-purple-700">Director Sharma · Full Privileges</p>
              </div>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md uppercase">
                ADMIN
              </span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          CaseIntel System · Controlled Fictional Demo Environment
        </p>
      </div>
    </div>
  );
}
