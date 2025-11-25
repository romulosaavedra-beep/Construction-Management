
// FIX: Added OrcamentoItem to the import from ../types.
import type { Etapa, DiarioRegistro, Compra, Fornecedor, Profissional, OrcamentoItem } from '../types';

export const obraInfo = {
    nome: "Edifício Comercial Downtown",
    local: "São Paulo, SP",
    cliente: "XYZ Incorporadora",
    responsavel: "Eng. Carlos Silva",
    dataInicio: "15/01/2024",
    dataFim: "31/12/2025",
};

export const kpiData = {
    progressoFisico: {
        value: 45,
        meta: 48,
        status: "No prazo",
    },
    orcamento: {
        executado: 2100000,
        total: 5000000,
    },
    prazo: {
        status: "No prazo",
        folga: "+2 dias de folga",
    },
    margem: {
        value: 25,
        status: "Dentro do esperado",
    }
};

export const etapasData: Etapa[] = [
    { nome: "Fundação", descricao: "Escavação, estrutura, concretagem", previsto: 450000, realizado: 450000, porcentagem: 100 },
    { nome: "Estrutura", descricao: "Pilares, vigas, lajes", previsto: 1200000, realizado: 960000, porcentagem: 80 },
    { nome: "Alvenaria", descricao: "Vedação, blocos, tijolos", previsto: 800000, realizado: 340000, porcentagem: 42 },
    { nome: "Revestimentos", descricao: "Chapisco, reboco, emboço", previsto: 450000, realizado: 200000, porcentagem: 44 },
    { nome: "Acabamento", descricao: "Pintura, pisos, esquadrias", previsto: 600000, realizado: 150000, porcentagem: 25 },
    { nome: "Instalações", descricao: "Elétrica, hidráulica, SPDA", previsto: 500000, realizado: 0, porcentagem: 0 }
];

export const diarioRegistrosData: DiarioRegistro[] = [
    {
        id: 1,
        data: "2025-11-10",
        etapa: "2.1 - Formas",
        servicos: [
            { id: 1, servico: "Forma de madeira para pilar", quantidadeExecutada: 50, quantidadePrevista: 450, unidade: 'm²', equipe: 10 },
            { id: 2, servico: "Forma de madeira para viga", quantidadeExecutada: 80, quantidadePrevista: 600, unidade: 'm²', equipe: 10 },
        ],
        observacoes: "Execução conforme cronograma, equipe completa.",
        responsavel: "Eng. Carlos Silva",
        clima: "Ensolarado",
        recursos: ["Serra Circular"],
        status: "Finalizado"
    },
    {
        id: 2,
        data: "2025-11-09",
        etapa: "1.1 - Serviços Preliminares",
        servicos: [
            { id: 1, servico: "Locação da obra", quantidadeExecutada: 1200, quantidadePrevista: 1200, unidade: 'm²', equipe: 4 }
        ],
        observacoes: "Finalização da locação da obra. Tudo ok para iniciar a escavação.",
        responsavel: "Mestre Paulo",
        clima: "Nublado",
        recursos: [],
        status: "Finalizado"
    },
    {
        id: 3,
        data: "2025-11-08",
        etapa: "1.1 - Serviços Preliminares",
        servicos: [
            { id: 1, servico: "Limpeza do terreno", quantidadeExecutada: 1500, quantidadePrevista: 1500, unidade: 'm²', equipe: 5 }
        ],
        observacoes: "Terreno completamente limpo.",
        responsavel: "Mestre Paulo",
        clima: "Ensolarado",
        recursos: ["Escavadeira"],
        status: "Finalizado"
    }
];

