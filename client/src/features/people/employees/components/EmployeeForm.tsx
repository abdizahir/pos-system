import { type FormEvent, useState } from "react";
import { FiX } from "react-icons/fi";

import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  type Employee,
  type Gender,
} from "../../../../api/api";
import { formatNationalId, isCompleteNationalId } from "../../nationalId";

type EmployeeFormProps = {
  // Omit for "Add Employee", pass one to edit it
  employee?: Employee;
  onClose: () => void;
};

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-[#FE9F43] disabled:bg-gray-100";

export default function EmployeeForm({ employee, onClose }: EmployeeFormProps) {
  const isEdit = employee !== undefined;

  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();
  const isLoading = isCreating || isUpdating;

  const [nationalId, setNationalId] = useState(
    formatNationalId(employee?.nationalId ?? ""),
  );
  const [gender, setGender] = useState<Gender | "">(employee?.gender ?? "");
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const formData = new FormData(event.currentTarget);
    const text = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value.trim() : "";
    };

    const fname = text("fname");
    const lname = text("lname");
    const email = text("email");
    const address = text("address");
    const salaryText = text("salary");
    const salary = Number(salaryText);

    if (!nationalId) return setFormError("National ID is required.");
    if (!isCompleteNationalId(nationalId)) {
      return setFormError("National ID must be 16 digits.");
    }
    if (!fname) return setFormError("First name is required.");
    if (!lname) return setFormError("Last name is required.");
    if (!gender) return setFormError("Please select a gender.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setFormError("Please enter a valid email address.");
    }
    if (!salaryText || !Number.isFinite(salary) || salary < 0) {
      return setFormError("Salary must be 0 or more.");
    }

    const payload = {
      nationalId,
      fname,
      lname,
      gender,
      email: email || null,
      address: address || null,
      salary,
    };

    try {
      if (isEdit) {
        await updateEmployee({ id: employee.id, ...payload }).unwrap();
      } else {
        await createEmployee(payload).unwrap();
      }
      onClose();
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data
          ? String(error.data.message)
          : `Something went wrong while ${isEdit ? "updating" : "creating"} the employee.`;

      setFormError(message);
    }
  };

  return (
    <div className="text-center bg-[#F7F7F7] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.75">
        <h4 className="text-lg text-text-two font-semibold">
          {isEdit ? "Edit Employee" : "Add Employee"}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 bg-red-500 rounded-full cursor-pointer"
          aria-label="Close"
        >
          <FiX size={20} color="white" />
        </button>
      </div>

      <hr className="border-t border-[#D1D5DB]" />

      <form autoComplete="off" onSubmit={handleSubmit}>
        <div className="p-5 max-h-[60vh] overflow-y-auto text-left">
          {/* National ID */}
          <div className="flex flex-col items-start mb-4">
            <label htmlFor="nationalId" className="text-sm font-medium mb-2">
              National ID <span className="text-red-500">*</span>
            </label>
            <input
              id="nationalId"
              name="nationalId"
              type="text"
              inputMode="numeric"
              placeholder="1234-5678-9012-3456"
              value={nationalId}
              onChange={(e) => setNationalId(formatNationalId(e.target.value))}
              maxLength={19}
              autoFocus
              disabled={isLoading}
              className={inputClass}
              required
            />
          </div>

          {/* Names */}
          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            <div className="flex flex-col items-start">
              <label htmlFor="fname" className="text-sm font-medium mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fname"
                name="fname"
                type="text"
                placeholder="Enter first name"
                defaultValue={employee?.fname ?? ""}
                disabled={isLoading}
                className={inputClass}
                required
              />
            </div>
            <div className="flex flex-col items-start">
              <label htmlFor="lname" className="text-sm font-medium mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lname"
                name="lname"
                type="text"
                placeholder="Enter last name"
                defaultValue={employee?.lname ?? ""}
                disabled={isLoading}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Gender */}
          <div className="flex flex-col items-start mb-4">
            <span className="text-sm font-medium mb-2">
              Gender <span className="text-red-500">*</span>
            </span>
            <div className="grid w-full grid-cols-2 gap-2">
              {(["MALE", "FEMALE"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setGender(option)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition cursor-pointer ${
                    gender === option
                      ? "border-[#FE9F43] bg-[#FFF7ED] text-[#E8862A]"
                      : "border-gray-300 bg-white text-[#646B72] hover:bg-gray-50"
                  }`}
                >
                  {option === "MALE" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col items-start mb-4">
            <label htmlFor="email" className="text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              defaultValue={employee?.email ?? ""}
              disabled={isLoading}
              className={inputClass}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col items-start mb-4">
            <label htmlFor="address" className="text-sm font-medium mb-2">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="Enter address"
              defaultValue={employee?.address ?? ""}
              disabled={isLoading}
              className={inputClass}
            />
          </div>

          {/* Salary */}
          <div className="flex flex-col items-start mb-1">
            <label htmlFor="salary" className="text-sm font-medium mb-2">
              Monthly Salary (ETB) <span className="text-red-500">*</span>
            </label>
            <input
              id="salary"
              name="salary"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              defaultValue={employee ? String(Number(employee.salary)) : ""}
              disabled={isLoading}
              className={inputClass}
              required
            />
          </div>
        </div>

        {formError && (
          <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700">
            {formError}
          </p>
        )}

        <hr className="border-t border-[#D1D5DB]" />

        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#FE9F43] text-white px-4 py-2 rounded-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Employee"
                : "Add Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}
