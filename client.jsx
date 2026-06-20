/* Portal do Cliente */
function ClientApp({ shared }) {
  const ME = 'c1'; // Juliana Ferreira
  const [logged, setLogged] = useState(!!window.__clienteLogado);
  const [tab, setTab] = useState('catalogo');
  const [overlay, setOverlay] = useState(null);
  const [cart, setCart] = useState({});
  const [, bump] = useState(0);
  const me = window.getClient(ME);
  const minhasVendas = window.SALES.filter((s) => s.clienteId === ME);
  const minhasParcelas = minhasVendas.flatMap((s) => s.parcelas.map((p) => ({ ...p, vendaId: s.id, clienteId: ME })));
  const pendente = minhasVendas.find((s) => s.modo === 'parcelado' && s.confirmacao && s.confirmacao.status === 'pendente');
  const devendo = minhasParcelas.some((p) => !p.pago); // cliente com saldo em aberto
  const valorDevido = minhasParcelas.filter((p) => !p.pago).reduce((a, p) => a + p.valor, 0);

  const app = {
    toast: shared.toast,
    open: (o) => setOverlay(o),
    close: () => setOverlay(null),
    go: setTab,
    refresh: () => bump((n) => n + 1),
    logout: () => { window.__clienteLogado = false; setLogged(false); },
  };

  if (!logged) return <ClientAuth onEnter={() => { window.__clienteLogado = true; setLogged(true); }} />;

  const nav = [
    { id: 'catalogo', icon: 'box', label: 'Catálogo' },
    { id: 'pedidos', icon: 'receipt', label: 'Pedidos', badge: pendente ? '1' : null },
    { id: 'pagar', icon: 'wallet', label: 'Parcelas' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'catalogo' && <ClientCatalogo cart={cart} setCart={setCart} app={app} me={me} />}        {tab === 'pedidos' && <ClientPedidos vendas={minhasVendas} app={app} />}
        {tab === 'pagar' && <ClientParcelas parcelas={minhasParcelas} app={app} />}
      </div>
      <BottomNav items={nav} active={tab} onChange={setTab} />

      {overlay?.type === 'compra' && <ClientCompraDetalhe venda={window.SALES.find((s) => s.id === overlay.id)} app={app} />}
      {overlay?.type === 'pagar' && <InformarPagamento parcela={overlay.parcela} app={app} />}
      {overlay?.type === 'confirmar' && <ConfirmarCompra venda={window.SALES.find((s) => s.id === overlay.id)} app={app} />}
      {overlay?.type === 'conta' && <ClientConta me={me} app={app} devendo={devendo} valorDevido={valorDevido} />}
      {overlay?.type === 'recibo' && <ReciboView vendaId={overlay.id} from={{ type: 'compra', id: overlay.id }} app={{ ...app, openOverlay: app.open, closeOverlay: app.close }} />}
      {overlay?.type === 'encomenda' && <EncomendaSheet app={app} me={me} />}
      {overlay?.type === 'editarOrcamento' && <EditarOrcamento id={overlay.id} app={app} />}
      <Sheet open={overlay?.type === 'excluirOrcamento'} onClose={app.close} title="Excluir orçamento">
        {overlay?.type === 'excluirOrcamento' && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.5, marginBottom: 18 }}>Tem certeza que quer excluir o orçamento <b>#{overlay.id}</b>? A loja não poderá mais responder. Você pode fazer um novo pedido quando quiser.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button kind="ghost" full size="lg" onClick={app.close}>Cancelar</Button>
              <Button kind="danger" full size="lg" icon="trash" onClick={() => { window.cancelOrderByClient(overlay.id); app.close(); app.toast('Orçamento excluído'); }}>Excluir</Button>
            </div>
            <div style={{ height: 8 }} />
          </div>
        )}
      </Sheet>
      <Sheet open={overlay?.type === 'carrinho'} onClose={app.close} title="Seu pedido">
        {overlay?.type === 'carrinho' && <CartReview cart={cart} setCart={setCart} app={app} me={me} />}
      </Sheet>
    </div>
  );
}

