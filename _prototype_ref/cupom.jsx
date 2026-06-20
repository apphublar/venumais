/* Cupons de desconto — gestão do vendedor */
function CupomScreen({ app }) {
  const [, bump] = useState(0);
  const [novo, setNovo] = useState(false);
  const ativos = window.COUPONS.filter((c) => c.ativo);
  const inativos = window.COUPONS.filter((c) => !c.ativo);

  const Row = ({ c }) => (
    <Card pad={13} style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: c.ativo ? 'var(--green-50)' : 'var(--chip)', color: c.ativo ? 'var(--green-700)' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="ticket" size={22} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', fontFamily: 'monospace' }}>{c.codigo}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green-700)', whiteSpace: 'nowrap' }}>{c.tipo === 'percentual' ? `${c.valor}%` : window.fmtBRL(c.valor)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{c.descricao || (c.tipo === 'percentual' ? 'Desconto percentual' : 'Desconto fixo')} · {c.usos} usos</div>
        </div>
        <Toggle on={c.ativo} onChange={() => { c.ativo = !c.ativo; bump((n) => n + 1); app.refresh && app.refresh(); }} />
      </div>
    </Card>
  );

  return (
    <Overlay>
      <Header title="Cupons de desconto" subtitle={`${ativos.length} ativos`} onBack={app.closeOverlay}
        right={<button onClick={() => setNovo(true)} style={{ ...iconBtn, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="plus" size={20} /></button>} />
      <div style={{ padding: '6px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--green-50)', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
          <Icon name="ticket" size={18} style={{ color: 'var(--green-700)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12.5, color: 'var(--green-700)', fontWeight: 600, lineHeight: 1.45 }}>Crie cupons para suas promoções. O cliente aplica o código no carrinho do app, e você pode usar na hora de fechar uma venda.</span>
        </div>

        <SectionLabel>Ativos</SectionLabel>
        {ativos.map((c) => <Row key={c.id} c={c} />)}
        {!ativos.length && <div style={{ textAlign: 'center', padding: '16px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>Nenhum cupom ativo.</div>}

        {!!inativos.length && <>
          <SectionLabel>Inativos</SectionLabel>
          {inativos.map((c) => <Row key={c.id} c={c} />)}
        </>}
        <div style={{ height: 16 }} />
      </div>
      <NovoCupomSheet open={novo} onClose={() => setNovo(false)} onCreate={(c) => { setNovo(false); bump((n) => n + 1); app.refresh && app.refresh(); app.toast(`Cupom ${c.codigo} criado ✓`); }} />
    </Overlay>
  );
}

function NovoCupomSheet({ open, onClose, onCreate }) {
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState('percentual');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  useEffect(() => { if (open) { setCodigo(''); setTipo('percentual'); setValor(''); setDescricao(''); } }, [open]);
  const valN = window.parseBRL(valor);
  const valid = codigo.trim().length >= 3 && valN > 0 && (tipo !== 'percentual' || valN <= 90);
  const label = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' };

  return (
    <Sheet open={open} onClose={onClose} title="Novo cupom">
      <div style={{ marginBottom: 14 }}>
        <label style={label}>Código do cupom *</label>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="EX.: PROMO10" style={{ ...input, fontFamily: 'monospace', letterSpacing: '0.05em' }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={label}>Tipo de desconto</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['percentual', 'Percentual (%)'], ['fixo', 'Valor fixo (R$)']].map(([k, l]) => (
            <button key={k} onClick={() => setTipo(k)} style={{ flex: 1, padding: '12px 6px', borderRadius: 13, border: '1.5px solid ' + (tipo === k ? 'var(--green-600)' : 'var(--line)'), background: tipo === k ? 'var(--green-50)' : 'var(--card)', color: tipo === k ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={label}>{tipo === 'percentual' ? 'Percentual de desconto' : 'Valor do desconto'}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '12px 14px' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>{tipo === 'percentual' ? '%' : 'R$'}</span>
          <input value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder={tipo === 'percentual' ? '10' : '15,00'} style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
        </div>
        {tipo === 'percentual' && valN > 90 && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 7 }}>Máximo de 90%.</div>}
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={label}>Descrição (opcional)</label>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Promo de aniversário" style={input} />
      </div>
      <Button kind="primary" full size="lg" icon="check" onClick={() => valid && onCreate(window.addCoupon({ codigo, tipo, valor: valN, descricao }))} style={{ opacity: valid ? 1 : 0.5 }}>Criar cupom</Button>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

Object.assign(window, { CupomScreen, NovoCupomSheet });
