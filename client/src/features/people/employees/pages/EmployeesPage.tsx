import { useState } from "react";
import { FiDollarSign } from "react-icons/fi";

import Button from "../../../../components/Button";
import DialogModal from "../../../../components/DialogModal";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeTable from "../components/EmployeeTable";
import PayrollModal from "../components/PayrollModal";

export default function EmployeesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayrollOpen, setIsPayrollOpen] = useState(false);

  return (
    <section id="employees-page" className="bg-[#F7F7F7] p-6">
      <article className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-text-two font-bold text-[18px] mb-0.5">Employees</h4>
          <p className="text-[#646B72] text-14">Manage your employees</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPayrollOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#FE9F43] bg-white px-3 py-1.75 text-[#E8862A] transition hover:bg-[#FFF7ED]"
          >
            <FiDollarSign size={18} />
            <span>Pay Salaries</span>
          </button>
          <Button name="Add Employee" onClick={() => setIsCreateOpen(true)} />
        </div>
      </article>

      <EmployeeTable />

      {isPayrollOpen && <PayrollModal onClose={() => setIsPayrollOpen(false)} />}

      <DialogModal open={isCreateOpen} onClick={() => setIsCreateOpen(false)}>
        <EmployeeForm onClose={() => setIsCreateOpen(false)} />
      </DialogModal>
    </section>
  );
}
