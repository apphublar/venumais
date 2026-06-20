/* Cobrança WhatsApp/PIX + Pedido detalhe + Nova Venda (parcelamento) + Cobrança em lote */

// helper: número → string BR editável ("73,30")
const brStr = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

// ── COBRANÇA (WhatsApp + PIX) ─────────────────────────────
function CobrancaSheet({ parcela, app }) {
  const cli = window.getClient(parcela.clienteId);
  const st = window.parcelaStatus(parcela);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const pixCode = `00020126580014BR.GOV.BCB.PIX0136${window.SELLER.pixChave}5204000053039865406${parcela.valor.toFixed(2)}5802BR5921${window.SELLER.pixNome}6009SAO PAULO62070503***6304A1B2`;
  // status da cobrança para informar o cliente: em dia / vence hoje / atraso (com dias)
  const dias = Math.abs(window.daysBetween(parcela.venc, window.TODAY));
  const statusLinha = st === 'atrasado'
    ? `⚠️ *Situação: EM ATRASO há ${dias} ${dias === 1 ? 'dia' : 'dias'}* (venceu em ${window.fmtDate(parcela.venc)})`
    : st === 'hoje'
      ? `🔔 *Situação: vence HOJE* (${window.fmtDate(parcela.venc)})`
      : `✅ Situação: em dia · vence em ${window.fmtDate(parcela.venc)} (faltam ${dias} ${dias === 1 ? 'dia' : 'dias'})`;
  const msg = `Olá, ${cli.nome.split(' ')[0]}! 😊\nLembrando da parcela ${parcela.n} da sua compra na ${window.SELLER.loja}:\n\n💰 Valor: ${window.fmtBRL(parcela.valor)}\n${statusLinha}\n\nVocê pode pagar via PIX (copia e cola) ou pelo link. Qualquer dúvida é só chamar!`;

  // 1.8 — link real do WhatsApp (wa.me), telefone sem máscara + mensagem encodada
  const enviarWhats = () => {
    const phone = '55' + cli.zap.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setSent(true);
    const real = window.findParcela(parcela.vendaId, parcela.id);
    if (real) real.cobradaEm = window.TODAY; // marca cobrança feita hoje
    window.logActivity && window.logActivity(`Enviou cobrança para ${cli.nome}`, 'cobranca');
    app.toast('Abrindo WhatsApp de ' + cli.nome.split(' ')[0]);
    app.refresh && app.refresh();
  };

  return (
    <Sheet open onClose={app.closeOverlay} title="Cobrança">
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <Avatar label={cli.inicial} color={cli.cor} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{cli.nome}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Parcela {parcela.n} · vence {window.fmtDate(parcela.venc)}</div>
        </div>
        <StatusBadge status={st} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 16, textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>Valor da parcela</div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>{window.fmtBRL(parcela.valor)}</div>
      </div>

      {/* Message preview */}
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '4px 2px 8px' }}>Mensagem automática</div>
      <div style={{ background: '#e7f8ee', borderRadius: 16, borderTopLeftRadius: 4, padding: 14, fontSize: 13.5, lineHeight: 1.55, color: '#0f3b27', whiteSpace: 'pre-line', fontWeight: 500, marginBottom: 14 }}>
        {msg}
      </div>

      {/* PIX copia e cola */}
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '4px 2px 8px', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><Icon name="pix" size={15} /> PIX copia e cola</div>
      <div onClick={() => { navigator.clipboard?.writeText(pixCode); setCopied(true); app.toast('Código PIX copiado!'); setTimeout(() => setCopied(false), 1800); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px dashed var(--line-2)', borderRadius: 14, padding: '13px 14px', cursor: 'pointer', marginBottom: 18 }}>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pixCode}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: copied ? 'var(--green-700)' : 'var(--ink-1)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Copiado' : 'Copiar'}
        </span>
      </div>

      <Button kind="whats" icon="whatsapp" full size="lg" onClick={enviarWhats}>
        {sent ? 'Cobrança enviada ✓' : 'Enviar pelo WhatsApp'}
      </Button>
      <button onClick={() => { app.confirmarPago(parcela); }} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--green-700)', fontWeight: 800, fontSize: 14.5, padding: 10, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <Icon name="check" size={18} /> Confirmar pagamento recebido
      </button>
    </Sheet>
  );
}

