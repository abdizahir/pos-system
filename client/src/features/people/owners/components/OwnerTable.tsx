import { useState } from "react";
import {
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import { useGetOwnersQuery, type Owner } from "../../../../api/api";
import DialogModal from "../../../../components/DialogModal";
import OwnerForm from "./OwnerForm";
import DeleteOwner from "./DeleteOwner";
import WithdrawalForm from "./WithdrawalForm";
import WithdrawalHistory from "./WithdrawalHistory";
import { useCurrentUser } from "../../../auth/useCurrentUser";

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OwnerTable() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [editing, setEditing] = useState<Owner | null>(null);
  const [deleting, setDeleting] = useState<Owner | null>(null);
  const [withdrawing, setWithdrawing] = useState<Owner | null>(null);
  const [viewing, setViewing] = useState<Owner | null>(null);
  const { isManager } = useCurrentUser();

  const { data: owners = [], isLoading, isError } = useGetOwnersQuery();

  const searchValue = search.trim().toLowerCase();
  const filteredOwners = owners.filter((owner) => {
    if (!searchValue) return true;

    return [
      `${owner.fname} ${owner.lname}`,
      owner.nationalId,
      owner.email ?? "",
      owner.address ?? "",
    ].some((value) => value.toLowerCase().includes(searchValue));
  });

  const totalPages = Math.max(1, Math.ceil(filteredOwners.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const currentOwners = filteredOwners.slice(startIndex, startIndex + rowsPerPage);

  const totalWithdrawn = owners.reduce((sum, owner) => sum + owner.totalWithdrawn, 0);

  return (
    <>
      <DialogModal open={editing !== null} onClick={() => setEditing(null)}>
        {editing && <OwnerForm owner={editing} onClose={() => setEditing(null)} />}
      </DialogModal>

      <DialogModal open={deleting !== null} onClick={() => setDeleting(null)}>
        {deleting && <DeleteOwner owner={deleting} onClose={() => setDeleting(null)} />}
      </DialogModal>

      <DialogModal open={withdrawing !== null} onClick={() => setWithdrawing(null)}>
        {withdrawing && (
          <WithdrawalForm ownerId={withdrawing.id} onClose={() => setWithdrawing(null)} />
        )}
      </DialogModal>

      {viewing && (
        <WithdrawalHistory
          owner={viewing}
          onClose={() => setViewing(null)}
          onWithdraw={() => {
            setWithdrawing(viewing);
            setViewing(null);
          }}
        />
      )}

      <article className="shadow bg-white rounded-lg border border-[#E6EAED]">
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

          {owners.length > 0 && (
            <p className="text-sm text-[#646B72]">
              {owners.length} owner{owners.length === 1 ? "" : "s"} · Total withdrawn{" "}
              <span className="font-semibold text-text-two">{money(totalWithdrawn)}</span>
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
                <th className="px-6 py-4 text-right">Total Withdrawn</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    Loading owners...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-red-500">
                    Failed to load owners.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && currentOwners.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#646B72]">
                    {search ? "No owners found." : "No owners yet. Click “Add Owner” to add one."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                currentOwners.map((owner) => (
                  <tr key={owner.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-[#646B72]">
                      OWN-{String(owner.id).padStart(4, "0")}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#212529]">
                      {owner.nationalId}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#212529]">
                      {owner.fname} {owner.lname}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          owner.gender === "MALE"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-pink-50 text-pink-700"
                        }`}
                      >
                        {owner.gender === "MALE" ? "Male" : "Female"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#646B72]">{owner.email || "-"}</td>
                    <td className="px-6 py-4 text-[#646B72]">{owner.address || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-medium tabular-nums text-[#212529]">
                        {money(owner.totalWithdrawn)}
                      </p>
                      {owner.withdrawalCount > 0 && (
                        <p className="text-xs text-[#8A94A3]">
                          {owner.withdrawalCount} withdrawal{owner.withdrawalCount === 1 ? "" : "s"}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title="View withdrawal history"
                          onClick={() => setViewing(owner)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#3675DF] hover:text-white transition-colors cursor-pointer"
                        >
                          <FiEye size={15} />
                        </button>
                        {isManager && (
                        <button
                          type="button"
                          title="Make withdrawal"
                          onClick={() => setWithdrawing(owner)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <FiArrowUpRight size={15} />
                        </button>
                        )}
                        <button
                          type="button"
                          title="Edit owner"
                          onClick={() => setEditing(owner)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E6EAED] text-[#646B72] hover:bg-[#FE9F43] hover:text-white transition-colors cursor-pointer"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          title="Delete owner"
                          onClick={() => setDeleting(owner)}
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
