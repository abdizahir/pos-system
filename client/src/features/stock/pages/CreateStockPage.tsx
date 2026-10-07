import { FiArrowLeft, FiInfo } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import StockForm from "../components/StockForm";

export default function CreateStockPage() {
  const navigate = useNavigate();

  return (
    <section className="bg-[#F7F7F7] p-6">
      <article className="flex items-center justify-between">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Opening Stock
          </h4>
          <p className="text-[#646B72] text-14">
            Add opening inventory with accounting entries
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/stock")}
          className="px-3.5 py-1.75 flex items-center gap-2 rounded-md bg-text-one text-white cursor-pointer"
        >
          <FiArrowLeft color="white" />
          <span className="text-[13.6px]">
            Back to Stock
          </span>
        </button>
      </article>

      <article className="mt-5 bg-white rounded-md shadow">
        <div className="flex items-center gap-2 px-5 py-4">
          <FiInfo
            size={20}
            color="#FE9F43"
          />
          <h5 className="text-lg text-text-two font-bold text-[16px]">
            Opening Stock Details
          </h5>
        </div>

        <hr className="border-t border-[#D1D5DB]" />

        <StockForm />
      </article>
    </section>
  );
}