export const profissionaisData: Profissional[] = [
    { id: 1, cargo: 'Engenheiro Civil', nome: 'Carlos Silva', email: 'carlos.silva@exemplo.com', telefone: '(11) 99999-1234', atividades: 'Responsável técnico pela execução da obra, gestão de cronograma, controle de qualidade e coordenação das equipes de campo.' },
    { id: 2, cargo: 'Engenheiro Civil', nome: 'Marina Costa', email: 'marina.costa@exemplo.com', telefone: '(11) 98888-5678', atividades: 'Focada em orçamentação, levantamento de quantitativos, cotações técnicas e controle de custos (Orçado x Realizado).' },
    { id: 3, cargo: 'Mestre de Obras', nome: 'Paulo Souza', email: 'paulo.obras@exemplo.com', telefone: '(11) 97777-1111', atividades: 'Supervisão direta dos pedreiros e serventes, controle de entrada e saída de materiais e garantia da segurança no canteiro.' },
    { id: 4, cargo: 'Fiscal de Obra', nome: 'João Santos', email: 'joao.santos@exemplo.com', telefone: '(11) 96666-2222', atividades: 'Vistoria diária dos serviços executados, medição de empreiteiros e elaboração de relatórios fotográficos de avanço.' }
];

export const unidadesData: string[] = ['m²', 'm³', 'm', 'un', 'kg', 'ton', 'sc', 'lata', 'balde', 'L'];
export const recursosData: string[] = ['Escavadeira', 'Betoneira', 'Guindaste', 'Vibrador', 'Serra Circular'];

export const comprasData: Compra[] = [
    { id: "SOL-20251111-001", data_solicitacao: "2025-11-11", responsavel: "Eng. Carlos Silva", item: "Cimento CP-V 50kg", quantidade: 200, unidade: "sc", data_necessaria: "2025-11-20", etapa: "Fundação", status: "Solicitado", fornecedor: "-", cotacoes: [] },
    { id: "SOL-20251110-001", data_solicitacao: "2025-11-10", responsavel: "Mestre Paulo", item: "Tijolos Cerâmicos 6 furos", quantidade: 50000, unidade: "un", data_necessaria: "2025-11-15", etapa: "Alvenaria", status: "Cotado", fornecedor: "Brasital", cotacoes: [{ fornecedor: "Brasital", preco: 0.70, prazo: 3 }] },
    { id: "SOL-20251109-001", data_solicitacao: "2025-11-09", responsavel: "Eng. Carlos Silva", item: "Concreto Usinado 30MPa", quantidade: 850, unidade: "m³", data_necessaria: "2025-11-14", etapa: "Estrutura", status: "Aprovado", fornecedor: "Concremat", cotacoes: [{ fornecedor: "Concremat", preco: 450.00, prazo: 2 }] },
    { id: "SOL-20251108-001", data_solicitacao: "2025-11-08", responsavel: "Eng. Marina", item: "Aço CA-50", quantidade: 80, unidade: "ton", data_necessaria: "2025-11-12", etapa: "Estrutura", status: "Recebido", fornecedor: "Gerdau", cotacoes: [{ fornecedor: "Gerdau", preco: 3500.00, prazo: 2 }] }
];

export const fornecedoresData: Fornecedor[] = [
    { nome: 'Lafarge', vendedor: 'Roberto Silva', cnpj: '12.345.678/0001-00', telefone: '(11) 99999-1111', email: 'vendas@lafarge.com', cidade: 'São Paulo', estado: 'SP' },
    { nome: 'Votorantim', vendedor: 'Marcela Costa', cnpj: '98.765.432/0001-00', telefone: '(11) 88888-2222', email: 'vendas@votorantim.com', cidade: 'São Paulo', estado: 'SP' },
    { nome: 'Brasital', vendedor: 'Fernando Oliveira', cnpj: '44.555.666/0001-00', telefone: '(11) 66666-4444', email: 'vendas@brasital.com', cidade: 'São Paulo', estado: 'SP' },
    { nome: 'Concremat', vendedor: 'Ana Paula', cnpj: '77.888.999/0001-00', telefone: '(11) 55555-5555', email: 'vendas@concremat.com', cidade: 'São Paulo', estado: 'SP' }
];

