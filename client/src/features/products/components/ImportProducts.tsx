import { type ChangeEvent, useState } from "react";
import { FiDownload, FiUploadCloud, FiX } from "react-icons/fi";

import {
  type ImportProductsResult,
  useImportProductsMutation,
} from "../../../api/api";
import {
  downloadProductTemplate,
  type ParsedProductFile,
  readProductCsv,
} from "../productCsv";

type ImportProductsProps = {
  onClose: () => void;
};

export default function ImportProducts({ onClose }: ImportProductsProps) {
  const [importProducts, { isLoading }] = useImportProductsMutation();

  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedProductFile | null>(null);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<ImportProductsResult | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Let the same file be picked again after fixing it
    e.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setParsed(null);
    setResult(null);
    setFileError("");

    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFileError(
        "Choose a CSV file. In Excel use File → Save As → CSV.",
      );
      return;
    }

    try {
      setParsed(readProductCsv(await file.text()));
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Could not read the file.",
      );
    }
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;

    try {
      const response = await importProducts({ rows: parsed.rows }).unwrap();

      setResult({
        created: response.created,
        skipped: [...parsed.errors, ...response.skipped].sort(
          (a, b) => a.row - b.row,
        ),
      });
      setParsed(null);
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data
        ?.message;
      setFileError(message || "Import failed. Please try again.");
    }
  }

  return (
    <div className="bg-[#F7F7F7] rounded-lg">
      <div
        id="modal-header"
        className="flex items-center justify-between px-5 py-3.75"
      >
        <h4 className="text-lg text-text-two font-semibold">
          Import Products
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
        >
          <FiX size={20} color="white" />
        </button>
      </div>
      <hr className="border-t border-[#D1D5DB]" />

      <div className="max-h-[70vh] overflow-y-auto p-5 flex flex-col gap-4">
        {result ? (
          <>
            <div className="rounded-lg border border-[#E6EAED] bg-white p-4">
              <p className="text-sm font-semibold text-[#1D7044]">
                {result.created} product{result.created === 1 ? "" : "s"}{" "}
                added
              </p>
              {result.skipped.length > 0 && (
                <p className="text-sm text-[#646B72] mt-1">
                  {result.skipped.length} row
                  {result.skipped.length === 1 ? " was" : "s were"} skipped:
                </p>
              )}
            </div>

            {result.skipped.length > 0 && <SkippedTable rows={result.skipped} />}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-[#FE9F43] text-white px-3.5 py-1.75 rounded-[5px] cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-[#646B72] flex flex-col gap-1">
              <p>
                Add many products at once from a CSV file. Each row needs a
                name, category and unit. Missing categories and units are
                created. A quantity is added as stock at its purchase price.
              </p>
              <p>Products whose name or barcode already exists are skipped.</p>
            </div>

            <button
              type="button"
              onClick={downloadProductTemplate}
              className="self-start flex items-center gap-2 text-sm font-semibold text-[#FE9F43] hover:underline cursor-pointer"
            >
              <FiDownload size={16} />
              Download template
            </button>

            <label
              htmlFor="productFile"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#D1D5DB] bg-white px-4 py-8 text-center cursor-pointer transition-colors hover:border-[#FE9F43]"
            >
              <FiUploadCloud size={28} className="text-[#FE9F43]" />
              <span className="text-sm font-medium text-text-two">
                {fileName || "Choose a CSV file"}
              </span>
              <span className="text-xs text-[#646B72]">
                {fileName ? "Click to choose another file" : "Click to browse"}
              </span>
              <input
                id="productFile"
                type="file"
                accept=".csv,text/csv,.txt"
                onChange={handleFile}
                className="sr-only"
              />
            </label>

            {fileError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {fileError}
              </p>
            )}

            {parsed && (
              <>
                <p className="text-sm text-text-two">
                  <span className="font-semibold">{parsed.rows.length}</span>{" "}
                  product{parsed.rows.length === 1 ? "" : "s"} ready to import
                  {parsed.errors.length > 0 && (
                    <>
                      {", "}
                      <span className="font-semibold text-red-600">
                        {parsed.errors.length}
                      </span>{" "}
                      row{parsed.errors.length === 1 ? "" : "s"} with problems
                      (these are left out)
                    </>
                  )}
                </p>
                {parsed.errors.length > 0 && (
                  <SkippedTable rows={parsed.errors} />
                )}
              </>
            )}

            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                disabled={isLoading}
                className="px-3.5 py-1.75 rounded-md bg-text-one text-white cursor-pointer disabled:opacity-50"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isLoading || !parsed || parsed.rows.length === 0}
                className="bg-[#FE9F43] text-white px-3.5 py-1.75 rounded-[5px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SkippedTable({
  rows,
}: {
  rows: { row: number; name: string; reason: string }[];
}) {
  return (
    <div className="max-h-56 overflow-auto rounded-lg border border-[#E6EAED] bg-white">
      <table className="w-full text-sm">
        <thead className="sticky top-0">
          <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
            <th className="px-3 py-2">Row</th>
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.row}-${r.reason}`}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="px-3 py-2 text-[#646B72]">{r.row}</td>
              <td className="px-3 py-2 text-text-two">{r.name || "—"}</td>
              <td className="px-3 py-2 text-red-600">{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
