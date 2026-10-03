"use client";

import { ShieldCheck, User, Bot, FileText } from "lucide-react";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/services/auditService";

function getIcon(role: string) {
  if (role === "System") return Bot;
  if (role === "Reviewer") return ShieldCheck;
  return User;
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadAuditLogs() {
      const data = await getAuditLogs();
      setAuditLogs(data);
    }

    loadAuditLogs();
  }, []);

  return (
    <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Audit Logs
        </h1>

        <p className="text-gray-500 mt-2">
          Complete record of actions performed within the investigation system.
        </p>
      </div>


      {/* SECURITY SUMMARY */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">
            Total Events
          </p>

          <p className="text-2xl font-bold mt-2">
            {auditLogs.length}
          </p>
        </div>


        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">
            System Events
          </p>

          <p className="text-2xl font-bold mt-2">
            {
              auditLogs.filter(
                (log) => log.role === "System"
              ).length
            }
          </p>
        </div>


        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">
            Human Actions
          </p>

          <p className="text-2xl font-bold mt-2">
            {
              auditLogs.filter(
                (log) => log.role !== "System"
              ).length
            }
          </p>
        </div>

      </div>


      {/* AUDIT TABLE */}

      <div className="bg-white border rounded-xl overflow-hidden">

        <div className="p-6 border-b">
          <h2 className="font-semibold">
            Activity History
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            All important actions are recorded for accountability.
          </p>
        </div>


        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-gray-50 border-b">

              <tr>
                <th className="text-left px-6 py-4 font-medium">
                  Time
                </th>

                <th className="text-left px-6 py-4 font-medium">
                  User
                </th>

                <th className="text-left px-6 py-4 font-medium">
                  Action
                </th>

                <th className="text-left px-6 py-4 font-medium">
                  Target
                </th>

                <th className="text-left px-6 py-4 font-medium">
                  Result
                </th>
              </tr>

            </thead>


            <tbody>

              {auditLogs.map((log) => {

                const Icon = getIcon(log.role);

                return (
                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >

                    {/* TIME */}

                    <td className="px-6 py-5 text-gray-600">
                      {log.timestamp}
                    </td>


                    {/* USER */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-3">

                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                          <Icon size={16} />
                        </div>

                        <div>
                          <p className="font-medium">
                            {log.user}
                          </p>

                          <p className="text-xs text-gray-500">
                            {log.role}
                          </p>
                        </div>

                      </div>

                    </td>


                    {/* ACTION */}

                    <td className="px-6 py-5">

                      <div className="flex items-center gap-2">

                        <FileText size={15} />

                        {log.action}

                      </div>

                    </td>


                    {/* TARGET */}

                    <td className="px-6 py-5 font-mono text-xs">
                      {log.target}
                    </td>


                    {/* RESULT */}

                    <td className="px-6 py-5">

                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          log.result === "Flagged"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {log.result}
                      </span>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>

    </main>
  );
}