// ── COBRANÇA EM LOTE (Feat B) ─────────────────────────────
function BatchCobrancaSheet({ app }) {
  const doDia = window.parcelasDoDia();
  const [sel, setSel] = useState(() => Object.fromEntries(doDia.map((p) => [p.id, true])));
  const [sending, setSending] = useState(false);
  const [doneIds, setDoneIds] = useState({});
  const selected = doDia.filter((p) => sel[p.id]);
  const totalSel = selected.reduce((a, p) => a + p.valor, 0);

  const enviar = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    for (const p of selected) {
      await new Promise((r) => setTimeout(r, 460)); // simula envio sequencial
      const real = window.findParcela(p.vendaId, p.id);
      if (real) real.cobradaEm = window.TODAY;
      setDoneIds((prev) => ({ ...prev, [p.id]: true }));
    }
    app.refresh && app.refresh();
    window.logActivity && window.logActivity(`Enviou ${selected.length} ${selected.length === 1 ? 'cobrança' : 'cobranças'} em lote`, 'cobranca');
    app.toast(`${selected.length} ${selected.length === 1 ? 'cobrança enviada' : 'cobranças enviadas'} ✓`);
    setTimeout(() => app.closeOverlay(), 800);
  };

  return (
    <Sheet open onClose={sending ? () => {} : app.closeOverlay} title="Cobranças do dia">
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, margin: '0 2px 14px', lineHeight: 1.5 }}>
        Revise e dispare todas as cobranças de hoje de uma vez. Cada cliente recebe a mensagem com valor, vencimento e PIX.
      </div>
      {doDia.map((p) => {
        const cli = window.getClient(p.clienteId);
        const st = window.parcelaStatus(p);
        const on = !!sel[p.id];
        const done = doneIds[p.id];
        return (
          <div key={p.id} onClick={() => !sending && setSel((s) => ({ ...s, [p.id]: !s[p.id] }))}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', marginBottom: 9, borderRadius: 14, cursor: sending ? 'default' : 'pointer', background: 'var(--card)', border: '1px solid ' + (on ? 'var(--green-600)' : 'var(--line)'), opacity: !on && !sending ? 0.55 : 1, transition: 'all .15s' }}>
            <Avatar label={cli.inicial} color={cli.cor} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>
                {window.fmtBRL(p.valor)} · {st === 'atrasado' ? <span style={{ color: '#dc2626', fontWeight: 700 }}>atrasada</span> : 'vence hoje'}
              </div>
            </div>
            {/* progresso ⏳ → ✓ ou checkbox */}
            {sending || done ? (
              <div style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', fontSize: 16 }}>
                {done ? <span style={{ color: 'var(--green-600)' }}><Icon name="check" size={20} stroke={2.6} /></span> : (on ? '⏳' : '—')}
              </div>
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid ' + (on ? 'var(--green-600)' : 'var(--line-2)'), background: on ? 'var(--green-600)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {on && <Icon name="check" size={15} stroke={3} style={{ color: '#fff' }} />}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 6 }}>
        <Button kind="whats" icon="whatsapp" full size="lg" onClick={enviar} style={{ opacity: selected.length && !sending ? 1 : 0.55 }}>
          {sending ? 'Enviando…' : `Enviar ${selected.length} ${selected.length === 1 ? 'cobrança' : 'cobranças'} · ${window.fmtBRL(totalSel)}`}
        </Button>
      </div>
    </Sheet>
  );
}

// ── PEDIDO (do catálogo) ──────────────────────────────────
function PedidoDetalhe({ id, app }) {
  const o = window.ORDERS.find((x) => x.id === id);
  const [, bump] = useState(0);
  const [garantia, setGarantia] = useState('');
  const cli = window.getClient(o.clienteId);
  const isEncomenda = o.tipo === 'encomenda';
  const [precos, setPrecos] = useState(() => {
    const m = {};
    o.itens.forEach((i) => { const p = window.getProduct(i.pid); m[i.pid] = p.precoVisivel ? brStr(isEncomenda && p.precoAtacado ? p.precoAtacado : p.preco) : ''; });
    return m;
  });
  const total = o.itens.reduce((a, i) => a + window.parseBRL(precos[i.pid]) * i.q, 0);
  const completo = o.itens.every((i) => window.parseBRL(precos[i.pid]) > 0);
  const garantiaN = window.parseBRL(garantia);

  const enviarGarantia = () => {
    if (garantiaN <= 0) { app.toast('Informe o valor de garantia'); return; }
    o.garantia = garantiaN; o.garantiaStatus = 'aguardando'; o.status = 'orcamento';
    o.precoAcordado = total;
    window.addNotif && window.addNotif('encomenda', 'Garantia enviada', `Encomenda #${o.id} — garantia de ${window.fmtBRL(garantiaN)} para ${cli.nome}`);
    window.logActivity && window.logActivity(`Definiu garantia de ${window.fmtBRL(garantiaN)} na encomenda #${o.id}`, 'encomenda');
    bump((n) => n + 1); app.refresh && app.refresh();
    app.closeOverlay();
    app.toast('Valor de garantia enviado ao cliente ✓');
  };

  return (
    <Overlay>
      <Header title={`${isEncomenda ? 'Encomenda' : 'Pedido'} #${o.id}`} subtitle={`${cli.nome} · ${window.fmtDateLong(o.data)}`} onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* tags origem / entrega */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
          <OrigemTag origem={o.origem} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: 'var(--chip)', color: 'var(--ink-2)', fontSize: 11.5, fontWeight: 800 }}><Icon name={o.entrega === 'entrega' ? 'truck' : 'store'} size={12} /> {o.entrega === 'entrega' ? 'Entrega' : 'Retirada'}</span>
          {isEncomenda && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: '#cffafe', color: '#0e7490', fontSize: 11.5, fontWeight: 800 }}><Icon name="truck" size={12} /> Encomenda atacado</span>}
        </div>

        {/* endereço de entrega */}
        {o.entrega === 'entrega' && (
          <Card pad={13} style={{ marginBottom: 12, display: 'flex', gap: 10, background: cli.endereco ? 'var(--card)' : '#fff7ed', borderColor: cli.endereco ? 'var(--line)' : '#fde9c8' }}>
            <Icon name={cli.endereco ? 'home' : 'alert'} size={17} style={{ color: cli.endereco ? 'var(--ink-3)' : '#b45309', flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 800, color: cli.endereco ? 'var(--ink-3)' : '#b45309' }}>Endereço de entrega</div><div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, marginTop: 2 }}>{cli.endereco || 'Cliente ainda não cadastrou. Ao aprovar, ele recebe o recibo e um aviso para cadastrar o endereço.'}</div></div>
          </Card>
        )}

        {o.obs && (
          <Card pad={14} style={{ marginBottom: 12, background: '#fffaf0', borderColor: '#fde9c8', display: 'flex', gap: 10 }}>
            <Icon name="doc" size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
            <div><div style={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>Observação do cliente</div><div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500, marginTop: 2 }}>"{o.obs}"</div></div>
          </Card>
        )}

        {isEncomenda && (
          <Card pad={14} style={{ marginBottom: 12, background: '#ecfeff', borderColor: '#a5f3fc', display: 'flex', gap: 10 }}>
            <Icon name="truck" size={18} style={{ color: '#0e7490', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.45 }}>O cliente quer que você <b>compre estes itens no atacado</b> para ele. Confira o valor e defina a <b>garantia</b> para iniciar a compra.</div>
          </Card>
        )}

        <SectionLabel>Itens · {isEncomenda ? 'preço de atacado' : 'informe os preços'}</SectionLabel>
        {o.itens.map((i) => {
          const p = window.getProduct(i.pid);
          return (
            <Card key={i.pid} pad={12} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProductThumb product={p} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Qtd: {i.q} {!p.precoVisivel && !isEncomenda && <span style={{ color: '#b45309', fontWeight: 700 }}>· definir preço</span>}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', width: 96 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span>
                <input value={precos[i.pid]} onChange={(e) => setPrecos((m) => ({ ...m, [i.pid]: e.target.value.replace(/[^\d.,]/g, '') }))} placeholder="0,00" inputMode="decimal" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
              </div>
            </Card>
          );
        })}
        <Card pad={15} style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>Total {isEncomenda ? 'da encomenda' : 'do orçamento'}</span>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{window.fmtBRL(total)}</span>
        </Card>

        {/* encomenda: definir garantia */}
        {isEncomenda && (
          <>
            <SectionLabel>Valor de garantia</SectionLabel>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, margin: '0 2px 10px', lineHeight: 1.45 }}>Valor que o cliente paga adiantado para você comprar a mercadoria. Sugestão: 30–50% do total.</div>
            <div style={{ display: 'flex', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '13px 14px' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span>
                <input value={garantia} onChange={(e) => setGarantia(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0,00" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
              </div>
              <button onClick={() => setGarantia(brStr(Math.round(total * 0.4 * 100) / 100))} style={{ flexShrink: 0, padding: '0 14px', borderRadius: 13, border: '1px solid var(--green-600)', background: 'var(--green-50)', color: 'var(--green-700)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>40%</button>
            </div>
            <div style={{ height: 8 }} />
          </>
        )}
        <div style={{ height: 8 }} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
        {isEncomenda
          ? <Button kind="primary" full size="lg" icon="check" onClick={enviarGarantia} style={{ opacity: (completo && garantiaN > 0) ? 1 : 0.5 }}>Enviar garantia ao cliente</Button>
          : <Button kind="primary" full size="lg" icon="check" onClick={() => { if (completo) { window.logActivity && window.logActivity(`Respondeu o orçamento #${o.id} — ${cli.nome}`, 'orcamento'); } app.closeOverlay(); app.toast(completo ? 'Orçamento aprovado e enviado ao cliente ✓' : 'Defina todos os preços para aprovar'); }} style={{ opacity: completo ? 1 : 0.5 }}>Aprovar e enviar ao cliente</Button>}
      </div>
    </Overlay>
  );
}

// ── NOVA VENDA (★ parcelamento) ───────────────────────────
function NovaVenda({ clienteId, app }) {
  const [step, setStep] = useState(clienteId ? 'itens' : 'cliente');
  const [cli, setCli] = useState(clienteId || null);
  const [cart, setCart] = useState({}); // pid -> qty
  const [sale, setSale] = useState(null);
  const cartItens = Object.entries(cart).filter(([, q]) => q > 0);
  const total = cartItens.reduce((a, [pid, q]) => a + (window.getProduct(pid).preco || 0) * q, 0);

  const steps = ['cliente', 'itens', 'pagamento', 'sucesso'];
  const idx = steps.indexOf(step);
  const title = { cliente: 'Escolher cliente', itens: 'Adicionar produtos', pagamento: 'Pagamento', sucesso: 'Venda criada' }[step];

  // finaliza: 1.5 baixa de estoque + persiste a venda no mock
  const finalize = (result) => {
    cartItens.forEach(([pid, q]) => { const p = window.getProduct(pid); if (p) p.estoque = Math.max(0, p.estoque - q); });
    const id = 'v' + (window.__saleSeq++);
    const avista = result.modo === 'avista';
    const pagoNow = avista && result.pago; // à vista pode ser "já recebido" ou "a receber"
    const totalFinal = result.total != null ? result.total : total;
    const venda = {
      id, clienteId: cli, data: window.TODAY, total: totalFinal, origem: 'vendedor',
      itens: cartItens.map(([pid, q]) => ({ pid, q, preco: window.getProduct(pid).preco || 0 })),
      modo: result.modo,
      metodo: result.metodo, // forma de pagamento: pix | cartao | dinheiro
      entrega: result.entrega || 'retirada', obs: result.obs || '',
      cupom: result.cupom || null, desconto: result.desconto || 0,
      confirmacao: { status: avista ? 'confirmada' : 'pendente', em: avista ? window.TODAY : null },
      parcelas: result.parcelas.map((p, i) => ({ id: `${id}-${i + 1}`, n: i + 1, venc: p.venc, valor: p.valor, pago: pagoNow, pagoEm: pagoNow ? window.TODAY : null, metodo: result.metodo })),
    };
    window.SALES.push(venda);
    window.addNotif && window.addNotif('venda', 'Venda registrada', `Venda #${id.replace(/^v/, '')} — ${window.getClient(cli).nome} · ${window.fmtBRL(totalFinal)}`);
    window.logActivity && window.logActivity(`Registrou a venda #${id.replace(/^v/, '')} — ${window.getClient(cli).nome} · ${window.fmtBRL(totalFinal)}`, 'venda');
    setSale(venda);
    setStep('sucesso');
  };

  return (
    <Overlay>
      {step !== 'sucesso' && (
        <>
          <Header title={title} onBack={() => { if (idx <= (clienteId ? 1 : 0)) app.closeOverlay(); else setStep(steps[idx - 1]); }} />
          <div style={{ display: 'flex', gap: 6, padding: '0 18px 8px' }}>
            {steps.slice(0, 3).map((s, i) => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? 'var(--green-600)' : 'var(--line-2)' }} />)}
          </div>
        </>
      )}

      {step === 'cliente' && (
        <ClienteStep onPick={(id) => { setCli(id); setStep('itens'); }} />
      )}

      {step === 'itens' && (
        <ItensStep cart={cart} setCart={setCart} total={total} cartItens={cartItens} onNext={() => setStep('pagamento')} />
      )}

      {step === 'pagamento' && (
        <PagamentoStep total={total} cli={cli} onDone={finalize} />
      )}

      {step === 'sucesso' && sale && (
        <SucessoStep sale={sale} app={app} />
      )}
    </Overlay>
  );
}

