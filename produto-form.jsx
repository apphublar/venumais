/* Cadastro de produto — completo: promo, variações, estoque mín, código de barras, dimensões, destaque */
function ProdutoForm({ app }) {
  const [foto, setFoto] = useState(null);
  const [nome, setNome] = useState('');
  const [cat, setCat] = useState('');
  const [sku, setSku] = useState('');
  const [descricao, setDescricao] = useState('');
  const [custo, setCusto] = useState('');
  const [preco, setPreco] = useState('');
  const [precoPromo, setPrecoPromo] = useState('');
  const [temPromo, setTemPromo] = useState(false);
  const [precoAtacado, setPrecoAtacado] = useState('');
  const [qtdAtacado, setQtdAtacado] = useState('');
  const [temAtacado, setTemAtacado] = useState(false);
  const [estoque, setEstoque] = useState('');
  const [estoqueMin, setEstoqueMin] = useState('3');
  const [barras, setBarras] = useState('');
  const [variStr, setVariStr] = useState('');
  const [alt, setAlt] = useState('');
  const [larg, setLarg] = useState('');
  const [comp, setComp] = useState('');
  const [peso, setPeso] = useState('');
  const [precoVisivel, setPrecoVisivel] = useState(true);
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const fileRef = useRef(null);

  const cats = Array.from(new Set(window.PRODUCTS.map((p) => p.cat)));
  const custoN = window.parseBRL(custo);
  const precoN = window.parseBRL(preco);
  const promoN = window.parseBRL(precoPromo);
  const precoFinal = temPromo && promoN > 0 ? promoN : precoN;
  const lucro = precoFinal - custoN;
  const margem = precoFinal > 0 ? Math.round((lucro / precoFinal) * 100) : 0;
  const valid = nome.trim().length >= 2;

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFoto(ev.target.result);
    reader.readAsDataURL(f);
  };

  const salvar = () => {
    if (!valid) return;
    const variacoes = variStr.split(',').map((v) => v.trim()).filter(Boolean);
    const temDim = alt || larg || comp || peso;
    window.addProduct({
      nome, cat: cat.trim() || 'Geral', sku, descricao,
      estoque: parseInt(estoque, 10) || 0, estoqueMin: parseInt(estoqueMin, 10) || 0,
      custo: custoN, preco: precoN, precoPromo: temPromo ? promoN : 0,
      precoAtacado: temAtacado ? window.parseBRL(precoAtacado) : 0, qtdAtacado: temAtacado ? (parseInt(qtdAtacado, 10) || 0) : 0,
      precoVisivel, ativo, destaque, foto, variacoes, codigoBarras: barras,
      dimensoes: temDim ? { alt: window.parseBRL(alt), larg: window.parseBRL(larg), comp: window.parseBRL(comp), peso: window.parseBRL(peso) } : null,
    });
    app.refresh && app.refresh();
    app.closeOverlay();
    app.toast('Produto cadastrado ✓');
  };

  const label = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' };
  const moneyBox = { display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '12px 14px' };
  const dimBox = { ...moneyBox, padding: '10px 12px' };
  const secTitle = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '20px 2px 12px' };

  return (
    <Overlay>
      <Header title="Novo produto" onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* Foto */}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
          {foto ? (
            <div style={{ position: 'relative' }}>
              <div style={{ width: 84, height: 84, borderRadius: 18, overflow: 'hidden', background: 'var(--chip)' }}>
                <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <button onClick={() => setFoto(null)} style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: 'var(--ink-1)', color: '#fff', border: '2px solid var(--bg)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={13} /></button>
            </div>
          ) : (
            <button onClick={() => fileRef.current && fileRef.current.click()} style={{ width: 84, height: 84, borderRadius: 18, border: '1.5px dashed var(--line-2)', background: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-3)', flexShrink: 0 }}>
              <Icon name="box" size={22} />
              <span style={{ fontSize: 10.5, fontWeight: 700 }}>Foto</span>
            </button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Foto do produto</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>Opcional. Toque no quadro para escolher uma imagem.</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nome *</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Perfume Floral 100ml" style={input} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Categoria</label>
          <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Ex.: Perfumaria" style={input} />
          {!!cats.length && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (cat === c ? 'var(--green-600)' : 'var(--line)'), background: cat === c ? 'var(--green-50)' : 'var(--card)', color: cat === c ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>{c}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── Preços ── */}
        <div style={secTitle}>Preços</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Custo (R$)</label>
            <div style={moneyBox}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span>
              <input value={custo} onChange={(e) => setCusto(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0,00" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Preço de venda (R$)</label>
            <div style={moneyBox}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span>
              <input value={preco} onChange={(e) => setPreco(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0,00" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
            </div>
          </div>
        </div>

        {/* Preço promocional */}
        <Card pad={14} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: temPromo ? '#fde9e9' : 'var(--chip)', color: temPromo ? '#dc2626' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 800, fontSize: 17 }}>%</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Preço promocional</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Mostra o preço antigo riscado</div>
            </div>
            <Toggle on={temPromo} onChange={() => setTemPromo((v) => !v)} />
          </div>
          {temPromo && (
            <div style={{ ...moneyBox, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span>
              <input value={precoPromo} onChange={(e) => setPrecoPromo(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="Preço com desconto" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} />
              {promoN > 0 && precoN > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap' }}>-{Math.round((1 - promoN / precoN) * 100)}%</span>}
            </div>
          )}
        </Card>
        {precoFinal > 0 && custoN > 0 && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: lucro >= 0 ? 'var(--green-700)' : '#dc2626', margin: '0 2px 4px' }}>
            Lucro de {window.fmtBRL(lucro)} por unidade · margem {margem}%
          </div>
        )}

        {/* Preço de atacado */}
        <Card pad={14} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: temAtacado ? 'var(--green-50)' : 'var(--chip)', color: temAtacado ? 'var(--green-700)' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="box" size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Preço de atacado</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Preço menor a partir de uma quantidade mínima</div>
            </div>
            <Toggle on={temAtacado} onChange={() => setTemAtacado((v) => !v)} />
          </div>
          {temAtacado && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1.3 }}>
                <label style={{ ...label, fontSize: 11.5 }}>Preço atacado (R$)</label>
                <div style={moneyBox}><span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>R$</span><input value={precoAtacado} onChange={(e) => setPrecoAtacado(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0,00" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} /></div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...label, fontSize: 11.5 }}>Qtd. mínima</label>
                <input value={qtdAtacado} onChange={(e) => setQtdAtacado(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Ex.: 6" style={input} />
              </div>
            </div>
          )}
        </Card>

        {/* ── Estoque ── */}
        <div style={secTitle}>Estoque</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Quantidade</label>
            <input value={estoque} onChange={(e) => setEstoque(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="0" style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Estoque mínimo</label>
            <input value={estoqueMin} onChange={(e) => setEstoqueMin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="3" style={input} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, margin: '0 2px 4px', lineHeight: 1.45 }}>Você é avisado quando o estoque chegar nesse mínimo.</div>

        {/* ── Identificação ── */}
        <div style={secTitle}>Identificação</div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Código SKU (opcional)</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex.: PF-100" style={input} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={label}>Código de barras (opcional)</label>
          <div style={{ display: 'flex', gap: 9 }}>
            <input value={barras} onChange={(e) => setBarras(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Digite ou escaneie" style={{ ...input, flex: 1 }} />
            <button onClick={() => { const fake = '789' + Math.floor(100000000 + Math.random() * 899999999); setBarras(fake); app.toast('Código escaneado ✓'); }} style={{ flexShrink: 0, width: 52, borderRadius: 13, border: '1px solid var(--green-600)', background: 'var(--green-50)', color: 'var(--green-700)', display: 'grid', placeItems: 'center', cursor: 'pointer' }} title="Escanear"><Icon name="scan" size={22} /></button>
          </div>
        </div>

        {/* ── Variações ── */}
        <div style={secTitle}>Variações</div>
        <div style={{ marginBottom: 4 }}>
          <label style={label}>Tamanhos / cores (opcional)</label>
          <input value={variStr} onChange={(e) => setVariStr(e.target.value)} placeholder="Ex.: P, M, G, GG  ou  Preto, Branco" style={input} />
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 7, lineHeight: 1.45 }}>Separe por vírgula. O cliente escolhe a variação no pedido.</div>
          {variStr.split(',').map((v) => v.trim()).filter(Boolean).length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
              {variStr.split(',').map((v) => v.trim()).filter(Boolean).map((v, i) => (
                <span key={i} style={{ padding: '5px 11px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-700)', fontWeight: 700, fontSize: 12.5 }}>{v}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Dimensões e peso ── */}
        <div style={secTitle}>Dimensões e peso (para entrega)</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          {[['Alt (cm)', alt, setAlt], ['Larg (cm)', larg, setLarg], ['Comp (cm)', comp, setComp]].map(([lb, val, set], i) => (
            <div key={i} style={{ flex: 1 }}>
              <label style={{ ...label, fontSize: 11.5 }}>{lb}</label>
              <div style={dimBox}><input value={val} onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} /></div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={label}>Peso (kg)</label>
          <div style={moneyBox}><input value={peso} onChange={(e) => setPeso(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0,000" style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: 'var(--ink-1)' }} /><span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>kg</span></div>
        </div>

        {/* ── Descrição ── */}
        <div style={secTitle}>Descrição e visibilidade</div>
        <div style={{ marginBottom: 14 }}>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes do produto, material, indicações..." style={{ ...input, minHeight: 64, resize: 'none' }} />
        </div>

        {/* destaque no topo da loja */}
        <Card pad={14} style={{ marginBottom: 11, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: destaque ? 'var(--green-50)' : 'var(--chip)', color: destaque ? 'var(--green-700)' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="star" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Mostrar no topo da loja</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Aparece em destaque no catálogo</div>
          </div>
          <Toggle on={destaque} onChange={() => setDestaque((v) => !v)} />
        </Card>

        {/* exibir preço */}
        <Card pad={14} style={{ marginBottom: 11, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: precoVisivel ? 'var(--green-50)' : '#fff7ed', color: precoVisivel ? 'var(--green-700)' : '#b45309', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={precoVisivel ? 'eye' : 'eyeOff'} size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Exibir preço no catálogo</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{precoVisivel ? 'Cliente vê o valor' : 'Cliente pede orçamento'}</div>
          </div>
          <Toggle on={precoVisivel} onChange={() => setPrecoVisivel((v) => !v)} />
        </Card>

        {/* ativo */}
        <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: ativo ? 'var(--green-50)' : 'var(--chip)', color: ativo ? 'var(--green-700)' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="check" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Produto ativo</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{ativo ? 'Disponível para venda' : 'Oculto / pausado'}</div>
          </div>
          <Toggle on={ativo} onChange={() => setAtivo((v) => !v)} />
        </Card>
        <div style={{ height: 16 }} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
        <Button kind="primary" full size="lg" icon="check" onClick={salvar} style={{ opacity: valid ? 1 : 0.5 }}>Cadastrar produto</Button>
      </div>
    </Overlay>
  );
}

Object.assign(window, { ProdutoForm });
