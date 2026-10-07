import Button from "../../../components/Button";
import { useDispatch, useSelector } from "react-redux";
import { closeCreateAccounts, openCreateAccounts } from "../../../store/posSlice";
import DialogModal from "../../../components/DialogModal";
import type { RootState } from "../../../store/store";
import CreateAccounts from "../components/CreateAccounts";
import { BankAccountsTable } from "../components/BankAccountsTable";

export default function BankAccountsPage() {
  const dispatch = useDispatch();
    const isCreateAccountsModalOpen = useSelector(
        (state: RootState) => state.pos.isCreateAccountsModalOpen,
      );
  return (
    <section id="proud-page" className="bg-[#F7F7F7] p-6">
      <article
        id="prod-header"
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Bank Accounts
          </h4>
          <p className="text-[#646B72] text-14">Manage your Accounts List</p>
        </div>
        <Button
          name="Add Account"
          onClick={() => dispatch(openCreateAccounts())}
        />
      </article>
      <BankAccountsTable />
      <DialogModal
        onClick={() => dispatch(closeCreateAccounts())}
        open={isCreateAccountsModalOpen}
      >
        <CreateAccounts />
      </DialogModal>
    </section>
  );
}
