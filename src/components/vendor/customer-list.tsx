"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import type { Customer } from "@/lib/database/types";
import type { CustomerBalance } from "@/lib/sales/types";

export function CustomerList({
  balances,
  customers
}: {
  balances: Map<string, CustomerBalance>;
  customers: Customer[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return customers;
    }

    return customers.filter((customer) =>
      customer.full_name.toLowerCase().includes(normalized)
    );
  }, [customers, query]);

  return (
    <section className="vendor-screen-body">
      <div className="vendor-search">
        <VendorIcon name="search" size={18} />
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente"
          type="search"
          value={query}
        />
      </div>

      {filtered.length ? (
        <div className="vendor-list">
          {filtered.map((customer) => {
            const balance = balances.get(customer.id);
            const owed = balance?.owed_amount ?? 0;
            const statusClass = balance?.overdue
              ? "vendor-customer-status-overdue"
              : owed > 0
                ? "vendor-customer-status-open"
                : "vendor-customer-status-ok";

            return (
              <Link href={`/painel/clientes/${customer.id}`} key={customer.id}>
                <VendorCard className="vendor-customer-card">
                  <VendorAvatar
                    color={customer.avatar_color}
                    label={getCustomerInitials(customer.full_name)}
                  />
                  <div className="vendor-customer-card-body">
                    <strong>{customer.full_name}</strong>
                    <span>{customer.phone}</span>
                  </div>
                  <div className="vendor-customer-card-balance">
                    {owed > 0 ? (
                      <>
                        <span>Deve</span>
                        <strong className={statusClass}>{formatBRL(owed)}</strong>
                      </>
                    ) : (
                      <span className={`vendor-customer-status ${statusClass}`}>Em dia</span>
                    )}
                  </div>
                </VendorCard>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="vendor-empty">
          <strong>{query ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</strong>
          <p>
            {query
              ? "Tente outro nome ou limpe a busca."
              : "Cadastre o primeiro cliente da sua loja."}
          </p>
        </div>
      )}
    </section>
  );
}
