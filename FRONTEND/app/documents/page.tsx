"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Upload, FileText, Lock, Download, CheckCircle2 } from "lucide-react";
import { getDocuments, getDocumentDownloadUrl } from "@/services/documentsService";
import UploadModal from "@/components/ui/UploadModal";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [notification, setNotification] = useState("");

  const loadDocuments = async () => {
    const data = await getDocuments();
    setDocuments(data || []);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadSuccess = (newDoc: any) => {
    loadDocuments();
    setNotification(`Successfully encrypted and vaulted "${newDoc?.name || 'document'}"!`);
    setTimeout(() => setNotification(""), 5000);
  };

  const filteredDocuments = documents.filter((doc) =>
    `${doc.id} ${doc.name} ${doc.type} ${doc.caseId}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification("")}
            className="text-xs text-green-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vaulted Documents</h1>
          <p className="text-gray-500 mt-1">
            Manage evidence files, envelope encryption records, and automated AI analysis results.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer shadow-xs"
        >
          <Upload size={17} />
          Upload Document
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by Document Name, Case ID, or Document Type..."
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

      {/* Documents Table */}
      <div className="bg-white border rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3.5">Document</th>
              <th className="text-left px-5 py-3.5">Type</th>
              <th className="text-left px-5 py-3.5">Case ID</th>
              <th className="text-left px-5 py-3.5">Vault Security</th>
              <th className="text-left px-5 py-3.5">AI Confidence</th>
              <th className="text-right px-5 py-3.5">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50/70 transition">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 text-gray-700 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition"
                      >
                        {doc.name}
                      </Link>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{doc.id}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {doc.type}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <Link
                    href={`/cases/${doc.caseId}`}
                    className="font-mono text-xs text-gray-600 hover:underline"
                  >
                    {doc.caseId}
                  </Link>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Lock size={11} />
                    AES-256 Encrypted
                  </span>
                </td>

                <td className="px-5 py-4">
                  {doc.confidence !== null && doc.confidence !== undefined ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-green-600 h-full rounded-full"
                          style={{ width: `${doc.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {doc.confidence}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600">Processing...</span>
                  )}
                </td>

                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                    >
                      AI Analysis
                    </Link>
                    <a
                      href={getDocumentDownloadUrl(doc.id)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
                      title="Download decrypted file"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDocuments.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <FileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="font-medium">No documents found matching "{search}"</p>
            <p className="text-xs text-gray-400 mt-1">Upload a document to begin analysis.</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </main>
  );
}