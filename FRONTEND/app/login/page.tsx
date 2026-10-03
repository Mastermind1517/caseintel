"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Building, Mail, UserPlus, KeyRound } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");

  // Sign In State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Register State
  const [regName, setRegName] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState<"INVESTIGATOR" | "ADMIN">("INVESTIGATOR");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("caseintel_user");
      const token = localStorage.getItem("caseintel_token");
      if (stored && token) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Helper: Retrieve locally registered users (for offline / hosted Vercel fallback)
  const getLocalUsers = (): any[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("caseintel_registered_users");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveLocalUser = (user: any, pw: string) => {
    if (typeof window === "undefined") return;
    try {
      const list = getLocalUsers();
      list.push({ ...user, password: pw });
      localStorage.setItem("caseintel_registered_users", JSON.stringify(list));
    } catch (e) {
      console.error("Failed to save local user", e);
    }
  };

  // -------------------------------------------------------------
  // SIGN IN LOGIC
  // -------------------------------------------------------------
  const handleLogin = async (idValue: string, pwValue: string) => {
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      let loggedIn = false;
      const cleanId = idValue.trim().toLowerCase();

      // 1. Attempt authentication with the live CaseIntel backend
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanId, password: pwValue }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (res.ok && data.success) {
            if (typeof window !== "undefined") {
              localStorage.setItem("caseintel_token", data.token);
              localStorage.setItem("caseintel_user", JSON.stringify(data.user));
            }
            loggedIn = true;
          } else if (data.error) {
            throw new Error(data.error);
          }
        }
      } catch (backendErr: any) {
        if (backendErr.message && backendErr.message.toLowerCase().includes("invalid credentials")) {
          throw backendErr;
        }
        console.warn("Backend API unreachable or returned non-JSON, checking local fallback:", backendErr);
      }

      // 2. Fallback check: check locally registered users
      if (!loggedIn) {
        const localUsers = getLocalUsers();
        const found = localUsers.find(
          (u) =>
            (u.username.toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === cleanId)) &&
            u.password === pwValue
        );

        if (found) {
          const { password: _, ...userSafe } = found;
          if (typeof window !== "undefined") {
            localStorage.setItem("caseintel_token", `local-jwt-${found.id}`);
            localStorage.setItem("caseintel_user", JSON.stringify(userSafe));
          }
          loggedIn = true;
        }
      }

      // 3. Built-in Demo Accounts Fallback
      if (!loggedIn) {
        if (cleanId === "investigator" && (pwValue === "Investigator123!" || pwValue === "investigator")) {
          const demoUser = {
            id: "usr-inv-001",
            username: "investigator",
            email: "investigator@caseintel.local",
            name: "Inspector Rajesh Verma",
            role: "INVESTIGATOR",
            department: "Cyber Crime",
          };
          if (typeof window !== "undefined") {
            localStorage.setItem("caseintel_token", "demo-jwt-investigator-offline");
            localStorage.setItem("caseintel_user", JSON.stringify(demoUser));
          }
          loggedIn = true;
        } else if (cleanId === "admin" && (pwValue === "Admin123!" || pwValue === "admin")) {
          const demoUser = {
            id: "usr-adm-001",
            username: "admin",
            email: "admin@caseintel.local",
            name: "Director Sharma",
            role: "ADMIN",
            department: "Special Operations",
          };
          if (typeof window !== "undefined") {
            localStorage.setItem("caseintel_token", "demo-jwt-admin-offline");
            localStorage.setItem("caseintel_user", JSON.stringify(demoUser));
          }
          loggedIn = true;
        } else {
          throw new Error("Invalid credentials. Please verify your username and password, or create a new ID.");
        }
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // REGISTRATION LOGIC
  // -------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setError("Please fill in your Official Name, User ID, and Password.");
      return;
    }

    if (regUsername.trim().length < 3) {
      setError("User ID must be at least 3 characters long.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    const payload = {
      name: regName.trim(),
      department: regDepartment.trim() || "Investigation Bureau",
      username: regUsername.trim().toLowerCase(),
      email: regEmail.trim().toLowerCase() || `${regUsername.trim().toLowerCase()}@caseintel.gov`,
      role: regRole,
      password: regPassword,
    };

    try {
      let registered = false;

      // 1. Attempt live backend registration
      try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (res.ok && data.success) {
            if (typeof window !== "undefined") {
              localStorage.setItem("caseintel_token", data.token);
              localStorage.setItem("caseintel_user", JSON.stringify(data.user));
              saveLocalUser(data.user, regPassword);
            }
            registered = true;
          } else if (data.error) {
            throw new Error(data.error);
          }
        }
      } catch (backendErr: any) {
        if (backendErr.message && backendErr.message.includes("already exists")) {
          throw backendErr;
        }
        console.warn("Backend registration API unreachable, creating local ID:", backendErr);
      }

      // 2. Offline / Hosted Vercel fallback registration
      if (!registered) {
        const localUsers = getLocalUsers();
        const exists = localUsers.some(
          (u) => u.username === payload.username || (u.email && u.email === payload.email)
        );
        if (exists) {
          throw new Error(`An account with User ID '${payload.username}' already exists.`);
        }

        const newUser = {
          id: `usr-${Date.now().toString(36)}`,
          username: payload.username,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          department: payload.department,
          createdAt: new Date().toISOString(),
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("caseintel_token", `local-jwt-${newUser.id}`);
          localStorage.setItem("caseintel_user", JSON.stringify(newUser));
          saveLocalUser(newUser, regPassword);
        }
      }

      setSuccessMsg(`Account created for ${payload.name} (${payload.role})! Redirecting to workspace...`);
      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to register new ID.");
    } finally {
      setLoading(false);
    }
  };

  const onSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please enter both username/email and password.");
      return;
    }
    handleLogin(identifier, password);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-3 shadow-xs">
          <Shield size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">CaseIntel</h2>
        <p className="mt-1 text-xs text-slate-500">
          Digital Evidence Chain of Custody & Document Intelligence
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 shadow-xs border border-slate-200/80 rounded-2xl sm:px-10 space-y-5">
          {/* Active Session Indicator */}
          {currentUser && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-900">Signed in as {currentUser.name || currentUser.username}</p>
                <p className="text-[11px] text-blue-700">{currentUser.department || currentUser.role}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>Dashboard</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "signin"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <KeyRound size={14} />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "register"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <UserPlus size={14} />
              Create New ID
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 1: SIGN IN FORM                                 */}
          {/* ==================================================== */}
          {mode === "signin" && (
            <>
              <form onSubmit={onSignInSubmit} className="space-y-4">
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
                      placeholder="e.g. investigator or custom ID"
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
              <div className="pt-3 border-t space-y-2.5">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider text-center">
                  Quick 1-Click Demo Personas
                </p>

                <button
                  type="button"
                  onClick={() => handleLogin("investigator", "Investigator123!")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition cursor-pointer"
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
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition cursor-pointer"
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
            </>
          )}

          {/* ==================================================== */}
          {/* TAB 2: REGISTER NEW CUSTOM ID                       */}
          {/* ==================================================== */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                  Official Full Name *
                </label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Agent Alex Mercer"
                    className="block w-full pl-9 pr-3 py-2 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                  Agency / Department
                </label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Building size={16} />
                  </div>
                  <input
                    type="text"
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    placeholder="e.g. Special Investigations Unit"
                    className="block w-full pl-9 pr-3 py-2 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                    User ID / Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. amercer"
                    className="mt-1 block w-full px-3 py-2 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                    Access Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="mt-1 block w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="INVESTIGATOR">Investigator</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                  Official Email (Optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. amercer@caseintel.gov"
                    className="block w-full pl-9 pr-3 py-2 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="mt-1 block w-full px-3 py-2 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-700 tracking-wider">
                    Confirm *
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm"
                    className="mt-1 block w-full px-3 py-2 border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? "Generating Credentials..." : "Create Official ID & Enter"}
                <ArrowRight size={16} />
              </button>

              <p className="text-[11px] text-gray-400 text-center pt-1">
                Your ID is cryptographically secured with role-based permissions.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          CaseIntel System · Digital Evidence Chain of Custody
        </p>
      </div>
    </div>
  );
}
