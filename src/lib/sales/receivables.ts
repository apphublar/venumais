export type ReceivableInstallment = {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  customer: {
    id: string;
    full_name: string;
    phone: string;
    avatar_color: string;
  };
};

function startOfTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysBetween(dueDate: string, today: Date) {
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function installmentDueBucket(dueDate: string) {
  const today = startOfTodayDate();
  const diff = daysBetween(dueDate, today);

  if (diff < 0) {
    return "overdue" as const;
  }

  if (diff === 0) {
    return "today" as const;
  }

  return "future" as const;
}

/** Parcelas vencendo hoje ou em atraso — alvo da cobrança em lote. */
export function filterInstallmentsForDailyCobranca(installments: ReceivableInstallment[]) {
  return installments.filter((installment) => {
    const bucket = installmentDueBucket(installment.due_date);
    return bucket === "today" || bucket === "overdue";
  });
}
