"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VendorAvatar } from "@/components/vendor/avatar";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorScreenHeader } from "@/components/vendor/screen-header";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { getCustomerInitials, normalizePhone } from "@/lib/customers/format";
import type { StoreCoupon } from "@/lib/coupons/types";
import type { Customer } from "@/lib/database/types";
import { formatBRL } from "@/lib/products/format";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

const DEFAULT_MESSAGE =
  "Parabéns, {nome}! 🎉 A {loja} preparou um presente de aniversário pra você: use o cupom {cupom} e aproveite! 🎁";

function birthdaysInMonth(customers: Customer[], month: number) {
  return customers
    .filter((customer) => {
      if (!customer.birth_date) {
        return false;
      }

      const [, birthMonth] = customer.birth_date.split("-").map(Number);
      return birthMonth - 1 === month;
    })
    .sort((a, b) => {
      const dayA = Number(a.birth_date?.split("-")[2] ?? 0);
      const dayB = Number(b.birth_date?.split("-")[2] ?? 0);
      return dayA - dayB;
    });
}

function formatCouponLabel(coupon: StoreCoupon) {
  return coupon.type === "percent" ? `${coupon.value}%` : formatBRL(coupon.value);
}

export function BirthdaysScreen({
  activeCoupons,
  customers,
  storeName
}: {
  activeCoupons: StoreCoupon[];
  customers: Customer[];
  storeName: string;
}) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [couponCode, setCouponCode] = useState(activeCoupons[0]?.code ?? "");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const list = useMemo(() => birthdaysInMonth(customers, month), [customers, month]);

  const buildMessage = (customer: Customer) =>
    message
      .replace(/\{nome\}/g, customer.full_name.split(" ")[0])
      .replace(/\{loja\}/g, storeName)
      .replace(/\{cupom\}/g, couponCode || "");

  const congratulate = (customer: Customer) => {
    const digits = normalizePhone(customer.phone);
    const url = `https://wa.me/55${digits}?text=${encodeURIComponent(buildMessage(customer))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const congratulateAll = () => {
    list.forEach((customer) => congratulate(customer));
  };

  return (
    <>
      <VendorScreenHeader
        backHref="/painel"
        subtitle="Faça promoções e fidelize"
        title="Aniversariantes"
      />

      <section className="vendor-screen-body vendor-birthdays-screen">
        <VendorCard className="vendor-birthdays-promo">
          <div className="vendor-birthdays-promo-head">
            <span className="vendor-birthdays-promo-icon">
              <VendorIcon name="gift" size={18} />
            </span>
            <strong>Promoção de aniversário</strong>
          </div>

          <div className="vendor-birthdays-label">Cupom do presente</div>
          {activeCoupons.length ? (
            <div className="vendor-birthdays-coupons">
              {activeCoupons.map((coupon) => (
                <button
                  className={`vendor-birthdays-coupon ${
                    couponCode === coupon.code ? "vendor-birthdays-coupon-active" : ""
                  }`.trim()}
                  key={coupon.id}
                  onClick={() => setCouponCode(couponCode === coupon.code ? "" : coupon.code)}
                  type="button"
                >
                  <VendorIcon name="ticket" size={13} />
                  {coupon.code}
                  <span>{formatCouponLabel(coupon)}</span>
                </button>
              ))}
            </div>
          ) : (
            <Link className="vendor-birthdays-create-coupon" href="/painel/cupons">
              <VendorIcon name="plus" size={16} />
              Criar um cupom primeiro
            </Link>
          )}

          <div className="vendor-birthdays-label">Mensagem</div>
          <textarea
            className="vendor-birthdays-message"
            onChange={(event) => setMessage(event.target.value)}
            value={message}
          />
          <p className="vendor-birthdays-vars">
            Variáveis: <b>{"{nome}"}</b>, <b>{"{loja}"}</b>, <b>{"{cupom}"}</b> — trocadas automaticamente
            para cada cliente.
          </p>

          {list[0] ? <div className="vendor-birthdays-preview">{buildMessage(list[0])}</div> : null}
        </VendorCard>

        <div className="vendor-sales-history-month">
          <button
            aria-label="Mês anterior"
            className="vendor-sales-history-nav"
            onClick={() => setMonth((current) => (current + 11) % 12)}
            type="button"
          >
            <VendorIcon name="chevL" size={18} />
          </button>
          <div>
            <strong>{MONTHS[month]}</strong>
            <span>
              {list.length} aniversariante{list.length === 1 ? "" : "s"}
            </span>
          </div>
          <button
            aria-label="Próximo mês"
            className="vendor-sales-history-nav"
            onClick={() => setMonth((current) => (current + 1) % 12)}
            type="button"
          >
            <VendorIcon name="chevR" size={18} />
          </button>
        </div>

        {list.length > 1 ? (
          <button className="vendor-cobranca-whats-btn vendor-birthdays-all" onClick={congratulateAll} type="button">
            <VendorWhatsLogo size={16} />
            Felicitar todos ({list.length})
          </button>
        ) : null}

        {list.map((customer) => {
          const day = Number(customer.birth_date?.split("-")[2] ?? 0);
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            Number(customer.birth_date?.split("-")[1]) === today.getMonth() + 1;

          return (
            <VendorCard
              className={`vendor-birthdays-row ${isToday ? "vendor-birthdays-row-today" : ""}`.trim()}
              key={customer.id}
            >
              <VendorAvatar
                color={customer.avatar_color}
                label={getCustomerInitials(customer.full_name)}
                size={44}
              />
              <div className="vendor-birthdays-row-copy">
                <strong>{customer.full_name}</strong>
                <span>{isToday ? "🎂 É hoje!" : `Dia ${String(day).padStart(2, "0")}`}</span>
              </div>
              <button
                className="vendor-birthdays-felicitar"
                onClick={() => congratulate(customer)}
                type="button"
              >
                <VendorWhatsLogo size={14} />
                Felicitar
              </button>
            </VendorCard>
          );
        })}

        {!list.length ? (
          <div className="vendor-empty vendor-empty-compact">
            <p>Nenhum aniversariante em {MONTHS[month]}.</p>
          </div>
        ) : null}

        <div className="vendor-dashboard-spacer" />
      </section>
    </>
  );
}
