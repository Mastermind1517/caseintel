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
} from "lucide-react";

import { getAIAnalysis } from "@/services/aiService";
import { getDocumentById, getDocumentDownloadUrl } from "@/services/documentsService";

export default function DocumentViewer() {
  const params = useParams();
  const documentId = params.documentId as string;

  const [doc, setDoc] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"text" | "translation" | "preview">("translation");
  const [loading, setLoading] = useState(true);

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
      <main className="p-8 max-w-7xl mx-auto">
        <Link
          href="/documents"
          className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-black transition"
        >
          <ArrowLeft size={16} />
          Back to Documents
        </Link>
        <div className="bg-white border rounded-xl p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Retrieving encrypted document & AI analysis...</p>
        </div>
      </main>
    );
  }

  const people = aiAnalysis.entities?.people || [];
  const locations = aiAnalysis.entities?.locations || [];
  const dates = aiAnalysis.entities?.dates || [];
  const orgs = aiAnalysis.entities?.organizations || [];

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/documents"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition"
      >
        <ArrowLeft size={16} />
        Back to Documents
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gray-100 rounded-xl text-gray-800">
            <FileText size={26} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {doc?.name || aiAnalysis.filename || `${documentId}.pdf`}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                {doc?.status || "Processed"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span className="font-mono">{documentId}</span> ·{" "}
              <Link
                href={`/cases/${doc?.caseId || "CASE-001"}`}
                className="text-blue-600 hover:underline"
              >
                {doc?.caseId || "CASE-001"}
              </Link>{" "}
              · Document Type: <span className="font-medium text-gray-700">{aiAnalysis.documentType}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock size={13} />
            AES-256 Vaulted
          </span>
          <a
            href={getDocumentDownloadUrl(documentId)}
            download
            className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-xs"
          >
            <Download size={15} />
            Download Original
          </a>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document Content & OCR Viewer */}
        <section className="lg:col-span-7 bg-white border rounded-xl shadow-xs overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="border-b px-5 py-3 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("translation")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === "translation"
                    ? "bg-black text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                English Translation
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === "text"
                    ? "bg-black text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Raw OCR Text
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === "preview"
                    ? "bg-black text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Structured Form View
              </button>
            </div>

            <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
              <Languages size={14} />
              {aiAnalysis.language || "English"}
            </span>
          </div>

          {/* Tab Content */}
          <div className="p-6 flex-1 min-h-[500px] bg-white">
            {activeTab === "translation" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-sm text-gray-900">
                    Translated Document Content (English)
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Engine: IndicTrans / Google Translation API
                  </span>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border text-sm text-gray-800 font-mono whitespace-pre-wrap leading-relaxed min-h-[400px]">
                  {aiAnalysis.translation || aiAnalysis.extractedText || "No translated content available."}
                </div>
              </div>
            )}

            {activeTab === "text" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-sm text-gray-900">
                    Extracted Text ({aiAnalysis.engine || "PaddleOCR"})
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Source Language: {aiAnalysis.language || "Auto"}
                  </span>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border text-sm text-gray-800 font-mono whitespace-pre-wrap leading-relaxed min-h-[400px]">
                  {aiAnalysis.extractedText || "No text extracted from document."}
                </div>
              </div>
            )}

            {activeTab === "preview" && (
              <div className="border rounded-xl p-8 bg-gray-50/50 shadow-inner">
                <div className="bg-white border rounded-lg p-8 shadow-sm space-y-6">
                  <div className="border-b pb-4 text-center">
                    <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900">
                      {aiAnalysis.documentType}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Case Reference: {doc?.caseId || "CASE-001"} · System Ref: {documentId}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Primary Person</p>
                      <p className="font-medium mt-0.5">{people[0] || "Not Specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Incident Location</p>
                      <p className="font-medium mt-0.5">{locations[0] || "Not Specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Recorded Date</p>
                      <p className="font-medium mt-0.5">{dates[0] || "Not Specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Department / Org</p>
                      <p className="font-medium mt-0.5">{orgs[0] || doc?.type || "General"}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Narrative Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border">
                      {aiAnalysis.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: AI Intelligence Panel */}
        <section className="lg:col-span-5 space-y-6">
          {/* AI Metrics Card */}
          <div className="bg-white border rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b">
              <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                <Brain size={20} />
              </div>
              <div>
                <h2 className="font-bold text-base">AI Document Intelligence</h2>
                <p className="text-xs text-gray-500">Automated multi-stage processing summary</p>
              </div>
            </div>

            {/* Confidence Gauge */}
            <div className="p-4 rounded-xl bg-gray-50 border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">OCR Recognition Confidence</span>
                <span className="text-lg font-bold text-gray-900">
                  {aiAnalysis.ocrConfidence}%
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-green-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${aiAnalysis.ocrConfidence}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Confidence verified with high recognition fidelity across scripts.
              </p>
            </div>

            {/* Processing Stages */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Processing Stages
              </h3>
              <div className="space-y-2">
                {(aiAnalysis.processingStages || []).map((stage: any) => (
                  <div
                    key={stage.name}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2 text-gray-700">
                      <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                      <span>{stage.name}</span>
                    </div>
                    <span className="text-[11px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      Complete
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Document Summary
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-xl border">
                {aiAnalysis.summary}
              </p>
            </div>

            {/* Extracted Entities */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Extracted Entities
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-white text-xs">
                  <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                    <User size={15} />
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                      People Mentioned
                    </span>
                    <span className="font-medium text-gray-900">
                      {people.length > 0 ? people.join(", ") : "None detected"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-white text-xs">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                    <MapPin size={15} />
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                      Location / Jurisdiction
                    </span>
                    <span className="font-medium text-gray-900">
                      {locations.length > 0 ? locations.join(", ") : "None detected"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-white text-xs">
                  <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                      Dates Extracted
                    </span>
                    <span className="font-medium text-gray-900">
                      {dates.length > 0 ? dates.join(", ") : "None detected"}
                    </span>
                  </div>
                </div>

                {orgs.length > 0 && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-white text-xs">
                    <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                      <Building size={15} />
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                        Organizations
                      </span>
                      <span className="font-medium text-gray-900">{orgs.join(", ")}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inconsistencies / Issues */}
            {aiAnalysis.issues && aiAnalysis.issues.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                  <AlertTriangle size={15} />
                  <span>Flagged Inconsistencies</span>
                </div>
                {aiAnalysis.issues.map((issue: string, idx: number) => (
                  <p key={idx} className="text-amber-700">
                    • {issue}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}