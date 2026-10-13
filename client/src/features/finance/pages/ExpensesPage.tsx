import Button from "../../../components/Button";
import { useDispatch, useSelector } from "react-redux";
import { closeCreateExpenses, openCreateExpenses } from "../../../store/posSlice";
import DialogModal from "../../../components/DialogModal";
import type { RootState } from "../../../store/store";
import CreateExpenses from "../components/CreateExpenses";
import ExpensesTable from "../components/ExpensesTable";
import { useOpenFromLink } from "../../../components/useOpenFromLink";

export default function ExpensesPage() {
  const dispatch = useDispatch();

  // Open the add form when linked with ?add=1 (e.g. dashboard quick action)
  useOpenFromLink(() => dispatch(openCreateExpenses()));
    const isCreateExpensesModalOpen = useSelector(
        (state: RootState) => state.pos.isCreateExpensesModalOpen,
      );
  return (
    <section id="proud-page" className="bg-[#F7F7F7] p-6">
      <article
        id="prod-header"
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">
            Expenses
          </h4>
          <p className="text-[#646B72] text-14">Manage Your Expenses</p>
        </div>
        <Button
          name="Expenses"
          onClick={() => dispatch(openCreateExpenses())}
        />
      </article>
      <ExpensesTable />
      <DialogModal
        onClick={() => dispatch(closeCreateExpenses())}
        open={isCreateExpensesModalOpen}
      >
        <CreateExpenses />
      </DialogModal>
    </section>
  );
}
