"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  FileText,
  AlertTriangle,
  FolderPlus,
  Clock,
  Filter,
} from "lucide-react";

import { getTimeline } from "@/services/timelineService";
import { getCases } from "@/services/casesService";

function getIcon(type: string) {
  if (type === "AI Alert") return AlertTriangle;
  if (type === "Document") return FileText;
  if (type === "Case") return FolderPlus;
  return Calendar;
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<string>("ALL");

  useEffect(() => {
    getCases().then((c) => setCases(c || []));
  }, []);

  useEffect(() => {
    getTimeline(selectedCase === "ALL" ? undefined : selectedCase).then((t) =>
      setTimeline(t || [])
    );
  }, [selectedCase]);

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Case Timeline</h1>
          <p className="text-gray-500 mt-1">
            Chronological audit of investigation milestones, evidence uploads, and AI flags.
          </p>
        </div>

        {/* Case Filter */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-xs shadow-xs">
          <Filter size={14} className="text-gray-400" />
          <span className="font-semibold text-gray-600">Filter Case:</span>
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="outline-none bg-transparent font-medium text-gray-900 cursor-pointer"
          >
            <option value="ALL">All Active Cases</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white border rounded-xl p-8 shadow-xs">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gray-200" />

          <div className="space-y-8">
            {timeline.map((event, idx) => {
              const Icon = getIcon(event.type);

              return (
                <div key={event.id || idx} className="relative flex gap-5 items-start">
                  {/* Icon */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-white border flex items-center justify-center shadow-xs shrink-0">
                    <Icon
                      size={16}
                      className={
                        event.type === "AI Alert"
                          ? "text-red-500"
                          : event.type === "Document"
                          ? "text-blue-500"
                          : "text-gray-700"
                      }
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-gray-50/60 hover:bg-gray-50 p-4 rounded-xl border transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <span className="text-[11px] font-mono text-gray-400">
                          {event.date}
                        </span>
                        <h3 className="font-semibold text-sm text-gray-900 mt-0.5">
                          {event.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {event.caseId && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                            {event.caseId}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            event.type === "AI Alert"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {event.type}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {timeline.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No events recorded for this selection.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}