"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  MapPin,
  User,
  Calendar,
  Folder,
  Network,
  ArrowRight,
  Shield,
  Building,
  Layers,
  Filter,
} from "lucide-react";

import { getConnections } from "@/services/connectionsService";
import { getCases } from "@/services/casesService";

function getIcon(type: string) {
  if (type === "Case") return Folder;
  if (type === "Document") return FileText;
  if (type === "Person") return User;
  if (type === "Location") return MapPin;
  if (type === "Organization") return Building;
  return Calendar;
}

function getNodeColor(type: string) {
  if (type === "Case") return "bg-gray-900 text-white border-gray-900";
  if (type === "Document") return "bg-blue-50 text-blue-700 border-blue-200";
  if (type === "Person") return "bg-purple-50 text-purple-700 border-purple-200";
  if (type === "Location") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "Organization") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function ConnectionsPage() {
  const [data, setData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCases().then((c) => setCases(c || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    getConnections(selectedCase)
      .then((res) => {
        setData(res || { nodes: [], edges: [] });
      })
      .finally(() => setLoading(false));
  }, [selectedCase]);

  const nodes = data.nodes || [];
  const edges = data.edges || [];

  const filteredNodes = nodes.filter((n) => filterType === "ALL" || n.type === filterType);
  const activeCaseInfo = cases.find((c) => c.id === selectedCase);

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Connections Knowledge Graph
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Visual intelligence linking investigation dossiers, vaulted evidence, suspect identities, organizations, and event locations.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Case Scope Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-xs">
            <Layers size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Case Scope:</span>
            <select
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">All Cases (Unified Graph)</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-xs">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Entity:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">All Entities ({nodes.length})</option>
              <option value="Case">Cases</option>
              <option value="Document">Documents</option>
              <option value="Person">People</option>
              <option value="Location">Locations</option>
              <option value="Organization">Organizations</option>
              <option value="Date">Dates</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected Scope Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
            <Network size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                ACTIVE INTELLIGENCE SCOPE
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {selectedCase === "ALL" ? "GLOBAL UNIFIED" : selectedCase}
              </span>
            </div>
            <h2 className="font-bold text-base text-slate-900 mt-0.5">
              {selectedCase === "ALL"
                ? "Unified Cross-Case Intelligence Graph"
                : `${activeCaseInfo?.name || selectedCase} · Investigation Graph`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedCase === "ALL"
                ? `Synthesizing relations across ${cases.length} cases and ${nodes.filter((n) => n.type === "Document").length} vaulted documents.`
                : `Department: ${activeCaseInfo?.department || "Special Investigation"} · Officer: ${activeCaseInfo?.officer || "Assigned Investigator"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/60">
            {loading ? "Refreshing..." : "Active Graph Sync"}
          </span>
          <span className="text-slate-500 font-mono">
            {edges.length} Linked Relationships
          </span>
        </div>
      </div>

      {/* Graph Visual Explorer */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm text-slate-900">Extracted Investigation Entities</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identities, legal exhibits, locations, and organizations linked across the corpus.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing {filteredNodes.length} of {nodes.length} nodes
          </span>
        </div>

        {/* Entity Nodes Grid */}
        {filteredNodes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredNodes.map((node) => {
              const Icon = getIcon(node.type);
              const colorClass = getNodeColor(node.type);

              return (
                <div
                  key={node.id}
                  className={`border rounded-xl p-4 text-center space-y-2 shadow-xs transition hover:scale-102 cursor-default ${colorClass}`}
                >
                  <div className="w-8 h-8 rounded-full bg-white/90 border border-current/20 flex items-center justify-center mx-auto shadow-xs">
                    <Icon size={16} className={node.type === "Case" ? "text-slate-900" : "text-current"} />
                  </div>
                  <p className="font-bold text-xs truncate" title={node.label}>
                    {node.label}
                  </p>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider opacity-80">
                    {node.type}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 border border-dashed rounded-xl">
            <Network size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No entity nodes found for this filter.</p>
          </div>
        )}

        {/* Relationship Links Table */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden mt-6">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
            <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
              Cross-Document Relationships & Inferences ({edges.length})
            </h3>
            <span className="text-[11px] text-slate-400">AI-Extracted Knowledge Graph</span>
          </div>

          {edges.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {edges.map((edge, idx) => {
                const sourceNode = nodes.find((n) => n.id === edge.from) || { label: edge.from };
                const targetNode = nodes.find((n) => n.id === edge.to) || { label: edge.to };

                return (
                  <div
                    key={idx}
                    className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                        {sourceNode.label}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                        — [{edge.label}] — <ArrowRight size={13} />
                      </span>
                      <span className="font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                        {targetNode.label}
                      </span>
                    </div>

                    <span className="inline-flex self-start sm:self-auto text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded font-medium">
                      Verified
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No relational connections found for the selected scope.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-wrap items-center gap-6 text-xs text-slate-600">
        <span className="font-bold text-slate-800">Node Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-900" />
          <span>Case</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Document</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Person / Accused</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Location / PS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span>Organization</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Incident Date</span>
        </div>
      </div>
    </main>
  );
}