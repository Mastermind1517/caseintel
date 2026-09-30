"use client";

import { useEffect, useState } from "react";

import {
  AlertTriangle,
  CheckCircle,
  FileText,
} from "lucide-react";

import {
  getVerificationIssues,
  resolveVerificationIssue,
} from "@/services/verificationService";

export default function VerificationPage() {
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
  async function loadIssues() {
    const data = await getVerificationIssues();
    setIssues(data);
  }

  loadIssues();
}, []);

  const resolveIssue = async (
    issueId: string,
    decision: string
  ) => {
    const updatedIssue = await resolveVerificationIssue(
      issueId,
      decision
    );

    if (!updatedIssue) {
      return;
    }

    setIssues((currentIssues) =>
      currentIssues.map((issue) =>
        issue.id === issueId
          ? updatedIssue
          : issue
      )
    );
  };

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">

      {/* Page Header */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">
          Verification Center
        </h1>

        <p className="text-gray-500 mt-2">
          Review inconsistencies detected across case documents.
        </p>

      </div>

      {/* Issues */}

      <div className="space-y-6">

        {issues.map((issue) => (

          <div
            key={issue.id}
            className="bg-white border rounded-xl overflow-hidden"
          >

            {/* Header */}

            <div className="p-5 border-b flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="p-2 rounded-lg bg-red-50">

                  <AlertTriangle
                    size={20}
                    className="text-red-600"
                  />

                </div>

                <div>

                  <h2 className="font-semibold">
                    {issue.type}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {issue.caseId} · {issue.id}
                  </p>

                </div>

              </div>

              {/* Status */}

              {issue.status === "pending" ? (

                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                  Pending Review
                </span>

              ) : (

                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                  {issue.status}
                </span>

              )}

            </div>

            {/* Body */}

            <div className="p-5">

              <p className="text-sm text-gray-600">
                {issue.description}
              </p>

              {/* Comparison */}

              <div className="grid grid-cols-2 gap-4 mt-6">

                {/* Source A */}

                <div className="border rounded-lg p-5">

                  <div className="flex items-center gap-2 mb-4">

                    <FileText size={18} />

                    <h3 className="font-semibold">
                      {issue.sourceA.documentName}
                    </h3>

                  </div>

                  <p className="text-xs text-gray-500">
                    {issue.sourceA.field}
                  </p>

                  <p className="text-lg font-semibold mt-1">
                    {issue.sourceA.value}
                  </p>

                </div>

                {/* Source B */}

                <div className="border rounded-lg p-5">

                  <div className="flex items-center gap-2 mb-4">

                    <FileText size={18} />

                    <h3 className="font-semibold">
                      {issue.sourceB.documentName}
                    </h3>

                  </div>

                  <p className="text-xs text-gray-500">
                    {issue.sourceB.field}
                  </p>

                  <p className="text-lg font-semibold mt-1">
                    {issue.sourceB.value}
                  </p>

                </div>

              </div>

              {/* Confidence */}

              <div className="mt-6">

                <p className="text-sm font-medium">
                  AI Detection Confidence
                </p>

                <p className="text-2xl font-bold mt-1">
                  {issue.confidence}%
                </p>

              </div>

              {/* Actions */}

              {issue.status === "pending" && (

                <div className="flex gap-3 mt-6">

                  <button
                    onClick={() =>
                      resolveIssue(
                        issue.id,
                        "Source A Confirmed"
                      )
                    }
                    className="px-4 py-2 rounded-lg bg-black text-white flex items-center gap-2"
                  >

                    <CheckCircle size={17} />

                    Confirm Source A

                  </button>

                  <button
                    onClick={() =>
                      resolveIssue(
                        issue.id,
                        "Source B Confirmed"
                      )
                    }
                    className="px-4 py-2 rounded-lg border"
                  >

                    Confirm Source B

                  </button>

                  <button
                    onClick={() =>
                      resolveIssue(
                        issue.id,
                        "Further Review"
                      )
                    }
                    className="px-4 py-2 rounded-lg border"
                  >

                    Mark for Further Review

                  </button>

                </div>

              )}

              {/* Resolved Message */}

              {issue.status !== "pending" && (

                <div className="mt-6 p-4 rounded-lg bg-green-50">

                  <div className="flex items-center gap-2">

                    <CheckCircle
                      size={18}
                      className="text-green-600"
                    />

                    <p className="text-sm font-medium text-green-700">
                      Human decision recorded: {issue.status}
                    </p>

                  </div>

                </div>

              )}

            </div>

          </div>

        ))}

      </div>

    </main>
  );
}