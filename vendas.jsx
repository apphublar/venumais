/* Registro de Vendas — lista detalhada + detalhe da venda */

// rótulos/ícones de forma de pagamento (espelha vendor-flow)
const MET_LABEL = { pix: 'PIX', cartao: 'Cartão', dinheiro: 'Dinheiro' };
const MET_ICON = { pix: 'pix', cartao: 'cards', dinheiro: 'wallet' };

// tipos de ocorrência (reclamação / troca / reembolso)
const OC_META = {
  reclamacao: { label: 'Reclamação', icon: 'alert', bg: '#fef3c7', fg: '#92660b' },
  troca: { label: 'Produto trocado', icon: 'split', bg: '#dbeafe', fg: '#1e478f' },
  reembolso: { label: 'Reembolsado', icon: 'arrowDown', bg: '#fee2e2', fg: '#b1182a' },
};
const brMoney = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

// status financeiro da venda: 'quitada' | 'aberta' | 'atrasada'
window.saleStatus = (s) => {
  const aberto = s.parcelas.filter((p) => !p.pago).reduce((a, p) => a + p.valor, 0);
  if (aberto <= 0.001) return 'quitada';
  if (s.parcelas.some((p) => window.parcelaStatus(p) === 'atrasado')) return 'atrasada';
  return 'aberta';
};
const SALE_META = {
  quitada: { label: 'Quitada', bg: 'var(--green-50)', fg: 'var(--green-700)', dot: '#16a34a' },
  aberta: { label: 'Em aberto', bg: '#dbeafe', fg: '#1e478f', dot: '#2563eb' },
  atrasada: { label: 'Atrasada', bg: '#fee2e2', fg: '#b1182a', dot: '#dc2626' },
};
function SaleBadge({ status, small }) {
  const m = SALE_META[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: m.bg, color: m.fg, borderRadius: 999, padding: small ? '2px 8px' : '4px 10px', fontSize: small ? 11 : 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot }} />{m.label}
    </span>
  );
}

// barra de progresso do crediário (pagas/total) + texto pagas/faltam + próxima parcela
function CrediarioProgress({ s }) {
  const pr = window.saleProgress(s);
  const pct = Math.round((pr.pagas / pr.total) * 100);
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: pr.faltam === 0 ? '#16a34a' : 'var(--green-600)', transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 700 }}>
          {pr.pagas} de {pr.total} pagas{pr.faltam > 0 ? ` · faltam ${pr.faltam}` : ''}
        </span>
        {pr.prox
          ? <span style={{ fontSize: 11.5, fontWeight: 800, color: pr.proxLabel === 'Última parcela' ? '#b45309' : 'var(--green-700)', whiteSpace: 'nowrap' }}>Próxima: {pr.proxLabel}</span>
          : <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--green-700)', whiteSpace: 'nowrap' }}>Quitada ✓</span>}
      </div>
    </div>
  );
}

// linha de venda no Início e no Registro — detalhada para crediário
function VendaRow({ s, app, from }) {
  const cli = window.getClient(s.clienteId);
  const st = window.saleStatus(s);
  const nItens = s.itens.reduce((a, i) => a + i.q, 0);
  const credi = s.modo === 'parcelado';
  return (
    <Card onClick={() => app.openOverlay({ type: 'venda', id: s.id, from })} pad={13} style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar label={cli.inicial} color={cli.cor} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span>#{s.id.replace(/^v/, '')}</span>
            <span>· {window.fmtDate(s.data)}</span>
            <span>· {nItens} {nItens === 1 ? 'item' : 'itens'}</span>
            <span style={{ fontWeight: 800, color: credi ? '#6d28d9' : 'var(--green-700)' }}>· {credi ? `${s.parcelas.length}x` : 'À vista'}</span>
            {s.ocorrencia && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 800, color: OC_META[s.ocorrencia.tipo].fg }}>· <Icon name={OC_META[s.ocorrencia.tipo].icon} size={11} /> {OC_META[s.ocorrencia.tipo].label}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Money value={s.total} size={15} />
          <div style={{ marginTop: 4 }}><SaleBadge status={st} small /></div>
        </div>
      </div>
      {credi && <CrediarioProgress s={s} />}
    </Card>
  );
}

