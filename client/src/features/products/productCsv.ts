// Product import / export as CSV files (Excel opens and saves these).

import type { ImportProductRow } from "../../api/api";
import { downloadCsv } from "../reports/reportUtils";

// Column titles used by the template and the export. Import also
// accepts the short names in HEADER_ALIASES.
export const PRODUCT_CSV_HEADERS = [
  "Product Name",
  "Barcode",
  "Category",
  "Unit",
  "Purchase Price",
  "Selling Price",
  "Quantity",
  "Low Stock Limit",
  "VAT (%)",
];

type Field = Exclude<keyof ImportProductRow, "row">;

const HEADER_ALIASES: Record<string, Field> = {
  productname: "productName",
  product: "productName",
  name: "productName",
  barcode: "barcode",
  category: "category",
  unit: "unit",
  purchaseprice: "purchasePrice",
  costprice: "purchasePrice",
  cost: "purchasePrice",
  sellingprice: "sellingPrice",
  saleprice: "sellingPrice",
  price: "sellingPrice",
  quantity: "quantity",
  qty: "quantity",
  initialquantity: "quantity",
  stock: "quantity",
  stockquantity: "quantity",
  lowstocklimit: "lowStockLimit",
  lowstock: "lowStockLimit",
  vat: "vat",
};

const NUMBER_FIELDS = new Set<Field>([
  "purchasePrice",
  "sellingPrice",
  "quantity",
  "lowStockLimit",
  "vat",
]);

const FIELD_LABELS: Record<Field, string> = {
  productName: "Product Name",
  barcode: "Barcode",
  category: "Category",
  unit: "Unit",
  purchasePrice: "Purchase Price",
  sellingPrice: "Selling Price",
  quantity: "Quantity",
  lowStockLimit: "Low Stock Limit",
  vat: "VAT",
};

// ------------------------------------------------------------
// CSV parsing (quoted cells, "" escapes, , ; or tab separators)
// ------------------------------------------------------------

function detectDelimiter(firstLine: string) {
  const counts = [",", ";", "\t"].map((d) => ({
    d,
    n: firstLine.split(d).length,
  }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].d;
}

export function parseCsv(text: string): string[][] {
  // \s also matches the byte-order mark Excel puts at the start
  const clean = text.replace(/^\s*/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function isBlank(cells: string[]) {
  return cells.every((c) => c.trim() === "");
}

// "1,250.50", "1 250", "12,5" -> numbers; anything else -> NaN
function parseNumber(value: string) {
  let v = value.replace(/\s/g, "");
  if (/^-?\d+,\d{1,2}$/.test(v)) {
    v = v.replace(",", ".");
  } else {
    v = v.replaceAll(",", "");
  }
  return v === "" ? NaN : Number(v);
}

export type ParsedProductFile = {
  rows: ImportProductRow[];
  errors: { row: number; name: string; reason: string }[];
};

// Turns the file into rows for the server. Rows with bad numbers
// are reported here and not sent.
export function readProductCsv(text: string): ParsedProductFile {
  const table = parseCsv(text);

  if (table.slice(1).every(isBlank)) {
    throw new Error("The file has no products.");
  }

  const fields = table[0].map(
    (h) => HEADER_ALIASES[h.toLowerCase().replace(/[^a-z]/g, "")],
  );

  const missing = (["productName", "category", "unit"] as const).filter(
    (f) => !fields.includes(f),
  );

  if (missing.length > 0) {
    throw new Error(
      `The file needs these columns: ${missing
        .map((f) => FIELD_LABELS[f])
        .join(", ")}. Download the template to see the layout.`,
    );
  }

  const rows: ImportProductRow[] = [];
  const errors: ParsedProductFile["errors"] = [];

  table.slice(1).forEach((cells, i) => {
    // Blank lines are skipped but still count, so numbers match the file
    if (isBlank(cells)) return;
    const rowNumber = i + 2;
    const values: Partial<Record<Field, string>> = {};

    fields.forEach((field, col) => {
      if (field) values[field] = (cells[col] ?? "").trim();
    });

    const out: ImportProductRow = {
      row: rowNumber,
      productName: values.productName ?? "",
      category: values.category ?? "",
      unit: values.unit ?? "",
    };

    if (values.barcode) out.barcode = values.barcode;

    for (const field of NUMBER_FIELDS) {
      const raw = values[field];
      if (!raw) continue;

      const n = parseNumber(raw);
      if (!Number.isFinite(n)) {
        errors.push({
          row: rowNumber,
          name: out.productName,
          reason: `${FIELD_LABELS[field]} "${raw}" is not a number`,
        });
        return;
      }

      (out as Record<string, unknown>)[field] = n;
    }

    rows.push(out);
  });

  return { rows, errors };
}

// ------------------------------------------------------------
// Downloads
// ------------------------------------------------------------

export function downloadProductTemplate() {
  downloadCsv("products-template.csv", [
    PRODUCT_CSV_HEADERS,
    ["Coca-Cola 500ml", "5449000000996", "Beverages", "Piece", 25, 35, 48, 10, 15],
    ["Rice 1kg", "", "Grocery", "Kg", 90, 110, 20, 5, 0],
  ]);
}

type ExportableProduct = {
  productName: string;
  sku: string;
  barcode: string | null;
  sellingPrice: number | string;
  stockQuantity: number;
  lowStockLimit: number;
  vat: number | string;
  category: { name: string };
  unit: { name: string };
  stockBatches?: { purchasePrice: number | string; createdAt: string }[];
};

// Latest purchase price the product was bought at
function latestPurchasePrice(product: ExportableProduct) {
  const batches = [...(product.stockBatches ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return batches.length > 0 ? Number(batches[0].purchasePrice) : "";
}

// Same columns as the template (plus SKU), so the file can be
// imported into another shop.
export function exportProductsCsv(products: ExportableProduct[]) {
  const today = new Date().toISOString().slice(0, 10);

  downloadCsv(`products-${today}.csv`, [
    ["SKU", ...PRODUCT_CSV_HEADERS],
    ...products.map((p) => [
      p.sku,
      p.productName,
      p.barcode ?? "",
      p.category.name,
      p.unit.name,
      latestPurchasePrice(p),
      Number(p.sellingPrice),
      p.stockQuantity,
      p.lowStockLimit,
      Number(p.vat),
    ]),
  ]);
}
