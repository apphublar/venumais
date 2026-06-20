/* Recibo de venda — profissional, compartilhável e imprimível */
function ReciboView({ vendaId, app, from }) {
  const s = window.SALES.find((x) => x.id === vendaId);
  if (!s) return null;
  const cli = window.getClient(s.clienteId);
  const sub = s.itens.reduce((a, i) => a + i.preco * i.q, 0);
  const desconto = s.desconto || 0;
  const onBack = from ? () => app.openOverlay(from) : app.closeOverlay;
  const numero = s.id.replace(/^v/, '');

  const linhaTexto = () => {
    let t = `*${window.SELLER.loja}*\nRecibo de venda #${numero}\n${window.fmtDateLong(s.data)}\n\nCliente: ${cli.nome}\n\n`;
    s.itens.forEach((i) => { const p = window.getProduct(i.pid); t += `${i.q}x ${p ? p.nome : 'Item'} — ${window.fmtBRL(i.preco * i.q)}\n`; });
    if (desconto > 0) t += `\nDesconto: -${window.fmtBRL(desconto)}`;
    t += `\n*Total: ${window.fmtBRL(s.total)}*\n`;
    t += s.modo === 'avista' ? '\nPagamento: à vista' : `\nParcelado em ${s.parcelas.length}x`;
    return t;
  };

  return (
    <Overlay>
      <Header title={`Recibo #${numero}`} onBack={onBack}
        right={<button onClick={() => app.toast('Recibo impresso (demonstração)')} style={{ ...iconBtn }}><Icon name="print" size={19} /></button>} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* folha do recibo */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--line)', overflow: 'hidden', boxShadow: '0 4px 16px rgba(16,32,24,0.06)' }}>
          {/* cabeçalho da marca */}
          <div style={{ background: 'linear-gradient(135deg, var(--brand-g1), var(--brand-g2))', color: '#fff', padding: '20px', display: 'flex', alignItems: 'center', gap: 13 }}>
            <BrandMark size={48} radius={13} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{window.SELLER.loja}</div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600 }}>{window.SELLER.catalogo}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700 }}>RECIBO</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>#{numero}</div>
            </div>
          </div>

          <div style={{ padding: '16px 18px' }}>
            {/* cliente + data */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase' }}>Cliente</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink-1)' }}>{cli.nome}</div>
                {cli.zap && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{cli.zap}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase' }}>Data</div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink-1)' }}>{window.fmtDate(s.data)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{s.modo === 'avista' ? 'À vista' : `${s.parcelas.length}x`}</div>
              </div>
            </div>

            {/* itens */}
            <div style={{ borderTop: '1px dashed var(--line-2)', borderBottom: '1px dashed var(--line-2)', padding: '10px 0', margin: '4px 0 12px' }}>
              {s.itens.map((i, idx) => {
                const p = window.getProduct(i.pid);
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0' }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)' }}>{p ? p.nome : 'Item'}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}> · {i.q} × {window.fmtBRL(i.preco)}</span>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{window.fmtBRL(i.preco * i.q)}</span>
                  </div>
                );
              })}
            </div>

            {/* totais */}
            {desconto > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>Subtotal</span><span style={{ fontSize: 13, fontWeight: 700 }}>{window.fmtBRL(sub)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>Desconto{s.cupom ? ` (${s.cupom})` : ''}</span><span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>− {window.fmtBRL(desconto)}</span></div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTop: '2px solid var(--ink-1)' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-1)' }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-700)', letterSpacing: '-0.02em' }}>{window.fmtBRL(s.total)}</span>
            </div>

            {/* entrega */}
            {s.entrega && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '9px 11px', borderRadius: 11, background: 'var(--green-50)' }}>
                <Icon name={s.entrega === 'entrega' ? 'truck' : 'store'} size={16} style={{ color: 'var(--green-700)' }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--green-700)' }}>{s.entrega === 'entrega' ? 'Entrega no endereço do cliente' : 'Retirada no local'}</span>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.5 }}>
              Obrigado pela preferência! 💚<br />Emitido por {window.SELLER.loja} via app
            </div>
          </div>
        </div>

        {/* ações */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button kind="whats" icon="whatsapp" full onClick={() => { const url = `https://wa.me/?text=${encodeURIComponent(linhaTexto())}`; window.open(url, '_blank'); app.toast('Compartilhando recibo…'); }}>Compartilhar</Button>
          <Button kind="ghost" icon="print" full onClick={() => app.toast('Recibo impresso (demonstração)')}>Imprimir</Button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          Este recibo também fica disponível para {cli.nome.split(' ')[0]} no app dela, dentro do pedido.
        </div>
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

Object.assign(window, { ReciboView });
