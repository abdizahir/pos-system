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
    function onPointerOutside(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          // Show the selected date's month each time the calendar opens
          if (!open) {
            setViewYear(value.getFullYear());
            setViewMonth(value.getMonth());
          }
          setOpen(!open);
        }}
        className="flex items-center gap-2 rounded-lg border border-[#E6EAED] bg-white px-3 py-2 text-sm font-medium text-[#1B2850] shadow-sm transition-colors hover:border-[#FE9F43] hover:text-[#FE9F43] cursor-pointer"
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
        <>
        {/* Phones: dim the page behind the calendar; tap it to close */}
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-label="Choose a date"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E6EAED] bg-white p-5 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-xl sm:p-4 sm:shadow-lg"
        >
          {/* Month / year nav */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={prevMonth}
              className="rounded-lg p-2.5 sm:p-1.5 text-[#646B72] transition-colors hover:bg-[#F7F7F7] hover:text-[#1B2850] cursor-pointer"
            >
              <FiChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-[#1B2850]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={nextMonth}
              disabled={!canNext}
              className={`rounded-lg p-2.5 sm:p-1.5 transition-colors ${
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
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(date);
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-sm transition-colors cursor-pointer disabled:cursor-not-allowed ${
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
              type="button"
              onClick={() => {
                onChange(new Date(today));
                setOpen(false);
              }}
              className="px-3 py-1.5 text-sm sm:text-xs font-semibold text-[#FE9F43] hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