// ── REGISTRO DE VENDAS (overlay) ──────────────────────────
function VendasHistorico({ app }) {
  // mês de referência (1º dia) — começa no mês de hoje
  const [ref, setRef] = useState(new Date(window.TODAY.getFullYear(), window.TODAY.getMonth(), 1));
  const [status, setStatus] = useState('todas'); // todas | quitada | aberta | atrasada

  const sameMonth = (dt, base) => dt.getMonth() === base.getMonth() && dt.getFullYear() === base.getFullYear();
  const prevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const curMonthStart = new Date(window.TODAY.getFullYear(), window.TODAY.getMonth(), 1);
  const isFutureNext = new Date(ref.getFullYear(), ref.getMonth() + 1, 1) > curMonthStart;

  const monthSales = window.SALES.filter((s) => sameMonth(s.data, ref));
  const prevSales = window.SALES.filter((s) => sameMonth(s.data, prevMonth));
  const monthTotal = monthSales.reduce((a, s) => a + s.total, 0);
  const prevTotal = prevSales.reduce((a, s) => a + s.total, 0);
  const delta = prevTotal > 0 ? Math.round(((monthTotal - prevTotal) / prevTotal) * 100) : (monthTotal > 0 ? 100 : 0);
  const recebido = monthSales.reduce((a, s) => a + s.parcelas.filter((p) => p.pago).reduce((b, p) => b + p.valor, 0), 0);
  const aReceber = monthSales.reduce((a, s) => a + s.parcelas.filter((p) => !p.pago).reduce((b, p) => b + p.valor, 0), 0);

  const counts = {
    todas: monthSales.length,
    quitada: monthSales.filter((s) => window.saleStatus(s) === 'quitada').length,
    aberta: monthSales.filter((s) => window.saleStatus(s) === 'aberta').length,
    atrasada: monthSales.filter((s) => window.saleStatus(s) === 'atrasada').length,
  };
  const list = monthSales
    .filter((s) => status === 'todas' || window.saleStatus(s) === status)
    .slice().sort((a, b) => b.data - a.data || (b.id > a.id ? 1 : -1));

  const mesNome = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mesLabel = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
  const prevNome = prevMonth.toLocaleDateString('pt-BR', { month: 'long' });
  const navBtn = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11, width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)', flexShrink: 0 };

  const statusTabs = [['todas', 'Todas'], ['quitada', 'Quitadas'], ['aberta', 'Em aberto'], ['atrasada', 'Atrasadas']];

  return (
    <Overlay>
      <Header title="Vendas" subtitle="Registro de vendas concluídas" onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* seletor de mês */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))} style={navBtn}><Icon name="chevL" size={18} /></button>
          <div style={{ textAlign: 'center', flex: 1, minWidth: 0, padding: '0 8px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{mesLabel}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>{counts.todas} {counts.todas === 1 ? 'venda' : 'vendas'}</div>
          </div>
          <button onClick={() => !isFutureNext && setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))} disabled={isFutureNext} style={{ ...navBtn, opacity: isFutureNext ? 0.4 : 1, cursor: isFutureNext ? 'default' : 'pointer' }}><Icon name="chevR" size={18} /></button>
        </div>

        {/* resumo + comparativo */}
        <div style={{ borderRadius: 18, padding: '16px 18px', background: 'linear-gradient(135deg, var(--brand-g1) 0%, var(--brand-g2) 100%)', color: '#fff', boxShadow: '0 8px 24px rgba(13,122,80,0.28)' }}>
          <div style={{ fontSize: 12.5, opacity: 0.9, fontWeight: 600 }}>Total vendido</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>{window.fmtBRL(monthTotal)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '3px 9px', fontSize: 12, fontWeight: 800 }}>
              <Icon name={delta >= 0 ? 'arrowUp' : 'arrowDown'} size={13} /> {Math.abs(delta)}%
            </span>
            <span style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>vs {prevNome} ({window.fmtBRL(prevTotal)})</span>
          </div>
        </div>

        {/* mini-stats recebido / a receber */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <Card pad={13} style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Recebido</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3, color: 'var(--green-700)' }}>{window.fmtBRL(recebido)}</div>
          </Card>
          <Card pad={13} style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>A receber</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>{window.fmtBRL(aReceber)}</div>
          </Card>
        </div>

        {/* filtro de status */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginTop: 16, paddingBottom: 2 }}>
          {statusTabs.map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '8px 13px', borderRadius: 999, border: '1px solid ' + (status === k ? 'var(--green-600)' : 'var(--line)'), background: status === k ? 'var(--green-600)' : 'var(--card)', color: status === k ? '#fff' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {l} <span style={{ opacity: 0.7, fontWeight: 800 }}>{counts[k]}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          {list.map((s) => <VendaRow key={s.id} s={s} app={app} from="vendas" />)}
          {!list.length && (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>
              {status === 'quitada' ? 'Nenhuma venda quitada neste mês.' : status === 'todas' ? 'Nenhuma venda neste mês.' : `Nenhuma venda "${statusTabs.find(([k]) => k === status)[1].toLowerCase()}" neste mês.`}
            </div>
          )}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

// ── DETALHE DA VENDA (overlay) ────────────────────────────
function VendaDetalhe({ id, app, from }) {
  const [sheet, setSheet] = useState(null); // 'pagamento' | 'ocorrencia'
  const s = window.SALES.find((x) => x.id === id);
  if (!s) return null;
  const cli = window.getClient(s.clienteId);
  const st = window.saleStatus(s);
  const pr = window.saleProgress(s);
  const aberto = s.total - pr.pagoValor;
  const lucro = s.itens.reduce((b, i) => b + (i.preco - window.getProduct(i.pid).custo) * i.q, 0);
  const onBack = from === 'vendas' ? () => app.openOverlay({ type: 'vendas' }) : app.closeOverlay;
  // dar baixa numa parcela ficando na tela (toast com Desfazer)
  const receber = (p) => {
    p.pago = true; p.pagoEm = window.TODAY; if (!p.metodo) p.metodo = s.metodo || 'dinheiro';
    app.refresh && app.refresh();
    window.logActivity && window.logActivity(`Registrou pagamento da parcela ${p.n} \u2014 ${cli.nome}`, 'pagamento');
    app.toast(`Parcela ${p.n} recebida ✓`, { label: 'Desfazer', onClick: () => { p.pago = false; p.pagoEm = null; app.refresh && app.refresh(); } });
  };

  return (
    <Overlay>
      <Header title={`Venda #${s.id.replace(/^v/, '')}`} subtitle={window.fmtDateLong(s.data)} onBack={onBack} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* cliente */}
        <Card onClick={() => app.openOverlay({ type: 'cliente', id: cli.id })} pad={13} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Avatar label={cli.inicial} color={cli.cor} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{cli.nome}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{cli.zap || 'Sem WhatsApp'}</div>
          </div>
          <Icon name="chevR" size={20} style={{ color: 'var(--ink-3)' }} />
        </Card>

        {/* badges status / modo / método */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <SaleBadge status={st} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: s.modo === 'avista' ? 'var(--green-50)' : '#ede9fe', color: s.modo === 'avista' ? 'var(--green-700)' : '#6d28d9', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <Icon name={s.modo === 'avista' ? 'wallet' : 'cards'} size={13} /> {s.modo === 'avista' ? 'À vista' : `Crediário ${s.parcelas.length}x`}
          </span>
          {s.metodo && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'var(--chip)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
              <Icon name={MET_ICON[s.metodo]} size={13} /> {MET_LABEL[s.metodo]}
            </span>
          )}
        </div>

        {/* ações do vendedor — registrar pagamento / ocorrência */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {aberto > 0.001 && <Button kind="primary" icon="check" full onClick={() => setSheet('pagamento')}>Registrar pagamento</Button>}
          <Button kind="ghost" icon="alert" full onClick={() => setSheet('ocorrencia')}>{s.ocorrencia ? 'Editar ocorrência' : 'Ocorrência'}</Button>
        </div>

        {/* ocorrência registrada */}
        {s.ocorrencia && (
          <Card pad={13} style={{ marginBottom: 12, display: 'flex', gap: 11, background: OC_META[s.ocorrencia.tipo].bg, borderColor: 'transparent' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#fff', color: OC_META[s.ocorrencia.tipo].fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={OC_META[s.ocorrencia.tipo].icon} size={19} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: OC_META[s.ocorrencia.tipo].fg, whiteSpace: 'nowrap' }}>{OC_META[s.ocorrencia.tipo].label}</span>
                <span style={{ fontSize: 11.5, color: OC_META[s.ocorrencia.tipo].fg, fontWeight: 700, whiteSpace: 'nowrap' }}>{window.fmtDate(s.ocorrencia.em)}</span>
              </div>
              {s.ocorrencia.obs && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginTop: 2, lineHeight: 1.4 }}>{s.ocorrencia.obs}</div>}
              {s.ocorrencia.produtos && s.ocorrencia.produtos.length > 0 && <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600, marginTop: 3 }}>Itens: {s.ocorrencia.produtos.map((pid) => { const p = window.getProduct(pid); return p ? p.nome : null; }).filter(Boolean).join(', ')}</div>}
              <div style={{ fontSize: 12.5, fontWeight: 800, color: s.ocorrencia.prejuizo > 0 ? '#b1182a' : 'var(--green-700)', marginTop: 4 }}>{s.ocorrencia.prejuizo > 0 ? `Prejuízo: ${window.fmtBRL(s.ocorrencia.prejuizo)}` : 'Sem prejuízo'}</div>
            </div>
          </Card>
        )}

        {/* resumo do crediário */}
        {s.modo === 'parcelado' && (
          <Card pad={15} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>Progresso do crediário</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-700)' }}>{pr.pagas}/{pr.total}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden', marginTop: 10 }}>
              <div style={{ width: Math.round((pr.pagas / pr.total) * 100) + '%', height: '100%', borderRadius: 999, background: pr.faltam === 0 ? '#16a34a' : 'var(--green-600)' }} />
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
              <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Pagas</div><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green-700)' }}>{pr.pagas}</div></div>
              <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Faltam</div><div style={{ fontSize: 15, fontWeight: 800 }}>{pr.faltam}</div></div>
              {pr.prox && (
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Próxima a pagar</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: pr.proxLabel === 'Última parcela' ? '#b45309' : 'var(--ink-1)' }}>{pr.proxLabel} · {window.fmtDate(pr.prox.venc)}</div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* itens */}
        <SectionLabel>Itens</SectionLabel>
        {s.itens.map((i) => {
          const p = window.getProduct(i.pid);
          return (
            <Card key={i.pid} pad={11} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProductThumb product={p} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{i.q} × {window.fmtBRL(i.preco)}</div></div>
              <Money value={i.preco * i.q} size={14} />
            </Card>
          );
        })}

        {/* totais */}
        <Card pad={15} style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Total</span><span style={{ fontSize: 15, fontWeight: 800 }}>{window.fmtBRL(s.total)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Recebido</span><span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--green-700)' }}>{window.fmtBRL(pr.pagoValor)}</span></div>
          {aberto > 0.001 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Em aberto</span><span style={{ fontSize: 14.5, fontWeight: 800, color: st === 'atrasada' ? '#dc2626' : 'var(--ink-1)' }}>{window.fmtBRL(aberto)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9, borderTop: '1px solid var(--line)' }}><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Lucro estimado</span><span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--green-700)' }}>{window.fmtBRL(lucro)}</span></div>
          {s.ocorrencia && s.ocorrencia.prejuizo > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Prejuízo</span><span style={{ fontSize: 14.5, fontWeight: 800, color: '#dc2626' }}>− {window.fmtBRL(s.ocorrencia.prejuizo)}</span></div>
              <div><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: OC_META[s.ocorrencia.tipo].bg, color: OC_META[s.ocorrencia.tipo].fg, borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 800 }}><Icon name={OC_META[s.ocorrencia.tipo].icon} size={11} /> {OC_META[s.ocorrencia.tipo].label}{s.ocorrencia.produtos && s.ocorrencia.produtos.length ? ` · ${s.ocorrencia.produtos.length} ${s.ocorrencia.produtos.length === 1 ? 'item' : 'itens'}` : ''}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9, borderTop: '1px solid var(--line)' }}><span style={{ fontSize: 13.5, color: 'var(--ink-1)', fontWeight: 800 }}>Resultado</span><span style={{ fontSize: 15, fontWeight: 800, color: (lucro - s.ocorrencia.prejuizo) >= 0 ? 'var(--green-700)' : '#dc2626' }}>{window.fmtBRL(lucro - s.ocorrencia.prejuizo)}</span></div>
            </>
          )}
        </Card>

        {/* confirmação do cliente (crediário) */}
        {s.modo === 'parcelado' && s.confirmacao && (
          <div style={{ marginTop: 12 }}>
            {s.confirmacao.status === 'confirmada' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'var(--green-50)', color: 'var(--green-700)', fontSize: 12.5, fontWeight: 700 }}>
                <Icon name="check" size={15} stroke={2.6} /> Confirmada pelo cliente{s.confirmacao.em ? ` em ${window.fmtDate(s.confirmacao.em)}` : ''}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px 10px 12px', borderRadius: 12, background: '#fef3c7', color: '#92660b', fontSize: 12.5, fontWeight: 700 }}>
                <Icon name="clock" size={15} /> <span style={{ flex: 1 }}>Aguardando confirmação</span>
                <button onClick={() => app.toast('Link de confirmação reenviado ✓')} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '4px 9px', fontSize: 11.5, fontWeight: 800, color: '#92660b', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Reenviar link</button>
              </div>
            )}
          </div>
        )}

        {/* parcelas */}
        {s.modo === 'parcelado' && (
          <>
            <SectionLabel>Parcelas</SectionLabel>
            {s.parcelas.map((p) => {
              const pst = window.parcelaStatus({ ...p, clienteId: s.clienteId });
              return (
                <Card key={p.id} onClick={p.pago ? undefined : () => app.openOverlay({ type: 'cobranca', parcela: { ...p, vendaId: s.id, clienteId: s.clienteId } })} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: window.STATUS_META[pst].bg, color: window.STATUS_META[pst].fg, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{p.n}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Money value={p.valor} size={14.5} />
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>Vence {window.fmtDate(p.venc)}</div>
                  </div>
                  {p.pago
                    ? <StatusBadge status="pago" small />
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                        <button onClick={(e) => { e.stopPropagation(); receber(p); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--green-600)', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}><Icon name="check" size={14} stroke={2.6} /> Recebi</button>
                        <button onClick={(e) => { e.stopPropagation(); app.openOverlay({ type: 'cobranca', parcela: { ...p, vendaId: s.id, clienteId: s.clienteId } }); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card)', color: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}><WhatsLogo size={13} /> Cobrar</button>
                      </div>}
                </Card>
              );
            })}
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
      {sheet === 'pagamento' && <RegistrarPagamentoSheet s={s} app={app} onClose={() => setSheet(null)} />}
      {sheet === 'ocorrencia' && <OcorrenciaSheet s={s} app={app} onClose={() => setSheet(null)} />}
    </Overlay>
  );
}

// ── REGISTRAR PAGAMENTO (vendedor dá baixa) ───────────────
function RegistrarPagamentoSheet({ s, app, onClose }) {
  const unpaid = s.parcelas.filter((p) => !p.pago).sort((a, b) => a.venc - b.venc);
  const [sel, setSel] = useState(() => (unpaid.length ? { [unpaid[0].id]: true } : {}));
  const [metodo, setMetodo] = useState(s.metodo || 'dinheiro');
  const selecionadas = unpaid.filter((p) => sel[p.id]);
  const totalSel = selecionadas.reduce((a, p) => a + p.valor, 0);
  const tudo = selecionadas.length === unpaid.length && unpaid.length > 0;

  const confirmar = () => {
    if (!selecionadas.length) return;
    selecionadas.forEach((p) => { p.pago = true; p.pagoEm = window.TODAY; p.metodo = metodo; });
    app.refresh && app.refresh();
    window.logActivity && window.logActivity(`Registrou pagamento de ${window.fmtBRL(totalSel)} — ${window.getClient(s.clienteId).nome}`, 'pagamento');
    app.toast(tudo ? 'Dívida quitada ✓' : `${selecionadas.length} ${selecionadas.length === 1 ? 'parcela recebida' : 'parcelas recebidas'} ✓`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Registrar pagamento">
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, margin: '0 2px 14px', lineHeight: 1.5 }}>
        Marque as parcelas que o cliente já pagou. Se ele quitou tudo de uma vez, use "Quitar dívida".
      </div>
      <button onClick={() => setSel(Object.fromEntries(unpaid.map((p) => [p.id, true])))} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--green-50)', border: '1.5px solid var(--green-600)', borderRadius: 13, padding: '12px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--green-700)', fontWeight: 800, fontSize: 14.5, marginBottom: 14, whiteSpace: 'nowrap' }}>
        <Icon name="check" size={18} /> Quitar dívida · {window.fmtBRL(unpaid.reduce((a, p) => a + p.valor, 0))}
      </button>
      {unpaid.map((p) => {
        const on = !!sel[p.id];
        const pst = window.parcelaStatus({ ...p, clienteId: s.clienteId });
        return (
          <div key={p.id} onClick={() => setSel((m) => ({ ...m, [p.id]: !m[p.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', marginBottom: 9, borderRadius: 14, cursor: 'pointer', background: 'var(--card)', border: '1px solid ' + (on ? 'var(--green-600)' : 'var(--line)'), opacity: on ? 1 : 0.6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid ' + (on ? 'var(--green-600)' : 'var(--line-2)'), background: on ? 'var(--green-600)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{on && <Icon name="check" size={15} stroke={3} style={{ color: '#fff' }} />}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Money value={p.valor} size={14.5} />
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>Parcela {p.n} · vence {window.fmtDate(p.venc)}</div>
            </div>
            {pst === 'atrasado' && <StatusBadge status="atrasado" small />}
          </div>
        );
      })}
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '14px 2px 8px' }}>Forma de pagamento</div>
      <MetodoSelector value={metodo} onChange={setMetodo} />
      <div style={{ height: 16 }} />
      <Button kind="primary" full size="lg" icon="check" onClick={confirmar} style={{ opacity: selecionadas.length ? 1 : 0.5 }}>
        Confirmar recebimento{selecionadas.length ? ` · ${window.fmtBRL(totalSel)}` : ''}
      </Button>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

// ── REGISTRAR OCORRÊNCIA (reclamação / troca / reembolso) ──
function OcorrenciaSheet({ s, app, onClose }) {
  const ex = s.ocorrencia;
  const [tipo, setTipo] = useState(ex ? ex.tipo : 'reclamacao');
  const [obs, setObs] = useState(ex ? ex.obs : '');
  const [temPrejuizo, setTemPrejuizo] = useState(ex ? ex.prejuizo > 0 : false);
  const [prejuizo, setPrejuizo] = useState(ex && ex.prejuizo ? brMoney(ex.prejuizo) : '');
  const [prodSel, setProdSel] = useState(() => { const m = {}; ((ex && ex.produtos) || []).forEach((pid) => { m[pid] = true; }); return m; });

  // ao marcar/desmarcar produto, soma o subtotal e preenche o valor (ajustável depois)
  const toggleProd = (pid) => setProdSel((prev) => {
    const next = { ...prev, [pid]: !prev[pid] };
    const soma = s.itens.filter((i) => next[i.pid]).reduce((a, i) => a + i.preco * i.q, 0);
    setPrejuizo(soma > 0 ? brMoney(soma) : '');
    return next;
  });

  const salvar = () => {
    const produtos = temPrejuizo ? Object.keys(prodSel).filter((k) => prodSel[k]) : [];
    s.ocorrencia = { tipo, obs: obs.trim(), prejuizo: temPrejuizo ? window.parseBRL(prejuizo) : 0, produtos, em: window.TODAY };
    app.refresh && app.refresh();
    const tipoLabel = { reclamacao: 'Reclamação', troca: 'Troca', reembolso: 'Reembolso' }[tipo];
    window.logActivity && window.logActivity(`Registrou ocorrência (${tipoLabel}) na venda #${s.id.replace(/^v/, '')}`, 'ocorrencia');
    app.toast('Ocorrência registrada ✓');
    onClose();
  };
  const remover = () => { s.ocorrencia = null; app.refresh && app.refresh(); app.toast('Ocorrência removida'); onClose(); };

  const tipos = [['reclamacao', 'Reclamação'], ['troca', 'Troca'], ['reembolso', 'Reembolso']];
  const label = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 2px 8px' };

  return (
    <Sheet open onClose={onClose} title="Ocorrência">
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, margin: '0 2px 14px', lineHeight: 1.5 }}>
        Registre uma reclamação, troca ou reembolso desta venda e informe se houve prejuízo.
      </div>

      <div style={label}>O que aconteceu?</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tipos.map(([k, l]) => {
          const on = tipo === k;
          return (
            <button key={k} onClick={() => setTipo(k)} style={{ flex: 1, padding: '13px 6px', borderRadius: 14, border: '1.5px solid ' + (on ? 'var(--green-600)' : 'var(--line)'), background: on ? OC_META[k].bg : 'var(--card)', color: on ? OC_META[k].fg : 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Icon name={OC_META[k].icon} size={20} /><span style={{ fontWeight: 800, fontSize: 13 }}>{l}</span>
            </button>
          );
        })}
      </div>

      <div style={label}>Observação</div>
      <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: cliente trocou pelo tamanho maior; produto com defeito..." style={{ width: '100%', boxSizing: 'border-box', minHeight: 70, padding: 13, borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none', marginBottom: 16, color: 'var(--ink-1)' }} />

      {/* prejuízo */}
      <Card pad={14} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: temPrejuizo ? '#fee2e2' : 'var(--chip)', color: temPrejuizo ? '#b1182a' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="arrowDown" size={20} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Teve prejuízo?</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Valor perdido com troca/reembolso</div>
        </div>
        <Toggle on={temPrejuizo} onChange={() => setTemPrejuizo((v) => !v)} />
      </Card>
      {temPrejuizo && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 2px 8px' }}>Produtos afetados</div>
          {s.itens.map((i) => {
            const p = window.getProduct(i.pid);
            const sub = i.preco * i.q;
            const on = !!prodSel[i.pid];
            return (
              <div key={i.pid} onClick={() => toggleProd(i.pid)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', marginBottom: 8, borderRadius: 13, cursor: 'pointer', background: 'var(--card)', border: '1px solid ' + (on ? '#dc2626' : 'var(--line)'), opacity: on ? 1 : 0.65 }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, border: '2px solid ' + (on ? '#dc2626' : 'var(--line-2)'), background: on ? '#dc2626' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{on && <Icon name="check" size={14} stroke={3} style={{ color: '#fff' }} />}</div>
                <ProductThumb product={p} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>{i.q} × {window.fmtBRL(i.preco)}</div>
                </div>
                <Money value={sub} size={13.5} />
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, margin: '2px 2px 10px', lineHeight: 1.45 }}>Selecione os itens com prejuízo. O valor é preenchido automaticamente — ajuste para <b style={{ color: 'var(--ink-2)' }}>total ou parcial</b> conforme o caso.</div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 2px 8px' }}>Valor do prejuízo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '12px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span>
            <input value={prejuizo} onChange={(e) => setPrejuizo(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0,00" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
          </div>
        </>
      )}

      <Button kind="primary" full size="lg" icon="check" onClick={salvar}>{ex ? 'Salvar alterações' : 'Registrar ocorrência'}</Button>
      {ex && window.can('reverter') && <button onClick={remover} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#dc2626', fontWeight: 800, fontSize: 14, padding: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Remover ocorrência</button>}
      {ex && !window.can('reverter') && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--ink-3)', fontSize: 12, fontWeight: 600 }}><Icon name="lock" size={14} /> Só o proprietário pode reverter ocorrências</div>}
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

Object.assign(window, { SaleBadge, CrediarioProgress, VendaRow, VendasHistorico, VendaDetalhe, RegistrarPagamentoSheet, OcorrenciaSheet });