// ── Cadastro / Login do cliente ───────────────────────────
function ClientAuth({ onEnter }) {
  const [modo, setModo] = useState('cadastro'); // cadastro | entrar
  // cadastro
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [email, setEmail] = useState('');
  const [zap, setZap] = useState('');
  const [endereco, setEndereco] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  // login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [verLogin, setVerLogin] = useState(false);
  const [erro, setErro] = useState('');

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const cadastroValido = nome.trim().length >= 2 && emailOk(email) && zap.replace(/\D/g, '').length >= 10 && senha.length >= 6 && senha === senha2;
  const loginValido = emailOk(loginEmail) && loginSenha.length >= 1;

  const label = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '14px 15px', borderRadius: 14, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15.5, fontWeight: 600, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' };
  const eyeBtn = { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' };

  const fazerCadastro = () => {
    if (!cadastroValido) { setErro('Preencha os campos obrigatórios. A senha precisa de 6+ caracteres e as duas devem ser iguais.'); return; }
    onEnter();
  };
  const fazerLogin = () => {
    if (!loginValido) { setErro('Informe um email válido e a senha.'); return; }
    onEnter();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
      {/* topo com a marca da loja */}
      <div style={{ background: 'linear-gradient(135deg, var(--brand-g1), var(--brand-g2))', padding: '36px 24px 26px', color: '#fff', textAlign: 'center' }}>
        <div style={{ margin: '0 auto 12px', display: 'flex', justifyContent: 'center' }}><BrandMark size={60} radius={18} /></div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{window.SELLER.loja}</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, fontWeight: 500, marginTop: 4, lineHeight: 1.4 }}>{modo === 'cadastro' ? 'Crie sua conta para comprar e acompanhar seus pedidos e parcelas.' : 'Acesse sua conta para continuar.'}</div>
      </div>

      <div style={{ flex: 1, padding: '20px 22px 28px' }}>
        {/* alternador */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 13, padding: 4, marginBottom: 20 }}>
          {[['cadastro', 'Criar conta'], ['entrar', 'Entrar']].map(([k, l]) => (
            <button key={k} onClick={() => { setModo(k); setErro(''); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, background: modo === k ? 'var(--card)' : 'transparent', color: modo === k ? 'var(--ink-1)' : 'var(--ink-3)', boxShadow: modo === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{l}</button>
          ))}
        </div>

        {erro && <div style={{ background: '#fee2e2', color: '#b1182a', borderRadius: 12, padding: '10px 13px', fontSize: 12.5, fontWeight: 700, marginBottom: 16, lineHeight: 1.45 }}>{erro}</div>}

        {modo === 'cadastro' ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nome completo *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ana Beatriz Ferreira" style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Apelido</label>
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Como prefere ser chamada(o)" style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Email *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="voce@email.com" style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>WhatsApp *</label>
              <input value={zap} onChange={(e) => setZap(e.target.value)} inputMode="tel" placeholder="(11) 90000-0000" style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Endereço de entrega <span style={{ color: 'var(--ink-3)', fontWeight: 600, textTransform: 'none' }}>(opcional)</span></label>
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" style={input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Senha *</label>
              <div style={{ position: 'relative' }}>
                <input value={senha} onChange={(e) => setSenha(e.target.value)} type={verSenha ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" style={{ ...input, paddingRight: 46 }} />
                <button onClick={() => setVerSenha((v) => !v)} tabIndex={-1} style={eyeBtn}><Icon name={verSenha ? 'eyeOff' : 'eye'} size={19} /></button>
              </div>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={label}>Confirme a senha *</label>
              <div style={{ position: 'relative' }}>
                <input value={senha2} onChange={(e) => setSenha2(e.target.value)} type={verSenha ? 'text' : 'password'} placeholder="Repita a senha" style={{ ...input, paddingRight: 46 }} />
                <button onClick={() => setVerSenha((v) => !v)} tabIndex={-1} style={eyeBtn}><Icon name={verSenha ? 'eyeOff' : 'eye'} size={19} /></button>
              </div>
              {senha2.length > 0 && senha !== senha2 && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 7 }}>As senhas não conferem.</div>}
              {senha2.length > 0 && senha === senha2 && senha.length >= 6 && <div style={{ fontSize: 12, color: 'var(--green-700)', fontWeight: 700, marginTop: 7, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={14} /> Senhas conferem</div>}
            </div>
            <Button kind="primary" full size="lg" icon="check" onClick={fazerCadastro} style={{ opacity: cadastroValido ? 1 : 0.5 }}>Criar conta e entrar</Button>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>Ao continuar você concorda em receber avisos de pedidos e cobranças pelo WhatsApp.</div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Email</label>
              <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} inputMode="email" placeholder="voce@email.com" style={input} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={label}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} type={verLogin ? 'text' : 'password'} placeholder="Sua senha" style={{ ...input, paddingRight: 46 }} />
                <button onClick={() => setVerLogin((v) => !v)} tabIndex={-1} style={eyeBtn}><Icon name={verLogin ? 'eyeOff' : 'eye'} size={19} /></button>
              </div>
            </div>
            <button onClick={() => setErro('Enviamos um link de redefinição para seu email (demonstração).')} style={{ background: 'none', border: 'none', color: 'var(--green-700)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 2px', marginBottom: 16, whiteSpace: 'nowrap' }}>Esqueci minha senha</button>
            <Button kind="primary" full size="lg" icon="check" onClick={fazerLogin} style={{ opacity: loginValido ? 1 : 0.5 }}>Entrar</Button>
          </>
        )}

        {/* atalho demo */}
        <button onClick={onEnter} style={{ width: '100%', marginTop: 18, background: 'none', border: 'none', color: 'var(--ink-3)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Entrar como Juliana (demonstração)</button>
      </div>
    </div>
  );
}

