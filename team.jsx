/* Equipe & permissões + menu do painel */

// lista de capacidades exibidas no resumo de permissões do vendedor
const PERM_ITEMS = [
  ['cadastrarCliente', 'Cadastrar clientes'],
  ['cadastrarProduto', 'Cadastrar produtos'],
  ['registrarVenda', 'Registrar vendas'],
  ['orcamento', 'Responder orçamentos'],
  ['ocorrencia', 'Registrar ocorrências'],
  ['pagamento', 'Registrar pagamentos'],
  ['cobrar', 'Enviar cobranças'],
  ['excluir', 'Excluir registros'],
  ['reverter', 'Reverter ocorrências'],
  ['equipe', 'Gerenciar equipe'],
  ['config', 'Configurações da loja'],
];

// ── MENU do painel (abre pelo botão no topo do Dashboard) ──
function MenuSheet({ app, onClose }) {
  const admin = window.isAdmin();
  const Item = ({ icon, title, sub, onClick, danger, disabled, badge }) => (
    <button onClick={disabled ? undefined : onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '13px 14px', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 10, opacity: disabled ? 0.5 : 1, textAlign: 'left' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: danger ? '#fee2e2' : 'var(--green-50)', color: danger ? '#dc2626' : 'var(--green-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={icon} size={20} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: danger ? '#dc2626' : 'var(--ink-1)' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{sub}</div>}
      </div>
      {badge}
      {!disabled && <Icon name="chevR" size={18} style={{ color: 'var(--ink-3)' }} />}
      {disabled && <Icon name="eyeOff" size={16} style={{ color: 'var(--ink-3)' }} />}
    </button>
  );

  const u = window.CURRENT_USER;
  const nomeAtual = admin ? window.SELLER.nome : (window.TEAM.find((m) => m.id === u.memberId)?.nome || 'Vendedor');

  return (
    <Sheet open onClose={onClose} title="Menu">
      {/* quem está usando */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 14, background: 'var(--green-50)', marginBottom: 16 }}>
        <Avatar label={admin ? window.SELLER.inicial : (window.TEAM.find((m) => m.id === u.memberId)?.inicial || 'V')} color={admin ? 'var(--green-600)' : (window.TEAM.find((m) => m.id === u.memberId)?.cor || 'var(--ink-2)')} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{nomeAtual}</div>
          <div style={{ fontSize: 12, color: 'var(--green-700)', fontWeight: 700 }}>{admin ? 'Proprietário · acesso total' : 'Vendedor · acesso restrito'}</div>
        </div>
      </div>

      <Item icon="users" title="Equipe & permissões" sub={admin ? `${window.TEAM.length + 1} pessoas com acesso` : 'Somente o proprietário gerencia'} onClick={() => { onClose(); app.openOverlay({ type: 'equipe' }); }} disabled={!admin} />
      <Item icon="ticket" title="Cupons de desconto" sub="Crie e gerencie cupons da loja" onClick={() => { onClose(); app.openOverlay({ type: 'cupons' }); }} />
      <Item icon="gift" title="Aniversariantes do mês" sub={`${window.aniversariantesDoMes().length} cliente(s) fazem aniversário`} onClick={() => { onClose(); app.openOverlay({ type: 'aniversariantes' }); }} />
      <Item icon="edit" title="Configurações da loja" sub="Marca, PIX e link do catálogo" onClick={() => { onClose(); app.toast('Configurações da loja (demonstração)'); }} disabled={!admin} />

      {/* trocar de usuário — demonstração de papéis */}
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: '16px 2px 10px' }}>Ver o app como (demonstração)</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { window.CURRENT_USER = { role: 'admin', memberId: null }; app.refresh(); onClose(); app.toast('Agora você é o Proprietário'); }} style={{ flex: 1, padding: '12px 8px', borderRadius: 13, border: '1.5px solid ' + (admin ? 'var(--green-600)' : 'var(--line)'), background: admin ? 'var(--green-50)' : 'var(--card)', color: admin ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Proprietário</button>
        <button onClick={() => { const m = window.TEAM[0]; window.CURRENT_USER = { role: 'vendedor', memberId: m ? m.id : null }; app.refresh(); onClose(); app.toast('Agora você é um Vendedor (acesso restrito)'); }} style={{ flex: 1, padding: '12px 8px', borderRadius: 13, border: '1.5px solid ' + (!admin ? 'var(--green-600)' : 'var(--line)'), background: !admin ? 'var(--green-50)' : 'var(--card)', color: !admin ? 'var(--green-700)' : 'var(--ink-2)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Vendedor</button>
      </div>
      <div style={{ height: 10 }} />
    </Sheet>
  );
}

// ── EQUIPE & PERMISSÕES (overlay, admin) ──────────────────
function EquipeScreen({ app }) {
  const [novo, setNovo] = useState(false);

  return (
    <Overlay>
      <Header title="Equipe & permissões" subtitle={`${window.TEAM.length + 1} pessoas com acesso`} onBack={app.closeOverlay}
        right={<button onClick={() => setNovo(true)} style={{ ...iconBtn, background: 'var(--green-600)', color: '#fff', border: 'none' }}><Icon name="plus" size={20} /></button>} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* proprietário */}
        <SectionLabel>Proprietário</SectionLabel>
        <Card pad={13} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 13 }}>
          <BrandMark size={46} onLight />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{window.SELLER.nome}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{window.SELLER.email}</div>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-700)', whiteSpace: 'nowrap' }}>Acesso total</span>
        </Card>

        {/* vendedores — toque para ver histórico e permissões */}
        <SectionLabel>Vendedores ({window.TEAM.length})</SectionLabel>
        {window.TEAM.map((m) => {
          const liberadas = window.GRANTABLE_PERMS.filter((k) => m.perms && m.perms[k]).length;
          return (
            <Card key={m.id} onClick={() => app.openOverlay({ type: 'membro', id: m.id })} pad={13} style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar label={m.inicial} color={m.cor} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>{m.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{liberadas} de {window.GRANTABLE_PERMS.length} permissões · {(m.log || []).length} ações</div>
              </div>
              <Icon name="chevR" size={20} style={{ color: 'var(--ink-3)' }} />
            </Card>
          );
        })}
        {!window.TEAM.length && <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13.5 }}>Nenhum vendedor adicionado ainda.</div>}

        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, lineHeight: 1.5, margin: '14px 4px 18px' }}>
          Toque num vendedor para ver tudo o que ele fez no app e ajustar as permissões dele. Apenas o proprietário gerencia a equipe e as configurações da loja.
        </div>
      </div>
      <NovoMembroSheet open={novo} onClose={() => setNovo(false)} onCreate={(m) => { setNovo(false); app.refresh(); app.openOverlay({ type: 'membro', id: m.id }); app.toast(`${m.nome.split(' ')[0]} agora tem acesso ✓`); }} />
    </Overlay>
  );
}

