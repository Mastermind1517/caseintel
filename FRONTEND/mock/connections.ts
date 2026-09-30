export const connections = {
  nodes: [
    {
      id: "case-001",
      label: "CASE-001",
      type: "Case",
    },
    {
      id: "doc-001",
      label: "FIR.pdf",
      type: "Document",
    },
    {
      id: "doc-002",
      label: "Investigation Report",
      type: "Document",
    },
    {
      id: "person-001",
      label: "Rahul Sharma",
      type: "Person",
    },
    {
      id: "location-001",
      label: "Siliguri",
      type: "Location",
    },
    {
      id: "date-001",
      label: "12 August 2026",
      type: "Date",
    },
  ],

  edges: [
    {
      from: "case-001",
      to: "doc-001",
      label: "contains",
    },
    {
      from: "case-001",
      to: "doc-002",
      label: "contains",
    },
    {
      from: "doc-001",
      to: "person-001",
      label: "mentions",
    },
    {
      from: "doc-002",
      to: "person-001",
      label: "mentions",
    },
    {
      from: "doc-001",
      to: "location-001",
      label: "location",
    },
    {
      from: "doc-001",
      to: "date-001",
      label: "date",
    },
  ],
};