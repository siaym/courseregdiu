"use client";

import * as React from "react";
import { ScrollText, Search } from "lucide-react";
import type { AdminAuditLogRow } from "@/lib/admin/admin-service";

export function AuditLogsView({ logs }: { logs: AdminAuditLogRow[] }) {
  const [search, setSearch] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("all");

  const entityTypes = React.useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) s.add(l.entity_type);
    return Array.from(s).sort();
  }, [logs]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      if (!q) return true;
      return (
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q) ||
        (l.entity_id || "").toLowerCase().includes(q) ||
        (l.reason || "").toLowerCase().includes(q)
      );
    });
  }, [logs, search, entityFilter]);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto py-2">
      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-5 space-y-1">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-[#2b200b] border border-[#78350f] text-amber-400">
            <ScrollText className="h-4 w-4" />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Immutable Administrative Audit Logs
          </h1>
        </div>
        <p className="text-xs text-[#8e9db2]">
          Tamper-protected log of advisor directory changes, roster imports, assignments, batch updates, and semester actions.
        </p>
      </div>

      <div className="bg-[#121827] border border-[#1c263c] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity ID, reason..."
            aria-label="Search audit logs"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#1c263c] bg-[#0b0f19] text-xs text-white"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          aria-label="Filter by entity type"
          className="h-9 rounded-lg border border-[#1c263c] bg-[#0b0f19] px-3 text-xs text-white"
        >
          <option value="all">All Entity Types</option>
          {entityTypes.map((et) => (
            <option key={et} value={et}>
              {et}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-[#1c263c] bg-[#121827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0f1523] border-b border-[#1c263c]">
              <tr>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Timestamp</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Action</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Entity</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Actor</th>
                <th className="px-4 py-3 text-slate-400 uppercase font-semibold">Reason / Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c263c]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#8e9db2]">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-[#172136]/40">
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-400">{l.action}</td>
                    <td className="px-4 py-3 font-mono text-white">
                      {l.entity_type} {l.entity_id ? `• ${l.entity_id}` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {l.actor_role || "admin"} ({l.actor_id ? l.actor_id.slice(0, 8) : "system"})
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-md truncate">
                      {l.reason || (l.after_data ? JSON.stringify(l.after_data) : "—")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
