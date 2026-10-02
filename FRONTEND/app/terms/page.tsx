import Link from "next/link";
import { ArrowLeft, Scale, ShieldAlert, FileText, CheckCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="border-b pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-blue-600 tracking-wider">
          <Scale size={14} /> Legal Terms & Platform Usage
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Effective Date: August 2026 · CaseIntel Investigation Suite
        </p>
      </div>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section className="bg-white border rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-600" />
            1. Authorized Law Enforcement & Investigative Use
          </h2>
          <p className="text-sm">
            CaseIntel is provided for authorized investigative, evidentiary, and legal research workflows.
            Users are required to possess appropriate jurisdictional authority to ingest and process
            digital case records.
          </p>
        </section>

        <section className="bg-white border rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            2. AI Assistance & Human-in-the-Loop Principle
          </h2>
          <p className="text-sm">
            CaseIntel provides AI-assisted document classification, optical character recognition,
            translation, and cross-document inconsistency detection. AI findings (such as date or entity mismatches)
            are flagged for <strong>human investigator verification</strong>.
          </p>
          <p className="text-sm">
            Final evidentiary determinations and legal submissions remain under the sole oversight and
            responsibility of qualified human investigators and legal counsel.
          </p>
        </section>

        <section className="bg-white border rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            3. Digital Integrity & Tamper Resistance
          </h2>
          <p className="text-sm">
            Users agree not to attempt to circumvent envelope encryption, reverse-engineer cryptographic keys,
            or alter append-only audit trail logs. The platform maintains real-time cryptographic verification
            to flag any tampering attempts.
          </p>
        </section>
      </div>
    </main>
  );
}
