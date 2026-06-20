/* Vendor screens — Dashboard, Agenda, Clientes, Produtos, Inadimplência */

// ── Shared header ─────────────────────────────────────────
function Header({ title, subtitle, onBack, right, big }) {
  return (
    <div style={{ padding: onBack ? '8px 18px 6px' : '10px 18px 6px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '50%', width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)', flexShrink: 0 }}>
            <Icon name="chevL" size={20} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: big ? 26 : 20, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2, fontWeight: 500 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────
function Dashboard({ app }) {
  const parcelas = window.allParcelas();
  const open = parcelas.filter((p) => !p.pago);
  const sum = (arr) => arr.reduce((a, p) => a + p.valor, 0);
  const hoje = open.filter((p) => window.parcelaStatus(p) === 'hoje');
  const semana = open.filter((p) => { const dd = window.daysBetween(p.venc, window.TODAY); return dd >= 0 && dd <= 6; });
  const mes = open.filter((p) => p.venc.getMonth() === window.TODAY.getMonth() && p.venc.getFullYear() === window.TODAY.getFullYear() && window.daysBetween(p.venc, window.TODAY) >= 0);
  const atraso = open.filter((p) => window.parcelaStatus(p) === 'atrasado');
  const inadimplentes = new Set(atraso.map((p) => p.clienteId));
  const lucro = window.SALES.reduce((a, s) => a + s.itens.reduce((b, i) => b + (i.preco - window.getProduct(i.pid).custo) * i.q, 0), 0);
  const estoque = window.PRODUCTS.reduce((a, p) => a + p.estoque, 0);
  const baixo = window.PRODUCTS.filter((p) => p.estoque <= 2);
  // 1.7 — Total vendido coerente: apenas vendas do mês/ano de hoje
  const vendasMes = window.SALES.filter((s) => s.data.getMonth() === window.TODAY.getMonth() && s.data.getFullYear() === window.TODAY.getFullYear());
  // recebido no mês: parcelas pagas (pagoEm) dentro do mês/ano de hoje — venda paga ou parcialmente paga
  const recebidoMes = window.allParcelas().filter((p) => p.pago && p.pagoEm && p.pagoEm.getMonth() === window.TODAY.getMonth() && p.pagoEm.getFullYear() === window.TODAY.getFullYear()).reduce((a, p) => a + p.valor, 0);
  // Feat B — resumo do dia (vence hoje + atrasadas)
  const clientesHoje = new Set(hoje.map((p) => p.clienteId)).size;
  const totalAtraso = sum(atraso);

  const [showVal, setShowVal] = useState(true);

  const Big = ({ label, value, sub, tone, onClick }) => (
    <Card onClick={onClick} pad={16} style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{label}</div>
        {onClick && <Icon name="chevR" size={15} style={{ color: 'var(--ink-3)' }} />}
      </div>
      <div style={{ marginTop: 6, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: tone }}>
        {showVal ? window.fmtBRL(value) : '••••'}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, fontWeight: 600 }}>{sub}</div>}
    </Card>
  );

  return (
    <div>
      <div style={{ padding: '12px 18px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <BrandMark size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Olá, {window.SELLER.nome.split(' ')[0]} 👋</div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{window.SELLER.loja}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowVal((v) => !v)} style={iconBtn}><Icon name={showVal ? 'eye' : 'eyeOff'} size={20} /></button>
          <button onClick={() => app.openOverlay({ type: 'notificacoes' })} style={{ ...iconBtn, position: 'relative' }}>
            <Icon name="bell" size={20} />
            {window.unreadNotifs() > 0 && <span style={{ position: 'absolute', top: 5, right: 6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid var(--bg)' }}>{window.unreadNotifs()}</span>}
          </button>
          <button onClick={() => app.openOverlay({ type: 'menu' })} style={iconBtn}><Icon name="cog" size={20} /></button>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {/* indicador de acesso restrito (vendedor) */}
        {!window.isAdmin() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, padding: '11px 13px', marginBottom: 12, background: '#fff7ed', border: '1px solid #fde9c8' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="lock" size={17} /></div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.4 }}>Você está como <b style={{ color: 'var(--ink-1)' }}>vendedor</b>. Pode cadastrar e vender; exclusões ficam com o proprietário.</div>
          </div>
        )}
        {/* Feat B — Resumo do dia */}
        {!app.resumoOff && (hoje.length > 0 || atraso.length > 0) && (
          <div style={{ borderRadius: 18, padding: '15px 16px', marginBottom: 12, background: 'var(--card)', border: '1px solid var(--green-600)', boxShadow: '0 2px 10px rgba(18,138,93,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em' }}>Bom dia, {window.SELLER.nome.split(' ')[0]}! ☀️</div>
              <button onClick={app.dismissResumo} style={{ background: 'var(--chip)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)', flexShrink: 0 }}><Icon name="x" size={15} /></button>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, marginTop: 4, lineHeight: 1.45 }}>
              Hoje: <b style={{ color: 'var(--ink-1)' }}>{window.fmtBRL(sum(hoje))}</b> a receber de <b style={{ color: 'var(--ink-1)' }}>{clientesHoje} cliente{clientesHoje !== 1 ? 's' : ''}</b>.
              {atraso.length > 0 && <span style={{ display: 'block', color: '#b1182a', fontWeight: 600, marginTop: 2 }}>+ {window.fmtBRL(totalAtraso)} em atraso de {inadimplentes.size} cliente{inadimplentes.size !== 1 ? 's' : ''}.</span>}
            </div>
            <button onClick={() => app.openOverlay({ type: 'loteCobranca' })} style={{ marginTop: 12, width: '100%', minHeight: 44, borderRadius: 12, border: 'none', background: 'var(--green-600)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}><WhatsLogo size={17} /> Enviar cobranças do dia</button>
          </div>
        )}
        {/* Hero — a receber hoje */}
        <div style={{
          borderRadius: 22, padding: '20px 20px 18px', color: '#fff', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--brand-g1) 0%, var(--brand-g2) 100%)', boxShadow: '0 10px 30px rgba(13,122,80,0.32)',
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>Recebido este mês</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            {showVal ? window.fmtBRL(recebidoMes) : 'R$ ••••'}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 600, marginTop: 2 }}>Vendas pagas e parcelas recebidas</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div><div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>A receber hoje</div><div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 1 }}>{showVal ? window.fmtBRL(sum(hoje)) : '••••'}</div></div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.25)' }} />
            <div><div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Semana</div><div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 1 }}>{showVal ? window.fmtBRL(sum(semana)) : '••••'}</div></div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.25)' }} />
            <div><div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Mês</div><div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 1 }}>{showVal ? window.fmtBRL(sum(mes)) : '••••'}</div></div>
          </div>
          <button onClick={() => app.go('pedidos')} style={{
            position: 'absolute', right: 16, top: 18, background: 'rgba(255,255,255,0.16)', border: 'none',
            color: '#fff', borderRadius: 999, padding: '7px 13px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)',
          }}>A receber <Icon name="chevR" size={14} /></button>
        </div>

        {/* Atraso alert */}
        {atraso.length > 0 && (
          <Card onClick={() => app.openOverlay({ type: 'inadimplencia' })} pad={14} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 13, borderColor: '#fbd5d5', background: '#fff6f6' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center' }}><Icon name="alert" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>{window.fmtBRL(sum(atraso))} em atraso</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{inadimplentes.size} cliente{inadimplentes.size > 1 ? 's' : ''} inadimplente{inadimplentes.size > 1 ? 's' : ''} · {atraso.length} parcelas</div>
            </div>
            <Icon name="chevR" size={20} style={{ color: 'var(--ink-3)' }} />
          </Card>
        )}

        {/* Two-up cards */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <Big label="Total vendido" value={vendasMes.reduce((a, s) => a + s.total, 0)} sub={`${vendasMes.length} ${vendasMes.length === 1 ? 'venda' : 'vendas'} no mês`} onClick={() => app.openOverlay({ type: 'vendas' })} />
          <Big label="Lucro estimado" value={lucro} sub="margem sobre custo" tone="var(--green-700)" />
        </div>

        {/* Últimas vendas */}
        <SectionLabel action="Ver todas" onAction={() => app.openOverlay({ type: 'vendas' })}>Últimas vendas</SectionLabel>
        {window.SALES.slice().sort((a, b) => b.data - a.data || (b.id > a.id ? 1 : -1)).slice(0, 3).map((s) => <VendaRow key={s.id} s={s} app={app} />)}

        {/* Estoque */}
        <SectionLabel action="Ver estoque" onAction={() => app.go('estoque')}>Estoque</SectionLabel>
        <div style={{ display: 'flex', gap: 12 }}>
          <Card pad={15} style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)' }}><Icon name="box" size={17} /><span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>Em estoque</span></div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{estoque} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>itens</span></div>
          </Card>
          <Card onClick={() => app.openOverlay({ type: 'estoqueBaixo' })} pad={15} style={{ flex: 1, borderColor: baixo.length ? '#fde9c8' : 'var(--line)', background: baixo.length ? '#fffaf0' : 'var(--card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: baixo.length ? '#b45309' : 'var(--ink-3)' }}><Icon name="alert" size={17} /><span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>Estoque baixo</span></div>
              <Icon name="chevR" size={15} style={{ color: baixo.length ? '#b45309' : 'var(--ink-3)' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: baixo.length ? '#b45309' : 'inherit' }}>{baixo.length} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>{baixo.length === 1 ? 'produto' : 'produtos'}</span></div>
          </Card>
        </div>

        {/* Aniversariantes do mês */}
        {window.aniversariantesDoMes().length > 0 && (
          <Card onClick={() => app.openOverlay({ type: 'aniversariantes' })} pad={13} style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, background: '#fdf2f8', borderColor: '#fbcfe8' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fce7f3', color: '#db2777', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="gift" size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{window.aniversariantesDoMes().length} aniversariante{window.aniversariantesDoMes().length > 1 ? 's' : ''} este mês 🎉</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>Faça uma promoção e fortaleça o relacionamento</div>
            </div>
            <Icon name="chevR" size={20} style={{ color: 'var(--ink-3)' }} />
          </Card>
        )}

        {/* Últimos pedidos */}
        <SectionLabel action="Ver todos" onAction={() => app.go('pedidos')}>Últimos pedidos</SectionLabel>
        {window.pedidosUnificados().slice(0, 3).map((it) => it.kind === 'order'
          ? <OrderRow key={'o' + it.id} o={it.raw} app={app} />
          : <VendaRow key={'s' + it.id} s={it.raw} app={app} from={{ type: 'tab', tab: 'inicio' }} />)}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
const iconBtn = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '50%', width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)' };

// ── AGENDA DE RECEBIMENTOS ────────────────────────────────
function Agenda({ app }) {
  const open = window.allParcelas().filter((p) => !p.pago);
  const groups = [
    { key: 'atrasado', title: 'Em atraso', filter: (p) => window.parcelaStatus(p) === 'atrasado' },
    { key: 'hoje', title: 'Hoje', filter: (p) => window.parcelaStatus(p) === 'hoje' },
    { key: '7', title: 'Próximos 7 dias', filter: (p) => { const dd = window.daysBetween(p.venc, window.TODAY); return dd >= 1 && dd <= 7; } },
    { key: '30', title: 'Próximos 30 dias', filter: (p) => { const dd = window.daysBetween(p.venc, window.TODAY); return dd >= 8 && dd <= 30; } },
  ];
  const sum = (arr) => arr.reduce((a, p) => a + p.valor, 0);
  const totalPrev = sum(open.filter((p) => window.daysBetween(p.venc, window.TODAY) <= 30));

  return (
    <div>
      <Header title="A receber" subtitle="Recebimentos previstos" big />
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{ borderRadius: 18, padding: '16px 18px', background: 'var(--ink-1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12.5, opacity: 0.7, fontWeight: 600 }}>Previsto em 30 dias</div>
            <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>{window.fmtBRL(totalPrev)}</div>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center' }}><Icon name="wallet" size={24} /></div>
        </div>

        {groups.map((g) => {
          const items = open.filter(g.filter).sort((a, b) => a.venc - b.venc);
          if (!items.length) return null;
          return (
            <div key={g.key} style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 9px' }}>
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', color: g.key === 'atrasado' ? '#dc2626' : 'var(--ink-1)' }}>{g.title}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{window.fmtBRL(sum(items))}</span>
              </div>
              {items.map((p) => <ParcelaRow key={p.id} p={p} app={app} />)}
            </div>
          );
        })}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

function ParcelaRow({ p, app }) {
  const cli = window.getClient(p.clienteId);
  const st = window.parcelaStatus(p);
  const dd = window.daysBetween(p.venc, window.TODAY);
  const cobrada = window.sameDay(p.cobradaEm, window.TODAY);
  return (
    <Card onClick={() => app.openOverlay({ type: 'cobranca', parcela: p })} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar label={cli.inicial} color={cli.cor} size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli.nome}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <Icon name="calendar" size={12} /> {window.fmtDate(p.venc)} · Parc. {p.n}
          {st === 'atrasado' && <span style={{ color: '#dc2626', fontWeight: 700 }}>· {Math.abs(dd)}d atraso</span>}
          {cobrada && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--green-700)', fontWeight: 700, whiteSpace: 'nowrap' }}><Icon name="check" size={11} stroke={3} /> cobrada hoje</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Money value={p.valor} size={15} />
        <div style={{ marginTop: 4 }}><StatusBadge status={st} small /></div>
      </div>
    </Card>
  );
}

// ── CLIENTES ──────────────────────────────────────────────
function Clientes({ app }) {
  const [q, setQ] = useState('');
  const list = window.CLIENTS.filter((c) => c.nome.toLowerCase().includes(q.toLowerCase()));
  const clienteSaldo = (id) => window.SALES.filter((s) => s.clienteId === id).reduce((a, s) => a + s.parcelas.filter((p) => !p.pago).reduce((b, p) => b + p.valor, 0), 0);
  const clienteAtraso = (id) => window.SALES.filter((s) => s.clienteId === id).some((s) => s.parcelas.some((p) => window.parcelaStatus(p) === 'atrasado'));

  return (
    <div>
      <Header title="Clientes" subtitle={`${window.CLIENTS.length} cadastrados`} big right={<button onClick={() => app.openOverlay({ type: 'novoCliente' })} style={{ ...iconBtn, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="plus" size={20} /></button>} />
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '11px 14px', marginBottom: 14 }}>
          <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 15, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
        </div>
        {list.map((c) => {
          const saldo = clienteSaldo(c.id);
          const atr = clienteAtraso(c.id);
          return (
            <Card key={c.id} onClick={() => app.openOverlay({ type: 'cliente', id: c.id })} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar label={c.inicial} color={c.cor} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{c.nome}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{c.zap}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {saldo > 0 ? <>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>Deve</div>
                  <Money value={saldo} size={14.5} color={atr ? '#dc2626' : 'var(--ink-1)'} />
                </> : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-700)', whiteSpace: 'nowrap' }}>Em dia</span>}
              </div>
            </Card>
          );
        })}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

// ── ESTOQUE / PRODUTOS ────────────────────────────────────
function Estoque({ app }) {
  const investido = window.PRODUCTS.reduce((a, p) => a + p.custo * p.estoque, 0);
  const potencial = window.PRODUCTS.reduce((a, p) => a + (p.preco || p.custo * 1.8) * p.estoque, 0);
  return (
    <div>
      <Header title="Estoque" subtitle={`${window.PRODUCTS.length} produtos`} big right={<button onClick={() => app.openOverlay({ type: 'novoProduto' })} style={{ ...iconBtn, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="plus" size={20} /></button>} />
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
          <Card pad={14} style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Investido</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{window.fmtBRL(investido)}</div>
          </Card>
          <Card pad={14} style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Potencial venda</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: 'var(--green-700)', fontVariantNumeric: 'tabular-nums' }}>{window.fmtBRL(potencial)}</div>
          </Card>
        </div>
        <SectionLabel>Produtos</SectionLabel>
        {window.PRODUCTS.map((p) => (
          <Card key={p.id} onClick={() => app.openOverlay({ type: 'produto', id: p.id })} pad={12} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13 }}>
            <ProductThumb product={p} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{p.cat}</span>
                {!p.precoVisivel && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#b45309', fontWeight: 700 }}><Icon name="eyeOff" size={12} /> sem preço</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {p.precoVisivel ? <Money value={p.preco} size={14.5} /> : <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>—</span>}
              <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 3, color: p.estoque <= 2 ? '#b45309' : 'var(--ink-3)' }}>{p.estoque} un.</div>
            </div>
          </Card>
        ))}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

Object.assign(window, { Header, Dashboard, Agenda, Clientes, Estoque, ParcelaRow, iconBtn });
