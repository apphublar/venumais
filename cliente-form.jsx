/* Cadastro completo de cliente (vendedor) — com data de nascimento p/ aniversariantes */
function ClienteForm({ app }) {
  const [nome, setNome] = useState('');
  const [zap, setZap] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [nasc, setNasc] = useState(''); // yyyy-mm-dd
  const [obs, setObs] = useState('');

  const valid = nome.trim().length >= 2 && zap.replace(/\D/g, '').length >= 10;
  const label = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' };

  const salvar = () => {
    if (!valid) return;
    let nascimento = null;
    if (nasc) { const [y, m, d] = nasc.split('-').map(Number); nascimento = new Date(y, m - 1, d); }
    const c = window.addClient({ nome, zap, email, endereco, nascimento, obs });
    app.refresh && app.refresh();
    app.closeOverlay();
    app.openOverlay({ type: 'cliente', id: c.id });
    app.toast('Cliente cadastrado ✓');
  };

  return (
    <Overlay>
      <Header title="Novo cliente" onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nome completo *</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana Beatriz" style={input} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>WhatsApp *</label>
          <input value={zap} onChange={(e) => setZap(e.target.value)} inputMode="tel" placeholder="(11) 90000-0000" style={input} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Email <span style={{ color: 'var(--ink-3)', fontWeight: 600, textTransform: 'none' }}>(opcional)</span></label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="cliente@email.com" style={input} />
        </div>

        {/* data de nascimento */}
        <div style={{ marginBottom: 6 }}>
          <label style={label}>Data de nascimento <span style={{ color: 'var(--ink-3)', fontWeight: 600, textTransform: 'none' }}>(opcional)</span></label>
          <input type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} style={{ ...input, WebkitAppearance: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--green-50)', borderRadius: 12, padding: '10px 12px', marginBottom: 16 }}>
          <Icon name="gift" size={17} style={{ color: 'var(--green-700)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--green-700)', fontWeight: 600, lineHeight: 1.45 }}>Com a data de aniversário, você recebe um lembrete para fazer promoções para os aniversariantes do mês.</span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Endereço de entrega <span style={{ color: 'var(--ink-3)', fontWeight: 600, textTransform: 'none' }}>(opcional)</span></label>
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade — UF" style={input} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={label}>Observações <span style={{ color: 'var(--ink-3)', fontWeight: 600, textTransform: 'none' }}>(opcional)</span></label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Preferências, anotações..." style={{ ...input, minHeight: 64, resize: 'none' }} />
        </div>
        <div style={{ height: 8 }} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
        <Button kind="primary" full size="lg" icon="check" onClick={salvar} style={{ opacity: valid ? 1 : 0.5 }}>Cadastrar cliente</Button>
      </div>
    </Overlay>
  );
}

Object.assign(window, { ClienteForm });

