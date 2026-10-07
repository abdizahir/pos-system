import { useState } from "react";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiDollarSign,
  FiChevronRight,
  FiEdit2,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import {
  useGetEmployeesQuery,
  useGetSalaryPaymentsQuery,
  type Employee,
} from "../../../../api/api";
import { currentPeriod, periodLabel } from "../payroll";
import DialogModal from "../../../../components/DialogModal";
import EmployeeForm from "./EmployeeForm";
import DeleteEmployee from "./DeleteEmployee";
import PayrollModal from "./PayrollModal";

function money(value: number | string) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function EmployeeTable() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [paying, setPaying] = useState<Employee | null>(null);

  // Salary status for this month
  const period = currentPeriod();
  const { data: payments = [] } = useGetSalaryPaymentsQuery(period);
  const paidIds = new Set(payments.map((payment) => payment.employeeId));

  const { data: employees = [], isLoading, isError } = useGetEmployeesQuery();

  // ==================================================
  // SEARCH
  // ==================================================

  const searchValue = search.trim().toLowerCase();

  const filteredEmployees = employees.filter((employee) => {
    if (!searchValue) return true;

    return [
      `${employee.fname} ${employee.lname}`,
      employee.nationalId,
      employee.email ?? "",
      employee.address ?? "",
    ].some((value) => value.toLowerCase().includes(searchValue));
  });

  // ==================================================
  // PAGINATION
  // ==================================================

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + rowsPerPage);

  const totalPayroll = employees.reduce((sum, employee) => sum + Number(employee.salary), 0);

  return (
    <>
      {/* Edit */}
      <DialogModal open={editing !== null} onClick={() => setEditing(null)}>
        {editing && <EmployeeForm employee={editing} onClose={() => setEditing(null)} />}
      </DialogModal>

      {/* Pay one employee */}
      {paying && (
        <PayrollModal employeeIds={[paying.id]} onClose={() => setPaying(null)} />
      )}

      {/* Delete */}
      <DialogModal open={deleting !== null} onClick={() => setDeleting(null)}>
        {deleting && <DeleteEmployee employee={deleting} onClose={() => setDeleting(null)} />}
      </DialogModal>

      <article
        id="employee-table"
        className="shadow bg-white rounded-lg border border-[#E6EAED]"
      >
        {/* Header */}
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="search-input relative">
            <FiSearch
              size={14}
              color="#A6AAAF"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              className="w-60 py-2 pr-3.5 pl-7.5 rounded-lg border border-[#E6EAED] text-text-two text-14 outline-none focus:border-[#FE9F43]"
              type="search"
              placeholder="Search name, ID, email..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {employees.length > 0 && (
            <p className="text-sm text-[#646B72]">
              {employees.length} employee{employees.length === 1 ? "" : "s"} · Monthly payroll{" "}
              <span className="font-semibold text-text-two">{money(totalPayroll)}</span>
            </p>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">National ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Salary</th>
                <th className="px-6 py-4">{periodLabel(period)}</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    Loading employees...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-red-500">
                    Failed to load employees.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && currentEmployees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-[#646B72]">
                    {search ? "No employees found." : "No employees yet. Click “Add Employee” to add one."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                currentEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-[#646B72]">
                      EMP-{String(employee.id).padStart(4, "0")}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#212529]">
                      {employee.nationalId}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#212529]">
                      {employee.fname} {employee.lname}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          employee.gender === "MALE"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-pink-50 text-pink-700"
                        }`}
                      >
                        {employee.gender === "MALE" ? "Male" : "Female"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#646B72]">{employee.email || "-"}</td>
                    <td className="px-6 py-4 text-[#646B72]">{employee.address || "-"}</td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums text-[#212529]">
                      {money(employee.salary)}
                    </td>
                    <td className="px-6 py-4">
                      {paidIds.has(employee.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <FiCheckCircle size={12} /> Paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title={paidIds.has(employee.id) ? "Salary paid this month" : "Pay salary"}
                          onClick={() => setPaying(employee)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <FiDollarSign size={15} />
                        </button>
                        <button
                          type="button"
                          title="Edit employee"
                          onClick={() => setEditing(employee)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          title="Delete employee"
                          onClick={() => setDeleting(employee)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row items-center justify-between px-5 py-4 border-t border-[#E6EAED]">
          <div className="flex items-center gap-2 text-sm text-[#646B72]">
            <span>Rows Per Page:</span>
            <select disabled className="border border-[#E6EAED] rounded-lg pt-1 pb-1 text-12">
              <option>10</option>
            </select>
            <span>Entries</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-6.25 h-6.25 rounded-[85px] text-12 flex items-center justify-center ${
                    safeCurrentPage === page
                      ? "bg-[#FE9F43] border border-[#FE9F43] text-white"
                      : "bg-[rgba(145,158,171,0.3)] text-[#5B6670] hover:bg-[#FE9F43] hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="w-6.25 h-6.25 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </article>
    </>
  );
}