// Catálogo
function ClientCatalogo({ cart, setCart, app, me }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const itens = Object.values(cart).reduce((a, q) => a + q, 0);
  const set = (pid, d) => setCart((c) => ({ ...c, [pid]: Math.max(0, (c[pid] || 0) + d) }));
  const cats = ['todas', ...Array.from(new Set(window.PRODUCTS.filter((p) => p.estoque > 0).map((p) => p.cat)))];
  const term = q.trim().toLowerCase();
  const list = window.PRODUCTS
    .filter((p) => p.estoque > 0)
    .filter((p) => cat === 'todas' || p.cat === cat)
    .filter((p) => p.nome.toLowerCase().includes(term) || (p.cat || '').toLowerCase().includes(term));
  return (
    <div style={{ paddingBottom: itens ? 150 : 16 }}>
      {/* Vendor banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--brand-g1), var(--brand-g2))', padding: '16px 18px 18px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandMark size={50} radius={15} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{window.SELLER.loja}</div>
            <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>{window.SELLER.catalogo}</div>
          </div>
          {me && <button onClick={() => app.open({ type: 'conta' })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', flexShrink: 0 }} aria-label="Minha conta"><Avatar label={me.inicial} color="rgba(255,255,255,0.22)" size={38} /></button>}
        </div>
        {/* busca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.16)', borderRadius: 13, padding: '11px 14px', marginTop: 14, backdropFilter: 'blur(4px)' }}>
          <Icon name="search" size={18} style={{ color: '#fff', opacity: 0.9 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." style={{ border: 'none', outline: 'none', background: 'none', flex: 1, fontSize: 15, fontFamily: 'inherit', color: '#fff' }} className="cat-search" />
          {q && <button onClick={() => setQ('')} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}><Icon name="x" size={13} /></button>}
        </div>
      </div>
      {/* filtro por categoria */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 16px 4px' }}>
        {cats.map((k) => (
          <button key={k} onClick={() => setCat(k)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '8px 15px', borderRadius: 999, border: '1px solid ' + (cat === k ? 'var(--green-600)' : 'var(--line)'), background: cat === k ? 'var(--green-600)' : 'var(--card)', color: cat === k ? '#fff' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{k === 'todas' ? 'Todas' : k}</button>
        ))}
      </div>
      {/* encomenda no atacado */}
      <div style={{ padding: '10px 16px 0' }}>
        <button onClick={() => app.open({ type: 'encomenda' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 16, padding: '13px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#cffafe', color: '#0e7490', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="truck" size={22} /></div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-1)' }}>Encomendar no atacado</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Peça para a loja comprar pra você (com garantia)</div>
          </div>
          <Icon name="chevR" size={20} style={{ color: '#0e7490' }} />
        </button>
      </div>
      <div style={{ padding: '10px 16px 0' }}>
        <SectionLabel>{list.length} {list.length === 1 ? 'produto' : 'produtos'}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {list.map((p) => (
            <div key={p.id} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ height: 96, background: p.cor, position: 'relative', overflow: 'hidden' }}>
                {p.foto
                  ? <img src={p.foto} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 7px, transparent 7px 14px)' }} />}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, minHeight: 32 }}>{p.nome}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  {p.precoVisivel
                    ? <Money value={p.preco} size={14.5} color="var(--green-700)" />
                    : <span style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309', background: '#fff7ed', padding: '3px 8px', borderRadius: 999 }}>Sob orçamento</span>}
                  {cart[p.id] > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <button onClick={() => set(p.id, -1)} style={miniStep}><Icon name="arrowDown" size={14} /></button>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{cart[p.id]}</span>
                      <button onClick={() => set(p.id, 1)} style={{ ...miniStep, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="arrowUp" size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => set(p.id, 1)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--green-50)', color: 'var(--green-700)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="plus" size={17} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {!list.length && <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>Nenhum produto encontrado.</div>}
      </div>
      {itens > 0 && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 76, zIndex: 20 }}>
          <button onClick={() => app.open({ type: 'carrinho' })} style={{ width: '100%', minHeight: 52, borderRadius: 15, border: 'none', background: 'var(--ink-1)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '2px 9px', fontSize: 13 }}>{itens}</span> Ver pedido <Icon name="chevR" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function CartReview({ cart, setCart, app, me }) {
  const [entrega, setEntrega] = useState('retirada');
  const [obs, setObs] = useState('');
  const [cupomCodigo, setCupomCodigo] = useState('');
  const itens = Object.entries(cart).filter(([, q]) => q > 0);
  const temPreco = itens.every(([pid]) => window.getProduct(pid).precoVisivel);
  const subtotal = itens.reduce((a, [pid, q]) => a + (window.getProduct(pid).preco || 0) * q, 0);
  const cupom = cupomCodigo ? window.findCoupon(cupomCodigo) : null;
  const desconto = temPreco ? window.cupomDesconto(cupom, subtotal) : 0;
  const total = subtotal - desconto;

  const enviar = () => {
    const o = window.addOrder({
      clienteId: me ? me.id : 'c1',
      itens: itens.map(([pid, q]) => ({ pid, q })),
      obs: obs.trim(), entrega, origem: 'cliente',
    });
    if (cupom) o.cupom = cupom.codigo;
    window.addNotif && window.addNotif(temPreco ? 'pedido' : 'orcamento', temPreco ? 'Novo pedido pelo app' : 'Pedido de orçamento', `${me ? me.nome : 'Cliente'} ${temPreco ? 'fez o pedido' : 'pediu orçamento'} #${o.id} (${entrega === 'entrega' ? 'entrega' : 'retirada'})`);
    app.close(); setCart({});
    app.toast(temPreco ? 'Pedido enviado para a loja ✓' : 'Orçamento solicitado ✓');
  };

  return (
    <div>
      {itens.map(([pid, q]) => {
        const p = window.getProduct(pid);
        return (
          <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
            <ProductThumb product={p} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.nome}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{p.precoVisivel ? window.fmtBRL(p.preco) : 'Sob orçamento'} · qtd {q}</div>
            </div>
            <button onClick={() => setCart((c) => ({ ...c, [pid]: 0 }))} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}><Icon name="x" size={18} /></button>
          </div>
        );
      })}

      {/* entrega */}
      <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
        {[['retirada', 'Retirada', 'store'], ['entrega', 'Entrega', 'truck']].map(([k, l, ic]) => (
          <button key={k} onClick={() => setEntrega(k)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid ' + (entrega === k ? 'var(--green-600)' : 'var(--line)'), background: entrega === k ? 'var(--green-50)' : 'var(--card)', color: entrega === k ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name={ic} size={16} /> {l}</button>
        ))}
      </div>

      {/* cupom — só faz sentido com preço */}
      {temPreco && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={cupomCodigo} onChange={(e) => setCupomCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Cupom de desconto" style={{ flex: 1, boxSizing: 'border-box', padding: '11px 13px', borderRadius: 12, border: '1px solid ' + (cupomCodigo && !cupom ? '#fbd5d5' : 'var(--line)'), fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' }} />
            {cupom && <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRadius: 12, background: 'var(--green-50)', color: 'var(--green-700)', fontWeight: 800, fontSize: 12.5, whiteSpace: 'nowrap' }}><Icon name="check" size={14} /> aplicado</span>}
          </div>
          {cupomCodigo && !cupom && <div style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 700, marginTop: 6 }}>Cupom inválido ou inativo.</div>}
        </div>
      )}

      {/* totais */}
      <div style={{ marginTop: 14 }}>
        {desconto > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Subtotal</span><span style={{ fontSize: 13.5, fontWeight: 700 }}>{window.fmtBRL(subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Cupom {cupom.codigo}</span><span style={{ fontSize: 13.5, fontWeight: 700, color: '#dc2626' }}>− {window.fmtBRL(desconto)}</span></div>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 4px' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>{temPreco ? 'Total' : 'Total parcial'}</span>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{window.fmtBRL(total)}</span>
        </div>
      </div>

      {!temPreco && <div style={{ fontSize: 12.5, color: '#b45309', fontWeight: 600, marginTop: 8, marginBottom: 12, background: '#fff7ed', padding: '10px 12px', borderRadius: 12 }}>Alguns itens são sob orçamento. A loja vai confirmar os valores e te enviar o total.</div>}
      <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações (cor, tamanho, ponto de referência...)" style={{ width: '100%', boxSizing: 'border-box', minHeight: 60, padding: 12, borderRadius: 12, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none', margin: '12px 0', color: 'var(--ink-1)' }} />
      <Button kind="primary" full size="lg" icon="share" onClick={enviar}>{temPreco ? 'Enviar pedido' : 'Solicitar orçamento'}</Button>
    </div>
  );
}

// Meus pedidos / compras — agrupados por status
function ClientPedidos({ vendas, app }) {
  const [filtro, setFiltro] = useState('todos'); // todos | orcamento | aberto | quitado
  const ME = 'c1';
  const orcamentos = window.ORDERS.filter((o) => o.clienteId === ME);
  const aguardandoConf = vendas.filter((s) => s.modo === 'parcelado' && s.confirmacao && s.confirmacao.status === 'pendente');
  const emAberto = vendas.filter((s) => !(s.modo === 'parcelado' && s.confirmacao && s.confirmacao.status === 'pendente') && s.parcelas.some((p) => !p.pago));
  const quitados = vendas.filter((s) => s.parcelas.every((p) => p.pago));

  const counts = { todos: orcamentos.length + vendas.length, orcamento: orcamentos.length, aberto: emAberto.length + aguardandoConf.length, quitado: quitados.length };
  const tabs = [['todos', 'Todos'], ['orcamento', 'Orçamentos'], ['aberto', 'Em aberto'], ['quitado', 'Quitados']];
  const show = (k) => filtro === 'todos' || filtro === k;

  // card de uma compra (venda)
  const CompraCard = (s) => {
    const aberto = s.parcelas.filter((p) => !p.pago).reduce((a, p) => a + p.valor, 0);
    const aguarda = s.modo === 'parcelado' && s.confirmacao && s.confirmacao.status === 'pendente';
    return (
      <Card key={s.id} onClick={() => app.open({ type: aguarda ? 'confirmar' : 'compra', id: s.id })} pad={14} style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 14.5, fontWeight: 800 }}>Pedido #{s.id.replace(/^v/, '')}</div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{window.fmtDateLong(s.data)} · {s.itens.length} itens</div></div>
          {aguarda
            ? <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: '#fef3c7', color: '#92660b', whiteSpace: 'nowrap' }}>Confirmar</span>
            : aberto > 0
              ? <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: '#dbeafe', color: '#1e478f', whiteSpace: 'nowrap' }}>Em aberto</span>
              : <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-700)', whiteSpace: 'nowrap' }}>Quitado</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div><div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>Total</div><Money value={s.total} size={14.5} /></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 700 }}>{aberto > 0 ? 'Restante' : 'Status'}</div>{aberto > 0 ? <Money value={aberto} size={14.5} color="var(--ink-1)" /> : <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-700)' }}>Quitado ✓</span>}</div>
        </div>
      </Card>
    );
  };

  // card de um orçamento (aguardando vendedor)
  const OrcamentoCard = (o) => {
    return (
      <Card key={o.id} pad={14} style={{ marginBottom: 10, background: '#fffaf0', borderColor: '#fde9c8' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 14.5, fontWeight: 800 }}>Orçamento #{o.id}</div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>{window.fmtDateLong(o.data)} · {o.itens.reduce((a, i) => a + i.q, 0)} itens{o.editadoEm ? ' · editado' : ''}</div></div>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: '#fef3c7', color: '#92660b', whiteSpace: 'nowrap' }}>Aguardando</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #fde9c8', color: '#92660b' }}>
          <Icon name="clock" size={15} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>Aguardando valores da loja</span>
        </div>
        {/* cliente pode editar ou excluir enquanto está pendente */}
        <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
          <Button kind="ghost" size="sm" icon="edit" full onClick={() => app.open({ type: 'editarOrcamento', id: o.id })}>Editar</Button>
          <Button kind="danger" size="sm" icon="trash" full onClick={() => app.open({ type: 'excluirOrcamento', id: o.id })}>Excluir</Button>
        </div>
      </Card>
    );
  };

  const vazio = (msg) => <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>{msg}</div>;

  return (
    <div>
      <Header title="Meus pedidos" subtitle="Compras e orçamentos" big />
      <div style={{ padding: '6px 16px 0' }}>
        {/* abas de filtro */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '8px 13px', borderRadius: 999, border: '1px solid ' + (filtro === k ? 'var(--green-600)' : 'var(--line)'), background: filtro === k ? 'var(--green-600)' : 'var(--card)', color: filtro === k ? '#fff' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {l} <span style={{ opacity: 0.7, fontWeight: 800 }}>{counts[k]}</span>
            </button>
          ))}
        </div>

        {/* Aguardando sua confirmação (sempre no topo quando há) */}
        {(filtro === 'todos' || filtro === 'aberto') && aguardandoConf.length > 0 && (
          <>
            <SectionLabel>Aguardando sua confirmação</SectionLabel>
            {aguardandoConf.map((s) => (
              <Card key={s.id} onClick={() => app.open({ type: 'confirmar', id: s.id })} pad={14} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--green-600)', background: 'var(--green-50)' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--green-600)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="receipt" size={21} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--green-700)' }}>Confirme sua compra</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, marginTop: 1 }}>Pedido #{s.id.replace(/^v/, '')} · {window.fmtBRL(s.total)}</div>
                </div>
                <Icon name="chevR" size={20} style={{ color: 'var(--green-700)' }} />
              </Card>
            ))}
          </>
        )}

        {/* Orçamentos aguardando vendedor */}
        {show('orcamento') && (
          <>
            <SectionLabel>Aguardando orçamento do vendedor</SectionLabel>
            {orcamentos.length ? orcamentos.map(OrcamentoCard) : (filtro === 'orcamento' && vazio('Nenhum orçamento pendente.'))}
          </>
        )}

        {/* Em aberto */}
        {show('aberto') && (
          <>
            <SectionLabel>Em aberto</SectionLabel>
            {emAberto.length ? emAberto.map(CompraCard) : (filtro === 'aberto' && !aguardandoConf.length && vazio('Nenhuma compra em aberto.'))}
          </>
        )}

        {/* Quitados */}
        {show('quitado') && (
          <>
            <SectionLabel>Quitados</SectionLabel>
            {quitados.length ? quitados.map(CompraCard) : vazio('Nenhuma compra quitada ainda.')}
          </>
        )}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

