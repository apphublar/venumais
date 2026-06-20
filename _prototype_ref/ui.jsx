/* Shared UI — GESTÃO DE VENDAS */
const { useState, useEffect, useRef } = React;

// ── Icons (simple line set) ───────────────────────────────
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5',
  calendar: 'M7 3v3M17 3v3M3.5 9h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5Z',
  cards: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5ZM3 10h18',
  users: 'M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3 3 0 0 1 0 5.6',
  box: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5ZM3.5 7.5 12 12m0 9V12m8.5-4.5L12 12',
  alert: 'M12 8.5v4.5M12 16.5h.01M10.3 3.9 2.7 17.4A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0Z',
  plus: 'M12 5v14M5 12h14',
  chevR: 'm9 5 7 7-7 7',
  chevL: 'm15 5-7 7 7 7',
  chevDown: 'm6 9 6 6 6-6',
  check: 'm5 12.5 4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5',
  filter: 'M3 5h18l-7 8v6l-4-2v-4Z',
  share: 'M16 6l-4-4-4 4M12 2v13M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  whatsapp: 'M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z',
  copy: 'M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM6 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1',
  trending: 'M3 17 9 11l4 4 8-8M16 7h5v5',
  wallet: 'M3 8.5A1.5 1.5 0 0 1 4.5 7H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H4.5A1.5 1.5 0 0 1 3 18ZM3 9.5h14a1.5 1.5 0 0 1 1.5 1.5v0M16.5 13.5h.01',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  eye: 'M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18M10.6 6.1A9.4 9.4 0 0 1 12 6c6 0 9 6 9 6a16 16 0 0 1-2.7 3.5M6.1 6.1A16 16 0 0 0 3 12s3 6 9 6a9 9 0 0 0 3.3-.6',
  edit: 'M4 20h4L19 9l-4-4L4 16ZM14 6l4 4',
  receipt: 'M5 3h14v18l-3-2-3 2-3-2-3 2ZM8.5 8h7M8.5 12h7',
  doc: 'M7 3h7l4 4v14H7ZM14 3v4h4',
  pix: 'M12 3 5 10l7 7 7-7ZM5 14v3h3M19 14v3h-3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7M10 11v6M14 11v6',
  lock: 'M6 10V8a6 6 0 0 1 12 0v2M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM12 15v2',
  pkg: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5ZM12 12v9m0-9 8.5-4.5M12 12 3.5 7.5',
  split: 'M6 3v6a4 4 0 0 0 4 4h8M18 9l3 3-3 3M6 21v-6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c0-3.3 3.1-6 7-6s7 2.7 7 6',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z',
  scan: 'M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16',
  ticket: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4ZM9 6v12',
  truck: 'M3 6.5A1.5 1.5 0 0 1 4.5 5H14v10H3ZM14 8h3.5L21 11.5V15h-7M7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  store: 'M4 9.5 5.2 4.5h13.6L20 9.5M4 9.5V20h16V9.5M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0M9.5 20v-5h5v5',
  gift: 'M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M3 8h18v4H3ZM12 8v13M12 8S10.5 4 8 4a2 2 0 0 0 0 4h4Zm0 0s1.5-4 4-4a2 2 0 0 1 0 4h-4Z',
  print: 'M6 9V3h12v6M6 18H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1M7 14h10v7H7Z',
  tag: 'M3 3h7l11 11-7 7L3 10Zm4 4h.01',
  cake: 'M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M4 14s1.5 1.5 4 0 4 0 4 0 1.5 1.5 4 0 4 0M12 8V5M9 8V6M15 8V6',
};
function Icon({ name, size = 22, stroke = 2, fill = 'none', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}>
      <path d={PATHS[name]} />
    </svg>
  );
}
function WhatsLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.9.9.9-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.25-.13-1.48-.73-1.7-.82s-.4-.13-.56.13-.64.81-.79.98-.29.2-.54.07a6.7 6.7 0 0 1-2-1.23 7.4 7.4 0 0 1-1.36-1.7c-.14-.25 0-.38.11-.5s.25-.29.37-.43a1.7 1.7 0 0 0 .25-.41.46.46 0 0 0 0-.44c-.07-.13-.56-1.35-.77-1.85s-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31 2.78 2.78 0 0 0-.87 2.07 4.83 4.83 0 0 0 1 2.56 11 11 0 0 0 4.2 3.7 14.2 14.2 0 0 0 1.4.52 3.37 3.37 0 0 0 1.55.1 2.54 2.54 0 0 0 1.66-1.17 2.06 2.06 0 0 0 .14-1.17c-.06-.1-.23-.17-.48-.3Z"/>
    </svg>
  );
}

