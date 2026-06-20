/* Login + cadastro do vendedor (cria a loja white-label) */

// barra de matiz arrastável (arco-íris) — prática no toque
function HueSlider({ hue, onChange }) {
  const ref = useRef(null);
  const setFromX = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    let f = (clientX - r.left) / r.width;
    f = Math.max(0, Math.min(1, f));
    onChange(Math.round(f * 360));
  };
  const onDown = (e) => {
    e.preventDefault();
    setFromX(e.clientX);
    const move = (ev) => setFromX(ev.clientX);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div style={{ padding: '0 13px' }}>
      <div ref={ref} onPointerDown={onDown} style={{
        position: 'relative', height: 26, borderRadius: 999, cursor: 'pointer', touchAction: 'none',
        background: 'linear-gradient(90deg, hsl(0,75%,50%), hsl(60,75%,50%), hsl(120,65%,45%), hsl(180,70%,45%), hsl(240,70%,55%), hsl(300,70%,55%), hsl(360,75%,50%))',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: `${(hue / 360) * 100}%`, transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: '50%', background: `hsl(${hue},70%,50%)`, border: '4px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

function VendorAuth({ onEnter, shared }) {
  const [modo, setModo] = useState('entrar'); // entrar | criar
  // login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [verLogin, setVerLogin] = useState(false);
  // criar — passo
  const [passo, setPasso] = useState(1); // 1 = seus dados, 2 = sua loja
  // dados pessoais
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [zap, setZap] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  // loja
  const [loja, setLoja] = useState('');
  const [logo, setLogo] = useState(null);
  const [cor, setCor] = useState('verde');
  const [customPalette, setCustomPalette] = useState(null); // paleta personalizada (matiz + tom)
  const [picking, setPicking] = useState(false);
  const [hue, setHue] = useState(265);
  const [tone, setTone] = useState('vibrante');
  const [pixChave, setPixChave] = useState('');
  const [pixNome, setPixNome] = useState('');
  const [erro, setErro] = useState('');
  const fileRef = useRef(null);

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 24);

  const label = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '14px 15px', borderRadius: 14, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15.5, fontWeight: 600, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' };
  const eyeBtn = { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' };

  // preview da cor escolhida no onboarding (sem afetar o app antes de entrar)
  useEffect(() => { if (modo === 'criar') window.applyBrand(customPalette || cor); else window.applyBrand(window.SELLER.corCustom || window.SELLER.cor); }, [cor, customPalette, modo]);

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogo(ev.target.result);
    reader.readAsDataURL(f);
  };

  const dadosOk = nome.trim().length >= 2 && emailOk(email) && zap.replace(/\D/g, '').length >= 10 && senha.length >= 6 && senha === senha2;
  const lojaOk = loja.trim().length >= 2 && pixChave.trim().length >= 3 && pixNome.trim().length >= 2;

  const finalizar = () => {
    if (!lojaOk) { setErro('Preencha o nome da loja e os dados do PIX.'); return; }
    const inicial = loja.trim().replace(/^[^a-zA-ZÀ-ÿ]+/, '').slice(0, 1).toUpperCase() || 'L';
    Object.assign(window.SELLER, {
      nome: nome.trim(), email: email.trim(), loja: loja.trim(), inicial, logo,
      cor: customPalette ? 'custom' : cor, corCustom: customPalette || null,
      pixChave: pixChave.trim(), pixNome: pixNome.trim().toUpperCase(),
      catalogo: `${slug(loja) || 'minhaloja'}.vendas.app`,
    });
    window.applyBrand(customPalette || cor);
    onEnter();
  };

  const entrar = () => {
    if (!emailOk(loginEmail) || loginSenha.length < 1) { setErro('Informe um email válido e a senha.'); return; }
    window.applyBrand(window.SELLER.cor);
    onEnter();
  };

  const corAtual = customPalette || window.BRAND_PALETTES[cor];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
      {/* topo */}
      <div style={{ background: 'linear-gradient(135deg, var(--brand-g1), var(--brand-g2))', padding: '34px 24px 24px', color: '#fff', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
          <Icon name="cards" size={28} />
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>Sua loja de vendas e crediário</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, fontWeight: 500, marginTop: 4, lineHeight: 1.4 }}>
          {modo === 'entrar' ? 'Acesse o painel da sua loja.' : 'Crie sua conta e monte sua loja em 2 passos.'}
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 22px 28px' }}>
        {/* alternador */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 13, padding: 4, marginBottom: 20 }}>
          {[['entrar', 'Entrar'], ['criar', 'Criar minha loja']].map(([k, l]) => (
            <button key={k} onClick={() => { setModo(k); setErro(''); setPasso(1); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, background: modo === k ? 'var(--card)' : 'transparent', color: modo === k ? 'var(--ink-1)' : 'var(--ink-3)', boxShadow: modo === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{l}</button>
          ))}
        </div>

        {erro && <div style={{ background: '#fee2e2', color: '#b1182a', borderRadius: 12, padding: '10px 13px', fontSize: 12.5, fontWeight: 700, marginBottom: 16, lineHeight: 1.45 }}>{erro}</div>}

        {modo === 'entrar' && (
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
            <Button kind="primary" full size="lg" icon="check" onClick={entrar} style={{ opacity: (emailOk(loginEmail) && loginSenha) ? 1 : 0.5 }}>Entrar no painel</Button>
            <button onClick={() => { window.applyBrand(window.SELLER.cor); onEnter(); }} style={{ width: '100%', marginTop: 18, background: 'none', border: 'none', color: 'var(--ink-3)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Entrar na loja demonstração (Bia Variedades)</button>
          </>
        )}

        {modo === 'criar' && (
          <>
            {/* indicador de passo */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              {[1, 2].map((n) => <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: passo >= n ? 'var(--green-600)' : 'var(--line-2)' }} />)}
            </div>

            {passo === 1 && (
              <>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.01em' }}>1. Seus dados</div>
                <div style={{ marginBottom: 13 }}>
                  <label style={label}>Seu nome *</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Bianca Costa" style={input} />
                </div>
                <div style={{ marginBottom: 13 }}>
                  <label style={label}>Email *</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="voce@email.com" style={input} />
                </div>
                <div style={{ marginBottom: 13 }}>
                  <label style={label}>WhatsApp *</label>
                  <input value={zap} onChange={(e) => setZap(e.target.value)} inputMode="tel" placeholder="(11) 90000-0000" style={input} />
                </div>
                <div style={{ marginBottom: 13 }}>
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
                </div>
                <Button kind="primary" full size="lg" onClick={() => { if (dadosOk) { setErro(''); setPasso(2); } else setErro('Preencha seus dados. Senha de 6+ caracteres e iguais nas duas.'); }} style={{ opacity: dadosOk ? 1 : 0.5 }}>Continuar</Button>
              </>
            )}

            {passo === 2 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <button onClick={() => setPasso(1)} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '50%', width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)' }}><Icon name="chevL" size={16} /></button>
                  <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>2. Sua loja</span>
                </div>

                {/* logo */}
                <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
                  {logo ? (
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: 76, height: 76, borderRadius: 18, overflow: 'hidden', background: 'var(--chip)' }}><img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>
                      <button onClick={() => setLogo(null)} style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: 'var(--ink-1)', color: '#fff', border: '2px solid var(--bg)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Icon name="x" size={13} /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current && fileRef.current.click()} style={{ width: 76, height: 76, borderRadius: 18, border: '1.5px dashed var(--line-2)', background: 'var(--card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-3)', flexShrink: 0 }}>
                      <Icon name="plus" size={20} /><span style={{ fontSize: 10, fontWeight: 700 }}>Logo</span>
                    </button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>Logotipo da loja</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>Opcional. Sem logo, usamos a inicial do nome da loja.</div>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={label}>Nome da loja *</label>
                  <input value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Ex.: Bia Variedades" style={input} />
                  {loja.trim() && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 7 }}>Seu link: <b style={{ color: 'var(--green-700)' }}>{slug(loja) || 'minhaloja'}.vendas.app</b></div>}
                </div>

                {/* cor da marca */}
                <div style={{ marginBottom: 16 }}>
                  <label style={label}>Cor da marca</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {Object.entries(window.BRAND_PALETTES).map(([k, p]) => (
                      <button key={k} onClick={() => { setCor(k); setCustomPalette(null); }} title={p.nome} style={{ width: 40, height: 40, borderRadius: 12, border: (!customPalette && cor === k) ? '3px solid var(--ink-1)' : '3px solid transparent', background: `linear-gradient(135deg, ${p.g1}, ${p.g2})`, cursor: 'pointer', padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                    ))}
                    {/* botão cor personalizada */}
                    <button onClick={() => setPicking(true)} title="Cor personalizada" style={{ width: 40, height: 40, borderRadius: 12, border: customPalette ? '3px solid var(--ink-1)' : '1.5px solid var(--line-2)', background: customPalette ? `linear-gradient(135deg, ${customPalette.g1}, ${customPalette.g2})` : 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #eab308, #22c55e, #06b6d4, #6366f1, #d946ef, #f43f5e)', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                      {customPalette ? <Icon name="check" size={18} stroke={3} style={{ color: '#fff' }} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={13} style={{ color: 'var(--ink-1)' }} /></div>}
                    </button>
                  </div>
                </div>

                {/* preview white-label */}
                <div style={{ borderRadius: 16, padding: 14, background: `linear-gradient(135deg, ${corAtual.g1}, ${corAtual.g2})`, color: '#fff', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 800, fontSize: 20 }}>
                    {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (loja.trim().slice(0, 1).toUpperCase() || 'L')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 600 }}>Prévia do app</div>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loja.trim() || 'Minha Loja'}</div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 2px 10px' }}>Recebimento PIX</div>
                <div style={{ marginBottom: 13 }}>
                  <label style={label}>Chave PIX *</label>
                  <input value={pixChave} onChange={(e) => setPixChave(e.target.value)} placeholder="email, telefone, CPF/CNPJ ou aleatória" style={input} />
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={label}>Nome do recebedor *</label>
                  <input value={pixNome} onChange={(e) => setPixNome(e.target.value)} placeholder="Como aparece na conta" style={input} />
                </div>

                <Button kind="primary" full size="lg" icon="check" onClick={finalizar} style={{ opacity: lojaOk ? 1 : 0.5 }}>Criar loja e entrar</Button>
              </>
            )}
          </>
        )}
      </div>

      {/* seletor de cor personalizada */}
      {picking && (() => {
        const preview = window.brandFromHue(hue, tone);
        const tones = [['vibrante', 'Vibrante'], ['suave', 'Suave'], ['escuro', 'Escuro']];
        return (
          <Sheet open onClose={() => setPicking(false)} title="Cor personalizada">
            {/* prévia grande */}
            <div style={{ borderRadius: 18, padding: '20px', background: `linear-gradient(135deg, ${preview.g1}, ${preview.g2})`, color: '#fff', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 13, overflow: 'hidden', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 800, fontSize: 22 }}>
                {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (loja.trim().slice(0, 1).toUpperCase() || 'L')}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 600 }}>Sua marca</div>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loja.trim() || 'Minha Loja'}</div>
              </div>
            </div>

            {/* matiz */}
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 2px 12px' }}>Escolha o matiz</div>
            <HueSlider hue={hue} onChange={setHue} />

            {/* tom */}
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '22px 2px 10px' }}>Tom</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tones.map(([k, l]) => {
                const tp = window.brandFromHue(hue, k);
                const on = tone === k;
                return (
                  <button key={k} onClick={() => setTone(k)} style={{ flex: 1, padding: '10px 6px 11px', borderRadius: 13, border: '1.5px solid ' + (on ? 'var(--ink-1)' : 'var(--line)'), background: 'var(--card)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: '100%', height: 22, borderRadius: 7, background: `linear-gradient(135deg, ${tp.g1}, ${tp.g2})` }} />
                    <span style={{ fontWeight: 800, fontSize: 12.5, color: on ? 'var(--ink-1)' : 'var(--ink-3)' }}>{l}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ height: 20 }} />
            <Button kind="primary" full size="lg" icon="check" onClick={() => { setCustomPalette(preview); setPicking(false); }}>Usar esta cor</Button>
            <div style={{ height: 8 }} />
          </Sheet>
        );
      })()}
    </div>
  );
}

Object.assign(window, { VendorAuth });