export const clima15DiasData = [
    { dia: 'Seg 11/Nov', max: 28, min: 22, condicao: 'Ensolarado', icone: '☀️', chuva: 5 },
    { dia: 'Ter 12/Nov', max: 29, min: 20, condicao: 'Parcialmente nublado', icone: '⛅', chuva: 10 },
    { dia: 'Qua 13/Nov', max: 26, min: 18, condicao: 'Chuvoso', icone: '🌧️', chuva: 80 },
    { dia: 'Qui 14/Nov', max: 25, min: 17, condicao: 'Chuvoso', icone: '🌧️', chuva: 75 },
    { dia: 'Sex 15/Nov', max: 27, min: 19, condicao: 'Parcialmente nublado', icone: '⛅', chuva: 40 },
    { dia: 'Sáb 16/Nov', max: 28, min: 20, condicao: 'Ensolarado', icone: '☀️', chuva: 10 },
    { dia: 'Dom 17/Nov', max: 30, min: 21, condicao: 'Ensolarado', icone: '☀️', chuva: 5 },
];

export const climaIntraDiarioData = [
    { hora: '06:00', temp: 18, condicao: 'Chuvoso', icone: '🌧️', chuva: 90 },
    { hora: '09:00', temp: 24, condicao: 'Nublado', icone: '⛅', chuva: 70 },
    { hora: '12:00', temp: 28, condicao: 'Ensolarado', icone: '☀️', chuva: 10 },
    { hora: '15:00', temp: 26, condicao: 'Nublado', icone: '⛅', chuva: 30 },
    { hora: '18:00', temp: 22, condicao: 'Nublado', icone: '⛅', chuva: 50 },
    { hora: '21:00', temp: 20, condicao: 'Parcialmente nublado', icone: '⛅', chuva: 40 }
];

export const initialOrcamentoData: OrcamentoItem[] = [
    { id: 1, nivel: '1', pai: null, discriminacao: 'FUNDAÇÃO', fonte: 'Obra', codigo: 'OB-01', unidade: '', quantidade: 0, mat_unit: 0, mo_unit: 0, expandido: true },
    { id: 2, nivel: '1.1', pai: 1, discriminacao: 'Serviços Preliminares', fonte: '', codigo: '', unidade: '', quantidade: 0, mat_unit: 0, mo_unit: 0, expandido: true },
    { id: 3, nivel: '1.1.1', pai: 2, discriminacao: 'Limpeza do terreno', fonte: 'SINAPI', codigo: '73983/001', unidade: 'm²', quantidade: 1500, mat_unit: 2.50, mo_unit: 5.00, expandido: false },
    { id: 4, nivel: '1.1.2', pai: 2, discriminacao: 'Locação da obra', fonte: 'SINAPI', codigo: '74133/001', unidade: 'm²', quantidade: 1200, mat_unit: 8.75, mo_unit: 12.30, expandido: false },
    { id: 5, nivel: '2', pai: null, discriminacao: 'ESTRUTURA', fonte: 'Obra', codigo: 'OB-02', unidade: '', quantidade: 0, mat_unit: 0, mo_unit: 0, expandido: true },
    { id: 6, nivel: '2.1', pai: 5, discriminacao: 'Formas', fonte: '', codigo: '', unidade: '', quantidade: 0, mat_unit: 0, mo_unit: 0, expandido: true },
    { id: 7, nivel: '2.1.1', pai: 6, discriminacao: 'Forma de madeira para pilar', fonte: 'SINAPI', codigo: '73950/001', unidade: 'm²', quantidade: 450, mat_unit: 45.80, mo_unit: 28.50, expandido: false },
    { id: 8, nivel: '2.1.2', pai: 6, discriminacao: 'Forma de madeira para viga', fonte: 'SINAPI', codigo: '73950/002', unidade: 'm²', quantidade: 600, mat_unit: 42.10, mo_unit: 25.50, expandido: false },
];

