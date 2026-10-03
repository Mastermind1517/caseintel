"use client";

import { useState, useEffect } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadDocument } from "@/services/documentsService";
import { getCases } from "@/services/casesService";
import { getSupportedLanguages } from "@/services/aiService";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: any) => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState("CASE-001");
  const [documentType, setDocumentType] = useState("FIR");
  const [language, setLanguage] = useState("auto");
  const [cases, setCases] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepMessage, setStepMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      getCases().then((data) => setCases(data || []));
      getSupportedLanguages().then((langs) => setLanguages(langs || []));
      setErrorMessage("");
      setFile(null);
      setStepMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Please select a file to upload.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      setStepMessage("1/3 Encrypting file with Envelope Encryption...");
      await new Promise((r) => setTimeout(r, 400));

      setStepMessage("2/3 Processing through AI OCR & Translation Engine...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", caseId);
      formData.append("documentType", documentType);
      formData.append("language", language);

      const res = await uploadDocument(formData);

      setStepMessage("3/3 Vaulted in KMS Storage & Chain of Custody logged!");
      await new Promise((r) => setTimeout(r, 600));

      onSuccess(res.document);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to upload and process document.");
    } finally {
      setIsSubmitting(false);
      setStepMessage("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-black text-white rounded-lg">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Upload Investigation Document</h2>
              <p className="text-xs text-gray-500">Secure AES-256 Vaulting & Indic OCR Processing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Select Document (PDF, PNG, JPG, TXT)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:border-black transition bg-gray-50/50">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="p-2.5 rounded-full bg-white shadow-xs border text-gray-700">
                  <FileText size={22} />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Click to choose file or drag & drop
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Supports scanned Hindi/Bengali/English FIRs, reports, and PDFs
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Quick Demo Test Files */}
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Demo Evidence Pack (Ready to Test)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Click to download sample</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <a
                  href="/test_evidence/01_FIR_Complaint_12Aug2026.png"
                  download="01_FIR_Complaint_12Aug2026.png"
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[11px] transition-colors"
                >
                  📄 FIR (PNG)
                </a>
                <a
                  href="/test_evidence/02_Investigation_Report_14Aug2026.pdf"
                  download="02_Investigation_Report_14Aug2026.pdf"
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[11px] transition-colors"
                >
                  📑 Report (PDF)
                </a>
                <a
                  href="/test_evidence/05_Witness_Interrogation_Transcript.txt"
                  download="05_Witness_Interrogation_Transcript.txt"
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[11px] transition-colors"
                >
                  📝 Transcript (TXT)
                </a>
                <a
                  href="/test_evidence/06_Cyber_Forensic_Extraction_Log.txt"
                  download="06_Cyber_Forensic_Extraction_Log.txt"
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[11px] transition-colors"
                >
                  💻 Forensic Log (TXT)
                </a>
              </div>
            </div>
          </div>

          {/* Case and Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Assign to Case
              </label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                disabled={isSubmitting}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-black"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={isSubmitting}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-black"
              >
                <option value="FIR">FIR (First Information Report)</option>
                <option value="Investigation Report">Investigation Report</option>
                <option value="Forensic Report">Forensic Report</option>
                <option value="Charge Sheet">Charge Sheet</option>
                <option value="Court Order">Court Order</option>
                <option value="Affidavit">Affidavit</option>
                <option value="Evidence Document">Evidence Document</option>
              </select>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              OCR & Translation Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isSubmitting}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-black"
            >
              <option value="auto">Auto-detect Language (Recommended)</option>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.engine})
                </option>
              ))}
            </select>
          </div>

          {/* Progress / Error */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSubmitting && (
            <div className="p-3.5 rounded-xl bg-gray-50 border space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-800">
                <Loader2 size={15} className="animate-spin text-black" />
                <span>{stepMessage}</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-black h-full animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="px-5 py-2 text-sm bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Encrypt & Ingest
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