function ClienteStep({ onPick }) {
  const [q, setQ] = useState('');
  const [novo, setNovo] = useState(false);
  const term = q.trim().toLowerCase();
  const onlyDigits = term.replace(/\D/g, '');
  const list = window.CLIENTS.filter((c) =>
    c.nome.toLowerCase().includes(term) || (onlyDigits && c.zap.replace(/\D/g, '').includes(onlyDigits)));
  return (
    <div style={{ padding: '4px 16px 0' }}>
      {/* busca de cliente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '11px 14px', marginBottom: 11 }}>
        <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou WhatsApp" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 15, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
        {q && <button onClick={() => setQ('')} style={{ background: 'var(--chip)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}><Icon name="x" size={13} /></button>}
      </div>
      {/* cadastrar na hora */}
      <button onClick={() => setNovo(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--green-50)', border: '1.5px dashed var(--green-600)', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--green-600)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="plus" size={22} /></div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--green-700)' }}>Cadastrar novo cliente</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Adicione na hora e continue a venda</div>
        </div>
      </button>
      {list.map((c) => (
        <Card key={c.id} onClick={() => onPick(c.id)} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13 }}>
          <Avatar label={c.inicial} color={c.cor} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{c.nome}</div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{c.zap || 'Sem WhatsApp'}</div></div>
          <Icon name="chevR" size={20} style={{ color: 'var(--ink-3)' }} />
        </Card>
      ))}
      {!list.length && (
        <div style={{ textAlign: 'center', padding: '22px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5, lineHeight: 1.5 }}>
          Nenhum cliente encontrado.<br />Use "Cadastrar novo cliente" acima.
        </div>
      )}
      <div style={{ height: 16 }} />
      <NovoClienteSheet open={novo} onClose={() => setNovo(false)} onCreate={(c) => { setNovo(false); onPick(c.id); }} />
    </div>
  );
}

