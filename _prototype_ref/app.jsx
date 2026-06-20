/* Root — VendorApp shell + environment switcher + mount */

function VendorApp({ shared }) {
  const [tab, setTab] = useState('inicio');
  const [overlay, setOverlay] = useState(null);
  const [, bump] = useState(0);
  const [resumoOff, setResumoOff] = useState(false);
  const [notif, setNotif] = useState(null); // notificação Android simulada
  const notifShown = useRef(false);

  const app = {
    go: (t) => { setOverlay(null); setTab(t); },
    openOverlay: (o) => setOverlay(o),
    closeOverlay: () => setOverlay(null),
    toast: shared.toast,
    refresh: () => bump((n) => n + 1),
    resumoOff,
    dismissResumo: () => setResumoOff(true),
    confirmarPago: (parcela) => {
      const p = window.findParcela(parcela.vendaId, parcela.id);
      if (p) { p.pago = true; p.pagoEm = window.TODAY; }
      setOverlay(null);
      bump((n) => n + 1);
      // 1.6 — toast com ação "Desfazer" por ~5s
      shared.toast('Parcela confirmada como paga ✓', {
        label: 'Desfazer',
        onClick: () => { if (p) { p.pago = false; p.pagoEm = null; } bump((n) => n + 1); },
      });
    },
  };

  // Feat B — notificação simulada ~2s após carregar o painel do vendedor
  useEffect(() => {
    if (notifShown.current) return;
    notifShown.current = true;
    const doDia = window.parcelasDoDia();
    if (!doDia.length) return;
    // headline = só as que vencem hoje (igual ao banner "Resumo do dia")
    const hoje = doDia.filter((p) => window.parcelaStatus(p) === 'hoje');
    const base = hoje.length ? hoje : doDia;
    const totalDia = base.reduce((a, p) => a + p.valor, 0);
    const nClientes = new Set(base.map((p) => p.clienteId)).size;
    const t1 = setTimeout(() => {
      setNotif({ total: totalDia, clientes: nClientes });
      const t2 = setTimeout(() => setNotif(null), 7000); // auto-dispensa
      app._notifTimer = t2;
    }, 2000);
    return () => { clearTimeout(t1); clearTimeout(app._notifTimer); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'inicio' && <Dashboard app={app} />}
        {tab === 'pedidos' && <PedidosScreen app={app} />}
        {tab === 'clientes' && <Clientes app={app} />}
        {tab === 'estoque' && <Estoque app={app} />}
      </div>

      {/* Vendor bottom nav with center FAB */}
      <div style={{ display: 'flex', alignItems: 'flex-end', background: 'var(--card)', borderTop: '1px solid var(--line)', padding: '6px 4px 4px', flexShrink: 0, position: 'relative' }}>
        {[{ id: 'inicio', icon: 'home', label: 'Início' }, { id: 'pedidos', icon: 'receipt', label: 'Pedidos' }].map((it) => <NavBtn key={it.id} it={it} on={tab === it.id} onClick={() => app.go(it.id)} />)}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => app.openOverlay({ type: 'novaVenda' })} style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--green-600)', color: '#fff', border: '4px solid var(--card)', display: 'grid', placeItems: 'center', cursor: 'pointer', marginTop: -24, boxShadow: '0 6px 18px rgba(18,138,93,0.4)' }}><Icon name="plus" size={28} /></button>
        </div>
        {[{ id: 'clientes', icon: 'users', label: 'Clientes' }, { id: 'estoque', icon: 'box', label: 'Estoque' }].map((it) => <NavBtn key={it.id} it={it} on={tab === it.id} onClick={() => app.go(it.id)} />)}
      </div>

      {/* Overlays */}
      {overlay?.type === 'cliente' && <ClienteDetalhe id={overlay.id} app={app} />}
      {overlay?.type === 'produto' && <ProdutoDetalhe id={overlay.id} app={app} />}
      {overlay?.type === 'inadimplencia' && <Inadimplencia app={app} />}
      {overlay?.type === 'estoqueBaixo' && <EstoqueBaixo app={app} />}
      {overlay?.type === 'pedido' && <PedidoDetalhe id={overlay.id} app={app} />}
      {overlay?.type === 'novaVenda' && <NovaVenda clienteId={overlay.clienteId} app={app} />}
      {overlay?.type === 'cobranca' && <CobrancaSheet parcela={overlay.parcela} app={app} />}
      {overlay?.type === 'loteCobranca' && <BatchCobrancaSheet app={app} />}
      {overlay?.type === 'vendas' && <VendasHistorico app={app} />}
      {overlay?.type === 'venda' && <VendaDetalhe id={overlay.id} from={overlay.from} app={app} />}
      {overlay?.type === 'recibo' && <ReciboView vendaId={overlay.id} from={overlay.from} app={app} />}
      {overlay?.type === 'novoProduto' && <ProdutoForm app={app} />}
      {overlay?.type === 'novoCliente' && <ClienteForm app={app} />}
      {overlay?.type === 'cupons' && <CupomScreen app={app} />}
      {overlay?.type === 'notificacoes' && <NotificacoesScreen app={app} />}
      {overlay?.type === 'aniversariantes' && <AniversariantesScreen app={app} />}
      {overlay?.type === 'agenda' && <Agenda app={app} />}
      {overlay?.type === 'menu' && <MenuSheet app={app} onClose={app.closeOverlay} />}
      {overlay?.type === 'equipe' && <EquipeScreen app={app} />}
      {overlay?.type === 'membro' && <MembroDetalhe id={overlay.id} app={app} />}

      {/* Notificação Android simulada */}
      {notif && (
        <div onClick={() => { setNotif(null); setTab('inicio'); setOverlay({ type: 'loteCobranca' }); }}
          style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 70, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.22)', border: '1px solid var(--line)', cursor: 'pointer', animation: 'notifDown .4s cubic-bezier(.16,1,.3,1)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><BrandMark size={38} radius={10} onLight /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--ink-3)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{window.SELLER.loja} · agora</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', marginTop: 1, lineHeight: 1.3 }}>Você tem {window.fmtBRL(notif.total)} a receber hoje de {notif.clientes} cliente{notif.clientes > 1 ? 's' : ''}</div>
          </div>
          <Icon name="chevR" size={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}
function NavBtn({ it, on, onClick }) {
  return (
    <button onClick={onClick} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', color: on ? 'var(--green-700)' : 'var(--ink-3)' }}>
      <div style={{ padding: '3px 14px', borderRadius: 999, background: on ? 'var(--green-50)' : 'transparent' }}><Icon name={it.icon} size={22} stroke={on ? 2.3 : 1.9} /></div>
      <span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600, whiteSpace: 'nowrap' }}>{it.label}</span>
    </button>
  );
}

