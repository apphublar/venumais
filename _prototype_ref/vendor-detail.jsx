/* Vendor detail overlays + cobrança WhatsApp/PIX */

// Full-screen overlay panel
function Overlay({ children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'slideIn .26s cubic-bezier(.16,1,.3,1)',
    }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

// ── CLIENTE DETALHE ───────────────────────────────────────
function ClienteDetalhe({ id, app }) {
  const c = window.getClient(id);
  const [delConf, setDelConf] = useState(false);
  const vendas = window.SALES.filter((s) => s.clienteId === id);
  const parcelas = vendas.flatMap((s) => s.parcelas.map((p) => ({ ...p, vendaId: s.id, clienteId: id })));
  const devido = parcelas.filter((p) => !p.pago).reduce((a, p) => a + p.valor, 0);
  const pago = parcelas.filter((p) => p.pago).reduce((a, p) => a + p.valor, 0);
  const temAtraso = parcelas.some((p) => window.parcelaStatus(p) === 'atrasado');

  return (
    <Overlay>
      <Header title={c.nome} subtitle={c.zap} onBack={app.closeOverlay} right={<button onClick={() => app.toast('Abrir conversa no WhatsApp')} style={{ ...iconBtn, background: '#25D366', color: '#fff', border: 'none' }}><WhatsLogo size={19} /></button>} />
      <div style={{ padding: '6px 16px 0' }}>
        <Card pad={16} style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Saldo devedor</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3, color: temAtraso ? '#dc2626' : 'var(--ink-1)' }}>{window.fmtBRL(devido)}</div>
          </div>
          <div style={{ width: 1, background: 'var(--line)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Já pago</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3, color: 'var(--green-700)' }}>{window.fmtBRL(pago)}</div>
          </div>
        </Card>

        {(c.endereco || c.obs) && (
          <Card pad={14} style={{ marginTop: 12 }}>
            {c.endereco && <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: c.obs ? 10 : 0 }}><Icon name="home" size={17} style={{ color: 'var(--ink-3)', marginTop: 1 }} /><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500 }}>{c.endereco}</span></div>}
            {c.obs && <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}><Icon name="doc" size={17} style={{ color: 'var(--ink-3)', marginTop: 1 }} /><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500 }}>{c.obs}</span></div>}
          </Card>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <Button kind="primary" icon="plus" full onClick={() => app.openOverlay({ type: 'novaVenda', clienteId: id })}>Nova venda</Button>
          <Button kind="ghost" icon="receipt" full onClick={() => app.toast('Exportar extrato do cliente')}>Extrato</Button>
        </div>

        <SectionLabel>Histórico · {vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'}</SectionLabel>
        {vendas.map((s) => (
          <Card key={s.id} pad={14} style={{ marginBottom: 11 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Venda #{s.id}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{window.fmtDateLong(s.data)}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: s.modo === 'avista' ? 'var(--green-50)' : '#ede9fe', color: s.modo === 'avista' ? 'var(--green-700)' : '#6d28d9' }}>{s.modo === 'avista' ? 'À vista' : `${s.parcelas.length}x`}</span>
            </div>
            {/* Feat A — status de confirmação do cliente (só parcelado) */}
            {s.modo === 'parcelado' && s.confirmacao && (
              s.confirmacao.status === 'confirmada' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, background: 'var(--green-50)', color: 'var(--green-700)', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                  <Icon name="check" size={14} stroke={2.6} /> Confirmada pelo cliente{s.confirmacao.em ? ` em ${window.fmtDate(s.confirmacao.em)}` : ''}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px 7px 10px', borderRadius: 10, background: '#fef3c7', color: '#92660b', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                  <Icon name="clock" size={14} /> <span style={{ flex: 1 }}>Aguardando confirmação</span>
                  <button onClick={(e) => { e.stopPropagation(); app.toast('Link de confirmação reenviado ✓'); }} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '4px 9px', fontSize: 11.5, fontWeight: 800, color: '#92660b', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Reenviar link</button>
                </div>
              )
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {s.parcelas.map((p) => {
                const st = window.parcelaStatus({ ...p, clienteId: id });
                return (
                  <div key={p.id} onClick={() => app.openOverlay({ type: 'cobranca', parcela: { ...p, vendaId: s.id, clienteId: id } })} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: window.STATUS_META[st].bg, color: window.STATUS_META[st].fg, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{p.n}</div>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, flex: 1 }}>{window.fmtDate(p.venc)}</span>
                    <Money value={p.valor} size={13.5} />
                    <div style={{ width: 86, display: 'flex', justifyContent: 'flex-end' }}><StatusBadge status={st} small /></div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        {/* Excluir cliente — somente proprietário */}
        {window.can('excluir') && (
          <>
            <SectionLabel>Zona de risco</SectionLabel>
            {!delConf ? (
              <button onClick={() => setDelConf(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff6f6', border: '1px solid #fbd5d5', borderRadius: 14, padding: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#dc2626', fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap' }}><Icon name="trash" size={18} /> Excluir cliente</button>
            ) : (
              <Card pad={14} style={{ borderColor: '#fbd5d5', background: '#fff6f6' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.45, marginBottom: 12 }}>Excluir <b>{c.nome}</b>? Isso remove o cliente e todo o histórico de vendas e parcelas dele. Esta ação não pode ser desfeita.</div>
                <div style={{ display: 'flex', gap: 9 }}>
                  <Button kind="ghost" full size="sm" onClick={() => setDelConf(false)}>Cancelar</Button>
                  <Button kind="danger" full size="sm" icon="trash" onClick={() => { window.deleteClient(c.id); app.closeOverlay(); app.refresh && app.refresh(); app.toast('Cliente excluído'); }}>Excluir</Button>
                </div>
              </Card>
            )}
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

// ── PRODUTO DETALHE ───────────────────────────────────────
function ProdutoDetalhe({ id, app }) {
  const p = window.getProduct(id);
  const [estoque, setEstoque] = useState(p.estoque);
  const [visivel, setVisivel] = useState(p.precoVisivel);
  const [delConf, setDelConf] = useState(false);
  const lucroUnit = (p.preco || 0) - p.custo;
  const margem = p.preco ? Math.round((lucroUnit / p.preco) * 100) : 0;

  return (
    <Overlay>
      <Header title="Produto" onBack={app.closeOverlay} right={<button onClick={() => app.toast('Editar produto')} style={iconBtn}><Icon name="edit" size={18} /></button>} />
      <div style={{ padding: '6px 16px 0' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <ProductThumb product={p} size={78} radius={18} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{p.nome}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>{p.cat} · {p.sku}</div>
          </div>
        </div>

        <Card pad={0} style={{ overflow: 'hidden', marginBottom: 12 }}>
          <Row label="Custo de aquisição" value={window.fmtBRL(p.custo)} />
          <Row label="Preço de venda" value={p.preco ? window.fmtBRL(p.preco) : 'A combinar'} />
          <Row label="Lucro por unidade" value={p.preco ? `${window.fmtBRL(lucroUnit)} · ${margem}%` : '—'} valueColor="var(--green-700)" last />
        </Card>

        {/* Visibilidade do preço */}
        <Card pad={14} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: visivel ? 'var(--green-50)' : '#fff7ed', color: visivel ? 'var(--green-700)' : '#b45309', display: 'grid', placeItems: 'center' }}><Icon name={visivel ? 'eye' : 'eyeOff'} size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Exibir preço para o cliente</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{visivel ? 'Aparece com valor no catálogo' : 'Cliente vê o produto e pede orçamento'}</div>
          </div>
          <Toggle on={visivel} onChange={() => { setVisivel((v) => !v); app.toast(visivel ? 'Preço ocultado no catálogo' : 'Preço visível no catálogo'); }} />
        </Card>

        {/* Estoque */}
        <SectionLabel>Estoque</SectionLabel>
        <Card pad={16} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>Disponível</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{estoque} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)' }}>un.</span></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEstoque((e) => Math.max(0, e - 1))} style={stepBtn}><Icon name="arrowDown" size={20} /></button>
            <button onClick={() => setEstoque((e) => e + 1)} style={{ ...stepBtn, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="arrowUp" size={20} /></button>
          </div>
        </Card>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <Card pad={13} style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Investido</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>{window.fmtBRL(p.custo * estoque)}</div>
          </Card>
          <Card pad={13} style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Lucro potencial</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3, color: 'var(--green-700)' }}>{window.fmtBRL(lucroUnit * estoque)}</div>
          </Card>
        </div>

        {/* Excluir produto — somente proprietário */}
        {window.can('excluir') && (
          <>
            <SectionLabel>Zona de risco</SectionLabel>
            {!delConf ? (
              <button onClick={() => setDelConf(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff6f6', border: '1px solid #fbd5d5', borderRadius: 14, padding: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#dc2626', fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap' }}><Icon name="trash" size={18} /> Excluir produto</button>
            ) : (
              <Card pad={14} style={{ borderColor: '#fbd5d5', background: '#fff6f6' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.45, marginBottom: 12 }}>Excluir <b>{p.nome}</b>? O produto sai do catálogo e do estoque. Vendas já registradas são mantidas.</div>
                <div style={{ display: 'flex', gap: 9 }}>
                  <Button kind="ghost" full size="sm" onClick={() => setDelConf(false)}>Cancelar</Button>
                  <Button kind="danger" full size="sm" icon="trash" onClick={() => { window.deleteProduct(p.id); app.closeOverlay(); app.refresh && app.refresh(); app.toast('Produto excluído'); }}>Excluir</Button>
                </div>
              </Card>
            )}
          </>
        )}
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}
function Row({ label, value, valueColor, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14.5, fontWeight: 800, color: valueColor || 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
const stepBtn = { width: 46, height: 46, borderRadius: 13, background: 'var(--card)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)' };
function Toggle({ on, onChange }) {
  return (
    <button onClick={onChange} style={{ width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? 'var(--green-600)' : 'var(--line-2)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

// ── INADIMPLÊNCIA ─────────────────────────────────────────
function Inadimplencia({ app }) {
  const [faixa, setFaixa] = useState('todos');
  const atrasadas = window.allParcelas().filter((p) => window.parcelaStatus(p) === 'atrasado');
  const inFaixa = (p) => {
    const dd = Math.abs(window.daysBetween(p.venc, window.TODAY));
    if (faixa === '1-7') return dd <= 7;
    if (faixa === '8-30') return dd >= 8 && dd <= 30;
    if (faixa === '30+') return dd > 30;
    return true;
  };
  const list = atrasadas.filter(inFaixa).sort((a, b) => a.venc - b.venc);
  const total = list.reduce((a, p) => a + p.valor, 0);
  const faixas = [['todos', 'Todos'], ['1-7', '1–7 dias'], ['8-30', '8–30 dias'], ['30+', '+30 dias']];

  return (
    <Overlay>
      <Header title="Inadimplência" subtitle={`${atrasadas.length} parcelas em atraso`} onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        <div style={{ borderRadius: 18, padding: '16px 18px', background: 'linear-gradient(135deg,#ef4444,#c81e1e)', color: '#fff' }}>
          <div style={{ fontSize: 12.5, opacity: 0.9, fontWeight: 600 }}>Total em atraso</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{window.fmtBRL(total)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {faixas.map(([k, l]) => (
            <button key={k} onClick={() => setFaixa(k)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '8px 15px', borderRadius: 999, border: '1px solid ' + (faixa === k ? 'var(--green-600)' : 'var(--line)'), background: faixa === k ? 'var(--green-600)' : 'var(--card)', color: faixa === k ? '#fff' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          {list.map((p) => {
            const cli = window.getClient(p.clienteId);
            const dd = Math.abs(window.daysBetween(p.venc, window.TODAY));
            return (
              <Card key={p.id} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar label={cli.inicial} color={cli.cor} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{cli.nome}</div>
                  <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {dd} dias · venceu {window.fmtDate(p.venc)}
                    {window.sameDay(p.cobradaEm, window.TODAY) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--green-700)', whiteSpace: 'nowrap' }}><Icon name="check" size={11} stroke={3} /> cobrada hoje</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Money value={p.valor} size={14.5} />
                  <button onClick={() => app.openOverlay({ type: 'cobranca', parcela: p })} style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 4, background: '#25D366', color: '#fff', border: 'none', borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><WhatsLogo size={13} /> Cobrar</button>
                </div>
              </Card>
            );
          })}
          {!list.length && <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink-3)', fontWeight: 600 }}>Nenhuma parcela nesta faixa 🎉</div>}
        </div>
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

// ── ESTOQUE BAIXO ─────────────────────────────────────────
function EstoqueBaixo({ app }) {
  const baixo = window.PRODUCTS.filter((p) => p.estoque <= 2).sort((a, b) => a.estoque - b.estoque);
  return (
    <Overlay>
      <Header title="Estoque baixo" subtitle="Produtos com 2 unidades ou menos" onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        <Card pad={14} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 13, borderColor: '#fde9c8', background: '#fffaf0' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="alert" size={22} /></div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.45 }}>
            {baixo.length ? <><b style={{ color: 'var(--ink-1)' }}>{baixo.length} {baixo.length === 1 ? 'produto precisa' : 'produtos precisam'}</b> de reposição. Toque para repor o estoque.</> : 'Tudo certo! Nenhum produto com estoque baixo.'}
          </div>
        </Card>
        {baixo.map((p) => (
          <Card key={p.id} onClick={() => app.openOverlay({ type: 'produto', id: p.id })} pad={12} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13 }}>
            <ProductThumb product={p} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{p.cat}{p.sku ? ` · ${p.sku}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: p.estoque === 0 ? '#fee2e2' : '#fef3c7', color: p.estoque === 0 ? '#b1182a' : '#92660b', borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                {p.estoque === 0 ? 'Esgotado' : `${p.estoque} un.`}
              </span>
              <div style={{ fontSize: 11.5, color: 'var(--green-700)', fontWeight: 700, marginTop: 5, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}><Icon name="plus" size={12} /> Repor</div>
            </div>
          </Card>
        ))}
        {!baixo.length && <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>Nenhum produto com estoque baixo 🎉</div>}
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

Object.assign(window, { Overlay, ClienteDetalhe, ProdutoDetalhe, Inadimplencia, EstoqueBaixo, Row, Toggle, stepBtn });
