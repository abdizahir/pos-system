import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import {
  FiBarChart2,
  FiBox,
  FiCheckCircle,
  FiShield,
  FiShoppingCart,
  FiTrendingUp,
} from "react-icons/fi";

import Logo from "../../../components/Logo";
import type { RootState } from "../../../store/store";
import LoginForm from "../components/LoginForm";
import { PRODUCT_NAME, useShop } from "../../shop/useShop";

const FEATURES = [
  { icon: FiShoppingCart, title: "Fast checkout", text: "Scan, sell and take cash, bank or mobile payments." },
  { icon: FiBox, title: "Stock that keeps up", text: "Low-stock and expiry alerts before shelves run empty." },
  { icon: FiBarChart2, title: "Books you can trust", text: "Every sale is recorded — P&L, VAT and close-out reports." },
];

export default function LoginPage() {
  const token = useSelector((state: RootState) => state.auth.token);
  const { name: shopName } = useShop();

  // Already signed in
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ---------------- Brand panel ---------------- */}
      <aside className="relative hidden overflow-hidden bg-[#1B2850] p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#FE9F43]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-112 w-md rounded-full bg-[#3675DF]/25 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <Logo size={44} />
          <div className="leading-tight">
            <p className="text-lg font-bold">{shopName}</p>
            <p className="text-xs text-white/60">Point of sale & accounting</p>
          </div>
        </div>

        <div className="relative my-auto max-w-md py-12">
          <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Run your store,
            <br />
            <span className="text-[#FE9F43]">know your numbers.</span>
          </h1>
          <p className="mt-4 text-base text-white/70">
            Sales, stock, payroll and books in one place — built for shops that move fast.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#FE9F43] ring-1 ring-white/10">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/60">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative sample card */}
        <div className="relative max-w-sm rounded-2xl bg-white/7 p-5 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white/60">Today's profit</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              <FiTrendingUp size={12} /> 12.4%
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">ETB 8,420.00</p>
          <div className="mt-4 flex h-12 items-end gap-1.5">
            {[35, 50, 42, 64, 48, 72, 58, 86, 70, 95].map((height, index) => (
              <span
                key={index}
                className="flex-1 rounded-t bg-linear-to-t from-[#FE9F43]/60 to-[#FE9F43]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ---------------- Form ---------------- */}
      <main className="flex flex-col bg-[#F8F4F0] px-6 py-8 sm:px-10 lg:bg-white">
        <div className="flex items-center gap-2.5 lg:hidden">
          <Logo size={38} />
          <p className="text-lg font-bold text-text-two">{shopName}</p>
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <div className="rounded-3xl bg-white p-7 shadow-xl shadow-black/5 ring-1 ring-[#E6EAED] sm:p-8 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
            <h2 className="text-2xl font-bold tracking-tight text-text-two sm:text-3xl">Welcome back</h2>
            <p className="mb-7 mt-1.5 text-sm text-[#646B72]">Sign in to open your register.</p>

            <LoginForm />
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#8A94A3]">
            <FiShield size={13} />
            Accounts are created by your store administrator.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A0A7AE]">
          <span>© {new Date().getFullYear()} {shopName} · Powered by {PRODUCT_NAME}</span>
          <span className="flex items-center gap-1">
            <FiCheckCircle size={12} className="text-emerald-500" /> Secure sign-in
          </span>
        </div>
      </main>
    </div>
  );
}
