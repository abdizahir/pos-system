// client/src/features/finance/pages/AccountStatementPage.tsx
//
// Statement for one bank / wallet / merchant account over a date range,
// with PDF (print) and Excel (CSV) downloads.

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { FaRegFileExcel, FaRegFilePdf } from "react-icons/fa";

import {
  useGetAccountsQuery,
  useGetLedgerStatementQuery,
  type Account,
  type LedgerType,
} from "../../../api/api";
import { shopDetailsLine, useShop } from "../../shop/useShop";
import { writePdfShopHeader } from "../../reports/reportUtils";

// ============================================================
// HELPERS
// ============================================================

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDay(value: string) {
  return formatDate(`${value}T00:00:00`);
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

// "OTHER_INCOME" → "Other Income"; already-readable names are kept
function categoryLabel(value: string) {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Whole-ledger options in the Bank selector: the Cash Register (it has
// no accounts) and every bank / wallet / merchant account combined
const GROUP_OPTIONS: { type: LedgerType; label: string; name: string }[] = [
  { type: "CASH", label: "Cash Register", name: "Cash on hand" },
  { type: "BANK", label: "All Banks", name: "All bank accounts" },
  { type: "WALLET", label: "All Wallets", name: "All wallet accounts" },
  { type: "MERCHANT", label: "All Merchants", name: "All merchant accounts" },
];

const groupValue = (type: LedgerType) => `all:${type}`;

// "HSBC · Main (3298784309485)"
function accountText(account: { bankName: string | null; name: string; number: string }) {
  return account.bankName
    ? `${account.bankName} · ${account.name} (${account.number})`
    : `${account.name} (${account.number})`;
}

// Accounts without a bank name are grouped by their type
function bankOf(account: Pick<Account, "bankName" | "type">) {
  if (account.bankName?.trim()) return account.bankName.trim();
  if (account.type === "WALLET") return "Wallet";
  if (account.type === "MERCHANT") return "Merchant";
  return "Other";
}

const INPUT =
  "w-full py-2 px-3 rounded-lg border border-[#E6EAED] bg-white text-14 text-text-two outline-none focus:border-[#FE9F43] disabled:bg-gray-100";

// ============================================================
// PAGE
// ============================================================

export default function AccountStatementPage() {
  const { shop, name: shopName } = useShop();
  const pdfShop = { name: shopName, details: shopDetailsLine(shop) };
  const { data: accounts = [], isLoading: isAccountsLoading } =
    useGetAccountsQuery();

  // Applied filter lives in the URL so a statement can be shared
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toDateInput(new Date());
  const monthStart = toDateInput(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  // The URL picks the statement:
  //   ?account=12                     one bank / wallet / merchant account
  //   ?type=cash                      the Cash Register
  //   ?type=bank|wallet|merchant      all accounts of that type combined
  // plus optional &from=YYYY-MM-DD&to=YYYY-MM-DD
  const appliedAccountId = Number(searchParams.get("account")) || null;
  const appliedType = (searchParams.get("type") ?? "").toUpperCase();
  const appliedTo = searchParams.get("to") || today;
  // Without a start date, show the month the end date falls in
  const appliedFrom =
    searchParams.get("from") ||
    (searchParams.get("to") ? `${appliedTo.slice(0, 7)}-01` : monthStart);

  const appliedAccount =
    accounts.find((account) => account.id === appliedAccountId) ?? null;

  const appliedGroup = appliedAccountId
    ? undefined
    : GROUP_OPTIONS.find((group) => group.type === appliedType);

  // What the statement is for (null = nothing chosen yet).
  // `combined` = several accounts, so each line shows its account.
  const subject = appliedGroup
    ? {
        title: appliedGroup.label,
        name: appliedGroup.name,
        fileKey: appliedGroup.label.toLowerCase().replace(/\s+/g, "-"),
        combined: appliedGroup.type !== "CASH",
      }
    : appliedAccount
      ? {
          title: `${bankOf(appliedAccount)} - ${appliedAccount.number}`,
          name: appliedAccount.name,
          fileKey: appliedAccount.number,
          combined: false,
        }
      : null;

  // Form state (applied on Submit). undefined = not touched yet, so the
  // selectors follow whatever the URL opened.
  const [from, setFrom] = useState(appliedFrom);
  const [to, setTo] = useState(appliedTo);
  const [bank, setBank] = useState<string | undefined>(undefined);
  const [accountChoice, setAccountChoice] = useState<number | null | undefined>(undefined);
  const [formError, setFormError] = useState("");

  const selectedBank =
    bank ??
    (appliedGroup
      ? groupValue(appliedGroup.type)
      : appliedAccount
        ? bankOf(appliedAccount)
        : "");

  const selectedGroup = GROUP_OPTIONS.find(
    (group) => groupValue(group.type) === selectedBank,
  );

  const selectedAccountId =
    accountChoice === undefined ? (appliedAccount?.id ?? null) : accountChoice;

  const banks = [...new Set(accounts.map(bankOf))].sort((a, b) =>
    a.localeCompare(b),
  );

  const bankAccounts = accounts.filter(
    (account) => bankOf(account) === selectedBank,
  );

  // --------------------------------------------------
  // Statement
  // --------------------------------------------------

  const {
    data: statement,
    isFetching,
    isError,
  } = useGetLedgerStatementQuery(
    {
      type: (appliedGroup?.type ?? appliedAccount?.type ?? "BANK") as LedgerType,
      from: appliedFrom,
      to: appliedTo,
      accountIds: appliedAccount ? [appliedAccount.id] : [],
    },
    { skip: !subject, refetchOnMountOrArgChange: true },
  );

  // Money in only, oldest first (the API returns newest first)
  const transactions = useMemo(
    () =>
      (statement?.transactions ?? [])
        .filter((t) => t.amountIn > 0)
        .reverse(),
    [statement],
  );

  const totalIn = transactions.reduce((sum, t) => sum + t.amountIn, 0);

  // Downloads add the account to the description on combined statements
  const describe = (t: (typeof transactions)[number]) =>
    subject?.combined && t.account
      ? `${t.description} · ${accountText(t.account)}`
      : t.description;
  const summary = statement?.summary;

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!from || !to) {
      setFormError("Choose a start and end date.");
      return;
    }
    if (from > to) {
      setFormError("Start date must be before end date.");
      return;
    }
    if (selectedGroup) {
      setSearchParams(
        { type: selectedGroup.type.toLowerCase(), from, to },
        { replace: true },
      );
      return;
    }

    if (!selectedAccountId) {
      setFormError("Select a bank and an account.");
      return;
    }

    setSearchParams(
      { account: String(selectedAccountId), from, to },
      { replace: true },
    );
  };

  // --------------------------------------------------
  // Downloads
  // --------------------------------------------------

  const statementTitle = subject?.title ?? "";

  const handleExcel = () => {
    if (!subject || !summary) return;

    const rows: (string | number)[][] = [
      ["Statement of Account", statementTitle],
      ["Account name", subject.name],
      ["Period", `${appliedFrom} to ${appliedTo}`],
      [],
      ["Date", "Reference", "Category", "Description", "Type", "Credit (In)"],
      ...transactions.map((t) => [
        toDateInput(new Date(t.date)),
        t.reference ?? "",
        categoryLabel(t.category),
        describe(t),
        t.source,
        t.amountIn.toFixed(2),
      ]),
      ["", "", "", "Total", "", totalIn.toFixed(2)],
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    // BOM so Excel opens UTF-8 correctly
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statement-${subject.fileKey}-${appliedFrom}_${appliedTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // PDF: built in the browser and downloaded directly. The library
  // is loaded only when the button is pressed.
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handlePdf = async () => {
    if (!subject || !summary) return;

    setIsPdfLoading(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 40;

      const top = writePdfShopHeader(doc, pdfShop, marginX);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Statement of Account : ${statementTitle}`, marginX, top);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subject.name, marginX, top + 18);
      doc.text(
        `Period: ${formatDay(appliedFrom)} – ${formatDay(appliedTo)}`,
        marginX,
        top + 32,
      );
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, marginX, top + 46);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: top + 62,
        margin: { left: marginX, right: marginX },
        head: [["Date", "Reference", "Category", "Description", "Type", "Credit (In)"]],
        body: transactions.map((t) => [
          formatDate(t.date),
          t.reference ?? "—",
          categoryLabel(t.category),
          describe(t),
          t.source,
          money(t.amountIn),
        ]),
        foot: [[
          {
            content: `Total · ${transactions.length} transaction${
              transactions.length === 1 ? "" : "s"
            }`,
            colSpan: 5,
          },
          money(totalIn),
        ]],
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [254, 159, 67], textColor: 255 },
        footStyles: { fillColor: [243, 244, 246], textColor: [27, 40, 80] },
        columnStyles: {
          5: { halign: "right" },
        },
        didParseCell: (cell) => {
          if (cell.section !== "body" && cell.column.index === 5) {
            cell.cell.styles.halign = "right";
          }
        },
      });

      doc.save(`statement-${subject.fileKey}-${appliedFrom}_${appliedTo}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      setFormError("Couldn't create the PDF. Please try again.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const canDownload = Boolean(subject && summary);

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <section id="statement-page" className="bg-[#F7F7F7] p-6 print:bg-white print:p-0">
      {/* ================= HEADER ================= */}

      <article
        id="prod-header"
        className="flex items-center justify-between mb-6 print:hidden"
      >
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Account Statement
          </h4>
          <p className="text-[#646B72] text-14">View Your Statement</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Download PDF"
            aria-label="Download PDF"
            onClick={handlePdf}
            disabled={!canDownload || isPdfLoading}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E6EAED] bg-white text-[#E53E3E] transition-colors hover:border-[#E53E3E] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaRegFilePdf size={18} />
          </button>
          <button
            type="button"
            title="Download Excel"
            aria-label="Download Excel"
            onClick={handleExcel}
            disabled={!canDownload}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E6EAED] bg-white text-[#1D7044] transition-colors hover:border-[#1D7044] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaRegFileExcel size={18} />
          </button>
        </div>
      </article>

      {/* ================= FILTERS ================= */}

      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="shadow bg-white rounded-lg border border-[#E6EAED] mb-6 print:hidden"
      >
        <div className="px-5 py-4">
          <h5 className="text-text-two font-semibold text-[15px]">
            Choose Your Date
          </h5>
        </div>
        <hr className="border-t border-[#E6EAED]" />

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="statement-from" className="text-sm font-medium text-text-two">
              Start Date
            </label>
            <input
              id="statement-from"
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => setFrom(e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="statement-to" className="text-sm font-medium text-text-two">
              End Date
            </label>
            <input
              id="statement-to"
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="statement-bank" className="text-sm font-medium text-text-two">
              Bank
            </label>
            <select
              id="statement-bank"
              value={selectedBank}
              onChange={(e) => {
                setBank(e.target.value);
                setAccountChoice(null);
              }}
              disabled={isAccountsLoading}
              className={INPUT}
            >
              <option value="">Select bank</option>
              <optgroup label="All accounts">
                {GROUP_OPTIONS.map((group) => (
                  <option key={group.type} value={groupValue(group.type)}>
                    {group.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Banks">
                {banks.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="statement-account" className="text-sm font-medium text-text-two">
              Account
            </label>
            <select
              id="statement-account"
              value={selectedAccountId ?? ""}
              onChange={(e) => setAccountChoice(e.target.value ? Number(e.target.value) : null)}
              disabled={!selectedBank || Boolean(selectedGroup)}
              className={INPUT}
            >
              <option value="">
                {selectedGroup?.type === "CASH"
                  ? "No account needed"
                  : selectedGroup
                    ? "All accounts"
                    : "Select account"}
              </option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.number})
                  {account.status === "INACTIVE" ? " · Inactive" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="h-9.5 px-5 rounded-lg bg-[#FE9F43] text-white text-14 font-medium cursor-pointer transition-opacity hover:opacity-90"
          >
            Submit
          </button>
        </div>

        {formError && (
          <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
            {formError}
          </p>
        )}
      </form>

      {/* ================= STATEMENT ================= */}

      {!subject ? (
        <article className="shadow bg-white rounded-lg border border-[#E6EAED] px-5 py-10 text-center text-[#646B72] print:hidden">
          {isAccountsLoading
            ? "Loading accounts..."
            : "Choose a date range, bank and account, then press Submit."}
        </article>
      ) : (
        <article
          id="statement"
          className="shadow bg-white rounded-lg border border-[#E6EAED] print:shadow-none print:border-0"
        >
          <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h5 className="text-text-two font-bold text-[16px]">
                Statement of Account : {statementTitle}
              </h5>
              <p className="text-[#646B72] text-14 mt-0.5">
                {subject.name} · {formatDay(appliedFrom)} – {formatDay(appliedTo)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 print:overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Credit (In)</th>
                </tr>
              </thead>

              <tbody>
                {isFetching && !statement ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#646B72]">
                      Loading statement...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                      Failed to load statement.
                    </td>
                  </tr>
                ) : (
                  <>
                    {transactions.length === 0 ? (
                      <tr className="border-b border-gray-100">
                        <td colSpan={6} className="px-6 py-8 text-center text-[#646B72]">
                          No transactions in this period.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="border-b border-gray-100">
                          <td className="px-6 py-3 whitespace-nowrap">{formatDate(t.date)}</td>
                          <td className="px-6 py-3 text-[#646B72]">{t.reference ?? "—"}</td>
                          <td className="px-6 py-3">
                            <span className="inline-flex rounded-full bg-[#FFF4EA] px-2.5 py-0.5 text-xs font-medium text-[#C26A12]">
                              {categoryLabel(t.category)}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            {t.description}
                            {subject.combined && t.account && (
                              <p className="text-xs text-[#94A3B8]">{accountText(t.account)}</p>
                            )}
                          </td>
                          <td className="px-6 py-3 text-[#646B72]">{t.source}</td>
                          <td className="px-6 py-3 text-right tabular-nums text-green-600">
                            {money(t.amountIn)}
                          </td>
                        </tr>
                      ))
                    )}

                    <tr className="bg-gray-50 font-semibold text-text-two">
                      <td className="px-6 py-3" colSpan={5}>
                        Total · {transactions.length} transaction
                        {transactions.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-green-600">
                        {money(totalIn)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
}