function NovoClienteSheet({ open, onClose, onCreate }) {
  const [nome, setNome] = useState('');
  const [zap, setZap] = useState('');
  useEffect(() => { if (open) { setNome(''); setZap(''); } }, [open]);
  const valid = nome.trim().length >= 2;
  const salvar = () => { if (valid) onCreate(window.addClient({ nome: nome.trim(), zap: zap.trim() })); };
  const fieldLabel = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
  const fieldInput = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' };
  return (
    <Sheet open={open} onClose={onClose} title="Novo cliente">
      <div style={{ marginBottom: 14 }}>
        <label style={fieldLabel}>Nome *</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana Beatriz" style={fieldInput} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={fieldLabel}>WhatsApp</label>
        <input value={zap} onChange={(e) => setZap(e.target.value)} inputMode="tel" placeholder="(11) 90000-0000" style={fieldInput} />
      </div>
      <Button kind="primary" full size="lg" icon="check" onClick={salvar} style={{ opacity: valid ? 1 : 0.5 }}>Cadastrar e selecionar</Button>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

function ItensStep({ cart, setCart, total, cartItens, onNext }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  // 1.5 — não permite passar do estoque disponível
  const set = (pid, delta) => setCart((c) => {
    const max = window.getProduct(pid).estoque;
    return { ...c, [pid]: Math.max(0, Math.min(max, (c[pid] || 0) + delta)) };
  });
  const cats = ['todas', ...Array.from(new Set(window.PRODUCTS.map((p) => p.cat)))];
  const term = q.trim().toLowerCase();
  const list = window.PRODUCTS
    .filter((p) => p.estoque > 0)
    .filter((p) => cat === 'todas' || p.cat === cat)
    .filter((p) => p.nome.toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term));
  const totalItens = cartItens.reduce((a, [, n]) => a + n, 0);
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>
        {/* busca de produto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '11px 14px', marginBottom: 10 }}>
          <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto ou SKU" style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 15, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
          {q && <button onClick={() => setQ('')} style={{ background: 'var(--chip)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}><Icon name="x" size={13} /></button>}
        </div>
        {/* filtro por categoria */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
          {cats.map((k) => (
            <button key={k} onClick={() => setCat(k)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 999, border: '1px solid ' + (cat === k ? 'var(--green-600)' : 'var(--line)'), background: cat === k ? 'var(--green-600)' : 'var(--card)', color: cat === k ? '#fff' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{k === 'todas' ? 'Todas' : k}</button>
          ))}
        </div>
        {list.map((p) => {
          const qn = cart[p.id] || 0;
          const noLimite = qn >= p.estoque;
          return (
            <Card key={p.id} pad={11} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProductThumb product={p} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>
                  {p.preco ? window.fmtBRL(p.preco) : 'A combinar'}
                  {qn > 0 && noLimite && <span style={{ color: '#b45309', fontWeight: 700 }}> · só restam {p.estoque} un.</span>}
                </div>
              </div>
              {qn > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => set(p.id, -1)} style={miniStep}><Icon name="arrowDown" size={16} /></button>
                  <span style={{ fontSize: 15, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{qn}</span>
                  <button onClick={() => set(p.id, 1)} disabled={noLimite} style={{ ...miniStep, background: noLimite ? 'var(--chip)' : 'var(--green-600)', color: noLimite ? 'var(--line-2)' : '#fff', border: 'none', cursor: noLimite ? 'default' : 'pointer' }}><Icon name="arrowUp" size={16} /></button>
                </div>
              ) : (
                <button onClick={() => set(p.id, 1)} style={{ ...miniStep, background: 'var(--green-50)', color: 'var(--green-700)', border: 'none', width: 'auto', padding: '0 14px', fontWeight: 800, fontSize: 13 }}>Adicionar</button>
              )}
            </Card>
          );
        })}
        {!list.length && <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>Nenhum produto encontrado.</div>}
        <div style={{ height: 90 }} />
      </div>
      <BottomBar disabled={!cartItens.length} label={cartItens.length ? `Continuar · ${window.fmtBRL(total)}` : 'Selecione produtos'} sub={cartItens.length ? `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}` : null} onClick={onNext} />
    </>
  );
}
const miniStep = { width: 34, height: 34, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)', fontFamily: 'inherit' };

// método de pagamento — usado em à vista e parcelado
const METODOS = [['pix', 'PIX', 'pix'], ['cartao', 'Cartão', 'cards'], ['dinheiro', 'Dinheiro', 'wallet']];
const METODO_LABEL = { pix: 'PIX', cartao: 'Cartão', dinheiro: 'Dinheiro' };
const METODO_ICON = { pix: 'pix', cartao: 'cards', dinheiro: 'wallet' };
function MetodoSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {METODOS.map(([k, l, ic]) => {
        const on = value === k;
        return (
          <button key={k} onClick={() => onChange(k)} style={{ flex: 1, padding: '12px 6px', borderRadius: 13, border: '1.5px solid ' + (on ? 'var(--green-600)' : 'var(--line)'), background: on ? 'var(--green-50)' : 'var(--card)', color: on ? 'var(--green-700)' : 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <Icon name={ic} size={20} /><span style={{ fontWeight: 800, fontSize: 12.5 }}>{l}</span>
          </button>
        );
      })}
    </div>
  );
}

function PagamentoStep({ total, cli, onDone }) {
  const [modo, setModo] = useState('parcelado');
  const [tipo, setTipo] = useState('auto'); // auto | manual
  const [nParc, setNParc] = useState(3);
  const [per, setPer] = useState('mensal');
  const [metodo, setMetodo] = useState('pix'); // forma de pagamento: pix | cartao | dinheiro
  const [pagoAvista, setPagoAvista] = useState(true); // à vista: já recebido ou a receber
  const [entrega, setEntrega] = useState('retirada'); // retirada | entrega
  const [obs, setObs] = useState('');
  const [cupomCodigo, setCupomCodigo] = useState('');
  const cupomAtivos = window.COUPONS.filter((c) => c.ativo);
  const cliEndereco = cli ? (window.getClient(cli) && window.getClient(cli).endereco) : '';
  const cupom = cupomCodigo ? window.findCoupon(cupomCodigo) : null;
  const desconto = window.cupomDesconto(cupom, total);
  const eff = Math.max(0, Math.round((total - desconto) * 100) / 100); // total com desconto
  const T = window.TODAY;

  // 1.3 mensal mantém o dia do mês · semanal/quinzenal por dias · 1.4 arredondamento
  const valoresAuto = window.splitParcelas(eff, nParc);
  const autoParcelas = Array.from({ length: nParc }, (_, i) => {
    const venc = per === 'mensal'
      ? window.addMonthsKeepDay(T, i + 1)
      : window.addDays(T, (per === 'semanal' ? 7 : 15) * (i + 1));
    return { n: i + 1, valor: valoresAuto[i], venc };
  });

  // manual: cada parcela tem uid estável, data editável e valor com vírgula (1.1, 1.2)
  const [manual, setManual] = useState(() => {
    const v = window.splitParcelas(total, 2);
    return [
      { uid: 'm1', venc: window.addDays(T, 7), raw: brStr(v[0]) },
      { uid: 'm2', venc: window.addDays(T, 21), raw: brStr(v[1]) },
    ];
  });
  const uidSeq = useRef(3);
  const [dateIdx, setDateIdx] = useState(null); // qual parcela está com o calendário aberto
  const manualTotal = manual.reduce((a, p) => a + window.parseBRL(p.raw), 0);
  const manualOk = Math.abs(manualTotal - total) < 0.01;

  const setRaw = (i, val) => setManual((m) => m.map((x, j) => (j === i ? { ...x, raw: val.replace(/[^\d.,]/g, '') } : x)));
  const removeParc = (i) => setManual((m) => m.filter((_, j) => j !== i));
  const addParc = () => setManual((m) => {
    const lastVenc = m.length ? m[m.length - 1].venc : T;
    return [...m, { uid: 'm' + (uidSeq.current++), venc: window.addDays(lastVenc, 30), raw: '0,00' }];
  });
  // ao escolher data: clamp p/ não-passado, reordena cronologicamente e renumera (1.1)
  const pickDate = (dt) => {
    const clamped = dt < T ? T : dt;
    setManual((m) => m.map((x, j) => (j === dateIdx ? { ...x, venc: clamped } : x)).sort((a, b) => a.venc - b.venc));
    setDateIdx(null);
  };

  const confirmar = () => {
    const extra = { entrega, obs: obs.trim(), cupom: cupom ? cupom.codigo : null, desconto, total: eff };
    if (cupom) cupom.usos = (cupom.usos || 0) + 1;
    if (modo === 'avista') return onDone({ modo: 'avista', metodo, pago: pagoAvista, parcelas: [{ venc: T, valor: eff }], ...extra });
    if (tipo === 'auto') return onDone({ modo: 'parcelado', metodo, pago: false, parcelas: autoParcelas.map((p) => ({ venc: p.venc, valor: p.valor })), ...extra });
    // manual — já ordenado
    const sorted = [...manual].sort((a, b) => a.venc - b.venc);
    onDone({ modo: 'parcelado', metodo, pago: false, parcelas: sorted.map((p) => ({ venc: p.venc, valor: window.parseBRL(p.raw) })), ...extra });
  };

  const confirmDisabled = modo === 'parcelado' && tipo === 'manual' && !manualOk;

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>
        <div style={{ background: 'var(--ink-1)', borderRadius: 16, padding: '14px 18px', color: '#fff', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5, opacity: 0.75, fontWeight: 600 }}>{desconto > 0 ? 'Subtotal' : 'Total da venda'}</span>
            <span style={{ fontSize: desconto > 0 ? 16 : 24, fontWeight: 800, opacity: desconto > 0 ? 0.7 : 1 }}>{window.fmtBRL(total)}</span>
          </div>
          {desconto > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 12.5, opacity: 0.75, fontWeight: 600 }}>Cupom {cupom.codigo}</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#5bd6a0' }}>− {window.fmtBRL(desconto)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{window.fmtBRL(eff)}</span>
              </div>
            </>
          )}
        </div>

        {/* Entrega */}
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Entrega</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {[['retirada', 'Retirada no local', 'store', 'Cliente retira na loja'], ['entrega', 'Entrega', 'truck', 'Entregamos no endereço']].map(([k, l, ic, sub]) => (
            <button key={k} onClick={() => setEntrega(k)} style={{ flex: 1, padding: '12px 10px', borderRadius: 14, border: '1.5px solid ' + (entrega === k ? 'var(--green-600)' : 'var(--line)'), background: entrega === k ? 'var(--green-50)' : 'var(--card)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: entrega === k ? 'var(--green-700)' : 'var(--ink-2)' }}>
              <Icon name={ic} size={20} /><div style={{ fontWeight: 800, fontSize: 13.5, marginTop: 5 }}>{l}</div><div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{sub}</div>
            </button>
          ))}
        </div>
        {entrega === 'entrega' && (
          <div style={{ marginBottom: 14, padding: '11px 13px', borderRadius: 12, background: cliEndereco ? 'var(--green-50)' : '#fff7ed', border: '1px solid ' + (cliEndereco ? 'transparent' : '#fde9c8') }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <Icon name={cliEndereco ? 'home' : 'alert'} size={16} style={{ color: cliEndereco ? 'var(--green-700)' : '#b45309', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: cliEndereco ? 'var(--green-700)' : '#b45309' }}>
                {cliEndereco ? <>Entregar em: <b>{cliEndereco}</b></> : 'Cliente ainda não cadastrou endereço. Ao confirmar, ele recebe o recibo e um pedido para cadastrar o endereço de entrega.'}
              </div>
            </div>
          </div>
        )}

        {/* Cupom */}
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Cupom de desconto</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: cupomAtivos.length ? 9 : 16 }}>
          <input value={cupomCodigo} onChange={(e) => setCupomCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Digite o código" style={{ flex: 1, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 13, border: '1px solid ' + (cupomCodigo && !cupom ? '#fbd5d5' : 'var(--line)'), fontFamily: 'monospace', fontSize: 14.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' }} />
          {cupomCodigo && <button onClick={() => setCupomCodigo('')} style={{ flexShrink: 0, width: 46, borderRadius: 13, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Icon name="x" size={18} /></button>}
        </div>
        {cupomCodigo && !cupom && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, margin: '-2px 2px 14px' }}>Cupom inválido ou inativo.</div>}
        {!cupomCodigo && cupomAtivos.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
            {cupomAtivos.map((c) => (
              <button key={c.id} onClick={() => setCupomCodigo(c.codigo)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, border: '1px dashed var(--green-600)', background: 'var(--green-50)', color: 'var(--green-700)', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}><Icon name="ticket" size={13} /> {c.codigo}</button>
            ))}
          </div>
        )}

        {/* Observações */}
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Observações</div>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Anotações sobre a venda, referências, combinados..." style={{ width: '100%', boxSizing: 'border-box', minHeight: 56, padding: 12, borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none', marginBottom: 18, color: 'var(--ink-1)' }} />

        {/* à vista / parcelado */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[['avista', 'À vista', 'wallet'], ['parcelado', 'Parcelado', 'cards']].map(([k, l, ic]) => (
            <button key={k} onClick={() => setModo(k)} style={{ flex: 1, padding: '14px 10px', borderRadius: 15, border: '1.5px solid ' + (modo === k ? 'var(--green-600)' : 'var(--line)'), background: modo === k ? 'var(--green-50)' : 'var(--card)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: modo === k ? 'var(--green-700)' : 'var(--ink-2)' }}>
              <Icon name={ic} size={22} /><span style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }}>{l}</span>
            </button>
          ))}
        </div>

        {modo === 'parcelado' && (
          <>
            <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
              {[['auto', 'Automático'], ['manual', 'Manual']].map(([k, l]) => (
                <button key={k} onClick={() => setTipo(k)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, background: tipo === k ? 'var(--card)' : 'transparent', color: tipo === k ? 'var(--ink-1)' : 'var(--ink-3)', boxShadow: tipo === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{l}</button>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Forma de recebimento</div>
            <div style={{ marginBottom: 18 }}><MetodoSelector value={metodo} onChange={setMetodo} /></div>

            {tipo === 'auto' && (
              <>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Número de parcelas</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[2, 3, 4, 6, 10, 12].map((n) => (
                    <button key={n} onClick={() => setNParc(n)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1.5px solid ' + (nParc === n ? 'var(--green-600)' : 'var(--line)'), background: nParc === n ? 'var(--green-600)' : 'var(--card)', color: nParc === n ? '#fff' : 'var(--ink-2)', fontWeight: 800, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit' }}>{n}x</button>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Periodicidade</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  {[['semanal', 'Semanal'], ['quinzenal', 'Quinzenal'], ['mensal', 'Mensal']].map(([k, l]) => (
                    <button key={k} onClick={() => setPer(k)} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1.5px solid ' + (per === k ? 'var(--green-600)' : 'var(--line)'), background: per === k ? 'var(--green-50)' : 'var(--card)', color: per === k ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 2px 10px' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)' }}>{nParc}x {per}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--green-700)', whiteSpace: 'nowrap' }}>soma {window.fmtBRL(total)}</span>
                </div>
                <ParcelasPreview list={autoParcelas} />
              </>
            )}

            {tipo === 'manual' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 2px 10px' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)' }}>Parcelas personalizadas</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap', color: manualOk ? 'var(--green-700)' : '#dc2626' }}>{window.fmtBRL(manualTotal)} / {window.fmtBRL(total)}</span>
                </div>
                {manual.map((p, i) => (
                  <Card key={p.uid} pad={12} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-50)', color: 'var(--green-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                    {/* botão de data — abre o calendário */}
                    <button onClick={() => setDateIdx(i)} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-1)' }}>
                      <Icon name="calendar" size={14} style={{ color: 'var(--green-700)' }} />
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{window.fmtDate(p.venc)}</span>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', width: 92, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span>
                      <input value={p.raw} onChange={(e) => setRaw(i, e.target.value)} inputMode="decimal" placeholder="0,00" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
                    </div>
                    {manual.length > 1 && <button onClick={() => removeParc(i)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 2, flexShrink: 0 }}><Icon name="x" size={16} /></button>}
                  </Card>
                ))}
                <button onClick={addParc} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px dashed var(--line-2)', background: 'none', color: 'var(--green-700)', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="plus" size={16} /> Adicionar parcela</button>
                {!manualOk && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, textAlign: 'center', marginTop: 10 }}>A soma das parcelas precisa fechar com o total da venda.</div>}
              </>
            )}
          </>
        )}

        {modo === 'avista' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Status do pagamento</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              {[['pago', 'Já recebido', true, 'check'], ['receber', 'A receber', false, 'clock']].map(([k, l, val, ic]) => (
                <button key={k} onClick={() => setPagoAvista(val)} style={{ flex: 1, padding: '13px 8px', borderRadius: 14, border: '1.5px solid ' + (pagoAvista === val ? 'var(--green-600)' : 'var(--line)'), background: pagoAvista === val ? 'var(--green-50)' : 'var(--card)', color: pagoAvista === val ? 'var(--green-700)' : 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <Icon name={ic} size={18} /> {l}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', margin: '2px 2px 8px' }}>Forma de pagamento</div>
            <MetodoSelector value={metodo} onChange={setMetodo} />
            <Card pad={14} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--green-50)', color: 'var(--green-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={METODO_ICON[metodo]} size={22} /></div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.45 }}>
                {pagoAvista
                  ? <>Recebido <b style={{ color: 'var(--ink-1)' }}>hoje</b> via <b style={{ color: 'var(--ink-1)' }}>{METODO_LABEL[metodo]}</b>.</>
                  : <>A receber via <b style={{ color: 'var(--ink-1)' }}>{METODO_LABEL[metodo]}</b> · vence hoje, {window.fmtDate(window.TODAY)}.</>}
              </div>
            </Card>
          </>
        )}
        <div style={{ height: 90 }} />
      </div>
      <BottomBar disabled={confirmDisabled} label="Confirmar venda" sub={modo === 'parcelado' ? (tipo === 'auto' ? `${nParc}x ${per}` : `${manual.length} parcelas`) : 'à vista'} onClick={confirmar} />

      {/* calendário da parcela manual em edição */}
      <DateSheet
        open={dateIdx !== null}
        value={dateIdx !== null ? manual[dateIdx].venc : null}
        min={T}
        refBase={dateIdx !== null ? (dateIdx > 0 ? manual[dateIdx - 1].venc : T) : T}
        onClose={() => setDateIdx(null)}
        onPick={pickDate}
      />
    </>
  );
}

