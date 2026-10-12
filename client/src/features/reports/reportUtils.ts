// Helpers shared by the report pages (Cash Flow, Close-Out, ...):
// dates, money formatting and the PDF / Excel downloads.

export function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "2026-10-08" → "08 Oct 2026"
export function formatDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ISO timestamp → "08 Oct 2026, 19:35"
export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function money(value: number) {
  const formatted = Math.abs(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "−" : ""}${formatted}`;
}

export function etb(value: number) {
  return `ETB ${money(value)}`;
}

export function percent(part: number, whole: number) {
  return whole ? `${((part / whole) * 100).toFixed(1)}%` : "—";
}

export const REPORT_CARD = "shadow bg-white rounded-lg border border-[#E6EAED]";

export const REPORT_INPUT =
  "w-full py-2 px-3 rounded-lg border border-[#E6EAED] bg-white text-14 text-text-two outline-none focus:border-[#FE9F43]";

// ------------------------------------------------------------
// Excel (CSV that opens directly in Excel)
// ------------------------------------------------------------

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------
// PDF (built in the browser; the library loads only when used)
// ------------------------------------------------------------

export type PdfTable = {
  title?: string;
  head: string[];
  body: string[][];
  // Column indexes to right-align (amounts)
  rightAlign?: number[];
  // Body row indexes to show bold on a grey background (totals)
  boldRows?: number[];
};

export async function downloadPdf(
  fileName: string,
  title: string,
  subtitleLines: string[],
  tables: PdfTable[],
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, marginX, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  let y = 68;
  for (const line of [...subtitleLines, `Generated: ${new Date().toLocaleString("en-GB")}`]) {
    doc.text(line, marginX, y);
    y += 14;
  }
  doc.setTextColor(0);

  const lastY = () =>
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

  let startY = y + 6;

  for (const table of tables) {
    if (table.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(table.title, marginX, startY + 4);
      doc.setFont("helvetica", "normal");
      startY += 12;
    }

    const right = new Set(table.rightAlign ?? []);
    const bold = new Set(table.boldRows ?? []);

    autoTable(doc, {
      startY,
      margin: { left: marginX, right: marginX },
      head: [table.head],
      body: table.body,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [254, 159, 67], textColor: 255 },
      didParseCell: (cell) => {
        if (right.has(cell.column.index)) cell.cell.styles.halign = "right";
        if (cell.section === "body" && bold.has(cell.row.index)) {
          cell.cell.styles.fontStyle = "bold";
          cell.cell.styles.fillColor = [243, 244, 246];
        }
      },
    });

    startY = lastY() + 24;
  }

  doc.save(fileName);
}