// ── Root ──────────────────────────────────────────────────
function Root() {
  const [env, setEnv] = useState('vendedor');
  const [vendorLogged, setVendorLogged] = useState(false);
  const [toast, setToast] = useState(null); // { msg, action }
  const tRef = useRef();
  useEffect(() => { window.applyBrand(window.SELLER.corCustom || window.SELLER.cor); }, []);
  const shared = {
    // toast(msg) ou toast(msg, { label, onClick }) — 1.6
    toast: (msg, action) => {
      setToast({ msg, action: action || null });
      clearTimeout(tRef.current);
      tRef.current = setTimeout(() => setToast(null), action ? 5000 : 2200);
    },
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 16px 40px', boxSizing: 'border-box' }}>
      {/* Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 14, padding: 4, border: '1px solid var(--line)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {[['vendedor', 'Painel do Vendedor', 'user'], ['cliente', 'Portal do Cliente', 'box']].map(([k, l, ic]) => (
            <button key={k} onClick={() => setEnv(k)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, background: env === k ? 'var(--green-600)' : 'transparent', color: env === k ? '#fff' : 'var(--ink-3)', transition: 'all .15s' }}>
              <Icon name={ic} size={16} /> {l}
            </button>
          ))}
        </div>
      </div>

      {/* Phone */}
      <div style={{ position: 'relative' }}>
        <AndroidDevice>
          <div style={{ height: '100%', background: 'var(--bg)', position: 'relative' }}>
            {env === 'vendedor'
              ? (vendorLogged ? <VendorApp shared={shared} /> : <VendorAuth onEnter={() => { window.CURRENT_USER = { role: 'admin', memberId: null }; setVendorLogged(true); }} shared={shared} />)
              : <ClientApp shared={shared} />}
            {toast && (
              <div style={{ position: 'absolute', left: '50%', bottom: 78, transform: 'translateX(-50%)', zIndex: 80, background: 'var(--ink-1)', color: '#fff', padding: '11px 14px 11px 18px', borderRadius: 13, fontSize: 13.5, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: 330, display: 'flex', alignItems: 'center', gap: 14, animation: 'toastIn .25s cubic-bezier(.16,1,.3,1)' }}>
                <span style={{ textAlign: 'left' }}>{toast.msg}</span>
                {toast.action && (
                  <button onClick={() => { toast.action.onClick(); setToast(null); }} style={{ background: 'none', border: 'none', color: '#5bd6a0', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>{toast.action.label}</button>
                )}
              </div>
            )}
          </div>
        </AndroidDevice>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>
          {env === 'vendedor'
            ? (vendorLogged
                ? <span>{window.SELLER.nome.split(' ')[0]} controla vendas, estoque e crediário · <button onClick={() => setVendorLogged(false)} style={{ background: 'none', border: 'none', color: 'var(--green-700)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>sair</button></span>
                : 'Crie sua loja ou entre no painel do vendedor')
            : 'Juliana acompanha pedidos e parcelas'}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
