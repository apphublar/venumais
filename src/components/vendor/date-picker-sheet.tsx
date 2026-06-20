"use client";

import { useState } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { addDays, toISODate } from "@/lib/sales/format";

const DAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"];
const QUICK_CHIPS: Array<[string, number]> = [
  ["+7 dias", 7],
  ["+15 dias", 15],
  ["+30 dias", 30]
];

function parseLocalDate(iso: string): Date {
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toMonthLabel(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type DatePickerSheetProps = {
  open: boolean;
  value: string | null;
  min: string;
  refBase: string;
  onClose: () => void;
  onPick: (isoDate: string) => void;
};

export function DatePickerSheet({
  open,
  value,
  min,
  refBase,
  onClose,
  onPick
}: DatePickerSheetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const baseDate = value ? parseLocalDate(value) : parseLocalDate(min);
  const [viewYear, setViewYear] = useState(baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(baseDate.getMonth());

  if (!open) return null;

  const minDate = parseLocalDate(min);
  const refDate = parseLocalDate(refBase);
  const selectedDate = value ? parseLocalDate(value) : null;

  // Build calendar grid cells
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function handleDayClick(day: number) {
    const picked = new Date(viewYear, viewMonth, day);
    onPick(toISODate(picked));
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="vendor-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="datepicker-title"
        aria-modal="true"
        className="vendor-sheet vendor-datepicker-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="vendor-sheet-handle" />
        <div className="vendor-sheet-header">
          <h2 id="datepicker-title">Escolher data</h2>
          <button
            aria-label="Fechar"
            className="vendor-dashboard-icon-btn"
            onClick={onClose}
            type="button"
          >
            <VendorIcon name="x" size={18} />
          </button>
        </div>

        {/* Quick-add chips relative to previous installment (or today) */}
        <div className="vendor-datepicker-chips">
          {QUICK_CHIPS.map(([label, days]) => (
            <button
              className="vendor-datepicker-chip"
              key={days}
              onClick={() => onPick(toISODate(addDays(refDate, days)))}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Month navigation */}
        <div className="vendor-datepicker-nav">
          <button
            aria-label="Mês anterior"
            className="vendor-datepicker-nav-btn"
            onClick={prevMonth}
            type="button"
          >
            <VendorIcon name="chevL" size={18} />
          </button>
          <span className="vendor-datepicker-month-label">
            {toMonthLabel(viewYear, viewMonth)}
          </span>
          <button
            aria-label="Próximo mês"
            className="vendor-datepicker-nav-btn"
            onClick={nextMonth}
            type="button"
          >
            <VendorIcon name="chevR" size={18} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="vendor-datepicker-grid">
          {DAY_HEADERS.map((header, i) => (
            <div className="vendor-datepicker-dow" key={i}>
              {header}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="vendor-datepicker-grid vendor-datepicker-days">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={i} />;
            }

            const cellDate = new Date(viewYear, viewMonth, day);
            cellDate.setHours(0, 0, 0, 0);
            const disabled = cellDate < minDate;
            const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;
            const isToday = isSameDay(cellDate, today);

            return (
              <button
                className={[
                  "vendor-datepicker-day",
                  disabled ? "vendor-datepicker-day-disabled" : "",
                  isSelected ? "vendor-datepicker-day-selected" : "",
                  isToday && !isSelected ? "vendor-datepicker-day-today" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={disabled}
                key={i}
                onClick={() => handleDayClick(day)}
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
