const AVATAR_COLORS = [
  "#2a6fdb",
  "#e8702a",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#0d7a50",
  "#b45309",
  "#22a06b"
];

export function getCustomerInitials(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "CL";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function pickAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function formatBirthDate(date: string | null) {
  if (!date) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day);

  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
}