export const DEFAULT_UNITS_DATA = [
    // Aceleração e Vibração
    { category: 'Aceleração e Vibração', name: 'Radiano por segundo quadrado', symbol: 'rad/s²' },
    { category: 'Aceleração e Vibração', name: 'Metro por segundo ao quadrado', symbol: 'm/s²' },
    { category: 'Aceleração e Vibração', name: 'Gravidade padrão', symbol: 'g' },
    // Acústica
    { category: 'Acústica', name: 'Decibel', symbol: 'dB' },
    { category: 'Acústica', name: 'Decibel A', symbol: 'dB(A)' },
    // Administração e Serviços
    { category: 'Administração e Serviços', name: 'Unidade', symbol: 'un' },
    { category: 'Administração e Serviços', name: 'Global', symbol: 'glb' },
    { category: 'Administração e Serviços', name: 'Verba', symbol: 'vb' },
    { category: 'Administração e Serviços', name: 'Folha', symbol: 'fl' },
    { category: 'Administração e Serviços', name: 'Refeição', symbol: 'ref' },
    { category: 'Administração e Serviços', name: 'Diária', symbol: 'dia' },
    { category: 'Administração e Serviços', name: 'Homem-hora', symbol: 'Hh' },
    { category: 'Administração e Serviços', name: 'Homem-mês', symbol: 'Hm' },
    // Agrimensura e Geografia
    { category: 'Agrimensura e Geografia', name: 'Metro', symbol: 'm' },
    { category: 'Agrimensura e Geografia', name: 'Alqueire (Goiano/Mineiro)', symbol: 'alq' },
    { category: 'Agrimensura e Geografia', name: 'Hectare', symbol: 'ha' },
    { category: 'Agrimensura e Geografia', name: 'Are', symbol: 'a' },
    { category: 'Agrimensura e Geografia', name: 'Grau, Minuto, Segundo', symbol: "° ' \"" },
    // Agronomia e Paisagismo
    { category: 'Agronomia e Paisagismo', name: 'Mudas', symbol: 'md' },
    { category: 'Agronomia e Paisagismo', name: 'Plantas', symbol: 'pl' },
    { category: 'Agronomia e Paisagismo', name: 'Arroba', symbol: '@' },
    // Logística e Notas Fiscais
    { category: 'Logística e Notas Fiscais', name: 'Cento', symbol: 'cto' },
    { category: 'Logística e Notas Fiscais', name: 'Milheiro', symbol: 'mil' },
    { category: 'Logística e Notas Fiscais', name: 'Dúzia', symbol: 'dz' },
    { category: 'Logística e Notas Fiscais', name: 'Par', symbol: 'par' },
    { category: 'Logística e Notas Fiscais', name: 'Bandeja', symbol: 'bdj' },
    { category: 'Logística e Notas Fiscais', name: 'Lata', symbol: 'lt' },
    { category: 'Logística e Notas Fiscais', name: 'Big Bag', symbol: 'bag' },
    { category: 'Logística e Notas Fiscais', name: 'Palete', symbol: 'pal' },
    { category: 'Logística e Notas Fiscais', name: 'Kit', symbol: 'kit' },
    { category: 'Logística e Notas Fiscais', name: 'Jogo', symbol: 'jg' },
    { category: 'Logística e Notas Fiscais', name: 'Caixa', symbol: 'cx' },
    { category: 'Logística e Notas Fiscais', name: 'Pacote', symbol: 'pct' },
    { category: 'Logística e Notas Fiscais', name: 'Saco', symbol: 'sc' },
    { category: 'Logística e Notas Fiscais', name: 'Tambor (200L)', symbol: 'tb' },
    { category: 'Logística e Notas Fiscais', name: 'Frasco', symbol: 'fr' },
    { category: 'Logística e Notas Fiscais', name: 'Bisnaga', symbol: 'bisn' },
    { category: 'Logística e Notas Fiscais', name: 'Bombona', symbol: 'bom' },
    { category: 'Logística e Notas Fiscais', name: 'Ampola', symbol: 'amp' },
    { category: 'Logística e Notas Fiscais', name: 'Fardo', symbol: 'fd' },
    { category: 'Logística e Notas Fiscais', name: 'Garrafa', symbol: 'gf' },
    { category: 'Logística e Notas Fiscais', name: 'Nota Fiscal', symbol: 'NF' },
    { category: 'Logística e Notas Fiscais', name: 'Nota Fiscal Eletrônica', symbol: 'NFe' },
    { category: 'Logística e Notas Fiscais', name: 'Container', symbol: 'cont' },
    { category: 'Logística e Notas Fiscais', name: 'Viagem', symbol: 'vg' },
    // Comprimento e Distância
    { category: 'Comprimento e Distância', name: 'Ano-luz', symbol: 'ly' },
    { category: 'Comprimento e Distância', name: 'Angstrom', symbol: 'Å' },
    { category: 'Comprimento e Distância', name: 'Metro', symbol: 'm' },
    { category: 'Comprimento e Distância', name: 'Andar', symbol: 'and' },
    { category: 'Comprimento e Distância', name: 'Centímetro', symbol: 'cm' },
    { category: 'Comprimento e Distância', name: 'Jarda', symbol: 'yd' },
    { category: 'Comprimento e Distância', name: 'Milha', symbol: 'mi' },
    { category: 'Comprimento e Distância', name: 'Pé', symbol: 'ft' },
    { category: 'Comprimento e Distância', name: 'Polegada', symbol: 'in' },
    { category: 'Comprimento e Distância', name: 'Milímetro', symbol: 'mm' },
    { category: 'Comprimento e Distância', name: 'Mícron (Micrômetro)', symbol: 'µm' },
    { category: 'Comprimento e Distância', name: 'Milha Náutica', symbol: 'NM' },
    { category: 'Comprimento e Distância', name: 'Quilômetro', symbol: 'km' },
    // Eletricidade e Magnetismo
    { category: 'Eletricidade e Magnetismo', name: 'Volt por metro', symbol: 'V/m' },
    { category: 'Eletricidade e Magnetismo', name: 'Ampere por metro', symbol: 'A/m' },
    { category: 'Eletricidade e Magnetismo', name: 'Ampere-hora', symbol: 'Ah' },
    { category: 'Eletricidade e Magnetismo', name: 'Farad', symbol: 'F' },
    { category: 'Eletricidade e Magnetismo', name: 'Microfarad', symbol: 'µF' },
    { category: 'Eletricidade e Magnetismo', name: 'Coulomb', symbol: 'C' },
    { category: 'Eletricidade e Magnetismo', name: 'Siemens', symbol: 'S' },
    { category: 'Eletricidade e Magnetismo', name: 'Microsiemens por cm', symbol: 'µS/cm' },
    { category: 'Eletricidade e Magnetismo', name: 'Ampere', symbol: 'A' },
    { category: 'Eletricidade e Magnetismo', name: 'Miliampere', symbol: 'mA' },
    { category: 'Eletricidade e Magnetismo', name: 'Tesla', symbol: 'T' },
    { category: 'Eletricidade e Magnetismo', name: 'Weber', symbol: 'Wb' },
    { category: 'Eletricidade e Magnetismo', name: 'Hertz', symbol: 'Hz' },
    { category: 'Eletricidade e Magnetismo', name: 'Henry', symbol: 'H' },
    { category: 'Eletricidade e Magnetismo', name: 'Volt-Ampere', symbol: 'VA' },
    { category: 'Eletricidade e Magnetismo', name: 'Mega-Volt-Ampere', symbol: 'MVA' },
    { category: 'Eletricidade e Magnetismo', name: 'Quilovolt-Ampere', symbol: 'kVA' },
    { category: 'Eletricidade e Magnetismo', name: 'Watt', symbol: 'W' },
    { category: 'Eletricidade e Magnetismo', name: 'Quilowatt', symbol: 'kW' },
    { category: 'Eletricidade e Magnetismo', name: 'Megawatt', symbol: 'MW' },
    { category: 'Eletricidade e Magnetismo', name: 'Volt-Ampere reativo', symbol: 'var' },
    { category: 'Eletricidade e Magnetismo', name: 'Ohm', symbol: 'Ω' },
    { category: 'Eletricidade e Magnetismo', name: 'Volt', symbol: 'V' },
    { category: 'Eletricidade e Magnetismo', name: 'Quilovolt', symbol: 'kV' },
    { category: 'Eletricidade e Magnetismo', name: 'Milivolt', symbol: 'mV' },
    // Energia, Calor e Trabalho
    { category: 'Energia, Calor e Trabalho', name: 'Joule por Kelvin', symbol: 'J/K' },
    { category: 'Energia, Calor e Trabalho', name: 'Quilocaloria', symbol: 'kcal' },
    { category: 'Energia, Calor e Trabalho', name: 'Tonelada Equiv. Petróleo', symbol: 'tep' },
    { category: 'Energia, Calor e Trabalho', name: 'Quilowatt-hora', symbol: 'kWh' },
    { category: 'Energia, Calor e Trabalho', name: 'British Thermal Unit', symbol: 'BTU' },
    { category: 'Energia, Calor e Trabalho', name: 'Barril de Óleo Equiv.', symbol: 'boe' },
    { category: 'Energia, Calor e Trabalho', name: 'Joule', symbol: 'J' },
    { category: 'Energia, Calor e Trabalho', name: 'Caloria', symbol: 'cal' },
    { category: 'Energia, Calor e Trabalho', name: 'Quilocaloria por hora', symbol: 'kcal/h' },
    { category: 'Energia, Calor e Trabalho', name: 'Watt por metro quadrado', symbol: 'W/m²' },
    // Força e Torque
    { category: 'Força e Torque', name: 'Newton', symbol: 'N' },
    { category: 'Força e Torque', name: 'Quilonewton', symbol: 'kN' },
    { category: 'Força e Torque', name: 'Quilograma-força', symbol: 'kgf' },
    { category: 'Força e Torque', name: 'Tonelada-força', symbol: 'tf' },
    { category: 'Força e Torque', name: 'Newton-metro', symbol: 'N.m' },
    { category: 'Força e Torque', name: 'Libra-pé', symbol: 'lb.ft' },
    { category: 'Força e Torque', name: 'Quilograma-força metro', symbol: 'kgf.m' },
    // Fotometria (Luz)
    { category: 'Fotometria (Luz)', name: 'Lumens por Watt', symbol: 'lm/W' },
    { category: 'Fotometria (Luz)', name: 'Lumen', symbol: 'lm' },
    { category: 'Fotometria (Luz)', name: 'Lux', symbol: 'lx' },
    { category: 'Fotometria (Luz)', name: 'Candela', symbol: 'cd' },
    // Hidráulica e Fluidos
    { category: 'Hidráulica e Fluidos', name: 'Unidade Nefelométrica', symbol: 'NTU' },
    { category: 'Hidráulica e Fluidos', name: 'Metro cúbico por hora', symbol: 'm³/h' },
    { category: 'Hidráulica e Fluidos', name: 'Metro cúbico por segundo', symbol: 'm³/s' },
    { category: 'Hidráulica e Fluidos', name: 'Litro por minuto', symbol: 'L/min' },
    { category: 'Hidráulica e Fluidos', name: 'Litro por hora', symbol: 'L/h' },
    { category: 'Hidráulica e Fluidos', name: 'Litro por segundo', symbol: 'L/s' },
    { category: 'Hidráulica e Fluidos', name: 'Stokes', symbol: 'St' },
    { category: 'Hidráulica e Fluidos', name: 'Pascal-segundo', symbol: 'Pa·s' },
    { category: 'Hidráulica e Fluidos', name: 'Poise', symbol: 'P' },
    // Informática e Tecnologia
    { category: 'Informática e Tecnologia', name: 'Byte', symbol: 'B' },
    { category: 'Informática e Tecnologia', name: 'Gigabyte', symbol: 'GB' },
    { category: 'Informática e Tecnologia', name: 'Kilobyte', symbol: 'KB' },
    { category: 'Informática e Tecnologia', name: 'Megabyte', symbol: 'MB' },
    { category: 'Informática e Tecnologia', name: 'Petabyte', symbol: 'PB' },
    { category: 'Informática e Tecnologia', name: 'Terabyte', symbol: 'TB' },
    { category: 'Informática e Tecnologia', name: 'Gigahertz', symbol: 'GHz' },
    { category: 'Informática e Tecnologia', name: 'Unidade de Rack', symbol: 'U' },
    { category: 'Informática e Tecnologia', name: 'Megabits por segundo', symbol: 'Mbps' },
    { category: 'Informática e Tecnologia', name: 'Pontos por polegada', symbol: 'dpi' },
    { category: 'Informática e Tecnologia', name: 'Pixel', symbol: 'px' },
    { category: 'Informática e Tecnologia', name: 'Bit', symbol: 'b' },
    // Massa e Peso
    { category: 'Massa e Peso', name: 'Quilograma', symbol: 'kg' },
    { category: 'Massa e Peso', name: 'Libra', symbol: 'lb' },
    { category: 'Massa e Peso', name: 'Miligrama', symbol: 'mg' },
    { category: 'Massa e Peso', name: 'Grama', symbol: 'g' },
    { category: 'Massa e Peso', name: 'Onça Troy', symbol: 'ozt' },
    { category: 'Massa e Peso', name: 'Tonelada', symbol: 't' },
    // Materiais de Construção
    { category: 'Materiais de Construção', name: 'Barra', symbol: 'br' },
    { category: 'Materiais de Construção', name: 'Rolo', symbol: 'rl' },
    { category: 'Materiais de Construção', name: 'Galão', symbol: 'gl' },
    { category: 'Materiais de Construção', name: 'Quarto', symbol: 'qt' },
    { category: 'Materiais de Construção', name: 'Metro quadrado', symbol: 'm²' },
    // Mecânica dos Materiais
    { category: 'Mecânica dos Materiais', name: 'Quilograma-força/metro', symbol: 'kgf/m' },
    { category: 'Mecânica dos Materiais', name: 'Quilonewton por metro', symbol: 'kN/m' },
    { category: 'Mecânica dos Materiais', name: 'Rockwell C', symbol: 'HRC' },
    { category: 'Mecânica dos Materiais', name: 'Kgf por mm quadrado', symbol: 'kgf/mm²' },
    { category: 'Mecânica dos Materiais', name: 'Megapascal', symbol: 'MPa' },
    { category: 'Mecânica dos Materiais', name: 'Quilopascal', symbol: 'kPa' },
    { category: 'Mecânica dos Materiais', name: 'Kgf por cm quadrado', symbol: 'kgf/cm²' },
    // Potência Mecânica
    { category: 'Potência Mecânica', name: 'Tonelada de Refrigeração', symbol: 'TR' },
    { category: 'Potência Mecânica', name: 'Cavalo-vapor', symbol: 'cv' },
    { category: 'Potência Mecânica', name: 'Horsepower', symbol: 'hp' },
    // Pressão
    { category: 'Pressão', name: 'Atmosfera', symbol: 'atm' },
    { category: 'Pressão', name: 'Metro de coluna d\'água', symbol: 'mca' },
    { category: 'Pressão', name: 'Libra por pol. quadrada', symbol: 'psi' },
    { category: 'Pressão', name: 'Bar', symbol: 'bar' },
    { category: 'Pressão', name: 'Pascal', symbol: 'Pa' },
    { category: 'Pressão', name: 'Milímetro de mercúrio', symbol: 'mmHg' },
    // Química e Segurança
    { category: 'Química e Segurança', name: 'Potencial Hidrogeniônico', symbol: 'pH' },
    { category: 'Química e Segurança', name: 'Becquerel', symbol: 'Bq' },
    { category: 'Química e Segurança', name: 'Partes por milhão', symbol: 'ppm' },
    { category: 'Química e Segurança', name: 'Mol por litro', symbol: 'mol/L' },
    { category: 'Química e Segurança', name: 'Sievert', symbol: 'Sv' },
    { category: 'Química e Segurança', name: 'Mol', symbol: 'mol' },
    // Temperatura
    { category: 'Temperatura', name: 'Kelvin', symbol: 'K' },
    { category: 'Temperatura', name: 'Grau Celsius', symbol: '°C' },
    { category: 'Temperatura', name: 'Grau Fahrenheit', symbol: '°F' },
    // Tempo e Cronograma
    { category: 'Tempo e Cronograma', name: 'Rotações por minuto', symbol: 'rpm' },
    { category: 'Tempo e Cronograma', name: 'Unidade por hora', symbol: 'un/h' },
    { category: 'Tempo e Cronograma', name: 'Horas por mês', symbol: 'h/mês' },
    { category: 'Tempo e Cronograma', name: 'Ano', symbol: 'ano' },
    { category: 'Tempo e Cronograma', name: 'Mês', symbol: 'mês' },
    { category: 'Tempo e Cronograma', name: 'Dia', symbol: 'd' },
    { category: 'Tempo e Cronograma', name: 'Hora', symbol: 'h' },
    { category: 'Tempo e Cronograma', name: 'Minuto', symbol: 'min' },
    { category: 'Tempo e Cronograma', name: 'Segundo', symbol: 's' },
    { category: 'Tempo e Cronograma', name: 'Takt Time', symbol: 'TT' },
    // Transportes
    { category: 'Transportes', name: 'Tonelada-Quilômetro Útil', symbol: 'TKU' },
    { category: 'Transportes', name: 'Nó', symbol: 'kn' },
    { category: 'Transportes', name: 'Metro por segundo', symbol: 'm/s' },
    { category: 'Transportes', name: 'Quilômetro por hora', symbol: 'km/h' },
    // Volume e Capacidade
    { category: 'Volume e Capacidade', name: 'Metro cúbico', symbol: 'm³' },
    { category: 'Volume e Capacidade', name: 'Barril (Petróleo)', symbol: 'bbl' },
    { category: 'Volume e Capacidade', name: 'Galão (US)', symbol: 'gal' },
    { category: 'Volume e Capacidade', name: 'Litro', symbol: 'L' },
    { category: 'Volume e Capacidade', name: 'Estéreo', symbol: 'st' },
    { category: 'Volume e Capacidade', name: 'Mililitro', symbol: 'mL' },
];

