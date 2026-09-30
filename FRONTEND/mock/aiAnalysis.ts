export const aiAnalysis = {
  documentId: "DOC-001",
  processingStatus: "complete",

  processingStages: [
    {
      name: "Document uploaded",
      status: "complete",
    },
    {
      name: "Document classified",
      status: "complete",
    },
    {
      name: "OCR processing",
      status: "complete",
    },
    {
      name: "Entity extraction",
      status: "complete",
    },
    {
      name: "Inconsistency check",
      status: "complete",
    },
  ],

  documentType: "FIR",
  language: "English",
  ocrConfidence: 96,

  summary:
    "The document records an incident reported in Siliguri involving Rahul Sharma on 12 August 2026.",

  entities: {
    people: ["Rahul Sharma"],
    locations: ["Siliguri"],
    dates: ["12 August 2026"],
    organizations: [],
  },

  issues: [],
};