// Compra detalhe
function ClientCompraDetalhe({ venda, app }) {
  const restante = venda.parcelas.filter((p) => !p.pago).reduce((a, p) => a + p.valor, 0);
  return (
    <Overlay>
      <Header title={`Pedido #${venda.id}`} subtitle={window.fmtDateLong(venda.data)} onBack={app.close} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* Feat A — comprovante de confirmação */}
        {venda.modo === 'parcelado' && venda.confirmacao && (
          venda.confirmacao.status === 'confirmada' ? (
            <Card pad={13} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 11, background: 'var(--green-50)', borderColor: 'var(--green-600)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--green-600)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="check" size={20} stroke={2.6} /></div>
              <div><div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--green-700)' }}>Compra confirmada{venda.confirmacao.em ? ` em ${window.fmtDate(venda.confirmacao.em)}` : ''}</div><div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>Seu comprovante do acordo</div></div>
            </Card>
          ) : (
            <Card onClick={() => app.open({ type: 'confirmar', id: venda.id })} pad={13} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 11, background: '#fffaf0', borderColor: '#fde9c8' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="clock" size={20} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 800, color: '#92660b' }}>Aguardando sua confirmação</div><div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>Toque para revisar e confirmar</div></div>
              <Icon name="chevR" size={18} style={{ color: '#b45309' }} />
            </Card>
          )
        )}
        <Card onClick={() => app.open({ type: 'recibo', id: venda.id })} pad={13} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--green-50)', color: 'var(--green-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="receipt" size={20} /></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>Ver recibo da compra</div><div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Recibo de {window.SELLER.loja}</div></div>
          <Icon name="chevR" size={18} style={{ color: 'var(--ink-3)' }} />
        </Card>
        <SectionLabel>Produtos</SectionLabel>
        {venda.itens.map((i) => {
          const p = window.getProduct(i.pid);
          return (
            <Card key={i.pid} pad={11} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProductThumb product={p} size={46} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.nome}</div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{i.q} × {window.fmtBRL(i.preco)}</div></div>
              <Money value={i.preco * i.q} size={14} />
            </Card>
          );
        })}
        <Card pad={15} style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Total</span><span style={{ fontSize: 15, fontWeight: 800 }}>{window.fmtBRL(venda.total)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>Restante</span><span style={{ fontSize: 15, fontWeight: 800, color: restante ? 'var(--ink-1)' : 'var(--green-700)' }}>{window.fmtBRL(restante)}</span></div>
        </Card>
        <SectionLabel>Parcelas</SectionLabel>
        {venda.parcelas.map((p) => {
          const st = window.parcelaStatus({ ...p, clienteId: venda.clienteId });
          return (
            <Card key={p.id} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: window.STATUS_META[st].bg, color: window.STATUS_META[st].fg, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 }}>{p.n}</div>
              <div style={{ flex: 1 }}><Money value={p.valor} size={14.5} /><div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>Vence {window.fmtDate(p.venc)}</div></div>
              {p.pago ? <StatusBadge status="pago" small /> : <button onClick={() => app.open({ type: 'pagar', parcela: { ...p, clienteId: venda.clienteId } })} style={{ background: 'var(--green-600)', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Pagar</button>}
            </Card>
          );
        })}
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

// Parcelas (todas)
function ClientParcelas({ parcelas, app }) {
  const abertas = parcelas.filter((p) => !p.pago).sort((a, b) => a.venc - b.venc);
  const total = abertas.reduce((a, p) => a + p.valor, 0);
  const proxima = abertas[0];
  return (
    <div>
      <Header title="Minhas parcelas" subtitle="Acompanhe seus pagamentos" big />
      <div style={{ padding: '6px 16px 0' }}>
        {proxima && (
          <div style={{ borderRadius: 20, padding: '18px 20px', background: 'linear-gradient(135deg, var(--brand-g1), var(--brand-g2))', color: '#fff', marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 600 }}>Próxima parcela · vence {window.fmtDate(proxima.venc)}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 3 }}>{window.fmtBRL(proxima.valor)}</div>
            <button onClick={() => app.open({ type: 'pagar', parcela: proxima })} style={{ marginTop: 14, width: '100%', minHeight: 46, borderRadius: 13, border: 'none', background: '#fff', color: 'var(--green-700)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Pagar agora</button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 10px' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase' }}>Em aberto</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)' }}>{window.fmtBRL(total)}</span>
        </div>
        {abertas.map((p) => {
          const st = window.parcelaStatus(p);
          return (
            <Card key={p.id} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: window.STATUS_META[st].bg, color: window.STATUS_META[st].fg, display: 'grid', placeItems: 'center', fontWeight: 800 }}>{p.n}</div>
              <div style={{ flex: 1 }}><Money value={p.valor} size={15} /><div style={{ marginTop: 3 }}><StatusBadge status={st} small /></div></div>
              <button onClick={() => app.open({ type: 'pagar', parcela: p })} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-1)' }}>Pagar</button>
            </Card>
          );
        })}
        <SectionLabel>Pagas</SectionLabel>
        {parcelas.filter((p) => p.pago).map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 8, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, opacity: 0.75 }}>
            <Icon name="check" size={18} style={{ color: 'var(--green-600)' }} />
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>Parcela {p.n}</span>
            <Money value={p.valor} size={13.5} muted />
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

