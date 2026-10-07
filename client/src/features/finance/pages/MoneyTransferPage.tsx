import Button from "../../../components/Button";
import { useDispatch, useSelector } from "react-redux";
import { closeCreateMoneyTransfer, openCreateMoneyTransfer } from "../../../store/posSlice";
import DialogModal from "../../../components/DialogModal";
import type { RootState } from "../../../store/store";
import CreateMoneyTransfer from "../components/CreateMoneyTransfer";
import {
  MoneyTransferTable,
} from "../components/MoneyTransferTable";
import { useGetMoneyTransfersQuery } from "../../../api/api";

export default function MoneyTransferPage() {
  const dispatch = useDispatch();
  const isCreateMoneyTransferModalOpen = useSelector(
    (state: RootState) => state.pos.isCreateMoneyTransferModalOpen,
  );
  const {
    data: transfers = [],
    isLoading,
    isError,
  } = useGetMoneyTransfersQuery();

  return (
    <section id="proud-page" className="bg-[#F7F7F7] p-6">
      <article
        id="prod-header"
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Money Transfer
          </h4>
          <p className="text-[#646B72] text-14">Manage Money Transfer List</p>
        </div>
        <Button
          name="Add Money Transfer"
          onClick={() => dispatch(openCreateMoneyTransfer())}
        />
      </article>
      <MoneyTransferTable
        transfers={transfers}
        isLoading={isLoading}
        isError={isError}
      />
      <DialogModal
        onClick={() => dispatch(closeCreateMoneyTransfer())}
        open={isCreateMoneyTransferModalOpen}
      >
        <CreateMoneyTransfer />
      </DialogModal>
    </section>
  );
}
