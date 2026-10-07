import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCreditCard,
  FiDollarSign,
  FiShoppingBag,
  FiSmartphone,
} from "react-icons/fi";

import {
  useGetLedgerBalancesQuery,
  type LedgerType,
} from "../../../api/api";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function OverviewCard({
  title,
  value,
  note,
  icon,
  tone,
  type,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone: string;
  type: LedgerType;
}) {
  return (
    <Link
      to={`/money-overview/${type.toLowerCase()}/statement`}
      className="group block rounded-xl border border-[#E6EAED] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FE9F43]/60 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#646B72]">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#1B2850] tabular-nums">
            {value}
          </p>
        </div>
        <span className={`rounded-xl p-3 ${tone}`}>{icon}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-[#8A94A3]">{note}</p>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#FE9F43] opacity-70 transition group-hover:opacity-100">
          Statement
          <FiArrowRight
            size={13}
            className="transition group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

export default function MoneyOverviewPage() {
  // Balances come from posted journal lines (ledger 1000-1030)
  const { data: balances, isLoading } = useGetLedgerBalancesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const balanceFor = (type: LedgerType) =>
    isLoading ? "Loading..." : money(balances?.[type] ?? 0);

  return (
    <section className="min-h-full bg-[#F7F7F7] p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#FE9F43]">
            Finance
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#212529]">
            Store overview
          </h1>
          <p className="mt-1 text-sm text-[#646B72]">
            Your current store balances at a glance. Click a card to open its
            statement.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            type="CASH"
            title="Cash in Drawer"
            value={balanceFor("CASH")}
            note="Ledger 1000 · Cash"
            icon={<FiDollarSign size={22} />}
            tone="bg-[#FFF0E1] text-[#F27D16]"
          />
          <OverviewCard
            type="BANK"
            title="Banks"
            value={balanceFor("BANK")}
            note="Ledger 1010 · Bank Accounts"
            icon={<FiCreditCard size={22} />}
            tone="bg-[#E8F1FF] text-[#3675DF]"
          />
          <OverviewCard
            type="WALLET"
            title="Wallets"
            value={balanceFor("WALLET")}
            note="Ledger 1020 · Mobile Wallets"
            icon={<FiSmartphone size={22} />}
            tone="bg-[#F1EBFF] text-[#805AD5]"
          />
          <OverviewCard
            type="MERCHANT"
            title="Merchants"
            value={balanceFor("MERCHANT")}
            note="Ledger 1030 · Merchant Accounts"
            icon={<FiShoppingBag size={22} />}
            tone="bg-[#FDECF3] text-[#D53F8C]"
          />
        </div>
      </div>
    </section>
  );
}