// --- Mock Database de Localização ---
export const locationDb: Record<string, Record<string, string[]>> = {
    "Brasil": {
        "AC": ["Rio Branco", "Cruzeiro do Sul"],
        "AL": ["Maceió", "Arapiraca"],
        "AP": ["Macapá", "Santana"],
        "AM": ["Manaus", "Parintins"],
        "BA": ["Salvador", "Feira de Santana", "Vitória da Conquista"],
        "CE": ["Fortaleza", "Caucaia", "Juazeiro do Norte"],
        "DF": ["Brasília"],
        "ES": ["Vitória", "Vila Velha", "Serra"],
        "GO": ["Goiânia", "Aparecida de Goiânia", "Anápolis"],
        "MA": ["São Luís", "Imperatriz"],
        "MT": ["Cuiabá", "Várzea Grande"],
        "MS": ["Campo Grande", "Dourados"],
        "MG": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora"],
        "PA": ["Belém", "Ananindeua", "Santarém"],
        "PB": ["João Pessoa", "Campina Grande"],
        "PR": ["Curitiba", "Londrina", "Maringá"],
        "PE": ["Recife", "Jaboatão dos Guararapes", "Olinda"],
        "PI": ["Teresina", "Parnaíba"],
        "RJ": ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Niterói"],
        "RN": ["Natal", "Mossoró"],
        "RS": ["Porto Alegre", "Caxias do Sul", "Canoas"],
        "RO": ["Porto Velho", "Ji-Paraná"],
        "RR": ["Boa Vista"],
        "SC": ["Florianópolis", "Joinville", "Blumenau"],
        "SP": ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santos", "Ribeirão Preto"],
        "SE": ["Aracaju", "Nossa Senhora do Socorro"],
        "TO": ["Palmas", "Araguaína"]
    }
};

// --- Mock Feriados Regionais (Mês-Dia) ---
export const regionalHolidaysMock: Record<string, string[]> = {
    "São Paulo": ["01-25", "07-09", "11-20"], // Aniversário de SP, Rev. Constitucionalista, Consciência Negra
    "Rio de Janeiro": ["01-20", "04-23", "11-20"], // São Sebastião, São Jorge, Zumbi
    "Brasília": ["04-21", "11-30"],
    "Salvador": ["06-24", "12-08"],
    "Belo Horizonte": ["08-15", "12-08"],
    "Porto Alegre": ["02-02", "09-20"] // Nossa Sra. Navegantes, Revolução Farroupilha
};