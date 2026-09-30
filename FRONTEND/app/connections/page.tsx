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
} from "lucide-react";

import { getConnections } from "@/services/connectionsService";
import { getCases } from "@/services/casesService";

function getIcon(type: string) {
  if (type === "Case") return Folder;
  if (type === "Document") return FileText;
  if (type === "Person") return User;
  if (type === "Location") return MapPin;
  return Calendar;
}

function getNodeColor(type: string) {
  if (type === "Case") return "bg-gray-900 text-white";
  if (type === "Document") return "bg-blue-50 text-blue-700 border-blue-200";
  if (type === "Person") return "bg-purple-50 text-purple-700 border-purple-200";
  if (type === "Location") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function ConnectionsPage() {
  const [data, setData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState("CASE-001");
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    getCases().then((c) => setCases(c || []));
    getConnections().then((res) => setData(res || { nodes: [], edges: [] }));
  }, []);

  const nodes = data.nodes || [];
  const edges = data.edges || [];

  const filteredNodes = nodes.filter((n) => filterType === "ALL" || n.type === filterType);

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections Knowledge Graph</h1>
          <p className="text-gray-500 mt-1">
            Visual relationships linking cases, vaulted evidence, suspect names, and geographic locations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Filter Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border bg-white rounded-lg px-3 py-1.5 text-xs outline-none shadow-xs"
          >
            <option value="ALL">All Nodes ({nodes.length})</option>
            <option value="Case">Cases</option>
            <option value="Document">Documents</option>
            <option value="Person">People</option>
            <option value="Location">Locations</option>
            <option value="Date">Dates</option>
          </select>
        </div>
      </div>

      {/* Selected Case Info */}
      <div className="bg-white border rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-black text-white rounded-xl">
            <Network size={20} />
          </div>
          <div>
            <span className="text-xs font-mono text-gray-400 font-bold">ACTIVE DOSSIER</span>
            <h2 className="font-bold text-base text-gray-900">CASE-001 · Document Fraud Investigation</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
            Active Graph Sync
          </span>
          <span className="text-gray-400 font-mono">
            {edges.length} Linked Relationships
          </span>
        </div>
      </div>

      {/* Graph Visual Explorer */}
      <div className="bg-white border rounded-xl p-6 shadow-xs space-y-6">
        <div>
          <h2 className="font-semibold text-sm text-gray-900">Extracted Investigation Entities</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Select or view entities mapped across the document corpus.
          </p>
        </div>

        {/* Entity Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredNodes.map((node) => {
            const Icon = getIcon(node.type);
            const colorClass = getNodeColor(node.type);

            return (
              <div
                key={node.id}
                className={`border rounded-xl p-4 text-center space-y-2 shadow-xs transition hover:scale-102 ${colorClass}`}
              >
                <div className="w-8 h-8 rounded-full bg-white/80 border flex items-center justify-center mx-auto shadow-xs">
                  <Icon size={16} className="text-gray-900" />
                </div>
                <p className="font-bold text-xs truncate" title={node.label}>
                  {node.label}
                </p>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider opacity-75">
                  {node.type}
                </span>
              </div>
            );
          })}
        </div>

        {/* Relationship Links Table */}
        <div className="border rounded-xl overflow-hidden mt-6">
          <div className="px-5 py-3.5 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="font-semibold text-xs text-gray-700 uppercase tracking-wider">
              Cross-Document Relationships & Inferences ({edges.length})
            </h3>
            <span className="text-[11px] text-gray-400">AI-Extracted Knowledge Graph</span>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {edges.map((edge, idx) => {
              const sourceNode = nodes.find((n) => n.id === edge.from) || { label: edge.from };
              const targetNode = nodes.find((n) => n.id === edge.to) || { label: edge.to };

              return (
                <div
                  key={idx}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">
                      {sourceNode.label}
                    </span>
                    <span className="text-gray-400 flex items-center gap-1 font-mono text-[11px]">
                      — [{edge.label}] — <ArrowRight size={13} />
                    </span>
                    <span className="font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
                      {targetNode.label}
                    </span>
                  </div>

                  <span className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded font-medium">
                    Verified
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border rounded-xl p-5 shadow-xs flex flex-wrap items-center gap-6 text-xs text-gray-600">
        <span className="font-bold text-gray-800">Node Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-900" />
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
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Incident Date</span>
        </div>
      </div>
    </main>
  );
}