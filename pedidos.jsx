/* Painel de PEDIDOS — substitui a aba "A receber" */

// status financeiro de um pedido (quando já virou venda) ou estado do pedido cru
window.pedidoFin = (s) => window.saleStatus(s); // reusa: quitada | aberta | atrasada

// devolve TODOS os pedidos: vendas (já fechadas) + ORDERS (crus do cliente) unificados p/ a aba
window.pedidosUnificados = () => {
  const fromOrders = window.ORDERS.map((o) => ({
    kind: 'order', id: o.id, clienteId: o.clienteId, data: o.data, origem: o.origem || 'cliente',
    status: o.status, tipo: o.tipo || 'pedido', entrega: o.entrega, raw: o,
  }));
  const fromSales = window.SALES.map((s) => ({
    kind: 'sale', id: s.id, clienteId: s.clienteId, data: s.data, origem: s.origem || 'vendedor',
    fin: window.saleStatus(s), raw: s,
  }));
  return [...fromOrders, ...fromSales].sort((a, b) => b.data - a.data || (String(b.id) > String(a.id) ? 1 : -1));
};

const ORIGEM_META = {
  cliente: { label: 'Pelo cliente', bg: '#dbeafe', fg: '#1e478f', icon: 'user' },
  vendedor: { label: 'Pelo vendedor', bg: 'var(--green-50)', fg: 'var(--green-700)', icon: 'store' },
};

function OrigemTag({ origem, small }) {
  const m = ORIGEM_META[origem] || ORIGEM_META.vendedor;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: m.bg, color: m.fg, borderRadius: 999, padding: small ? '2px 7px' : '3px 9px', fontSize: small ? 10.5 : 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
      <Icon name={m.icon} size={11} /> {m.label}
    </span>
  );
}

// linha de pedido cru (ORDER) — aguardando resposta do vendedor
function OrderRow({ o, app }) {
  const cli = window.getClient(o.clienteId);
  const nItens = o.itens.reduce((a, i) => a + i.q, 0);
  const isEncomenda = o.tipo === 'encomenda';
  const statusLabel = isEncomenda ? 'Encomenda' : (o.status === 'orcamento' ? 'Orçamento' : 'Novo pedido');
  const statusCor = isEncomenda ? { bg: '#cffafe', fg: '#0e7490' } : (o.status === 'orcamento' ? { bg: '#fef3c7', fg: '#92660b' } : { bg: '#dbeafe', fg: '#1e478f' });
  return (
    <Card onClick={() => app.openOverlay({ type: 'pedido', id: o.id })} pad={13} style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar label={cli.inicial} color={cli.cor} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli.nome}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>#{o.id} · {nItens} {nItens === 1 ? 'item' : 'itens'} · {window.fmtDate(o.data)}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: statusCor.bg, color: statusCor.fg, whiteSpace: 'nowrap' }}>{statusLabel}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <OrigemTag origem={o.origem} small />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}><Icon name={o.entrega === 'entrega' ? 'truck' : 'store'} size={12} /> {o.entrega === 'entrega' ? 'Entrega' : 'Retirada'}</span>
        {o.editadoEm && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: '#92660b', background: '#fef3c7', borderRadius: 999, padding: '2px 8px' }}><Icon name="edit" size={11} /> Editado pelo cliente</span>}
      </div>
    </Card>
  );
}

