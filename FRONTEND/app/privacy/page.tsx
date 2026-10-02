import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, FileCheck } from "lucide-react";

export default function PrivacyPage() {
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
          <Shield size={14} /> Security & Data Governance
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Last updated: August 2026 · CaseIntel Platform Policy
        </p>
      </div>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section className="bg-white border rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lock size={18} className="text-emerald-600" />
            1. Evidence Vault & Document Storage
          </h2>
          <p className="text-sm">
            CaseIntel is designed for law enforcement, investigation agencies, and legal departments.
            Uploaded legal documents are immediately processed through an envelope encryption pipeline
            using AES-256 cipher streams. Encryption keys (DEKs) are ephemeral and wrapped using a master key.
          </p>
          <p className="text-sm">
            Cryptographic SHA-256 hashes are computed directly from unencrypted file streams prior to vaulting
            and logged into an immutable audit ledger to maintain strict chain-of-custody verification.
          </p>
        </section>

        <section className="bg-white border rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Eye size={18} className="text-blue-600" />
            2. Local AI & Indic OCR Processing
          </h2>
          <p className="text-sm">
            Optical Character Recognition (OCR) and Named Entity Extraction (NER) are executed locally on
            dedicated inference instances. Document content is parsed in-memory without third-party data broker sharing.
          </p>
          <p className="text-sm">
            Translation backends operate with strict payload confidentiality and do not train models on customer evidence dossiers.
          </p>
        </section>

        <section className="bg-white border rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileCheck size={18} className="text-purple-600" />
            3. Chain of Custody & Audit Records
          </h2>
          <p className="text-sm">
            Every file upload, OCR extraction, inconsistency detection, and human verification decision
            is recorded in an append-only audit trail with timestamps, user identities, and action targets.
            Audit logs cannot be modified by standard investigator accounts.
          </p>
        </section>

        <section className="bg-white border rounded-xl p-6 shadow-xs space-y-3">
          <h2 className="text-lg font-bold text-gray-900">
            4. Access Control & Authorization
          </h2>
          <p className="text-sm">
            Access to case dossiers is governed by Role-Based Access Control (RBAC). Only authenticated users
            holding designated roles (e.g. <code>INVESTIGATOR</code>, <code>ADMIN</code>) are permitted to inspect,
            upload, or verify evidence items.
          </p>
        </section>
      </div>
    </main>
  );
}