// ── Brand mark (white-label): logo do vendedor ou inicial ─
function BrandMark({ size = 44, radius, onLight }) {
  const s = window.SELLER;
  const r = radius != null ? radius : Math.round(size * 0.34);
  if (s.logo) {
    return (
      <div style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', flexShrink: 0, background: onLight ? 'var(--chip)' : 'rgba(255,255,255,0.18)' }}>
        <img src={s.logo} alt={s.loja} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0, display: 'grid', placeItems: 'center',
      fontSize: size * 0.42, fontWeight: 800, letterSpacing: '-0.02em',
      background: onLight ? 'var(--green-600)' : 'rgba(255,255,255,0.18)', color: '#fff',
    }}>{s.inicial}</div>
  );
}

// ── Avatar ────────────────────────────────────────────────
function Avatar({ label, color = 'var(--green-600)', size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, letterSpacing: '-0.02em',
    }}>{label}</div>
  );
}

// ── Money ─────────────────────────────────────────────────
function Money({ value, size, weight = 700, color, muted }) {
  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums', fontWeight: weight, fontSize: size,
      color: color || (muted ? 'var(--ink-3)' : 'inherit'), letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>{window.fmtBRL(value)}</span>
  );
}

// ── Status badge for parcelas ─────────────────────────────
const STATUS_META = {
  pago: { label: 'Pago', dot: '#16a34a', bg: 'var(--green-50)', fg: 'var(--green-700)', icon: '✓' },
  hoje: { label: 'Vence hoje', dot: '#d97706', bg: '#fef3c7', fg: '#92660b', icon: '!' },
  futuro: { label: 'A vencer', dot: '#2563eb', bg: '#dbeafe', fg: '#1e478f', icon: '•' },
  atrasado: { label: 'Atrasado', dot: '#dc2626', bg: '#fee2e2', fg: '#b1182a', icon: '!' },
};
function StatusBadge({ status, small }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.bg, color: m.fg, borderRadius: 999,
      padding: small ? '2px 8px' : '4px 10px', fontSize: small ? 11 : 12.5, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot }} />
      {m.label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────
function Card({ children, style, onClick, pad = 16 }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', borderRadius: 18, padding: pad,
      border: '1px solid var(--line)', boxShadow: '0 1px 2px rgba(16,32,24,0.04)',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

// ── Button ────────────────────────────────────────────────
function Button({ children, kind = 'primary', icon, onClick, full, size = 'md', style }) {
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 13.5, h: 36 },
    md: { padding: '12px 18px', fontSize: 15, h: 48 },
    lg: { padding: '15px 20px', fontSize: 16, h: 54 },
  }[size];
  const kinds = {
    primary: { background: 'var(--green-600)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(18,138,93,0.28)' },
    dark: { background: 'var(--ink-1)', color: '#fff', border: 'none' },
    ghost: { background: 'var(--card)', color: 'var(--ink-1)', border: '1px solid var(--line)' },
    soft: { background: 'var(--green-50)', color: 'var(--green-700)', border: 'none' },
    whats: { background: '#25D366', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(37,211,102,0.32)' },
    danger: { background: '#fee2e2', color: '#b1182a', border: 'none' },
  }[kind];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
      width: full ? '100%' : undefined, minHeight: sizes.h, lineHeight: 1,
      ...sizes, ...kinds, ...style,
    }}>
      {icon && (icon === 'whatsapp' ? <WhatsLogo size={18} /> : <Icon name={icon} size={18} />)}
      {children}
    </button>
  );
}