// ── DETALHE DO MEMBRO: histórico + permissões editáveis ───
const LOG_CAT = {
  venda: { icon: 'cards', cor: '#6d28d9', bg: '#ede9fe' },
  cliente: { icon: 'users', cor: '#1e478f', bg: '#dbeafe' },
  produto: { icon: 'box', cor: '#92660b', bg: '#fef3c7' },
  pagamento: { icon: 'wallet', cor: 'var(--green-700)', bg: 'var(--green-50)' },
  cobranca: { icon: 'whatsapp', cor: '#0e7a4f', bg: '#e7f8ee' },
  orcamento: { icon: 'receipt', cor: '#1e478f', bg: '#dbeafe' },
  ocorrencia: { icon: 'alert', cor: '#b1182a', bg: '#fee2e2' },
  geral: { icon: 'clock', cor: 'var(--ink-3)', bg: 'var(--chip)' },
};
function fmtLogTime(dt) {
  const d = (dt instanceof Date) ? dt : new Date(dt);
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} · ${hora}`;
}

function MembroDetalhe({ id, app }) {
  const [, bump] = useState(0);
  const [novoDel, setNovoDel] = useState(false);
  const m = window.TEAM.find((x) => x.id === id);
  if (!m) return null;
  if (!m.perms) m.perms = window.defaultMemberPerms();
  const liberadas = window.GRANTABLE_PERMS.filter((k) => m.perms[k]).length;
  const todas = liberadas === window.GRANTABLE_PERMS.length;
  const log = m.log || [];

  const toggle = (k) => { m.perms[k] = !m.perms[k]; bump((n) => n + 1); app.refresh && app.refresh(); };
  const setTudo = (val) => { window.GRANTABLE_PERMS.forEach((k) => { m.perms[k] = val; }); bump((n) => n + 1); app.refresh && app.refresh(); };

  return (
    <Overlay>
      <Header title={m.nome} subtitle="Vendedor da equipe" onBack={app.closeOverlay} />
      <div style={{ padding: '6px 16px 0' }}>
        {/* cartão do membro */}
        <Card pad={14} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 13 }}>
          <Avatar label={m.inicial} color={m.cor} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{m.nome}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{m.email || m.zap || 'Sem contato'}</div>
            {m.desde && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Na equipe desde {window.fmtDateLong(m.desde)}</div>}
          </div>
        </Card>

        {/* permissões */}
        <SectionLabel>Permissões</SectionLabel>
        {/* permitir tudo */}
        <Card pad={14} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, borderColor: todas ? 'var(--green-600)' : 'var(--line)', background: todas ? 'var(--green-50)' : 'var(--card)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: todas ? 'var(--green-600)' : 'var(--chip)', color: todas ? '#fff' : 'var(--ink-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="check" size={20} stroke={2.6} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>Permitir tudo</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Acesso total às funções operacionais</div>
          </div>
          <Toggle on={todas} onChange={() => setTudo(!todas)} />
        </Card>
        {/* itens individuais */}
        <Card pad={6} style={{ marginBottom: 10 }}>
          {window.GRANTABLE_PERMS.map((k, i) => {
            const lbl = (PERM_ITEMS.find(([key]) => key === k) || [k, k])[1];
            const on = !!m.perms[k];
            const sensivel = k === 'excluir' || k === 'reverter';
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderBottom: i < window.GRANTABLE_PERMS.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)' }}>{lbl}</div>
                  {sensivel && <div style={{ fontSize: 11, color: '#b45309', fontWeight: 700, marginTop: 1 }}>Ação sensível</div>}
                </div>
                <Toggle on={on} onChange={() => toggle(k)} />
              </div>
            );
          })}
        </Card>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500, lineHeight: 1.5, margin: '0 4px 18px' }}>
          {liberadas} de {window.GRANTABLE_PERMS.length} permissões liberadas. Mudanças valem na hora para este vendedor.
        </div>

        {/* histórico */}
        <SectionLabel>Histórico de atividade ({log.length})</SectionLabel>
        {log.length ? (
          <div style={{ position: 'relative', paddingLeft: 6 }}>
            {log.map((e, i) => {
              const meta = LOG_CAT[e.cat] || LOG_CAT.geral;
              return (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: meta.bg, color: meta.cor, display: 'grid', placeItems: 'center' }}>{e.cat === 'cobranca' ? <WhatsLogo size={16} /> : <Icon name={meta.icon} size={17} />}</div>
                    {i < log.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--line)', marginTop: 4, minHeight: 12 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.4 }}>{e.acao}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{fmtLogTime(e.em)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card pad={20} style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 600 }}>Nenhuma atividade registrada ainda.</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500, marginTop: 4 }}>Tudo que {m.nome.split(' ')[0]} fizer no app aparece aqui.</div>
          </Card>
        )}

        {/* remover acesso */}
        <SectionLabel>Acesso</SectionLabel>
        {!novoDel ? (
          <button onClick={() => setNovoDel(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff6f6', border: '1px solid #fbd5d5', borderRadius: 14, padding: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#dc2626', fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap' }}><Icon name="trash" size={18} /> Remover acesso</button>
        ) : (
          <Card pad={14} style={{ borderColor: '#fbd5d5', background: '#fff6f6' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1.45, marginBottom: 12 }}>Remover o acesso de <b>{m.nome}</b>? O histórico de atividade dele será perdido.</div>
            <div style={{ display: 'flex', gap: 9 }}>
              <Button kind="ghost" full size="sm" onClick={() => setNovoDel(false)}>Cancelar</Button>
              <Button kind="danger" full size="sm" icon="trash" onClick={() => { window.removeMember(m.id); app.closeOverlay(); app.refresh(); app.toast('Vendedor removido'); }}>Remover</Button>
            </div>
          </Card>
        )}
        <div style={{ height: 18 }} />
      </div>
    </Overlay>
  );
}

function NovoMembroSheet({ open, onClose, onCreate }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [zap, setZap] = useState('');
  const [senha, setSenha] = useState('');
  useEffect(() => { if (open) { setNome(''); setEmail(''); setZap(''); setSenha(''); } }, [open]);
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const valid = nome.trim().length >= 2 && emailOk(email) && senha.length >= 6;
  const label = { fontSize: 12.5, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 7, display: 'block' };
  const input = { width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', outline: 'none', background: 'var(--card)' };
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar vendedor">
      <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, margin: '0 2px 16px', lineHeight: 1.5 }}>
        O vendedor entra com email e senha e terá acesso restrito: pode cadastrar e vender, mas não excluir nada.
      </div>
      <div style={{ marginBottom: 13 }}><label style={label}>Nome *</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Carla Souza" style={input} /></div>
      <div style={{ marginBottom: 13 }}><label style={label}>Email *</label><input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="vendedor@email.com" style={input} /></div>
      <div style={{ marginBottom: 13 }}><label style={label}>WhatsApp</label><input value={zap} onChange={(e) => setZap(e.target.value)} inputMode="tel" placeholder="(11) 90000-0000" style={input} /></div>
      <div style={{ marginBottom: 20 }}><label style={label}>Senha de acesso *</label><input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="Mínimo 6 caracteres" style={input} /></div>
      <Button kind="primary" full size="lg" icon="check" onClick={() => valid && onCreate(window.addMember({ nome, email, zap }))} style={{ opacity: valid ? 1 : 0.5 }}>Adicionar vendedor</Button>
      <div style={{ height: 8 }} />
    </Sheet>
  );
}

Object.assign(window, { MenuSheet, EquipeScreen, MembroDetalhe, NovoMembroSheet, PERM_ITEMS });
