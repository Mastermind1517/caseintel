import { API_BASE_URL, AI_SERVICE_URL } from "@/config/api";

const fallbackAiAnalysis = {
  documentId: "DOC-001",
  processingStatus: "complete",
  processingStages: [
    { name: "Document uploaded", status: "complete" },
    { name: "Document classified", status: "complete" },
    { name: "OCR processing", status: "complete" },
    { name: "Entity extraction", status: "complete" },
    { name: "Inconsistency check", status: "complete" },
  ],
  documentType: "FIR",
  language: "English",
  ocrConfidence: 96,
  summary:
    "The document records an incident in Siliguri involving Rahul Sharma on 12 August 2026.",
  extractedText: "FIRST INFORMATION REPORT\nCase Number: CASE-001\nIncident Date: 12 August 2026\nLocation: Siliguri\nPerson: Rahul Sharma\nThe incident was reported and recorded for further investigation.",
  translation: "FIRST INFORMATION REPORT\nCase Number: CASE-001\nIncident Date: 12 August 2026\nLocation: Siliguri\nPerson: Rahul Sharma\nThe incident was reported and recorded for further investigation.",
  entities: {
    people: ["Rahul Sharma"],
    locations: ["Siliguri"],
    dates: ["12 August 2026"],
    organizations: ["Cyber Crime"],
  },
  issues: [],
};

export async function getAIAnalysis(documentId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/analysis/${documentId}`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch AI analysis from API, using fallback data:", e);
  }
  return {
    ...fallbackAiAnalysis,
    documentId,
  };
}

export async function getSupportedLanguages() {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/languages`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch languages from AI service, using default list:", e);
  }
  return [
    { code: "auto", label: "Auto-detect", engine: "Heuristic" },
    { code: "hi", label: "Hindi (हिन्दी)", engine: "PaddleOCR" },
    { code: "bn", label: "Bengali (বাংলা)", engine: "Tesseract" },
    { code: "ta", label: "Tamil (தமிழ்)", engine: "PaddleOCR" },
    { code: "te", label: "Telugu (తెలుగు)", engine: "PaddleOCR" },
    { code: "kn", label: "Kannada (ಕನ್ನಡ)", engine: "PaddleOCR" },
    { code: "en", label: "English", engine: "PaddleOCR" },
  ];
}