// ── Bottom sheet ──────────────────────────────────────────
function Sheet({ open, onClose, title, children, maxH = '88%' }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(12,22,17,0.45)', display: 'flex', alignItems: 'flex-end',
      animation: 'fadeIn .18s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg)', width: '100%', borderRadius: '24px 24px 0 0',
        maxHeight: maxH, display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .26s cubic-bezier(.16,1,.3,1)', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--line-2)' }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px 12px', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'var(--chip)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)' }}>
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: '0 20px 24px', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────
function SectionLabel({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 10px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', color: 'var(--ink-3)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
      {action && <button onClick={onAction} style={{ background: 'none', border: 'none', color: 'var(--green-700)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>{action}</button>}
    </div>
  );
}

// ── Product thumb placeholder ─────────────────────────────
function ProductThumb({ product, size = 52, radius = 12 }) {
  if (product.foto) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden', background: 'var(--chip)' }}>
        <img src={product.foto} alt={product.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: product.cor, position: 'relative', overflow: 'hidden',
      display: 'grid', placeItems: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 6px, transparent 6px 12px)',
      }} />
      <span style={{ position: 'relative', fontWeight: 800, fontSize: size * 0.3, color: 'rgba(0,0,0,0.42)' }}>
        {product.nome.split(' ').slice(0, 1)[0].slice(0, 1)}
      </span>
    </div>
  );
}

// ── Bottom nav ────────────────────────────────────────────
function BottomNav({ items, active, onChange }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--card)', borderTop: '1px solid var(--line)',
      padding: '6px 6px 4px', flexShrink: 0,
    }}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0',
            color: on ? 'var(--green-700)' : 'var(--ink-3)',
          }}>
            <div style={{
              padding: '3px 16px', borderRadius: 999, position: 'relative',
              background: on ? 'var(--green-50)' : 'transparent', transition: 'background .15s',
            }}>
              <Icon name={it.icon} size={22} stroke={on ? 2.3 : 1.9} />
              {it.badge ? <span style={{ position: 'absolute', top: -1, right: 9, minWidth: 16, height: 16, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid var(--card)' }}>{it.badge}</span> : null}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Date picker (mini-calendário em Sheet, sem libs) ──────
// value: Date selecionada · min: Date mínima (datas anteriores ficam desabilitadas)
// refBase: data de referência para os chips de atalho (+7/+15/+30)
function DateSheet({ open, value, min, refBase, onClose, onPick }) {
  const base = value || min || window.TODAY;
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  useEffect(() => { if (open) setView(new Date(base.getFullYear(), base.getMonth(), 1)); }, [open]);
  if (!open) return null;

  const y = view.getFullYear(), m = view.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const minDay = min ? new Date(min.getFullYear(), min.getMonth(), min.getDate()) : null;
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let dd = 1; dd <= days; dd++) cells.push(dd);
  const monthName = view.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const ref = refBase || window.TODAY;
  const chips = [['+7 dias', 7], ['+15 dias', 15], ['+30 dias', 30]];

  return (
    <Sheet open onClose={onClose} title="Escolher data">
      {/* chips de atalho relativos à parcela anterior (ou hoje) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {chips.map(([l, n]) => (
          <button key={n} onClick={() => onPick(window.addDays(ref, n))} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--green-50)', color: 'var(--green-700)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>
      {/* navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => setView(new Date(y, m - 1, 1))} style={{ background: 'var(--chip)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)' }}><Icon name="chevL" size={18} /></button>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{monthLabel}</span>
        <button onClick={() => setView(new Date(y, m + 1, 1))} style={{ background: 'var(--chip)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-1)' }}><Icon name="chevR" size={18} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', padding: '4px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, paddingBottom: 8 }}>
        {cells.map((dd, i) => {
          if (dd == null) return <div key={i} />;
          const cur = new Date(y, m, dd);
          const disabled = minDay && cur < minDay;
          const selected = value && window.sameDay(cur, value);
          const isToday = window.sameDay(cur, window.TODAY);
          return (
            <button key={i} disabled={disabled} onClick={() => onPick(cur)} style={{
              aspectRatio: '1', borderRadius: 11, border: 'none', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
              fontSize: 14, fontWeight: selected ? 800 : 600,
              background: selected ? 'var(--green-600)' : 'transparent',
              color: selected ? '#fff' : disabled ? 'var(--line-2)' : 'var(--ink-1)',
              outline: isToday && !selected ? '1.5px solid var(--green-600)' : 'none', outlineOffset: -1.5,
            }}>{dd}</button>
          );
        })}
      </div>
    </Sheet>
  );
}

Object.assign(window, {
  Icon, WhatsLogo, BrandMark, Avatar, Money, StatusBadge, STATUS_META, Card, Button, Sheet,
  SectionLabel, ProductThumb, BottomNav, DateSheet,
});
