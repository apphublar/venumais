"use client";

import { useEffect, useMemo, useState } from "react";
import { VendorIcon } from "@/components/vendor/icon";
import { formatBRL } from "@/lib/products/format";
import { addDays, splitInstallments, toISODate } from "@/lib/sales/format";

type InstallmentDraft = {
  uid: string;
  due_date: string;
  amount: number;
};

function buildDefaultInstallments(total: number, count = 2): InstallmentDraft[] {
  const amounts = splitInstallments(total, count);
  return amounts.map((amount, index) => ({
    uid: `inst-${index + 1}`,
    due_date: toISODate(addDays(new Date(), index === 0 ? 7 : 30)),
    amount
  }));
}

export function ClientCartInstallmentPlan({
  onChange,
  total
}: {
  onChange: (installments: Array<{ installment_number: number; due_date: string; amount: number }>) => void;
  total: number;
}) {
  const [rows, setRows] = useState<InstallmentDraft[]>(() => buildDefaultInstallments(total, 2));

  const emitChange = (nextRows: InstallmentDraft[]) => {
    onChange(
      nextRows.map((row, index) => ({
        installment_number: index + 1,
        due_date: row.due_date,
        amount: row.amount
      }))
    );
  };

  useEffect(() => {
    const nextRows = buildDefaultInstallments(total, 2);
    setRows(nextRows);
    emitChange(nextRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const sum = useMemo(() => rows.reduce((acc, row) => acc + row.amount, 0), [rows]);

  const rebalance = (nextRows: InstallmentDraft[]) => {
    const amounts = splitInstallments(total, nextRows.length);
    const balanced = nextRows.map((row, index) => ({
      ...row,
      amount: amounts[index] ?? row.amount
    }));
    setRows(balanced);
    emitChange(balanced);
  };

  const updateDate = (uid: string, dueDate: string) => {
    const nextRows = rows
      .map((row) => (row.uid === uid ? { ...row, due_date: dueDate } : row))
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    setRows(nextRows);
    emitChange(nextRows);
  };

  const addRow = () => {
    if (rows.length >= 12) return;
    const lastDate = rows[rows.length - 1]?.due_date ?? toISODate(new Date());
    rebalance([
      ...rows,
      {
        uid: `inst-${Date.now()}`,
        due_date: toISODate(addDays(new Date(`${lastDate}T00:00:00`), 30)),
        amount: 0
      }
    ]);
  };

  const removeRow = (uid: string) => {
    if (rows.length <= 2) return;
    rebalance(rows.filter((row) => row.uid !== uid));
  };

  const mismatch = Math.abs(sum - total) > 0.02;

  return (
    <div className="client-cart-installment-plan">
      <div className="client-cart-installment-plan-header">
        <strong>Datas das parcelas</strong>
        <span>
          {rows.length}x · {formatBRL(total)}
        </span>
      </div>

      <div className="client-cart-installment-list">
        {rows.map((row, index) => (
          <div className="client-cart-installment-row" key={row.uid}>
            <span className="client-cart-installment-badge">{index + 1}</span>
            <label className="client-cart-installment-date">
              <span>Vencimento</span>
              <input
                min={toISODate(new Date())}
                onChange={(event) => updateDate(row.uid, event.target.value)}
                type="date"
                value={row.due_date}
              />
            </label>
            <strong>{formatBRL(row.amount)}</strong>
            {rows.length > 2 ? (
              <button
                aria-label="Remover parcela"
                className="client-cart-installment-remove"
                onClick={() => removeRow(row.uid)}
                type="button"
              >
                <VendorIcon name="x" size={14} />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <button className="client-cart-installment-add" onClick={addRow} type="button">
        <VendorIcon name="plus" size={16} />
        Adicionar parcela
      </button>

      {mismatch ? (
        <p className="client-cart-installment-warning">
          A soma das parcelas precisa bater com o total do pedido.
        </p>
      ) : (
        <p className="client-cart-installment-hint">
          A loja precisa autorizar o parcelamento antes de liberar o pagamento.
        </p>
      )}
    </div>
  );
}
