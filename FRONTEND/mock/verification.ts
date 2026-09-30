export const verificationIssues = [
  {
    id: "ISSUE-001",

    caseId: "CASE-001",

    type: "Date Mismatch",

    severity: "high",

    status: "pending",

    description:
      "The incident date differs between the FIR and Investigation Report.",

    sourceA: {
      documentId: "DOC-001",
      documentName: "FIR.pdf",
      field: "Incident Date",
      value: "12 August 2026",
    },

    sourceB: {
      documentId: "DOC-002",
      documentName: "Investigation_Report.pdf",
      field: "Incident Date",
      value: "14 August 2026",
    },

    confidence: 94,

    createdAt: "2026-08-15T10:30:00",
  },
];