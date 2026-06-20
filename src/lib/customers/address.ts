import type { Customer } from "@/lib/database/types";

export type CustomerAddressParts = {
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

export type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
] as const;

export function normalizeCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatCepDisplay(value: string) {
  const digits = normalizeCep(value);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function getCustomerAddressParts(customer?: Customer | null): CustomerAddressParts {
  if (!customer) {
    return {
      postal_code: null,
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      city: null,
      state: null
    };
  }

  const hasStructured = Boolean(
    customer.address_postal_code ||
      customer.address_street ||
      customer.address_number ||
      customer.address_complement ||
      customer.address_neighborhood ||
      customer.address_city ||
      customer.address_state
  );

  if (hasStructured) {
    return {
      postal_code: customer.address_postal_code,
      street: customer.address_street,
      number: customer.address_number,
      complement: customer.address_complement,
      neighborhood: customer.address_neighborhood,
      city: customer.address_city,
      state: customer.address_state
    };
  }

  return {
    postal_code: null,
    street: customer.address,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null
  };
}

export function buildFormattedAddress(parts: CustomerAddressParts) {
  const streetLine = [parts.street, parts.number].filter(Boolean).join(", ");
  const cityLine = [parts.city, parts.state].filter(Boolean).join(" — ");
  const cepLine = parts.postal_code ? `CEP ${formatCepDisplay(parts.postal_code)}` : null;

  const formatted = [streetLine, parts.complement, parts.neighborhood, cityLine, cepLine]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");

  return formatted || null;
}

export function parseCustomerAddressForm(formData: FormData): CustomerAddressParts {
  const postal_code = normalizeCep(String(formData.get("addressPostalCode") ?? "")) || null;
  const street = String(formData.get("addressStreet") ?? "").trim() || null;
  const number = String(formData.get("addressNumber") ?? "").trim() || null;
  const complement = String(formData.get("addressComplement") ?? "").trim() || null;
  const neighborhood = String(formData.get("addressNeighborhood") ?? "").trim() || null;
  const city = String(formData.get("addressCity") ?? "").trim() || null;
  const state = String(formData.get("addressState") ?? "").trim().toUpperCase() || null;

  return {
    postal_code,
    street,
    number,
    complement,
    neighborhood,
    city,
    state: state && state.length === 2 ? state : null
  };
}

export async function fetchAddressByCep(cep: string) {
  const digits = normalizeCep(cep);

  if (digits.length !== 8) {
    throw new Error("Informe um CEP com 8 dígitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);

  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP. Tente novamente.");
  }

  const data = (await response.json()) as ViaCepResponse;

  if (data.erro) {
    throw new Error("CEP não encontrado.");
  }

  return {
    postal_code: digits,
    street: data.logradouro || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
    complement: data.complemento || ""
  };
}

export function formatCustomerAddress(customer: Customer) {
  const parts = getCustomerAddressParts(customer);
  return buildFormattedAddress(parts) ?? customer.address;
}
