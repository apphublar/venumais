"use client";

import { useState } from "react";
import {
  BRAZILIAN_STATES,
  fetchAddressByCep,
  formatCepDisplay,
  getCustomerAddressParts,
  normalizeCep
} from "@/lib/customers/address";
import type { Customer } from "@/lib/database/types";

type CustomerAddressFieldsProps = {
  customer?: Customer;
};

export function CustomerAddressFields({ customer }: CustomerAddressFieldsProps) {
  const initial = getCustomerAddressParts(customer);
  const [postalCode, setPostalCode] = useState(
    initial.postal_code ? formatCepDisplay(initial.postal_code) : ""
  );
  const [street, setStreet] = useState(initial.street ?? "");
  const [number, setNumber] = useState(initial.number ?? "");
  const [complement, setComplement] = useState(initial.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  async function handleLookupCep() {
    setCepError(null);
    setCepLoading(true);

    try {
      const result = await fetchAddressByCep(postalCode);
      setPostalCode(formatCepDisplay(result.postal_code));
      setStreet(result.street);
      setNeighborhood(result.neighborhood);
      setCity(result.city);
      setState(result.state);

      if (result.complement && !complement) {
        setComplement(result.complement);
      }
    } catch (error) {
      setCepError(error instanceof Error ? error.message : "CEP inválido.");
    } finally {
      setCepLoading(false);
    }
  }

  return (
    <div className="vendor-address-section">
      <div className="vendor-section-label vendor-section-label-normal">
        Endereço de entrega <em>(opcional)</em>
      </div>

      <label className="vendor-field">
        <span>CEP</span>
        <div className="vendor-cep-row">
          <input
            inputMode="numeric"
            name="addressPostalCode"
            onChange={(event) => setPostalCode(formatCepDisplay(event.target.value))}
            placeholder="00000-000"
            type="text"
            value={postalCode}
          />
          <button
            className="vendor-button vendor-button-ghost vendor-cep-button"
            disabled={cepLoading || normalizeCep(postalCode).length !== 8}
            onClick={handleLookupCep}
            type="button"
          >
            {cepLoading ? "Buscando..." : "Buscar CEP"}
          </button>
        </div>
      </label>

      {cepError ? (
        <p className="vendor-message vendor-message-error vendor-address-message" role="alert">
          {cepError}
        </p>
      ) : null}

      <label className="vendor-field">
        <span>Endereço</span>
        <input
          name="addressStreet"
          onChange={(event) => setStreet(event.target.value)}
          placeholder="Rua, avenida, travessa..."
          type="text"
          value={street}
        />
      </label>

      <div className="vendor-field-grid">
        <label className="vendor-field">
          <span>Número</span>
          <input
            name="addressNumber"
            onChange={(event) => setNumber(event.target.value)}
            placeholder="Ex.: 123"
            type="text"
            value={number}
          />
        </label>
        <label className="vendor-field">
          <span>Complemento</span>
          <input
            name="addressComplement"
            onChange={(event) => setComplement(event.target.value)}
            placeholder="Apto, bloco, sala..."
            type="text"
            value={complement}
          />
        </label>
      </div>

      <label className="vendor-field">
        <span>Bairro</span>
        <input
          name="addressNeighborhood"
          onChange={(event) => setNeighborhood(event.target.value)}
          placeholder="Bairro"
          type="text"
          value={neighborhood}
        />
      </label>

      <div className="vendor-field-grid">
        <label className="vendor-field">
          <span>Cidade</span>
          <input
            name="addressCity"
            onChange={(event) => setCity(event.target.value)}
            placeholder="Cidade"
            type="text"
            value={city}
          />
        </label>
        <label className="vendor-field">
          <span>Estado</span>
          <select
            name="addressState"
            onChange={(event) => setState(event.target.value)}
            value={state}
          >
            <option value="">UF</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
