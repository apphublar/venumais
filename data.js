/* Mock data for GESTÃO DE VENDAS — pt-BR. "Hoje" = 2026-06-08 (segunda) */
window.TODAY = new Date(2026, 5, 8); // June 8 2026

window.fmtBRL = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
window.fmtNum = (n) => new Intl.NumberFormat('pt-BR').format(n);

// date helpers
window.d = (y, m, day) => new Date(y, m - 1, day);
window.fmtDate = (dt) =>
  dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
window.fmtDateLong = (dt) =>
  dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
window.daysBetween = (a, b) => Math.round((a - b) / 86400000);

// add N days, keeping local midnight
window.addDays = (date, n) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// add N months keeping the same day-of-month; clamp to last valid day (ex.: 31 → 30/28)
window.addMonthsKeepDay = (date, n) => {
  const total = date.getMonth() + n;
  const y = date.getFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), lastDay));
};

// same calendar day?
window.sameDay = (a, b) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// parse BRL-formatted user input: "73,30" | "73.30" | "1.234,56" → Number
window.parseBRL = (str) => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  let s = String(str).trim().replace(/[^\d.,]/g, '');
  if (s.includes('.') && s.includes(',')) {
    // "1.234,56" — dot = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// split a total into N parcelas (2 casas); última absorve a diferença → soma exata
window.splitParcelas = (total, n) => {
  const each = Math.round((total / n) * 100) / 100;
  const arr = Array.from({ length: n }, () => each);
  arr[n - 1] = Math.round((total - each * (n - 1)) * 100) / 100;
  return arr;
};

// status of a parcela relative to today: 'pago' | 'hoje' | 'futuro' | 'atrasado'
window.parcelaStatus = (p) => {
  if (p.pago) return 'pago';
  const diff = window.daysBetween(p.venc, window.TODAY);
  if (diff === 0) return 'hoje';
  if (diff < 0) return 'atrasado';
  return 'futuro';
};

window.SELLER = {
  nome: 'Bianca Costa',
  loja: 'Bia Variedades',
  inicial: 'B',
  email: 'bianca@biavariedades.com',
  logo: null,            // dataURL do logotipo (white-label) — null = usa inicial
  cor: 'verde',          // chave da paleta da marca
  pixChave: 'bia.variedades@pix.com.br',
  pixNome: 'BIANCA C COSTA',
  catalogo: 'bia.vendas.app/biavariedades',
};

// ── White-label: paletas de marca ─────────────────────────
// cada paleta define o tom 50/600/700 (vars --green-*) + os 2 stops do gradiente da marca
window.BRAND_PALETTES = {
  verde:   { nome: 'Verde',   c50: '#e7f6ef', c600: '#128a5d', c700: '#0e6e4a', g1: '#15a06a', g2: '#0d7a50' },
  azul:    { nome: 'Azul',    c50: '#e8f1fe', c600: '#2563eb', c700: '#1d4ed8', g1: '#3b82f6', g2: '#1e4fc4' },
  roxo:    { nome: 'Roxo',    c50: '#f1ecfe', c600: '#7c3aed', c700: '#6d28d9', g1: '#8b5cf6', g2: '#6d28d9' },
  laranja: { nome: 'Laranja', c50: '#fdf0e7', c600: '#ea580c', c700: '#c2410c', g1: '#f97316', g2: '#c2410c' },
  rosa:    { nome: 'Rosa',    c50: '#fdebf4', c600: '#db2777', c700: '#be185d', g1: '#ec4899', g2: '#be185d' },
  grafite: { nome: 'Grafite', c50: '#eef1f4', c600: '#1f2937', c700: '#111827', g1: '#374151', g2: '#111827' },
};

// aplica a paleta da marca às CSS variables (afeta o app inteiro)
// aceita uma chave de BRAND_PALETTES OU um objeto de paleta {c50,c600,c700,g1,g2}
window.applyBrand = (paletteOrKey) => {
  const p = (typeof paletteOrKey === 'string' ? window.BRAND_PALETTES[paletteOrKey] : paletteOrKey) || window.BRAND_PALETTES.verde;
  const r = document.documentElement.style;
  r.setProperty('--green-50', p.c50);
  r.setProperty('--green-600', p.c600);
  r.setProperty('--green-700', p.c700);
  r.setProperty('--brand-g1', p.g1);
  r.setProperty('--brand-g2', p.g2);
};

// gera uma paleta de marca harmônica a partir de um matiz (0–360) e um tom
window.brandFromHue = (h, tone = 'vibrante') => {
  h = Math.round(h);
  const hsl = (s, l) => `hsl(${h}, ${s}%, ${l}%)`;
  const T = {
    vibrante: { c50: [70, 95], c600: [68, 43], c700: [70, 33], g1: [64, 49], g2: [72, 34] },
    suave:    { c50: [52, 96], c600: [44, 50], c700: [46, 40], g1: [42, 55], g2: [48, 42] },
    escuro:   { c50: [38, 94], c600: [50, 32], c700: [54, 23], g1: [46, 37], g2: [54, 24] },
  }[tone] || {};
  return {
    nome: 'Personalizada', custom: true, hue: h, tone,
    c50: hsl(...T.c50), c600: hsl(...T.c600), c700: hsl(...T.c700), g1: hsl(...T.g1), g2: hsl(...T.g2),
  };
};



// ── Produtos ──────────────────────────────────────────────
window.PRODUCTS = [
  { id: 'p1', nome: 'Perfume Floral 100ml', cat: 'Perfumaria', sku: 'PF-100', custo: 38, preco: 89.9, precoPromo: 69.9, estoque: 24, estoqueMin: 5, precoVisivel: true, destaque: true, cor: '#e9d5ff', variacoes: [] },
  { id: 'p2', nome: 'Kit Skincare Vitamina C', cat: 'Cosméticos', sku: 'SK-VC', custo: 52, preco: 129.9, estoque: 7, estoqueMin: 4, precoVisivel: true, cor: '#fde68a', variacoes: [] },
  { id: 'p3', nome: 'Tênis Esportivo Runner', cat: 'Calçados', sku: 'TN-RUN', custo: 95, preco: 219.9, estoque: 3, estoqueMin: 3, precoVisivel: true, cor: '#bfdbfe', variacoes: ['37', '38', '39', '40', '41', '42'] },
  { id: 'p4', nome: 'Bolsa Transversal Couro', cat: 'Acessórios', sku: 'BL-TR', custo: 70, preco: 0, estoque: 5, estoqueMin: 2, precoVisivel: false, cor: '#fecaca', variacoes: ['Preta', 'Caramelo', 'Rosa'] },
  { id: 'p5', nome: 'Relógio Digital Pro', cat: 'Acessórios', sku: 'RL-PRO', custo: 60, preco: 159.9, precoPromo: 139.9, estoque: 12, estoqueMin: 4, precoVisivel: true, destaque: true, cor: '#a7f3d0', variacoes: [] },
  { id: 'p6', nome: 'Conjunto Fitness', cat: 'Moda', sku: 'CJ-FIT', custo: 45, preco: 0, estoque: 2, estoqueMin: 3, precoVisivel: false, cor: '#c7d2fe', variacoes: ['P', 'M', 'G', 'GG'] },
  { id: 'p7', nome: 'Caixa de Som Bluetooth', cat: 'Eletrônicos', sku: 'CX-BT', custo: 80, preco: 189.9, precoAtacado: 149.9, qtdAtacado: 5, estoque: 9, estoqueMin: 3, precoVisivel: true, cor: '#bae6fd', variacoes: [] },
  { id: 'p8', nome: 'Batom Matte (kit 4)', cat: 'Cosméticos', sku: 'BT-M4', custo: 22, preco: 59.9, precoAtacado: 44.9, qtdAtacado: 6, estoque: 31, estoqueMin: 6, precoVisivel: true, cor: '#fbcfe8', variacoes: [] },
];

// ── Clientes ──────────────────────────────────────────────
window.CLIENTS = [
  { id: 'c1', nome: 'Juliana Ferreira', zap: '(11) 98472-1130', inicial: 'JF', cor: '#22a06b', endereco: 'R. das Acácias, 120 — São Paulo, SP', nascimento: window.d(1992, 6, 12), obs: 'Cliente desde 2024. Sempre pontual.' },
  { id: 'c2', nome: 'Marcos Andrade', zap: '(11) 99631-2245', inicial: 'MA', cor: '#2a6fdb', endereco: 'Av. Brasil, 880 — Guarulhos, SP', nascimento: window.d(1988, 6, 25), obs: '' },
  { id: 'c3', nome: 'Patrícia Lopes', zap: '(21) 98123-7740', inicial: 'PL', cor: '#e8702a', endereco: '', nascimento: window.d(1995, 9, 3), obs: 'Prefere receber cobrança à tarde.' },
  { id: 'c4', nome: 'Rafael Souza', zap: '(31) 99880-1192', inicial: 'RS', cor: '#7c3aed', endereco: 'R. Minas, 45 — Belo Horizonte, MG', nascimento: window.d(1990, 6, 18), obs: '' },
  { id: 'c5', nome: 'Camila Nunes', zap: '(11) 97412-3308', inicial: 'CN', cor: '#db2777', endereco: '', nascimento: window.d(1998, 2, 14), obs: 'Comprou kit completo de skincare.' },
  { id: 'c6', nome: 'Diego Martins', zap: '(47) 99203-5561', inicial: 'DM', cor: '#0891b2', endereco: 'R. das Flores, 78 — Joinville, SC', nascimento: window.d(1985, 11, 30), obs: 'Renegociou parcela em maio.' },
];

// ── Vendas / Parcelas ─────────────────────────────────────
// Each venda: cliente, itens, total, modo (avista|parcelado), parcelas[], confirmacao
// confirmacao: { status: 'pendente'|'confirmada', em: Date|null }  (à vista nasce confirmada)
// parcela: pode ter cobradaEm: Date  (cobrança já disparada naquele dia)
window.SALES = [
  {
    id: 'v1024', clienteId: 'c1', data: window.d(2026, 4, 18), total: 269.7,
    itens: [{ pid: 'p1', q: 1, preco: 89.9 }, { pid: 'p8', q: 3, preco: 59.9 }],
    modo: 'parcelado',
    confirmacao: { status: 'confirmada', em: window.d(2026, 4, 18) },
    parcelas: [
      { id: 'pa1', n: 1, venc: window.d(2026, 5, 18), valor: 89.9, pago: true, pagoEm: window.d(2026, 5, 17) },
      { id: 'pa2', n: 2, venc: window.d(2026, 6, 8), valor: 89.9, pago: false },
      { id: 'pa3', n: 3, venc: window.d(2026, 6, 29), valor: 89.9, pago: false },
    ],
  },
  {
    id: 'v1025', clienteId: 'c2', data: window.d(2026, 5, 2), total: 219.9,
    itens: [{ pid: 'p3', q: 1, preco: 219.9 }],
    modo: 'parcelado',
    confirmacao: { status: 'confirmada', em: window.d(2026, 5, 2) },
    parcelas: [
      { id: 'pb1', n: 1, venc: window.d(2026, 5, 16), valor: 73.3, pago: true, pagoEm: window.d(2026, 5, 16) },
      { id: 'pb2', n: 2, venc: window.d(2026, 5, 30), valor: 73.3, pago: false },
      { id: 'pb3', n: 3, venc: window.d(2026, 6, 13), valor: 73.3, pago: false },
    ],
  },
  {
    id: 'v1026', clienteId: 'c3', data: window.d(2026, 5, 20), total: 159.9,
    itens: [{ pid: 'p5', q: 1, preco: 159.9 }],
    modo: 'parcelado',
    confirmacao: { status: 'confirmada', em: window.d(2026, 5, 20) },
    parcelas: [
      { id: 'pc1', n: 1, venc: window.d(2026, 5, 27), valor: 53.3, pago: false },
      { id: 'pc2', n: 2, venc: window.d(2026, 6, 3), valor: 53.3, pago: false },
      { id: 'pc3', n: 3, venc: window.d(2026, 6, 10), valor: 53.3, pago: false },
    ],
  },
  {
    id: 'v1027', clienteId: 'c5', data: window.d(2026, 5, 28), total: 129.9,
    itens: [{ pid: 'p2', q: 1, preco: 129.9 }],
    modo: 'avista',
    confirmacao: { status: 'confirmada', em: window.d(2026, 5, 28) },
    parcelas: [
      { id: 'pd1', n: 1, venc: window.d(2026, 5, 28), valor: 129.9, pago: true, pagoEm: window.d(2026, 5, 28) },
    ],
  },
  {
    id: 'v1028', clienteId: 'c4', data: window.d(2026, 6, 1), total: 379.8,
    itens: [{ pid: 'p7', q: 2, preco: 189.9 }],
    modo: 'parcelado',
    confirmacao: { status: 'confirmada', em: window.d(2026, 6, 1) },
    parcelas: [
      { id: 'pe1', n: 1, venc: window.d(2026, 6, 8), valor: 126.6, pago: false },
      { id: 'pe2', n: 2, venc: window.d(2026, 6, 22), valor: 126.6, pago: false },
      { id: 'pe3', n: 3, venc: window.d(2026, 7, 6), valor: 126.6, pago: false },
    ],
  },
  {
    id: 'v1029', clienteId: 'c6', data: window.d(2026, 4, 30), total: 159.9,
    itens: [{ pid: 'p5', q: 1, preco: 159.9 }],
    modo: 'parcelado',
    confirmacao: { status: 'confirmada', em: window.d(2026, 4, 30) },
    parcelas: [
      { id: 'pf1', n: 1, venc: window.d(2026, 5, 25), valor: 79.95, pago: false },
      { id: 'pf2', n: 2, venc: window.d(2026, 6, 25), valor: 79.95, pago: false },
    ],
  },
  // ★ Venda recém-criada para Juliana (c1) — AGUARDANDO CONFIRMAÇÃO no portal
  {
    id: 'v1030', clienteId: 'c1', data: window.d(2026, 6, 7), total: 189.8,
    itens: [{ pid: 'p2', q: 1, preco: 129.9 }, { pid: 'p8', q: 1, preco: 59.9 }],
    modo: 'parcelado',
    confirmacao: { status: 'pendente', em: null },
    parcelas: [
      { id: 'pg1', n: 1, venc: window.d(2026, 6, 21), valor: 94.9, pago: false },
      { id: 'pg2', n: 2, venc: window.d(2026, 7, 5), valor: 94.9, pago: false },
    ],
  },
];
// sequência para novos ids de venda criados no protótipo
window.__saleSeq = 1031;

// ── Pedidos (do portal do cliente OU criados pelo vendedor) ──
// origem: 'cliente' (pedido feito no app do cliente) | 'vendedor'
// status: 'novo' | 'orcamento' (aguardando preços) | 'aprovado' (virou venda)
window.ORDERS = [
  {
    id: '1234', clienteId: 'c5', data: window.d(2026, 6, 7), status: 'orcamento', origem: 'cliente',
    obs: 'Pode ser na cor rosa? Quero para presente.', entrega: 'entrega',
    itens: [{ pid: 'p4', q: 1 }, { pid: 'p8', q: 2 }],
  },
  {
    id: '1235', clienteId: 'c2', data: window.d(2026, 6, 6), status: 'novo', origem: 'cliente',
    obs: '', entrega: 'retirada',
    itens: [{ pid: 'p6', q: 1 }, { pid: 'p1', q: 1 }],
  },
  {
    id: '1236', clienteId: 'c1', data: window.d(2026, 6, 13), status: 'orcamento', origem: 'cliente',
    obs: 'Queria saber o valor da bolsa antes de fechar.', entrega: 'entrega',
    itens: [{ pid: 'p4', q: 1 }, { pid: 'p5', q: 1 }],
  },
];
window.__orderSeq = 1237;

window.getClient = (id) => window.CLIENTS.find((c) => c.id === id);
window.getProduct = (id) => window.PRODUCTS.find((p) => p.id === id);
// adiciona um cliente novo ao mock (cadastro na hora) e devolve o objeto criado
window.__clientSeq = 7;
window.addClient = ({ nome, zap, email, endereco, nascimento, obs }) => {
  const palette = ['#2a6fdb', '#e8702a', '#7c3aed', '#db2777', '#0891b2', '#0d7a50', '#b45309', '#22a06b'];
  const id = 'c' + (window.__clientSeq++);
  const parts = String(nome).trim().split(/\s+/);
  const inicial = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || String(nome).slice(0, 1).toUpperCase();
  const cor = palette[window.CLIENTS.length % palette.length];
  const cliente = { id, nome: String(nome).trim(), zap: zap || '', email: (email || '').trim(), inicial, cor, endereco: (endereco || '').trim(), nascimento: nascimento || null, obs: (obs || '').trim() };
  window.CLIENTS.push(cliente);
  window.logActivity && window.logActivity(`Cadastrou o cliente ${cliente.nome}`, 'cliente');
  return cliente;
};
// localizar o objeto-parcela REAL dentro de SALES (para mutação)
window.findParcela = (vendaId, parcelaId) => {
  const s = window.SALES.find((x) => x.id === vendaId);
  return s ? s.parcelas.find((p) => p.id === parcelaId) : null;
};

// flatten all parcelas with cliente + venda context
window.allParcelas = () => {
  const out = [];
  window.SALES.forEach((s) => {
    s.parcelas.forEach((p) => out.push({ ...p, vendaId: s.id, clienteId: s.clienteId }));
  });
  return out;
};

// progresso do crediário de uma venda: quantas pagas/faltam + qual a próxima parcela (1ª/última)
window.saleProgress = (s) => {
  const total = s.parcelas.length;
  const pagas = s.parcelas.filter((p) => p.pago).length;
  const faltam = total - pagas;
  const pagoValor = s.parcelas.filter((p) => p.pago).reduce((a, p) => a + p.valor, 0);
  const abertoValor = s.parcelas.filter((p) => !p.pago).reduce((a, p) => a + p.valor, 0);
  const prox = [...s.parcelas].sort((a, b) => a.venc - b.venc).find((p) => !p.pago) || null;
  let proxLabel = null;
  if (prox) {
    if (total === 1) proxLabel = 'Parcela única';
    else if (prox.n === 1) proxLabel = '1ª parcela';
    else if (prox.n === total) proxLabel = 'Última parcela';
    else proxLabel = `${prox.n}ª parcela`;
  }
  return { total, pagas, faltam, pagoValor, abertoValor, prox, proxLabel };
};

// cadastrar produto novo (foto opcional). preco guardado mesmo se oculto; flag controla exibição.
window.__prodSeq = 9;
window.addProduct = ({ nome, cat, sku, descricao, estoque, estoqueMin, custo, preco, precoPromo, precoAtacado, qtdAtacado, precoVisivel, foto, ativo, destaque, variacoes, codigoBarras, dimensoes }) => {
  const cores = ['#e9d5ff', '#fde68a', '#bfdbfe', '#fecaca', '#a7f3d0', '#c7d2fe', '#bae6fd', '#fbcfe8'];
  const id = 'p' + (window.__prodSeq++);
  const prod = {
    id, nome: String(nome).trim(),
    cat: (cat || 'Geral').trim(), sku: (sku || '').trim(), descricao: (descricao || '').trim(),
    estoque: Math.max(0, parseInt(estoque, 10) || 0),
    estoqueMin: Math.max(0, parseInt(estoqueMin, 10) || 0),
    custo: custo || 0, preco: preco || 0, precoPromo: precoPromo || 0,
    precoAtacado: precoAtacado || 0, qtdAtacado: Math.max(0, parseInt(qtdAtacado, 10) || 0),
    precoVisivel: precoVisivel !== false, ativo: ativo !== false, destaque: !!destaque,
    variacoes: Array.isArray(variacoes) ? variacoes : [],
    codigoBarras: (codigoBarras || '').trim(), dimensoes: dimensoes || null,
    foto: foto || null, cor: cores[window.PRODUCTS.length % cores.length],
  };
  window.PRODUCTS.push(prod);
  window.logActivity && window.logActivity(`Cadastrou o produto “${prod.nome}”`, 'produto');
  return prod;
};

// parcelas que precisam de cobrança hoje (vencendo hoje + atrasadas), ainda não cobradas hoje
window.parcelasDoDia = () =>
  window.allParcelas().filter((p) => {
    const st = window.parcelaStatus(p);
    return (st === 'hoje' || st === 'atrasado');
  });

// ── Equipe & permissões ───────────────────────────────────
// papéis: 'admin' (proprietário) e 'vendedor' (equipe, acesso restrito).
// O admin tem todas as capacidades. Cada vendedor tem seu PRÓPRIO conjunto de
// permissões (editável pelo proprietário) — pode liberar tudo ou só algumas.
window.ROLE_PERMS = {
  admin: {
    cadastrarCliente: true, cadastrarProduto: true, registrarVenda: true,
    ocorrencia: true, orcamento: true, pagamento: true, cobrar: true,
    excluir: true, reverter: true, equipe: true, config: true,
  },
  vendedor: {
    cadastrarCliente: true, cadastrarProduto: true, registrarVenda: true,
    ocorrencia: true, orcamento: true, pagamento: true, cobrar: true,
    excluir: false, reverter: false, equipe: false, config: false,
  },
};

// capacidades que o proprietário pode conceder/revogar por vendedor
window.GRANTABLE_PERMS = ['cadastrarCliente', 'cadastrarProduto', 'registrarVenda', 'orcamento', 'ocorrencia', 'pagamento', 'cobrar', 'excluir', 'reverter'];
// permissões padrão de um novo vendedor (operacionais liberadas; exclusão/reversão não)
window.defaultMemberPerms = () => ({
  cadastrarCliente: true, cadastrarProduto: true, registrarVenda: true,
  orcamento: true, ocorrencia: true, pagamento: true, cobrar: true,
  excluir: false, reverter: false,
});

// equipe cadastrada pelo proprietário (apenas os vendedores adicionais; o dono vem do SELLER)
window.__memberSeq = 1;
window.TEAM = [
  {
    id: 'm1', nome: 'Carla Souza', email: 'carla@equipe.com', zap: '(11) 96622-3110',
    role: 'vendedor', inicial: 'CS', cor: '#2a6fdb', ativo: true,
    perms: { cadastrarCliente: true, cadastrarProduto: true, registrarVenda: true, orcamento: true, ocorrencia: true, pagamento: true, cobrar: true, excluir: false, reverter: false },
    desde: window.d(2026, 4, 2),
    log: [
      { acao: 'Registrou a venda #1028 — Rafael Souza · R$ 379,80', cat: 'venda', em: window.d(2026, 6, 1) },
      { acao: 'Cadastrou o cliente Diego Martins', cat: 'cliente', em: window.d(2026, 5, 30) },
      { acao: 'Registrou pagamento da parcela 1 — Marcos Andrade', cat: 'pagamento', em: window.d(2026, 5, 30) },
      { acao: 'Enviou cobrança para Patrícia Lopes', cat: 'cobranca', em: window.d(2026, 5, 27) },
      { acao: 'Respondeu o orçamento #1235 — Marcos Andrade', cat: 'orcamento', em: window.d(2026, 5, 26) },
      { acao: 'Cadastrou o produto "Caixa de Som Bluetooth"', cat: 'produto', em: window.d(2026, 5, 20) },
    ],
  },
];

// usuário logado atualmente no painel — começa como proprietário (admin)
window.CURRENT_USER = { role: 'admin', memberId: null };

// membro logado no momento (ou null se admin)
window.currentMember = () => (window.CURRENT_USER && window.CURRENT_USER.memberId)
  ? window.TEAM.find((m) => m.id === window.CURRENT_USER.memberId) : null;

// permissão da sessão atual — admin tem tudo; vendedor usa as permissões dele
window.can = (key) => {
  if (window.isAdmin()) return !!window.ROLE_PERMS.admin[key];
  const m = window.currentMember();
  const perms = (m && m.perms) || window.ROLE_PERMS.vendedor;
  return !!perms[key];
};
window.isAdmin = () => (window.CURRENT_USER && window.CURRENT_USER.role) === 'admin';

// registra uma ação no histórico do vendedor logado (admin não gera histórico de equipe)
window.logActivity = (acao, cat) => {
  const m = window.currentMember();
  if (!m) return;
  if (!m.log) m.log = [];
  m.log.unshift({ acao, cat: cat || 'geral', em: new Date() });
};

window.addMember = ({ nome, email, zap, perms }) => {
  const palette = ['#2a6fdb', '#e8702a', '#7c3aed', '#db2777', '#0891b2', '#b45309'];
  const id = 'm' + (++window.__memberSeq);
  const parts = String(nome).trim().split(/\s+/);
  const inicial = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || String(nome).slice(0, 1).toUpperCase();
  const membro = {
    id, nome: String(nome).trim(), email: (email || '').trim(), zap: (zap || '').trim(),
    role: 'vendedor', inicial, cor: palette[window.TEAM.length % palette.length], ativo: true,
    perms: perms || window.defaultMemberPerms(), desde: window.TODAY, log: [],
  };
  window.TEAM.push(membro);
  return membro;
};
window.removeMember = (id) => { window.TEAM = window.TEAM.filter((m) => m.id !== id); };

// ── Exclusões (somente admin via can('excluir')) ──────────
window.deleteProduct = (id) => { window.PRODUCTS = window.PRODUCTS.filter((p) => p.id !== id); };
window.deleteClient = (id) => {
  window.CLIENTS = window.CLIENTS.filter((c) => c.id !== id);
  window.SALES = window.SALES.filter((s) => s.clienteId !== id);   // remove vendas órfãs
  window.ORDERS = window.ORDERS.filter((o) => o.clienteId !== id); // e pedidos órfãos
};

// ── Cupons de desconto ────────────────────────────────────
// tipo: 'percentual' (valor = %) | 'fixo' (valor = R$)
window.__cupomSeq = 4;
window.COUPONS = [
  { id: 'cup1', codigo: 'BEMVINDO10', tipo: 'percentual', valor: 10, ativo: true, usos: 8, descricao: '10% para novos clientes' },
  { id: 'cup2', codigo: 'FRETE15', tipo: 'fixo', valor: 15, ativo: true, usos: 3, descricao: 'R$ 15 de desconto' },
  { id: 'cup3', codigo: 'JUNHO20', tipo: 'percentual', valor: 20, ativo: false, usos: 22, descricao: 'Promo de junho (encerrada)' },
];
window.addCoupon = ({ codigo, tipo, valor, descricao }) => {
  const id = 'cup' + (window.__cupomSeq++);
  const c = { id, codigo: String(codigo).trim().toUpperCase(), tipo, valor: valor || 0, ativo: true, usos: 0, descricao: (descricao || '').trim() };
  window.COUPONS.push(c);
  return c;
};
window.findCoupon = (codigo) => window.COUPONS.find((c) => c.ativo && c.codigo === String(codigo).trim().toUpperCase());
window.cupomDesconto = (cup, subtotal) => {
  if (!cup) return 0;
  const d = cup.tipo === 'percentual' ? subtotal * (cup.valor / 100) : cup.valor;
  return Math.min(d, subtotal);
};

// ── Notificações (feed do vendedor) ───────────────────────
// cat: venda | orcamento | pedido | pagamento | estoque | cliente | aniversario
window.__notifSeq = 1;
window.NOTIFICATIONS = [
  { id: 'n1', cat: 'pedido', titulo: 'Novo pedido pelo app', texto: 'Marcos Andrade fez o pedido #1235 (retirada)', em: window.d(2026, 6, 6), lida: false },
  { id: 'n2', cat: 'orcamento', titulo: 'Pedido de orçamento', texto: 'Camila Nunes pediu orçamento do #1234', em: window.d(2026, 6, 7), lida: false },
  { id: 'n3', cat: 'venda', titulo: 'Venda registrada', texto: 'Venda #1030 — Juliana Ferreira · R$ 189,80 (2x)', em: window.d(2026, 6, 7), lida: false },
  { id: 'n4', cat: 'pagamento', titulo: 'Pagamento recebido', texto: 'Parcela 1 de Marcos Andrade — R$ 73,30', em: window.d(2026, 5, 30), lida: true },
  { id: 'n5', cat: 'estoque', titulo: 'Estoque baixo', texto: 'Conjunto Fitness está com apenas 2 unidades', em: window.d(2026, 5, 29), lida: true },
];
window.addNotif = (cat, titulo, texto) => {
  window.NOTIFICATIONS.unshift({ id: 'n' + (++window.__notifSeq + 100), cat, titulo, texto, em: new Date(), lida: false });
};
window.unreadNotifs = () => window.NOTIFICATIONS.filter((n) => !n.lida).length;
window.markNotifsRead = () => { window.NOTIFICATIONS.forEach((n) => { n.lida = true; }); };

// aniversariantes do mês de referência (default: mês de hoje)
window.aniversariantesDoMes = (mes) => {
  const m = mes == null ? window.TODAY.getMonth() : mes;
  return window.CLIENTS.filter((c) => c.nascimento && c.nascimento.getMonth() === m)
    .sort((a, b) => a.nascimento.getDate() - b.nascimento.getDate());
};

// criar pedido (usado pelo portal do cliente)
window.addOrder = ({ clienteId, itens, obs, entrega, origem }) => {
  const id = String(window.__orderSeq++);
  const ped = { id, clienteId, data: window.TODAY, status: 'novo', origem: origem || 'cliente', obs: obs || '', entrega: entrega || 'retirada', itens };
  window.ORDERS.unshift(ped);
  return ped;
};
// cliente edita um pedido/orçamento que ainda está pendente — marca como alterado
window.editOrder = (id, patch) => {
  const o = window.ORDERS.find((x) => x.id === id);
  if (!o) return;
  Object.assign(o, patch);
  o.editadoEm = window.TODAY;
  window.addNotif && window.addNotif('orcamento', 'Orçamento alterado', `${window.getClient(o.clienteId).nome} alterou o orçamento #${o.id}`);
};
// cliente exclui o pedido — vira "cancelado pelo cliente" (some da fila, mas registra p/ o vendedor)
window.__cancelledOrders = window.__cancelledOrders || [];
window.cancelOrderByClient = (id) => {
  const o = window.ORDERS.find((x) => x.id === id);
  if (!o) return;
  o.status = 'cancelado'; o.canceladoEm = window.TODAY; o.canceladoPor = 'cliente';
  window.ORDERS = window.ORDERS.filter((x) => x.id !== id);
  window.__cancelledOrders.unshift(o);
  window.addNotif && window.addNotif('orcamento', 'Orçamento cancelado', `${window.getClient(o.clienteId).nome} cancelou o orçamento #${o.id}. Você pode enviar uma promoção depois.`);
};
window.cancelledOrders = () => window.__cancelledOrders;