// Informar pagamento (com PIX + comprovante)
function InformarPagamento({ parcela, app }) {
  const [copied, setCopied] = useState(false);
  const [comprovante, setComprovante] = useState(false);
  const pixCode = `00020126580014BR.GOV.BCB.PIX0136${window.SELLER.pixChave}520400005303986540${parcela.valor.toFixed(2)}5802BR5921${window.SELLER.pixNome}6304A1B2`;
  return (
    <Overlay>
      <Header title="Pagar parcela" subtitle={`Parcela ${parcela.n} · vence ${window.fmtDate(parcela.venc)}`} onBack={app.close} />
      <div style={{ padding: '6px 16px 0' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18, padding: 18, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>Valor a pagar</div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 2 }}>{window.fmtBRL(parcela.valor)}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>para {window.SELLER.pixNome}</div>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', margin: '4px 2px 8px', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><Icon name="pix" size={15} /> PIX copia e cola</div>
        <div onClick={() => { navigator.clipboard?.writeText(pixCode); setCopied(true); app.toast('Código PIX copiado!'); setTimeout(() => setCopied(false), 1800); }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px dashed var(--line-2)', borderRadius: 14, padding: '13px 14px', cursor: 'pointer', marginBottom: 18 }}>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pixCode}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: copied ? 'var(--green-700)' : 'var(--ink-1)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}><Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Copiado' : 'Copiar'}</span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', margin: '4px 2px 8px' }}>Já pagou? Avise a vendedora</div>
        <button onClick={() => setComprovante(true)} style={{ width: '100%', padding: 18, borderRadius: 14, border: '1.5px dashed var(--line-2)', background: comprovante ? 'var(--green-50)' : 'var(--card)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, marginBottom: 16, color: comprovante ? 'var(--green-700)' : 'var(--ink-3)' }}>
          <Icon name={comprovante ? 'check' : 'share'} size={26} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>{comprovante ? 'comprovante-pix.jpg anexado' : 'Anexar comprovante'}</span>
        </button>
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
        <Button kind="primary" full size="lg" icon="check" onClick={() => { app.close(); app.toast('Pagamento informado! A vendedora vai confirmar. ✓'); }}>Informar pagamento</Button>
      </div>
    </Overlay>
  );
}

