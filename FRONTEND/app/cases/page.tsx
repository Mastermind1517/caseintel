"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Folder, X, CheckCircle2, Shield, Trash2, AlertTriangle } from "lucide-react";
import { getCases, createCase, deleteCase } from "@/services/casesService";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newCaseName, setNewCaseName] = useState("");
  const [department, setDepartment] = useState("Cyber Crime");
  const [priority, setPriority] = useState("High");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const loadCases = async () => {
    const data = await getCases();
    setCases(data || []);
  };

  useEffect(() => {
    loadCases();
    try {
      const u = localStorage.getItem("caseintel_user");
      if (u) setCurrentUser(JSON.parse(u));
    } catch {}
  }, []);

  const isAdmin = (currentUser?.role || "").toUpperCase() === "ADMIN";

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCase(caseToDelete.id);
      setToast(`Case "${caseToDelete.name}" (${caseToDelete.id}) permanently purged.`);
      setTimeout(() => setToast(""), 4000);
      setCaseToDelete(null);
      loadCases();
    } catch (err: any) {
      alert(err.message || "Failed to delete case");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createCase({
        name: newCaseName.trim(),
        department,
        priority,
      });

      setNewCaseName("");
      setIsModalOpen(false);
      setToast(`Created case "${created.name}" successfully!`);
      setTimeout(() => setToast(""), 4000);
      loadCases();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCases = cases.filter((item) =>
    `${item.id} ${item.name} ${item.department} ${item.officer}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast("")} className="text-xs text-green-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investigation Cases</h1>
          <p className="text-gray-500 mt-1">
            Manage legal case dossiers, digital evidence chains, and cross-document intelligence.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer shadow-xs"
        >
          <Plus size={18} />
          New Case
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border rounded-xl p-4 flex items-center gap-3 shadow-xs">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search cases by name, ID, department, or assigned officer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="outline-none w-full text-sm placeholder:text-gray-400"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Case table */}
      <div className="bg-white border rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3.5">Case ID</th>
              <th className="text-left px-5 py-3.5">Case Title</th>
              <th className="text-left px-5 py-3.5">Department</th>
              <th className="text-left px-5 py-3.5">Priority</th>
              <th className="text-left px-5 py-3.5">Status</th>
              <th className="text-left px-5 py-3.5">Assigned Officer</th>
              <th className="text-right px-5 py-3.5">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredCases.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/70 transition">
                <td className="px-5 py-4 font-mono text-xs font-bold text-gray-900">
                  <div className="flex items-center gap-2">
                    <Folder size={15} className="text-gray-400" />
                    <span>{item.id}</span>
                  </div>
                </td>

                <td className="px-5 py-4 font-medium text-gray-900">
                  <Link href={`/cases/${item.id}`} className="hover:text-blue-600 transition">
                    {item.name}
                  </Link>
                </td>

                <td className="px-5 py-4 text-gray-500 text-xs">
                  {item.department}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.priority === "High"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : item.priority === "Medium"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.priority}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>

                <td className="px-5 py-4 text-gray-600 text-xs">
                  {item.officer}
                </td>

                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/cases/${item.id}`}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-100 transition inline-block"
                    >
                      Workspace
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => setCaseToDelete(item)}
                        title="Delete Case (Admin Only)"
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCases.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Folder size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="font-medium">No cases found matching "{search}"</p>
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black text-white rounded-lg">
                  <Shield size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Register New Case</h2>
                  <p className="text-xs text-gray-500">Chain of custody dossier creation</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Case Name / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siliguri Financial Forgery Investigation"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm bg-white outline-none focus:border-black"
                >
                  <option value="Cyber Crime">Cyber Crime</option>
                  <option value="Economic Offences">Economic Offences</option>
                  <option value="Special Investigation Team">Special Investigation Team</option>
                  <option value="CID / Forensics">CID / Forensics</option>
                  <option value="Anti-Corruption Branch">Anti-Corruption Branch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border rounded-lg px-3.5 py-2 text-sm bg-white outline-none focus:border-black"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCaseName.trim()}
                  className="px-5 py-2 text-sm bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  {isSubmitting ? "Creating..." : "Create Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Case Confirmation Modal */}
      {caseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Purge Investigation Case</h2>
                  <p className="text-xs text-red-600 font-mono font-medium">{caseToDelete.id}</p>
                </div>
              </div>
              <button
                onClick={() => setCaseToDelete(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-gray-900">"{caseToDelete.name}"</strong>?
              </p>
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-200/80 text-xs text-red-800 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0" />
                  Irreversible Cascade Deletion:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700">
                  <li>All associated vault documents (.enc files) will be destroyed</li>
                  <li>Extracted AI analysis, OCR, and entities will be purged</li>
                  <li>Verification issues and audit timeline entries will be cleared</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCaseToDelete(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteCase}
                  className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  {isDeleting ? "Purging Case..." : "Confirm Permanent Deletion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}