function PedidosScreen({ app }) {
  const [filtro, setFiltro] = useState('todos'); // todos | novos | pago | receber | atraso | hoje
  const unif = window.pedidosUnificados();

  const matchFiltro = (it) => {
    if (filtro === 'todos') return true;
    if (filtro === 'novos') return it.kind === 'order';
    if (it.kind !== 'sale') return false;
    const fin = it.fin;
    if (filtro === 'pago') return fin === 'quitada';
    if (filtro === 'receber') return fin === 'aberta';
    if (filtro === 'atraso') return fin === 'atrasada';
    if (filtro === 'hoje') return it.raw.parcelas.some((p) => window.parcelaStatus(p) === 'hoje');
    return true;
  };

  const lista = unif.filter(matchFiltro);
  const novos = unif.filter((it) => it.kind === 'order').length;

  const filtros = [
    ['todos', 'Todos'], ['novos', `Novos${novos ? ` (${novos})` : ''}`],
    ['pago', 'Pagos'], ['receber', 'A receber'], ['atraso', 'Em atraso'], ['hoje', 'Vence hoje'],
  ];

  // totais rápidos
  const open = window.allParcelas().filter((p) => !p.pago);
  const aReceber = open.reduce((a, p) => a + p.valor, 0);
  const atraso = open.filter((p) => window.parcelaStatus(p) === 'atrasado').reduce((a, p) => a + p.valor, 0);

  return (
    <div>
      <Header title="Pedidos" subtitle={`${unif.length} no total · ${novos} novos`} big
        right={<button onClick={() => app.openOverlay({ type: 'novaVenda' })} style={{ ...iconBtn, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="plus" size={20} /></button>} />
      <div style={{ padding: '8px 16px 0' }}>
        {/* resumo a receber — clicáveis */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <button onClick={() => app.openOverlay({ type: 'agenda' })} style={{ flex: 1, textAlign: 'left', borderRadius: 16, padding: '14px 16px', background: 'var(--ink-1)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 11.5, opacity: 0.7, fontWeight: 600 }}>A receber</span><Icon name="chevR" size={14} style={{ opacity: 0.7 }} /></div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{window.fmtBRL(aReceber)}</div>
          </button>
          <button onClick={() => app.openOverlay({ type: 'inadimplencia' })} style={{ flex: 1, textAlign: 'left', borderRadius: 16, padding: '14px 16px', background: atraso > 0 ? '#fff6f6' : 'var(--card)', border: '1px solid ' + (atraso > 0 ? '#fbd5d5' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 11.5, color: atraso > 0 ? '#b1182a' : 'var(--ink-3)', fontWeight: 700 }}>Em atraso</span><Icon name="chevR" size={14} style={{ color: atraso > 0 ? '#b1182a' : 'var(--ink-3)' }} /></div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2, color: atraso > 0 ? '#b1182a' : 'var(--ink-1)' }}>{window.fmtBRL(atraso)}</div>
          </button>
        </div>

        {/* filtros rápidos */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
          {filtros.map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 999, border: '1px solid ' + (filtro === k ? 'var(--green-600)' : 'var(--line)'), background: filtro === k ? 'var(--green-600)' : 'var(--card)', color: filtro === k ? '#fff' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>

        {/* lista */}
        <div style={{ marginTop: 8 }}>
          {lista.map((it) => it.kind === 'order'
            ? <OrderRow key={'o' + it.id} o={it.raw} app={app} />
            : <VendaRow key={'s' + it.id} s={it.raw} app={app} from={{ type: 'tab', tab: 'pedidos' }} />)}
          {!lista.length && <div style={{ textAlign: 'center', padding: '34px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>Nenhum pedido neste filtro.</div>}
        </div>

        {/* Cancelados pelo cliente — oportunidade de recuperar a venda */}
        {filtro === 'todos' && window.cancelledOrders().length > 0 && (
          <div style={{ marginTop: 8 }}>
            <SectionLabel>Cancelados pelo cliente</SectionLabel>
            {window.cancelledOrders().map((o) => {
              const cli = window.getClient(o.clienteId);
              return (
                <Card key={'c' + o.id} pad={13} style={{ marginBottom: 9, opacity: 0.92 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar label={cli.inicial} color={cli.cor} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>#{o.id} · cancelado {o.canceladoEm ? window.fmtDate(o.canceladoEm) : ''}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#fee2e2', color: '#b1182a', whiteSpace: 'nowrap' }}>Cancelado</span>
                  </div>
                  <button onClick={() => { const url = `https://wa.me/55${cli.zap.replace(/\D/g, '')}?text=${encodeURIComponent(`Oi, ${cli.nome.split(' ')[0]}! Vi que você se interessou por alguns produtos da ${window.SELLER.loja}. Preparei uma condição especial pra você — quer dar uma olhada? 🎁`)}`; window.open(url, '_blank'); app.toast('Abrindo promoção no WhatsApp'); }} style={{ width: '100%', marginTop: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'var(--green-50)', border: 'none', borderRadius: 12, padding: '10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--green-700)', fontWeight: 800, fontSize: 13 }}><WhatsLogo size={15} /> Enviar promoção</button>
                </Card>
              );
            })}
          </div>
        )}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

Object.assign(window, { PedidosScreen, OrderRow, OrigemTag, ORIGEM_META });
