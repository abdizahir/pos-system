import StockTable from "../components/StockTable";

export default function StockPage() {
  return (
    <section className="bg-[#F7F7F7] p-6">
      <article className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Manage Stock
          </h4>

          <p className="text-[#646B72] text-14">Monitor stock levels and manage your inventory</p>
        </div>
      </article>

      <StockTable />
    </section>
  );
}
