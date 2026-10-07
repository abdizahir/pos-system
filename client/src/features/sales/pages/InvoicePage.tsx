import InvoiceTable from "../components/InvoiceTable";


export default function InvoicePage() {
  return (
    <section id="proud-page" className="bg-[#F7F7F7] p-6">
        <article id="prod-header" className="flex items-center justify-between mb-6">
            <div>
                <h4 className="text-text-two font-bold text-[18px] mb-0.5">Low Stocks</h4>
                <p className="text-[#646B72] text-14">Manage your low stocks</p>
            </div>
        </article>
        <InvoiceTable />
    </section>
  );
}
