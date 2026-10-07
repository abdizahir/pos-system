import { useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";

import Button from "../../../../components/Button";
import DialogModal from "../../../../components/DialogModal";
import OwnerForm from "../components/OwnerForm";
import OwnerTable from "../components/OwnerTable";
import WithdrawalForm from "../components/WithdrawalForm";
import { useCurrentUser } from "../../../auth/useCurrentUser";

export default function OwnersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  // Only the manager takes owner withdrawals
  const { isManager } = useCurrentUser();

  return (
    <section id="owners-page" className="bg-[#F7F7F7] p-6">
      <article className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">Owners</h4>
          <p className="text-[#646B72] text-14">Manage business owners and their withdrawals</p>
        </div>
        <div className="flex items-center gap-3">
          {isManager && (
          <button
            type="button"
            onClick={() => setIsWithdrawOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#FE9F43] bg-white px-3 py-1.75 text-[#E8862A] transition hover:bg-[#FFF7ED]"
          >
            <FiArrowUpRight size={18} />
            <span>Make Withdrawal</span>
          </button>
          )}
          <Button name="Add Owner" onClick={() => setIsCreateOpen(true)} />
        </div>
      </article>

      <OwnerTable />

      <DialogModal open={isCreateOpen} onClick={() => setIsCreateOpen(false)}>
        <OwnerForm onClose={() => setIsCreateOpen(false)} />
      </DialogModal>

      <DialogModal open={isWithdrawOpen} onClick={() => setIsWithdrawOpen(false)}>
        <WithdrawalForm onClose={() => setIsWithdrawOpen(false)} />
      </DialogModal>
    </section>
  );
}