// Feat A — tela de confirmação de compra pelo cliente
function ConfirmarCompra({ venda, app }) {
  const [done, setDone] = useState(venda.confirmacao && venda.confirmacao.status === 'confirmada');

  const confirmar = () => {
    venda.confirmacao = { status: 'confirmada', em: window.TODAY };
    setDone(true);
    app.refresh && app.refresh();
    app.toast('Compra confirmada ✓');
  };
  const falarVendedora = () => {
    const phone = '55' + window.SELLER.pixNome ? '' : ''; // vendedora — número fictício
    window.open(`https://wa.me/?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o pedido #' + venda.id)}`, '_blank');
    app.toast('Abrindo conversa com a vendedora');
  };

  if (done) {
    return (
      <Overlay>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--green-50)', color: 'var(--green-600)', display: 'grid', placeItems: 'center', margin: '0 auto 20px', animation: 'pop .4s cubic-bezier(.16,1.4,.5,1)' }}>
            <Icon name="check" size={44} stroke={2.6} />
          </div>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em' }}>Compra confirmada!</h2>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
            Confirmado em {window.fmtDate(window.TODAY)}. Esse registro fica como comprovante do acordo entre você e a {window.SELLER.loja}.
          </p>
          <div style={{ marginTop: 26 }}>
            <Button kind="primary" size="lg" full onClick={() => { app.close(); app.go('pagar'); }}>Ver minhas parcelas</Button>
          </div>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <Header title="Confirmar compra" subtitle={`Pedido #${venda.id} · ${window.fmtDateLong(venda.data)}`} onBack={app.close} />
      <div style={{ padding: '6px 16px 0' }}>
        <Card pad={14} style={{ marginBottom: 12, display: 'flex', gap: 10, background: 'var(--green-50)', borderColor: 'var(--green-600)' }}>
          <Icon name="receipt" size={18} style={{ color: 'var(--green-700)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.5 }}>
            A <b style={{ color: 'var(--ink-1)' }}>{window.SELLER.loja}</b> registrou esta compra. Revise os itens e o parcelamento e confirme que está tudo certo.
          </div>
        </Card>

        <SectionLabel>Itens</SectionLabel>
        {venda.itens.map((i) => {
          const p = window.getProduct(i.pid);
          return (
            <Card key={i.pid} pad={11} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProductThumb product={p} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>{p.nome}</div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{i.q} × {window.fmtBRL(i.preco)}</div></div>
              <Money value={i.preco * i.q} size={14} />
            </Card>
          );
        })}

        <Card pad={15} style={{ marginTop: 4, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>Total · {venda.modo === 'parcelado' ? `${venda.parcelas.length}x` : 'à vista'}</div></div>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{window.fmtBRL(venda.total)}</span>
        </Card>

        <SectionLabel>Parcelas</SectionLabel>
        {venda.parcelas.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-50)', color: 'var(--green-700)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>{p.n}</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}><Icon name="calendar" size={14} style={{ color: 'var(--ink-3)' }} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>Vence {window.fmtDate(p.venc)}</span></div>
            <Money value={p.valor} size={14.5} />
          </div>
        ))}
        <div style={{ height: 8 }} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
        <Button kind="primary" full size="lg" icon="check" onClick={confirmar}>Confirmo esta compra</Button>
        <button onClick={falarVendedora} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: 'var(--ink-3)', fontWeight: 700, fontSize: 13.5, padding: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Algo está errado? Falar com a vendedora</button>
      </div>
    </Overlay>
  );
}

