"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientOverlay } from "@/components/client/client-overlay";
import { ClientScreenHeader } from "@/components/client/client-screen-header";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorSectionLabel } from "@/components/vendor/section-label";
import {
  clientSignOutAction,
  deleteClientPortalAccessAction,
  requestClientAccountChangeAction,
  updateClientPasswordAction,
  updateClientProfileAction
} from "@/lib/client/actions";
import { getCustomerInitials } from "@/lib/customers/format";
import { formatBRL } from "@/lib/products/format";
import type { PortalCustomer, PublicStore } from "@/lib/client/queries";

function ContaField({
  inputMode,
  label,
  onChange,
  optional,
  placeholder,
  readOnly,
  value
}: {
  inputMode?: "email" | "tel" | "numeric" | "text";
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  value: string;
}) {
  return (
    <label className="client-conta-field">
      <span>
        {label}{" "}
        {optional ? <em>(opcional)</em> : null}
      </span>
      <input
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        value={value}
      />
    </label>
  );
}

export function ClientConta({
  customer,
  onClose,
  onGoPay,
  onToast,
  owedAmount,
  store
}: {
  customer: PortalCustomer;
  onClose: () => void;
  onGoPay: () => void;
  onToast: (message: string) => void;
  owedAmount: number;
  store: PublicStore;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(customer.email ?? "");
  const [phone, setPhone] = useState(customer.phone);
  const [postalCode, setPostalCode] = useState(customer.address_postal_code ?? "");
  const [street, setStreet] = useState(
    [customer.address_street, customer.address_number].filter(Boolean).join(", ")
  );
  const [complement, setComplement] = useState(customer.address_complement ?? "");
  const [neighborhood, setNeighborhood] = useState(customer.address_neighborhood ?? "");
  const [cityState, setCityState] = useState(
    [customer.address_city, customer.address_state].filter(Boolean).join(", ")
  );
  const [editing, setEditing] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");

  const blocked = owedAmount > 0.001;
  const editable = editing && !blocked;

  const save = () => {
    startTransition(async () => {
      const [streetPart, numberPart] = street.includes(",")
        ? street.split(",").map((part) => part.trim())
        : [street.trim(), ""];

      const [cityPart, statePart] = cityState.includes(",")
        ? cityState.split(",").map((part) => part.trim())
        : [cityState.trim(), ""];

      const result = await updateClientProfileAction({
        storeId: store.id,
        storeSlug: store.slug,
        email,
        phone,
        address_postal_code: postalCode,
        address_street: streetPart,
        address_number: numberPart || undefined,
        address_complement: complement,
        address_neighborhood: neighborhood,
        address_city: cityPart,
        address_state: statePart
      });

      if (result.error) {
        onToast(result.error);
        return;
      }

      setEditing(false);
      setChangePassword(false);
      onToast("Dados atualizados ✓");
    });
  };

  const logout = () => {
    startTransition(async () => {
      await clientSignOutAction(store.slug);
      onClose();
      router.refresh();
    });
  };

  const deleteAccount = () => {
    startTransition(async () => {
      const result = await deleteClientPortalAccessAction({
        storeId: store.id,
        storeSlug: store.slug
      });

      if (result.error) {
        onToast(result.error);
        return;
      }

      await clientSignOutAction(store.slug);
      onClose();
      router.refresh();
      onToast("Conta excluída");
    });
  };

  const savePassword = () => {
    startTransition(async () => {
      const result = await updateClientPasswordAction({
        storeId: store.id,
        storeSlug: store.slug,
        currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword
      });

      if (result.error) {
        onToast(result.error);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setChangePassword(false);
      onToast("Senha alterada ✓");
    });
  };

  const submitSupportRequest = () => {
    startTransition(async () => {
      const result = await requestClientAccountChangeAction({
        storeId: store.id,
        storeSlug: store.slug,
        requestType: "support",
        message: supportMessage
      });

      if (result.error) {
        onToast(result.error);
        return;
      }

      setSupportOpen(false);
      setSupportMessage("");
      onToast("Solicitação enviada para a loja ✓");
    });
  };

  return (
    <ClientOverlay>
      <ClientScreenHeader onBack={onClose} title="Minha conta" />
      <div className="client-screen-body client-conta-body">
        <div className="client-conta-profile">
          <div
            className="vendor-avatar"
            style={{ width: 58, height: 58, background: customer.avatar_color }}
          >
            {getCustomerInitials(customer.full_name)}
          </div>
          <div>
            <strong>{customer.full_name ?? "Cliente"}</strong>
            <span>Cliente · {store.name}</span>
          </div>
        </div>

        {blocked ? (
          <VendorCard className="client-conta-alert">
            <div className="client-conta-alert-main">
              <span className="client-conta-alert-icon">
                <VendorIcon name="alert" size={21} />
              </span>
              <div>
                <strong>Conta com pagamento em aberto</strong>
                <p>
                  Você tem {formatBRL(owedAmount)} em aberto. Para alterar seus dados ou excluir a
                  conta, quite as parcelas ou fale com o suporte da loja.
                </p>
              </div>
            </div>
            <div className="client-conta-alert-actions">
              <button
                className="vendor-button vendor-button-primary"
                onClick={() => {
                  onClose();
                  onGoPay();
                }}
                type="button"
              >
                <VendorIcon name="wallet" size={16} />
                Ver parcelas
              </button>
              <button
                className="vendor-button client-conta-whats-button"
                onClick={() => setSupportOpen((value) => !value)}
                type="button"
              >
                <VendorIcon name="whatsapp" size={16} />
                Falar com suporte
              </button>
            </div>
            {supportOpen ? (
              <div className="client-conta-support-request">
                <label className="client-conta-field">
                  <span>O que você precisa alterar?</span>
                  <textarea
                    onChange={(event) => setSupportMessage(event.target.value)}
                    placeholder="Ex.: atualizar endereço, trocar telefone, excluir conta…"
                    rows={3}
                    value={supportMessage}
                  />
                </label>
                <button
                  className="vendor-button vendor-button-primary vendor-button-full"
                  disabled={pending || !supportMessage.trim()}
                  onClick={submitSupportRequest}
                  type="button"
                >
                  <VendorIcon name="check" size={16} />
                  Enviar solicitação
                </button>
              </div>
            ) : null}
          </VendorCard>
        ) : null}

        {!blocked ? (
          <button
            className={`client-conta-edit-toggle ${editing ? "is-editing" : ""}`}
            onClick={() => setEditing((value) => !value)}
            type="button"
          >
            <VendorIcon name={editing ? "x" : "edit"} size={17} />
            {editing ? "Cancelar edição" : "Editar meus dados"}
          </button>
        ) : null}

        <VendorSectionLabel>Contato</VendorSectionLabel>
        <ContaField
          inputMode="email"
          label="Email"
          onChange={setEmail}
          placeholder="voce@email.com"
          readOnly={!editable}
          value={email}
        />
        <ContaField
          inputMode="tel"
          label="WhatsApp / Telefone"
          onChange={setPhone}
          placeholder="(11) 90000-0000"
          readOnly={!editable}
          value={phone}
        />

        <VendorSectionLabel>Senha</VendorSectionLabel>
        {!changePassword ? (
          <button
            className={`client-conta-row-button${blocked ? " is-disabled" : ""}`}
            disabled={blocked}
            onClick={() => {
              if (!blocked) setChangePassword(true);
            }}
            type="button"
          >
            <VendorIcon name="alert" size={18} />
            <span>Trocar senha</span>
            {blocked ? <VendorIcon name="eyeOff" size={16} /> : <VendorIcon name="chevR" size={18} />}
          </button>
        ) : (
          <VendorCard className="client-conta-password-card">
            <label className="client-conta-field">
              <span>Senha atual</span>
              <input
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="••••••"
                type="password"
                value={currentPassword}
              />
            </label>
            <label className="client-conta-field">
              <span>Nova senha</span>
              <input
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                type="password"
                value={newPassword}
              />
            </label>
            <label className="client-conta-field">
              <span>Confirme a nova senha</span>
              <input
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Repita a nova senha"
                type="password"
                value={confirmNewPassword}
              />
            </label>
            <div className="client-conta-inline-actions">
              <button
                className="vendor-button vendor-button-ghost"
                onClick={() => {
                  setChangePassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="vendor-button vendor-button-primary"
                disabled={pending}
                onClick={savePassword}
                type="button"
              >
                <VendorIcon name="check" size={16} />
                Salvar senha
              </button>
            </div>
          </VendorCard>
        )}

        <VendorSectionLabel>Endereço de entrega</VendorSectionLabel>
        <ContaField
          inputMode="numeric"
          label="CEP"
          onChange={setPostalCode}
          placeholder="00000-000"
          readOnly={!editable}
          value={postalCode}
        />
        <ContaField
          label="Rua e número"
          onChange={setStreet}
          placeholder="Rua, número"
          readOnly={!editable}
          value={street}
        />
        <ContaField
          label="Complemento"
          onChange={setComplement}
          optional
          placeholder="Apto, bloco, referência"
          readOnly={!editable}
          value={complement}
        />
        <ContaField
          label="Bairro"
          onChange={setNeighborhood}
          placeholder="Bairro"
          readOnly={!editable}
          value={neighborhood}
        />
        <ContaField
          label="Cidade / UF"
          onChange={setCityState}
          placeholder="Cidade, UF"
          readOnly={!editable}
          value={cityState}
        />

        {editable ? (
          <button
            className="vendor-button vendor-button-primary vendor-button-full client-conta-save"
            disabled={pending}
            onClick={save}
            type="button"
          >
            <VendorIcon name="check" size={18} />
            Salvar alterações
          </button>
        ) : null}

        <VendorSectionLabel>Conta</VendorSectionLabel>
        {!confirmDelete ? (
          <button
            className={`client-conta-row-button ${blocked ? "is-disabled" : "is-danger"}`}
            onClick={() => {
              if (blocked) {
                onToast("Quite suas parcelas para excluir a conta");
              } else {
                setConfirmDelete(true);
              }
            }}
            type="button"
          >
            <VendorIcon name="x" size={18} />
            <span>Excluir minha conta</span>
            {blocked ? <em>indisponível</em> : null}
          </button>
        ) : (
          <VendorCard className="client-conta-delete-card">
            <p>
              Tem certeza? Esta ação é permanente e você perderá seu histórico de pedidos.
            </p>
            <div className="client-conta-inline-actions">
              <button
                className="vendor-button vendor-button-ghost"
                onClick={() => setConfirmDelete(false)}
                type="button"
              >
                Voltar
              </button>
              <button
                className="vendor-button vendor-button-danger"
                disabled={pending}
                onClick={deleteAccount}
                type="button"
              >
                <VendorIcon name="x" size={16} />
                Excluir conta
              </button>
            </div>
          </VendorCard>
        )}

        <button className="client-conta-logout" disabled={pending} onClick={logout} type="button">
          Sair da conta
        </button>
      </div>
    </ClientOverlay>
  );
}
