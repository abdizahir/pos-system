import { Outlet } from "react-router-dom";
import SaleTable from "../components/SaleTable";

export default function SalePage() {
  return (
    <section className="bg-[#F7F7F7] p-6">
      <article className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Manage Sale
          </h4>

          <p className="text-[#646B72] text-14">
            Manage your Sale
          </p>
        </div>
      </article>

      <SaleTable />

      {/* View / Resume / Return / Cancel modals (child routes) */}
      <Outlet />
    </section>
  );
}