// ── Minha conta ───────────────────────────────────────────
const _contaLabel = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
const _contaInput = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, outline: 'none' };
function ContaField({ lbl, value, onChange, placeholder, optional, inputMode, readOnly }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={_contaLabel}>{lbl} {optional && <span style={{ color: 'var(--ink-3)', fontWeight: 600, textTransform: 'none' }}>(opcional)</span>}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} placeholder={placeholder} inputMode={inputMode}
        style={{ ..._contaInput, background: readOnly ? 'var(--chip)' : 'var(--card)', color: readOnly ? 'var(--ink-2)' : 'var(--ink-1)' }} />
    </div>
  );
}
function ClientConta({ me, app, devendo, valorDevido }) {
  const [email, setEmail] = useState('juliana.ferreira@email.com');
  const [zap, setZap] = useState(me.zap);
  const [cep, setCep] = useState('05432-000');
  const [rua, setRua] = useState('R. das Acácias, 120');
  const [bairro, setBairro] = useState('Pinheiros');
  const [cidade, setCidade] = useState('São Paulo, SP');
  const [compl, setCompl] = useState('');
  const [editando, setEditando] = useState(false);
  const [trocaSenha, setTrocaSenha] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);

  const bloqueado = devendo;
  const label = _contaLabel;
  const inputBase = { ..._contaInput, background: 'var(--card)', color: 'var(--ink-1)' };
  const editavel = editando && !bloqueado;

  const salvar = () => { setEditando(false); setTrocaSenha(false); app.toast('Dados atualizados ✓'); };

  return (
    <Overlay>
      <Header title="Minha conta" onBack={app.close} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* cabeçalho do perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
          <Avatar label={me.inicial} color={me.cor} size={58} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{me.nome}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Cliente · {window.SELLER.loja}</div>
          </div>
        </div>

        {/* aviso de bloqueio quando devendo */}
        {bloqueado && (
          <Card pad={14} style={{ marginBottom: 16, background: '#fff6f6', borderColor: '#fbd5d5' }}>
            <div style={{ display: 'flex', gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="alert" size={21} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#b1182a' }}>Conta com pagamento em aberto</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, marginTop: 3, lineHeight: 1.45 }}>Você tem {window.fmtBRL(valorDevido)} em aberto. Para alterar seus dados ou excluir a conta, quite as parcelas ou fale com o suporte da loja.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              <Button kind="primary" icon="wallet" full size="sm" onClick={() => { app.close(); app.go('pagar'); }}>Ver parcelas</Button>
              <Button kind="whats" icon="whatsapp" full size="sm" onClick={() => app.toast('Abrindo conversa com o suporte')}>Falar com suporte</Button>
            </div>
          </Card>
        )}

        {/* botão editar (somente se não bloqueado) */}
        {!bloqueado && (
          <button onClick={() => setEditando((v) => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: editando ? 'var(--chip)' : 'var(--green-50)', border: 'none', borderRadius: 13, padding: '11px', cursor: 'pointer', fontFamily: 'inherit', color: editando ? 'var(--ink-2)' : 'var(--green-700)', fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
            <Icon name={editando ? 'x' : 'edit'} size={17} /> {editando ? 'Cancelar edição' : 'Editar meus dados'}
          </button>
        )}

        <SectionLabel>Contato</SectionLabel>
        <ContaField lbl="Email" value={email} onChange={setEmail} placeholder="voce@email.com" inputMode="email" readOnly={!editavel} />
        <ContaField lbl="WhatsApp / Telefone" value={zap} onChange={setZap} placeholder="(11) 90000-0000" inputMode="tel" readOnly={!editavel} />

        {/* trocar senha */}
        <SectionLabel>Senha</SectionLabel>
        {!trocaSenha ? (
          <button onClick={() => !bloqueado && setTrocaSenha(true)} disabled={bloqueado} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '13px 14px', cursor: bloqueado ? 'default' : 'pointer', fontFamily: 'inherit', opacity: bloqueado ? 0.55 : 1, marginBottom: 4 }}>
            <Icon name="alert" size={18} style={{ color: 'var(--ink-3)' }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>Trocar senha</span>
            {bloqueado ? <Icon name="eyeOff" size={16} style={{ color: 'var(--ink-3)' }} /> : <Icon name="chevR" size={18} style={{ color: 'var(--ink-3)' }} />}
          </button>
        ) : (
          <Card pad={14} style={{ marginBottom: 4 }}>
            <div style={{ marginBottom: 12 }}><label style={label}>Senha atual</label><input type="password" placeholder="••••••" style={inputBase} /></div>
            <div style={{ marginBottom: 12 }}><label style={label}>Nova senha</label><input type="password" placeholder="Mínimo 6 caracteres" style={inputBase} /></div>
            <div style={{ marginBottom: 14 }}><label style={label}>Confirme a nova senha</label><input type="password" placeholder="Repita a nova senha" style={inputBase} /></div>
            <div style={{ display: 'flex', gap: 9 }}>
              <Button kind="ghost" full size="sm" onClick={() => setTrocaSenha(false)}>Cancelar</Button>
              <Button kind="primary" full size="sm" icon="check" onClick={() => { setTrocaSenha(false); app.toast('Senha alterada ✓'); }}>Salvar senha</Button>
            </div>
          </Card>
        )}

        <SectionLabel>Endereço de entrega</SectionLabel>
        <ContaField lbl="CEP" value={cep} onChange={setCep} placeholder="00000-000" inputMode="numeric" readOnly={!editavel} />
        <ContaField lbl="Rua e número" value={rua} onChange={setRua} placeholder="Rua, número" readOnly={!editavel} />
        <ContaField lbl="Complemento" value={compl} onChange={setCompl} placeholder="Apto, bloco, referência" optional readOnly={!editavel} />
        <ContaField lbl="Bairro" value={bairro} onChange={setBairro} placeholder="Bairro" readOnly={!editavel} />
        <ContaField lbl="Cidade / UF" value={cidade} onChange={setCidade} placeholder="Cidade, UF" readOnly={!editavel} />

        {/* salvar alterações */}
        {editando && !bloqueado && (
          <Button kind="primary" full size="lg" icon="check" onClick={salvar} style={{ marginTop: 6 }}>Salvar alterações</Button>
        )}

        {/* excluir conta */}
        <SectionLabel>Conta</SectionLabel>
        {!confirmExcluir ? (
          <button onClick={() => bloqueado ? app.toast('Quite suas parcelas para excluir a conta') : setConfirmExcluir(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, background: 'var(--card)', border: '1px solid ' + (bloqueado ? 'var(--line)' : '#fbd5d5'), borderRadius: 13, padding: '13px 14px', cursor: 'pointer', fontFamily: 'inherit', opacity: bloqueado ? 0.55 : 1 }}>
            <Icon name="x" size={18} style={{ color: bloqueado ? 'var(--ink-3)' : '#dc2626' }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700, color: bloqueado ? 'var(--ink-3)' : '#dc2626' }}>Excluir minha conta</span>
            {bloqueado && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)' }}>indisponível</span>}
          </button>
        ) : (
          <Card pad={14} style={{ borderColor: '#fbd5d5', background: '#fff6f6' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.45, marginBottom: 12 }}>Tem certeza? Esta ação é permanente e você perderá seu histórico de pedidos.</div>
            <div style={{ display: 'flex', gap: 9 }}>
              <Button kind="ghost" full size="sm" onClick={() => setConfirmExcluir(false)}>Voltar</Button>
              <Button kind="danger" full size="sm" icon="x" onClick={() => { app.close(); app.logout(); app.toast('Conta excluída'); }}>Excluir conta</Button>
            </div>
          </Card>
        )}

        {/* sair */}
        <button onClick={() => { app.close(); app.logout(); }} style={{ width: '100%', marginTop: 18, background: 'none', border: 'none', color: 'var(--ink-3)', fontWeight: 800, fontSize: 14, padding: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Sair da conta</button>
        <div style={{ height: 16 }} />
      </div>
    </Overlay>
  );
}

// ── Encomenda no atacado (cliente) ────────────────────────
function EncomendaSheet({ app, me }) {
  const [sel, setSel] = useState({}); // pid -> qty
  const produtos = window.PRODUCTS.filter((p) => p.ativo !== false);
  const set = (pid, d) => setSel((c) => ({ ...c, [pid]: Math.max(0, (c[pid] || 0) + d) }));
  const itens = Object.entries(sel).filter(([, q]) => q > 0);

  const enviar = () => {
    const o = window.addOrder({ clienteId: me ? me.id : 'c1', itens: itens.map(([pid, q]) => ({ pid, q })), obs: '', entrega: 'retirada', origem: 'cliente' });
    o.tipo = 'encomenda'; o.status = 'novo';
    window.addNotif && window.addNotif('encomenda', 'Nova encomenda', `${me ? me.nome : 'Cliente'} quer encomendar ${itens.length} item(ns) no atacado (#${o.id})`);
    app.close();
    app.toast('Encomenda enviada! A loja vai definir a garantia ✓');
  };

  return (
    <Overlay>
      <Header title="Encomendar no atacado" onBack={app.close} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 0' }}>
        <Card pad={14} style={{ marginBottom: 14, background: '#ecfeff', borderColor: '#a5f3fc', display: 'flex', gap: 10 }}>
          <Icon name="truck" size={18} style={{ color: '#0e7490', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500, lineHeight: 1.45 }}>Escolha os produtos que quer que a loja compre para você no <b>preço de atacado</b>. A loja vai analisar e definir um <b>valor de garantia</b> que você paga adiantado para iniciar a compra.</div>
        </Card>
        {produtos.map((p) => {
          const q = sel[p.id] || 0;
          const temAtac = p.precoAtacado > 0;
          return (
            <Card key={p.id} pad={11} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProductThumb product={p} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: temAtac ? 'var(--green-700)' : 'var(--ink-3)', fontWeight: 700 }}>{temAtac ? `Atacado ${window.fmtBRL(p.precoAtacado)} · a partir de ${p.qtdAtacado} un.` : 'Sob consulta'}</div>
              </div>
              {q > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <button onClick={() => set(p.id, -1)} style={miniStep}><Icon name="arrowDown" size={14} /></button>
                  <span style={{ fontSize: 14, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{q}</span>
                  <button onClick={() => set(p.id, 1)} style={{ ...miniStep, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="arrowUp" size={14} /></button>
                </div>
              ) : (
                <button onClick={() => set(p.id, p.qtdAtacado || 1)} style={{ ...miniStep, background: 'var(--green-50)', color: 'var(--green-700)', border: 'none', width: 'auto', padding: '0 13px', fontWeight: 800, fontSize: 12.5 }}>Encomendar</button>
              )}
            </Card>
          );
        })}
        <div style={{ height: 90 }} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
        <Button kind="primary" full size="lg" icon="truck" onClick={enviar} style={{ opacity: itens.length ? 1 : 0.5 }}>Enviar encomenda{itens.length ? ` · ${itens.reduce((a, [, q]) => a + q, 0)} itens` : ''}</Button>
      </div>
    </Overlay>
  );
}

// ── Cliente edita um orçamento pendente ───────────────────
function EditarOrcamento({ id, app }) {
  const o = window.ORDERS.find((x) => x.id === id);
  const [qtds, setQtds] = useState(() => { const m = {}; (o ? o.itens : []).forEach((i) => { m[i.pid] = i.q; }); return m; });
  const [obs, setObs] = useState(o ? o.obs : '');
  const [entrega, setEntrega] = useState(o ? o.entrega : 'retirada');
  if (!o) return null;
  const set = (pid, d) => setQtds((m) => ({ ...m, [pid]: Math.max(0, (m[pid] || 0) + d) }));
  const itens = Object.entries(qtds).filter(([, q]) => q > 0);

  const salvar = () => {
    if (!itens.length) { app.toast('Adicione ao menos 1 item'); return; }
    window.editOrder(id, { itens: itens.map(([pid, q]) => ({ pid, q })), obs: obs.trim(), entrega });
    app.close();
    app.toast('Orçamento atualizado ✓');
  };

  return (
    <Overlay>
      <Header title={`Editar orçamento #${o.id}`} onBack={app.close} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 0' }}>
        <SectionLabel>Itens</SectionLabel>
        {o.itens.map((i) => {
          const p = window.getProduct(i.pid);
          const q = qtds[i.pid] || 0;
          return (
            <Card key={i.pid} pad={11} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 12, opacity: q === 0 ? 0.5 : 1 }}>
              <ProductThumb product={p} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>{p.precoVisivel ? window.fmtBRL(p.preco) : 'Sob orçamento'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <button onClick={() => set(i.pid, -1)} style={miniStep}><Icon name="arrowDown" size={14} /></button>
                <span style={{ fontSize: 14, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{q}</span>
                <button onClick={() => set(i.pid, 1)} style={{ ...miniStep, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="arrowUp" size={14} /></button>
              </div>
            </Card>
          );
        })}

        <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
          {[['retirada', 'Retirada', 'store'], ['entrega', 'Entrega', 'truck']].map(([k, l, ic]) => (
            <button key={k} onClick={() => setEntrega(k)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid ' + (entrega === k ? 'var(--green-600)' : 'var(--line)'), background: entrega === k ? 'var(--green-50)' : 'var(--card)', color: entrega === k ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name={ic} size={16} /> {l}</button>
          ))}
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', margin: '16px 2px 8px' }}>Observações</div>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Cor, tamanho, ponto de referência..." style={{ width: '100%', boxSizing: 'border-box', minHeight: 60, padding: 12, borderRadius: 12, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none', color: 'var(--ink-1)' }} />
        <div style={{ height: 16 }} />
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
        <Button kind="primary" full size="lg" icon="check" onClick={salvar} style={{ opacity: itens.length ? 1 : 0.5 }}>Salvar alterações</Button>
      </div>
    </Overlay>
  );
}

Object.assign(window, { ClientApp, EncomendaSheet, EditarOrcamento });