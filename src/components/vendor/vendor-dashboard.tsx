"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { VendorBrandMark } from "@/components/vendor/brand-mark";
import { VendorCard } from "@/components/vendor/card";
import { VendorIcon } from "@/components/vendor/icon";
import { VendorMenuSheet } from "@/components/vendor/vendor-menu-sheet";
import { BatchCobrancaSheet } from "@/components/vendor/batch-cobranca-sheet";
import { VendorOrderRow } from "@/components/vendor/vendor-order-row";
import { VendorSaleRow } from "@/components/vendor/sale-row";
import { VendorSectionLabel } from "@/components/vendor/section-label";
import { VendorWhatsLogo } from "@/components/vendor/whats-logo";
import { formatBRL } from "@/lib/products/format";
import type { DashboardData, ReceivableInstallment } from "@/lib/sales/dashboard";
import { filterInstallmentsForDailyCobranca } from "@/lib/sales/receivables";

const RESUMO_KEY = "venumais-resumo-off";
const NOTIF_SEEN_KEY = "venumais-notif-seen";
const DEMO_UNREAD_DEFAULT = 3; // matches DEMO_NOTIFICATIONS unread count

export function VendorDashboard({
  cobrancaInstallments,
  data,
  isSeller,
  sellerFirstName,
  store,
  storeInitial,
  storeName
}: {
  cobrancaInstallments: ReceivableInstallment[];
  data: DashboardData;
  isSeller: boolean;
  sellerFirstName: string;
  store: {
    name: string;
    logo_url?: string | null;
    pix_key?: string | null;
    pix_receiver_name?: string | null;
  };
  storeInitial: string;
  storeName: string;
}) {
  const [showValues, setShowValues] = useState(true);
  const [resumoOff, setResumoOff] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(RESUMO_KEY) === "1";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [notifBadge] = useState(() => {
    if (typeof window === "undefined") return 0;
    const seen = window.localStorage.getItem(NOTIF_SEEN_KEY);
    return seen === "1" ? 0 : DEMO_UNREAD_DEFAULT;
  });

  const { receivables } = data;
  const showResumo =
    !resumoOff &&
    (receivables.today > 0 || receivables.overdue > 0);

  const dismissResumo = () => {
    window.localStorage.setItem(RESUMO_KEY, "1");
    setResumoOff(true);
  };

  const mask = (value: number) => (showValues ? formatBRL(value) : "••••");
  const maskHero = showValues ? formatBRL(data.receivedThisMonth) : "R$ ••••";
  const dailyCobranca = filterInstallmentsForDailyCobranca(cobrancaInstallments);

  return (
    <div className="vendor-dashboard">
      <div className="vendor-dashboard-top">
        <div className="vendor-dashboard-greeting">
          {store.logo_url ? (
            <Image
              alt={`Logo da loja ${storeName}`}
              className="vendor-dashboard-store-logo"
              height={48}
              loader={({ src }) => src}
              src={store.logo_url}
              unoptimized
              width={48}
            />
          ) : (
            <VendorBrandMark label={storeInitial} onLight size={48} />
          )}
          <div>
            <span>Olá, {sellerFirstName} 👋</span>
            <strong>{storeName}</strong>
          </div>
        </div>
        <div className="vendor-dashboard-actions">
          <button
            aria-label={showValues ? "Ocultar valores" : "Mostrar valores"}
            className="vendor-dashboard-icon-btn"
            onClick={() => setShowValues((value) => !value)}
            type="button"
          >
            <VendorIcon name={showValues ? "eye" : "eyeOff"} size={20} />
          </button>
          <Link
            aria-label="Notificações"
            className="vendor-dashboard-icon-btn vendor-dashboard-icon-btn-notif"
            href="/painel/notificacoes"
          >
            <VendorIcon name="bell" size={20} />
            {notifBadge > 0 ? (
              <span aria-label={`${notifBadge} notificações não lidas`} className="vendor-notif-badge">
                {notifBadge}
              </span>
            ) : null}
          </Link>
          <button
            aria-label="Menu"
            className="vendor-dashboard-icon-btn"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <VendorIcon name="cog" size={20} />
          </button>
        </div>
      </div>

      <div className="vendor-dashboard-body">
        {isSeller ? (
          <div className="vendor-dashboard-restricted">
            <div className="vendor-dashboard-restricted-icon">
              <VendorIcon name="lock" size={17} />
            </div>
            <p>
              Você está como <b>vendedor</b>. Pode cadastrar e vender; exclusões ficam com o
              proprietário.
            </p>
          </div>
        ) : null}

        {showResumo ? (
          <div className="vendor-dashboard-resumo">
            <div className="vendor-dashboard-resumo-head">
              <strong>Bom dia, {sellerFirstName}! ☀️</strong>
              <button
                aria-label="Fechar resumo"
                className="vendor-dashboard-resumo-close"
                onClick={dismissResumo}
                type="button"
              >
                <VendorIcon name="x" size={15} />
              </button>
            </div>
            <p>
              Hoje: <b>{mask(receivables.today)}</b> a receber de{" "}
              <b>
                {receivables.todayCustomerIds.length} cliente
                {receivables.todayCustomerIds.length !== 1 ? "s" : ""}
              </b>
              .
              {receivables.overdue > 0 ? (
                <span className="vendor-dashboard-resumo-overdue">
                  + {mask(receivables.overdue)} em atraso de{" "}
                  {receivables.overdueCustomerIds.length} cliente
                  {receivables.overdueCustomerIds.length !== 1 ? "s" : ""}.
                </span>
              ) : null}
            </p>
            <button
              className="vendor-dashboard-resumo-btn"
              disabled={!dailyCobranca.length}
              onClick={() => setBatchOpen(true)}
              type="button"
            >
              <VendorWhatsLogo size={17} />
              Enviar cobranças do dia
            </button>
          </div>
        ) : null}

        <div className="vendor-dashboard-hero">
          <div aria-hidden="true" className="vendor-dashboard-hero-glow" />
          <span>Recebido este mês</span>
          <strong>{maskHero}</strong>
          <span className="vendor-dashboard-hero-subtitle">Vendas pagas e parcelas recebidas</span>
          <div className="vendor-dashboard-hero-stats">
            <div>
              <small>A receber hoje</small>
              <strong>{mask(receivables.today)}</strong>
            </div>
            <div aria-hidden="true" className="vendor-dashboard-hero-divider" />
            <div>
              <small>Semana</small>
              <strong>{mask(receivables.week)}</strong>
            </div>
            <div aria-hidden="true" className="vendor-dashboard-hero-divider" />
            <div>
              <small>Mês</small>
              <strong>{mask(receivables.month)}</strong>
            </div>
          </div>
          <Link className="vendor-dashboard-hero-link" href="/painel/pedidos?filter=open">
            A receber <VendorIcon name="chevR" size={14} />
          </Link>
        </div>

        {receivables.overdue > 0 ? (
          <Link href="/painel/inadimplencia">
            <VendorCard className="vendor-dashboard-alert">
              <div className="vendor-dashboard-alert-icon">
                <VendorIcon name="alert" size={22} />
              </div>
              <div>
                <strong>{mask(receivables.overdue)} em atraso</strong>
                <span>
                  {receivables.overdueCustomerIds.length} cliente
                  {receivables.overdueCustomerIds.length > 1 ? "s" : ""} inadimplente
                  {receivables.overdueCustomerIds.length > 1 ? "s" : ""} ·{" "}
                  {receivables.overdueInstallmentCount} parcelas
                </span>
              </div>
              <VendorIcon name="chevR" size={20} />
            </VendorCard>
          </Link>
        ) : null}

        <div className="vendor-dashboard-two-up">
          <DashboardMetricCard
            href="/painel/vendas"
            label="Total vendido"
            showValues={showValues}
            sub={`${data.monthSalesCount} ${data.monthSalesCount === 1 ? "venda" : "vendas"} no mês`}
            value={data.monthSalesTotal}
          />
          <DashboardMetricCard
            label="Lucro estimado"
            showValues={showValues}
            sub="margem sobre custo"
            tone="success"
            value={data.estimatedProfit}
          />
        </div>

        <VendorSectionLabel action="Ver todas" href="/painel/vendas">
          Últimas vendas
        </VendorSectionLabel>
        {data.recentSales.length ? (
          data.recentSales.map((sale) => <VendorSaleRow key={sale.id} sale={sale} />)
        ) : (
          <div className="vendor-empty vendor-dashboard-empty">
            <strong>Nenhuma venda ainda</strong>
            <p>Registre a primeira venda pelo botão +.</p>
          </div>
        )}

        <VendorSectionLabel action="Ver estoque" href="/painel/estoque">
          Estoque
        </VendorSectionLabel>
        <div className="vendor-dashboard-two-up">
          <VendorCard className="vendor-dashboard-stock-card">
            <div className="vendor-dashboard-stock-label">
              <VendorIcon name="box" size={17} />
              <span>Em estoque</span>
            </div>
            <strong>
              {data.stock.totalItems}{" "}
              <small>itens</small>
            </strong>
          </VendorCard>
          <Link href="/painel/estoque/baixo">
            <VendorCard
              className={`vendor-dashboard-stock-card ${data.stock.lowStockCount ? "vendor-dashboard-stock-card-warn" : ""}`}
            >
              <div className="vendor-dashboard-stock-label">
                <VendorIcon name="alert" size={17} />
                <span>Estoque baixo</span>
                <VendorIcon name="chevR" size={15} />
              </div>
              <strong>
                {data.stock.lowStockCount}{" "}
                <small>{data.stock.lowStockCount === 1 ? "produto" : "produtos"}</small>
              </strong>
            </VendorCard>
          </Link>
        </div>

        {data.birthdayCount > 0 ? (
          <Link href="/painel/aniversariantes">
            <VendorCard className="vendor-dashboard-birthday">
              <div className="vendor-dashboard-birthday-icon">
                <VendorIcon name="gift" size={22} />
              </div>
              <div>
                <strong>
                  {data.birthdayCount} aniversariante{data.birthdayCount > 1 ? "s" : ""} este mês 🎉
                </strong>
                <span>Faça uma promoção e fortaleça o relacionamento</span>
              </div>
              <VendorIcon name="chevR" size={20} />
            </VendorCard>
          </Link>
        ) : null}

        <VendorSectionLabel action="Ver todos" href="/painel/pedidos">
          Últimos pedidos
        </VendorSectionLabel>
        {data.recentFeed.length ? (
          data.recentFeed.map((item) =>
            item.kind === "order" ? (
              <VendorOrderRow key={`order-${item.order.id}`} order={item.order} />
            ) : (
              <VendorSaleRow key={`sale-${item.sale.id}`} sale={item.sale} />
            )
          )
        ) : (
          <div className="vendor-empty vendor-dashboard-empty">
            <strong>Nenhum pedido ainda</strong>
            <p>Quando o portal do cliente estiver ativo, os pedidos aparecerão aqui.</p>
          </div>
        )}

        <div className="vendor-dashboard-spacer" />
      </div>

      {menuOpen ? (
        <VendorMenuSheet
          birthdayCount={data.birthdayCount}
          isOwner={!isSeller}
          onClose={() => setMenuOpen(false)}
          profileName={sellerFirstName}
          storeName={storeName}
        />
      ) : null}

      {batchOpen && dailyCobranca.length ? (
        <BatchCobrancaSheet
          installments={dailyCobranca}
          onClose={() => setBatchOpen(false)}
          store={store}
        />
      ) : null}
    </div>
  );
}

function DashboardMetricCard({
  href,
  label,
  showValues,
  sub,
  tone,
  value
}: {
  href?: string;
  label: string;
  showValues: boolean;
  sub: string;
  tone?: "success";
  value: number;
}) {
  const content = (
    <VendorCard className="vendor-dashboard-metric">
      <div className="vendor-dashboard-metric-head">
        <span>{label}</span>
        {href ? <VendorIcon name="chevR" size={15} /> : null}
      </div>
      <strong className={tone === "success" ? "vendor-text-success" : undefined}>
        {showValues ? formatBRL(value) : "••••"}
      </strong>
      <small>{sub}</small>
    </VendorCard>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
