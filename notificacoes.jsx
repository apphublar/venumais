/* Tela de Notificações do vendedor */
const NOTIF_META = {
  venda: { icon: 'cards', cor: '#6d28d9', bg: '#ede9fe' },
  orcamento: { icon: 'receipt', cor: '#1e478f', bg: '#dbeafe' },
  pedido: { icon: 'box', cor: 'var(--green-700)', bg: 'var(--green-50)' },
  pagamento: { icon: 'wallet', cor: 'var(--green-700)', bg: 'var(--green-50)' },
  estoque: { icon: 'alert', cor: '#b45309', bg: '#fef3c7' },
  cliente: { icon: 'users', cor: '#1e478f', bg: '#dbeafe' },
  aniversario: { icon: 'gift', cor: '#db2777', bg: '#fce7f3' },
  encomenda: { icon: 'truck', cor: '#0891b2', bg: '#cffafe' },
  geral: { icon: 'bell', cor: 'var(--ink-3)', bg: 'var(--chip)' },
};
function fmtNotifTime(dt) {
  const d = (dt instanceof Date) ? dt : new Date(dt);
  const diff = window.daysBetween(window.TODAY, new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Hoje · ${hora}`;
  if (diff === 1) return `Ontem · ${hora}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ` · ${hora}`;
}

function NotificacoesScreen({ app }) {
  const [, bump] = useState(0);
  const lista = window.NOTIFICATIONS;
  const naoLidas = lista.filter((n) => !n.lida).length;
  // marca todas como lidas ao abrir
  useEffect(() => { const t = setTimeout(() => { window.markNotifsRead(); app.refresh && app.refresh(); }, 1200); return () => clearTimeout(t); }, []);

  return (
    <Overlay>
      <Header title="Notificações" subtitle={naoLidas ? `${naoLidas} não lidas` : 'Tudo em dia'} onBack={app.closeOverlay}
        right={naoLidas ? <button onClick={() => { window.markNotifsRead(); bump((n) => n + 1); app.refresh && app.refresh(); }} style={{ background: 'none', border: 'none', color: 'var(--green-700)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Marcar lidas</button> : null} />
      <div style={{ padding: '6px 16px 0' }}>
        {lista.map((n) => {
          const m = NOTIF_META[n.cat] || NOTIF_META.geral;
          return (
            <div key={n.id} style={{ display: 'flex', gap: 12, padding: '13px 13px', marginBottom: 9, borderRadius: 14, background: n.lida ? 'var(--card)' : 'var(--green-50)', border: '1px solid ' + (n.lida ? 'var(--line)' : 'transparent') }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: m.bg, color: m.cor, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={m.icon} size={20} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-1)' }}>{n.titulo}</span>
                  {!n.lida && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green-600)', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginTop: 2, lineHeight: 1.4 }}>{n.texto}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>{fmtNotifTime(n.em)}</div>
              </div>
            </div>
          );
        })}
        {!lista.length && <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--ink-3)', fontWeight: 600 }}>Nenhuma notificação ainda.</div>}
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

Object.assign(window, { NotificacoesScreen, NOTIF_META });
