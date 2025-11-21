
export type Module = 
  | 'dashboard'
  | 'orcamento'
  | 'planejamento'
  | 'composicao'
  | 'diario'
  | 'medicao'
  | 'curva-abc'
  | 'compras'
  | 'financeiro'
  | 'clima'
  | 'settings';

export interface NavItemType {
  id: Module;
  icon: string;
  label: string;
}

export interface Etapa {
  nome: string;
  descricao: string;
  previsto: number;
  realizado: number;
  porcentagem: number;
}

export interface ServicoExecutado {
  id: number;
  servico: string;
  quantidadeExecutada: number;
  quantidadePrevista: number;
  unidade: string;
  equipe: number;
}

export interface DiarioRegistro {
  id: number;
  data: string;
  responsavel: string;
  etapa: string;
  servicos: ServicoExecutado[];
  observacoes: string;
  clima: string;
  status: string;
  fotos?: string[];
  horario_inicial?: string;
  horario_final?: string;
  recursos?: string[];
}

export interface OrcamentoItem {
  id: number;
  nivel: string;
  pai: number | null;
  fonte: string;
  codigo: string;
  discriminacao: string;
  unidade: string;
  quantidade: number;
  mat_unit: number;
  mo_unit: number;
  expandido: boolean;
}

export interface PlanejamentoItem {
    id: number;
    orcamentoId: number;
    nivel: string;
    pai: number | null;
    discriminacao: string;
    unidade: string;
    quantidade: number;
    valorTotal: number;
    
    // Planned
    duracao: number; // em dias
    dataInicio: string; // YYYY-MM-DD
    dataFim: string; // YYYY-MM-DD
    
    // Real/Execution
    quantidadeExecutada: number;
    responsavel: string;
    percentualConclusao: number;
    duracaoReal: number;
    inicioReal: string;
    fimReal: string;

    // UI State
    expandido: boolean;
    isParent: boolean;
}

export interface MedicaoItem extends OrcamentoItem {
  quantMedida: number;
  medicaoAcumAnterior: number;
}

export interface Cotacao {
  fornecedor: string;
  vendedor?: string;
  preco: number;
  prazo: number;
}

export interface Compra {
  id: string;
  data_solicitacao: string;
  responsavel: string;
  item: string;
  quantidade: number;
  unidade: string;
  data_necessaria: string;
  etapa: string;
  justificativa?: string;
  status: 'Solicitado' | 'Cotado' | 'Aprovado' | 'Recebido';
  fornecedor: string;
  cotacoes: Cotacao[];
}

export interface Fornecedor {
  nome: string;
  vendedor: string;
  cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
}

export interface Profissional {
    id: number;
    cargo: string;
    nome: string;
    email?: string;
    telefone?: string;
}
