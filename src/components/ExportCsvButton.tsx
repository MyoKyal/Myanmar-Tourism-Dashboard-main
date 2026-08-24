"use client";

import { Download } from "lucide-react";

interface ExportCsvButtonProps {
    data: Record<string, unknown>[] | null | undefined;
    filename: string;
    label?: string;
}

function toCsv(data: Record<string, unknown>[]): string {
    const headers = Object.keys(data[0]);
    const escapeCell = (value: unknown) => {
        const str = value === null || value === undefined ? "" : String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = data.map(row => headers.map(h => escapeCell(row[h])).join(","));
    return [headers.join(","), ...rows].join("\n");
}

export function ExportCsvButton({ data, filename, label = "Export CSV" }: ExportCsvButtonProps) {
    const hasData = !!data && data.length > 0;

    const handleExport = () => {
        if (!hasData) return;
        const csv = toCsv(data);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleExport}
            disabled={!hasData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-sm font-medium text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
            <Download className="w-4 h-4" />
            {label}
        </button>
    );
}