// ── Aniversariantes do mês ────────────────────────────────
function AniversariantesScreen({ app }) {
  const [mes, setMes] = useState(window.TODAY.getMonth());
  const ativos = window.COUPONS.filter((c) => c.ativo);
  const [cupom, setCupom] = useState(ativos[0] ? ativos[0].codigo : '');
  const [msg, setMsg] = useState('Parabéns, {nome}! 🎉 A {loja} preparou um presente de aniversário pra você: use o cupom {cupom} e aproveite! 🎁');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const lista = window.aniversariantesDoMes(mes);

  // monta a mensagem final substituindo as variáveis
  const montarMsg = (c) => msg
    .replace(/\{nome\}/g, c.nome.split(' ')[0])
    .replace(/\{loja\}/g, window.SELLER.loja)
    .replace(/\{cupom\}/g, cupom || '');
  const felicitar = (c) => {
    const url = `https://wa.me/55${c.zap.replace(/\D/g, '')}?text=${encodeURIComponent(montarMsg(c))}`;
    window.open(url, '_blank');
    app.toast('Abrindo felicitação no WhatsApp');
  };
  const enviarTodos = () => {
    if (!lista.length) return;
    app.toast(`Felicitação enviada a ${lista.length} aniversariante${lista.length > 1 ? 's' : ''} ✓`);
  };
  const inputBox = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)', resize: 'none' };

  return (
    <Overlay>
      <Header title="Aniversariantes" subtitle="Faça promoções e fidelize" onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* configurar promoção de aniversário */}
        <Card pad={14} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fce7f3', color: '#db2777', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="gift" size={18} /></div>
            <span style={{ fontSize: 14.5, fontWeight: 800, whiteSpace: 'nowrap' }}>Promoção de aniversário</span>
          </div>

          {/* cupom */}
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7 }}>Cupom do presente</div>
          {ativos.length ? (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
              {ativos.map((c) => (
                <button key={c.id} onClick={() => setCupom(cupom === c.codigo ? '' : c.codigo)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 999, border: '1px solid ' + (cupom === c.codigo ? 'var(--green-600)' : 'var(--line)'), background: cupom === c.codigo ? 'var(--green-50)' : 'var(--card)', color: cupom === c.codigo ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'monospace' }}>
                  <Icon name="ticket" size={13} /> {c.codigo} <span style={{ opacity: 0.7 }}>{c.tipo === 'percentual' ? `${c.valor}%` : window.fmtBRL(c.valor)}</span>
                </button>
              ))}
            </div>
          ) : (
            <button onClick={() => { app.closeOverlay(); app.openOverlay({ type: 'cupons' }); }} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', justifyContent: 'center', background: 'var(--green-50)', border: '1.5px dashed var(--green-600)', borderRadius: 12, padding: '10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--green-700)', fontWeight: 800, fontSize: 13, marginBottom: 14 }}><Icon name="plus" size={16} /> Criar um cupom primeiro</button>
          )}

          {/* mensagem */}
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7 }}>Mensagem</div>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} style={{ ...inputBox, minHeight: 78 }} />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 7, lineHeight: 1.5 }}>Variáveis: <b>{'{nome}'}</b>, <b>{'{loja}'}</b>, <b>{'{cupom}'}</b> — trocadas automaticamente para cada cliente.</div>

          {/* prévia */}
          {lista[0] && (
            <div style={{ marginTop: 12, background: '#e7f8ee', borderRadius: 14, borderTopLeftRadius: 4, padding: '11px 13px', fontSize: 12.5, lineHeight: 1.5, color: '#0f3b27', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
              {montarMsg(lista[0])}
            </div>
          )}
        </Card>

        {/* seletor de mês */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => setMes((mes + 11) % 12)} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11, width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)' }}><Icon name="chevL" size={18} /></button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{meses[mes]}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>{lista.length} aniversariante{lista.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={() => setMes((mes + 1) % 12)} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11, width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)' }}><Icon name="chevR" size={18} /></button>
        </div>

        {lista.length > 1 && (
          <Button kind="whats" icon="whatsapp" full onClick={enviarTodos} style={{ marginBottom: 12 }}>Felicitar todos ({lista.length})</Button>
        )}

        {lista.map((c) => {
          const dia = c.nascimento.getDate();
          const hoje = dia === window.TODAY.getDate() && mes === window.TODAY.getMonth();
          return (
            <Card key={c.id} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13, borderColor: hoje ? '#fbcfe8' : 'var(--line)', background: hoje ? '#fdf2f8' : 'var(--card)' }}>
              <Avatar label={c.inicial} color={c.cor} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>{c.nome}</div>
                <div style={{ fontSize: 12.5, color: hoje ? '#db2777' : 'var(--ink-3)', fontWeight: 700, marginTop: 1 }}>{hoje ? '🎂 É hoje!' : `Dia ${String(dia).padStart(2, '0')}`}</div>
              </div>
              <button onClick={() => felicitar(c)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#25D366', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}><WhatsLogo size={14} /> Felicitar</button>
            </Card>
          );
        })}
        {!lista.length && <div style={{ textAlign: 'center', padding: '34px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>Nenhum aniversariante em {meses[mes]}.</div>}
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

Object.assign(window, { ClienteForm, AniversariantesScreen });
