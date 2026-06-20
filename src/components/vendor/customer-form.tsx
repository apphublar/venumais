"use client";

import { useActionState } from "react";
import { useAuthRedirect } from "@/components/auth/use-auth-redirect";
import { CustomerAddressFields } from "@/components/vendor/customer-address-fields";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorBottomBar } from "@/components/vendor/vendor-bottom-bar";
import { VendorFormShell } from "@/components/vendor/vendor-form-shell";
import type { CustomerActionState } from "@/lib/customers/actions";
import type { Customer } from "@/lib/database/types";

type CustomerFormProps = {
  action: (
    prevState: CustomerActionState,
    formData: FormData
  ) => Promise<CustomerActionState>;
  customer?: Customer;
  submitLabel: string;
};

export function CustomerForm({ action, customer, submitLabel }: CustomerFormProps) {
  const [state, formAction, pending] = useActionState<CustomerActionState, FormData>(
    action,
    {}
  );

  useAuthRedirect(state);

  return (
    <form action={formAction} className="vendor-form-page-form">
      <VendorFormShell
        footer={
          <>
            {state.error ? (
              <p className="vendor-message vendor-message-error" role="alert">
                {state.error}
              </p>
            ) : null}
            <VendorBottomBar
              disabled={pending}
              icon="check"
              label={submitLabel}
              pending={pending}
              type="submit"
            />
          </>
        }
      >
        <label className="vendor-field">
          <span>Nome completo *</span>
          <input
            defaultValue={customer?.full_name ?? ""}
            minLength={2}
            name="fullName"
            placeholder="Ex.: Ana Beatriz"
            required
            type="text"
          />
        </label>

        <label className="vendor-field">
          <span>WhatsApp *</span>
          <input
            defaultValue={customer?.phone ?? ""}
            inputMode="tel"
            name="phone"
            placeholder="(11) 90000-0000"
            required
            type="tel"
          />
        </label>

        <label className="vendor-field">
          <span>
            Email <em>(opcional)</em>
          </span>
          <input
            defaultValue={customer?.email ?? ""}
            inputMode="email"
            name="email"
            placeholder="cliente@email.com"
            type="email"
          />
        </label>

        <label className="vendor-field">
          <span>
            Data de nascimento <em>(opcional)</em>
          </span>
          <input defaultValue={customer?.birth_date ?? ""} name="birthDate" type="date" />
        </label>

        <div className="vendor-hint-card">
          <VendorIcon name="gift" size={17} />
          <p>
            Com a data de aniversário, você recebe um lembrete para fazer promoções para os
            aniversariantes do mês.
          </p>
        </div>

        <CustomerAddressFields customer={customer} />

        <label className="vendor-field">
          <span>
            Observações <em>(opcional)</em>
          </span>
          <textarea
            defaultValue={customer?.notes ?? ""}
            name="notes"
            placeholder="Preferências, anotações..."
            rows={4}
          />
        </label>
      </VendorFormShell>
    </form>
  );
}
