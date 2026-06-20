export type VendorNotificationCategory =
  | "venda"
  | "orcamento"
  | "pedido"
  | "pagamento"
  | "estoque"
  | "cliente"
  | "aniversario"
  | "encomenda"
  | "geral";

export type VendorNotification = {
  id: string;
  cat: VendorNotificationCategory;
  titulo: string;
  texto: string;
  em: string;
  lida: boolean;
};

export type DemoCoupon = {
  id: string;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: number;
  descricao?: string;
  usos: number;
  ativo: boolean;
};

export type DemoTeamMember = {
  id: string;
  nome: string;
  email: string;
  inicial: string;
  cor: string;
  permissoesLiberadas: number;
  totalPermissoes: number;
  acoes: number;
};

export const NOTIFICATION_META: Record<
  VendorNotificationCategory,
  { icon: string; cor: string; bg: string }
> = {
  venda: { icon: "cards", cor: "#6d28d9", bg: "#ede9fe" },
  orcamento: { icon: "receipt", cor: "#1e478f", bg: "#dbeafe" },
  pedido: { icon: "box", cor: "var(--vendor-green-700)", bg: "var(--vendor-green-50)" },
  pagamento: { icon: "wallet", cor: "var(--vendor-green-700)", bg: "var(--vendor-green-50)" },
  estoque: { icon: "alert", cor: "#b45309", bg: "#fef3c7" },
  cliente: { icon: "users", cor: "#1e478f", bg: "#dbeafe" },
  aniversario: { icon: "gift", cor: "#db2777", bg: "#fce7f3" },
  encomenda: { icon: "truck", cor: "#0891b2", bg: "#cffafe" },
  geral: { icon: "bell", cor: "var(--vendor-ink-3)", bg: "var(--vendor-chip)" }
};

export const DEMO_NOTIFICATIONS: VendorNotification[] = [
  {
    id: "n1",
    cat: "pedido",
    titulo: "Novo pedido no catálogo",
    texto: "Ana Beatriz fez um pedido de 3 itens. Confira e aprove.",
    em: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    lida: false
  },
  {
    id: "n2",
    cat: "pagamento",
    titulo: "Parcela recebida",
    texto: "Carlos Souza pagou a 2ª parcela da venda #0042 via PIX.",
    em: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    lida: false
  },
  {
    id: "n3",
    cat: "estoque",
    titulo: "Estoque baixo",
    texto: "Bolsa transversal está com apenas 1 unidade disponível.",
    em: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    lida: true
  },
  {
    id: "n4",
    cat: "aniversario",
    titulo: "Aniversariante hoje",
    texto: "Juliana Costa faz aniversário hoje. Envie uma promoção!",
    em: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    lida: false
  }
];

export const DEMO_COUPONS_INITIAL: DemoCoupon[] = [
  {
    id: "c1",
    codigo: "BEMVINDO10",
    tipo: "percentual",
    valor: 10,
    descricao: "Desconto de boas-vindas",
    usos: 12,
    ativo: true
  },
  {
    id: "c2",
    codigo: "FRETE15",
    tipo: "fixo",
    valor: 15,
    descricao: "Desconto fixo em compras",
    usos: 4,
    ativo: true
  },
  {
    id: "c3",
    codigo: "VERAO20",
    tipo: "percentual",
    valor: 20,
    descricao: "Promo de verão",
    usos: 0,
    ativo: false
  }
];

export const DEMO_TEAM_MEMBERS: DemoTeamMember[] = [
  {
    id: "m1",
    nome: "Carla Souza",
    email: "carla@email.com",
    inicial: "CS",
    cor: "#2a6fdb",
    permissoesLiberadas: 7,
    totalPermissoes: 10,
    acoes: 24
  },
  {
    id: "m2",
    nome: "Pedro Lima",
    email: "pedro@email.com",
    inicial: "PL",
    cor: "#e8702a",
    permissoesLiberadas: 5,
    totalPermissoes: 10,
    acoes: 11
  }
];

export const GRANTABLE_PERMISSIONS_COUNT = 10;