function ParcelasPreview({ list }) {
  return (
    <div>
      {list.map((p) => (
        <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-50)', color: 'var(--green-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>{p.n}</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}><Icon name="calendar" size={14} style={{ color: 'var(--ink-3)' }} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>{window.fmtDate(p.venc)}</span></div>
          <Money value={p.valor} size={14.5} />
        </div>
      ))}
    </div>
  );
}

function BottomBar({ label, sub, onClick, disabled }) {
  return (
    <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)', flexShrink: 0 }}>
      <button onClick={disabled ? undefined : onClick} style={{ width: '100%', minHeight: 54, borderRadius: 15, border: 'none', cursor: disabled ? 'default' : 'pointer', background: disabled ? 'var(--line-2)' : 'var(--green-600)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: disabled ? 'none' : '0 4px 14px rgba(18,138,93,0.3)' }}>
        {label}{sub && <span style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.8, whiteSpace: 'nowrap', flexShrink: 0 }}>· {sub}</span>}
      </button>
    </div>
  );
}

function SucessoStep({ sale, app }) {
  const c = window.getClient(sale.clienteId);
  const parcelado = sale.modo === 'parcelado';

  // Feat A — envia link de confirmação ao cliente (WhatsApp simulado)
  const enviarConfirmacao = () => {
    const phone = '55' + c.zap.replace(/\D/g, '');
    const msg = `Oi, ${c.nome.split(' ')[0]}! Registrei sua compra de ${window.fmtBRL(sale.total)} em ${sale.parcelas.length}x na ${window.SELLER.loja}. Confirme os detalhes no seu portal: ${window.SELLER.catalogo}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    app.closeOverlay();
    app.toast('Link de confirmação enviado a ' + c.nome.split(' ')[0] + ' ✓');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--green-50)', color: 'var(--green-600)', display: 'grid', placeItems: 'center', margin: '0 auto 20px', animation: 'pop .4s cubic-bezier(.16,1.4,.5,1)' }}>
        <Icon name="check" size={44} stroke={2.6} />
      </div>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Venda registrada!</h2>
      <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--ink-3)', fontWeight: 500 }}>
        {window.fmtBRL(sale.total)} para <b style={{ color: 'var(--ink-1)' }}>{c.nome}</b>.{' '}
        {parcelado
          ? `Crediário em ${sale.parcelas.length}x · ${METODO_LABEL[sale.metodo] || 'a combinar'}.`
          : (sale.parcelas[0] && sale.parcelas[0].pago
              ? `Recebido via ${METODO_LABEL[sale.metodo] || ''}.`
              : `A receber via ${METODO_LABEL[sale.metodo] || ''} · vence hoje.`)}
      </p>

      {parcelado && (
        <Card pad={14} style={{ marginTop: 20, textAlign: 'left', display: 'flex', gap: 11, background: '#fffaf0', borderColor: '#fde9c8' }}>
          <Icon name="clock" size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.5 }}>
            Envie para o cliente confirmar a compra pelo portal. A confirmação fica registrada com data — um comprovante do acordo.
          </div>
        </Card>
      )}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <Button kind="primary" icon="receipt" size="lg" full onClick={() => app.openOverlay({ type: 'recibo', id: sale.id })}>Ver recibo</Button>
        {parcelado
          ? <Button kind="whats" icon="whatsapp" size="lg" full onClick={enviarConfirmacao}>Enviar para confirmação do cliente</Button>
          : null}
        <Button kind="ghost" size="lg" full onClick={() => { app.closeOverlay(); app.go('pedidos'); }}>Ver pedidos</Button>
      </div>
    </div>
  );
}

Object.assign(window, { CobrancaSheet, BatchCobrancaSheet, PedidoDetalhe, NovaVenda, BottomBar, brStr });
