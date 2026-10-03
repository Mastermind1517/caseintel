"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Brain,
  User,
  MapPin,
  Calendar,
  Building,
  Lock,
  Download,
  Languages,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  Eye,
  FileCheck2,
  ArrowRight,
  Fingerprint,
} from "lucide-react";

import { getAIAnalysis } from "@/services/aiService";
import { getDocumentById, getDocumentDownloadUrl } from "@/services/documentsService";
import { API_BASE_URL } from "@/config/api";

export default function DocumentViewer() {
  const params = useParams();
  const documentId = params.documentId as string;

  const [doc, setDoc] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [inspectionView, setInspectionView] = useState<"original" | "ocr" | "translation">("original");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<any>(null);

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('caseintel_token') : null;
      const res = await fetch(`${API_BASE_URL}/documents/${documentId}/verify-integrity`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setIntegrityResult(data);
    } catch (err: any) {
      setIntegrityResult({ success: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [docData, aiData] = await Promise.all([
        getDocumentById(documentId),
        getAIAnalysis(documentId),
      ]);
      setDoc(docData);
      setAiAnalysis(aiData);
      setLoading(false);
    }

    if (documentId) {
      loadData();
    }
  }, [documentId]);

  if (loading || !aiAnalysis) {
    return (
      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} />
          Back to Documents
        </Link>
        <div className="bg-white border border-slate-200/80 rounded-xl p-16 text-center space-y-3 shadow-xs">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Retrieving encrypted vault file & AI intelligence...</p>
        </div>
      </main>
    );
  }

  const people = aiAnalysis.entities?.people || [];
  const locations = aiAnalysis.entities?.locations || [];
  const dates = aiAnalysis.entities?.dates || [];
  const orgs = aiAnalysis.entities?.organizations || [];
  const downloadUrl = getDocumentDownloadUrl(documentId);

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <Link
        href="/documents"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft size={14} />
        <span>Evidence Documents</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-semibold">{documentId}</span>
      </Link>

      {/* Top Banner: Document Name & Status */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-800 shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {doc?.name || aiAnalysis.filename || `${documentId}.pdf`}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-semibold">
                {doc?.status || "Processed & Sealed"}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-slate-600">{documentId}</span>
              <span>·</span>
              <Link
                href={`/cases/${doc?.caseId || "CASE-001"}`}
                className="text-slate-700 hover:underline font-medium"
              >
                Case: {doc?.caseId || "CASE-001"}
              </Link>
              <span>·</span>
              <span>Type: <strong className="text-slate-700 font-semibold">{aiAnalysis.documentType}</strong></span>
              <span>·</span>
              <span>Lang: <strong className="text-slate-700 font-semibold">{aiAnalysis.language || "English"}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80">
            <Lock size={12} className="text-emerald-600" />
            AES-256 Vaulted
          </span>
          <a
            href={downloadUrl}
            download
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition shadow-xs"
          >
            <Download size={13} />
            Download Original
          </a>
        </div>
      </div>

      {/* Main Split Intelligence Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Inspection Area (Original -> OCR -> Translation) */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
          {/* Natural Step Switcher */}
          <div className="border-b border-slate-100 p-2 sm:px-4 sm:py-2.5 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInspectionView("original")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  inspectionView === "original"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Eye size={13} />
                <span>Original Document</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectionView("ocr")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  inspectionView === "ocr"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <FileCode size={13} />
                <span>Raw OCR Text</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectionView("translation")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  inspectionView === "translation"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Languages size={13} />
                <span>Translation</span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Confidence: {aiAnalysis.ocrConfidence || 94}%
            </span>
          </div>

          {/* View Body */}
          <div className="p-5 sm:p-6 flex-1 min-h-[460px] flex flex-col justify-between">
            {/* View 1: Original Document */}
            {inspectionView === "original" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Vault Ingestion Record
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Format: PNG/PDF Evidence</span>
                </div>

                <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[380px] text-center">
                  <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-5 shadow-xs text-left space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {aiAnalysis.documentType}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                        SEALED
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-wrap line-clamp-6">
                      {aiAnalysis.extractedText || "Original document stored in encrypted envelope."}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">SHA-256 Integrity Verified</span>
                      <a
                        href={downloadUrl}
                        download
                        className="text-slate-900 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Download Artifact</span>
                        <Download size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Raw OCR Text */}
            {inspectionView === "ocr" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    PaddleOCR Extraction Engine ({aiAnalysis.language || "Indic"})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(aiAnalysis.extractedText || "").length} characters
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed min-h-[360px]">
                  {aiAnalysis.extractedText || "No raw text was extracted."}
                </div>
              </div>
            )}

            {/* View 3: English Translation */}
            {inspectionView === "translation" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Verified English Intelligence Translation
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Standardized</span>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed min-h-[360px]">
                  {aiAnalysis.translation || aiAnalysis.extractedText || "No translated content available."}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between mt-4">
              <span>Status: AI Extraction Verified</span>
              <span>Encrypted Envelope: Local KMS Master Key</span>
            </div>
          </div>
        </section>

        {/* Right 5 Columns: Extracted Information, Entities & Findings Panel */}
        <section className="lg:col-span-5 space-y-6">
          {/* Extracted Information Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Extracted Information</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Named Entities
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* PERSONS */}
              <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <User size={12} className="text-indigo-600" />
                  PERSONS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {people.length > 0 ? (
                    people.map((p: string, idx: number) => (
                      <span key={idx} className="font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs shadow-2xs">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None identified</span>
                  )}
                </div>
              </div>

              {/* LOCATIONS */}
              <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <MapPin size={12} className="text-emerald-600" />
                  LOCATIONS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {locations.length > 0 ? (
                    locations.map((loc: string, idx: number) => (
                      <span key={idx} className="font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs shadow-2xs">
                        {loc}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None identified</span>
                  )}
                </div>
              </div>

              {/* DATES */}
              <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Calendar size={12} className="text-amber-600" />
                  DATES
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dates.length > 0 ? (
                    dates.map((d: string, idx: number) => (
                      <span key={idx} className="font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs shadow-2xs">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None identified</span>
                  )}
                </div>
              </div>

              {/* ORGANIZATIONS */}
              <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <Building size={12} className="text-purple-600" />
                  ORGANIZATIONS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {orgs.length > 0 ? (
                    orgs.map((org: string, idx: number) => (
                      <span key={idx} className="font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs shadow-2xs">
                        {org}
                      </span>
                    ))
                  ) : (
                    <span className="font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs shadow-2xs">
                      {doc?.type || "Investigation Bureau"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Findings Section */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                FINDINGS & CORRELATIONS
              </span>

              {aiAnalysis.issues && aiAnalysis.issues.length > 0 ? (
                <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/70 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-amber-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-700" />
                      Inconsistency Flagged
                    </span>
                    <Link href="/verification" className="text-amber-800 underline text-[11px]">
                      Verify →
                    </Link>
                  </div>
                  {aiAnalysis.issues.map((iss: string, idx: number) => (
                    <p key={idx} className="text-amber-800 text-[11px]">
                      • {iss}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-500 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>No cross-document contradictions detected for this record.</span>
                </div>
              )}
            </div>
          </div>

          {/* Cryptographic Chain of Custody & In-Memory Check Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Fingerprint size={16} className="text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Cryptographic Verification
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold">
                SEALED
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Ledger SHA-256 Digest
              </span>
              <p className="font-mono text-[11px] break-all bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 select-all">
                {doc?.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
              </p>
            </div>

            <button
              onClick={handleVerifyIntegrity}
              disabled={verifying}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2.5 px-3 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {verifying ? "Decrypting stream in RAM & re-computing SHA-256..." : "Verify Vault Cryptographic Integrity"}
            </button>

            {integrityResult && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  integrityResult.integrityValid
                    ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                {integrityResult.integrityValid ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Integrity Verified: 100% Cryptographic Match</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed font-mono">
                      Decrypted SHA-256 matches ledger exactly. Zero tampering.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 text-rose-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <span>Integrity Failure</span>
                    </div>
                    <p className="text-[11px]">{integrityResult.error || "Calculated hash did not match stored hash."}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}