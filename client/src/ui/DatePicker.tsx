import { useEffect, useRef, useState } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";

type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCells(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    const atOrPastToday =
      viewYear > today.getFullYear() ||
      (viewYear === today.getFullYear() && viewMonth >= today.getMonth());
    if (atOrPastToday) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const canNext =
    !(viewYear === today.getFullYear() && viewMonth >= today.getMonth());

  const cells = buildCells(viewYear, viewMonth);

  const selectedNorm = new Date(value);
  selectedNorm.setHours(0, 0, 0, 0);

  return (
    <div className="relative inline-block" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm font-medium text-[#1B2850] shadow-sm transition-colors hover:border-[#FE9F43] hover:text-[#FE9F43]"
      >
        <FiCalendar size={15} className="shrink-0" />
        {value.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[#E6EAED] bg-white p-4 shadow-lg">
          {/* Month / year nav */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-[#646B72] transition-colors hover:bg-[#F7F7F7] hover:text-[#1B2850]"
            >
              <FiChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-[#1B2850]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={!canNext}
              className={`rounded-lg p-1.5 transition-colors ${
                canNext
                  ? "text-[#646B72] hover:bg-[#F7F7F7] hover:text-[#1B2850]"
                  : "cursor-not-allowed text-[#D1D5DB]"
              }`}
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="mb-1 grid grid-cols-7">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-xs font-medium text-[#8A94A3]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const disabled = date > today;
              const selected = sameDay(date, selectedNorm);
              const isToday = sameDay(date, today);

              return (
                <button
                  key={i}
                  disabled={disabled}
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
                    selected
                      ? "bg-[#FE9F43] font-semibold text-white"
                      : isToday
                        ? "border border-[#FE9F43] font-semibold text-[#FE9F43] hover:bg-[#FFF0E1]"
                        : disabled
                          ? "cursor-not-allowed text-[#D1D5DB]"
                          : "text-[#1B2850] hover:bg-[#F7F7F7]"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-3 border-t border-[#E6EAED] pt-2.5 text-center">
            <button
              onClick={() => {
                onChange(new Date(today));
                setOpen(false);
              }}
              className="text-xs font-semibold text-[#FE9F43] hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
