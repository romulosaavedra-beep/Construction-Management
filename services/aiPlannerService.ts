
import { GoogleGenAI, Type } from "@google/genai";
import type { PlanejamentoItem, ConstraintItem } from "../types";
import { WorkScheduleConfig, calculateDurationInWorkingDays } from "../utils/formatters";

// --- Types for AI Responses ---

export interface ScheduleBuilderInput {
  dataInicio: string;
  dataFim: string;
  escopo: PlanejamentoItem[];
  profissionaisDisponiveis: string[];
  scheduleConfig: WorkScheduleConfig;
  historicoObras?: PlanejamentoItem[];
}

export interface ScheduleBuilderOutput {
  cronograma: Array<{
    id: number;
    duracao: number;
    dataInicio: string;
    dataFim: string;
    responsavel: string;
    predecessores: number[];
    sucessores: number[];
    tipoRelacao: "FS" | "SS" | "FF" | "SF";
    folga_total: number;
    folga_livre: number;
    eh_critica: boolean;
    justificativa: string;
  }>;
  caminhoCritico: number[];
  duracaoTotal: number;
  prazoOtimizado: boolean;
  alertas: string[];
}

export interface PredictiveAdjusterOutput {
  analise: {
    spi: number;
    desvioFisico: number;
    diasAtrasoEstimado: number;
    tendenciaFinal: string;
    variancia: {
      planejado: number;
      estimadoAtualizado: number;
      risco: "BAIXO" | "MÉDIO" | "ALTO";
    };
  };
  ajustesRecomendados: Array<{
    id_atividade: number;
    acao: string;
    impacto_dias: number;
    impacto_custo: number;
    razao: string;
  }>;
  cenarios: {
    pessimista: string;
    realista: string;
    otimista: string;
  };
}

export interface OptimizerOutput {
  cronogramaOtimizado: any[]; // Simplified structure for preview
  compressaoAlcancada: number;
  custo_adicional: number;
  viabilidade: boolean;
  estrategia: string;
  impactoRisco: string;
  detalhes: Array<{
    tipo: string;
    afeta_ids: number[];
    impacto: string;
    risco: string;
  }>;
}

export interface ConstraintAnalysisOutput {
  restricoes_criticas: Array<{
    id: string;
    tipo: string;
    descricao: string;
    data_impacto: string;
    atividades_bloqueadas: number[];
    mitigacoes: Array<{
      acao: string;
      impacto: string;
      viabilidade: string;
      custo_adicional?: number;
    }>;
  }>;
}

// --- Service Implementation ---

const MODEL_NAME = "gemini-2.5-flash"; 

function getAiClient() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not configured in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
}

// 1. SCHEDULE BUILDER
export async function generateScheduleWithGemini(input: ScheduleBuilderInput): Promise<ScheduleBuilderOutput> {
  const ai = getAiClient();

  const escopoJSON = JSON.stringify(input.escopo.filter(i => !i.isParent), null, 2);
  const profisJSON = JSON.stringify(input.profissionaisDisponiveis);
  const historicoJSON = input.historicoObras 
    ? JSON.stringify(input.historicoObras.slice(0, 20), null, 2) 
    : "Nenhum histórico fornecido.";
  
  const prompt = `
    Você é um Engenheiro Sênior de Planejamento com 20+ anos em obras civis complexas.
    Sua especialidade é usar CPM (Critical Path Method), Lean Construction e análise 
    de produtividade para gerar cronogramas realistas e otimizados.

    CONTEXTO DO PROJETO:
    - Data Início: ${input.dataInicio}
    - Data Fim (Limite): ${input.dataFim}
    - Calendário: ${input.scheduleConfig.scheduleType} (${input.scheduleConfig.workOnHolidays ? "Incluindo feriados" : "Excluindo feriados"})
    - Localização: ${input.scheduleConfig.city || 'N/A'}, ${input.scheduleConfig.state || 'N/A'}

    LISTA DE RESPONSÁVEIS (EQUIPE DISPONÍVEL):
    ${profisJSON}

    ESCOPO DO PROJETO (EAP - Estrutura de Divisão de Trabalho):
    ${escopoJSON}

    HISTORIAL DE OBRAS SIMILARES (Produtividades Observadas):
    ${historicoJSON}

    SUA MISSÃO:
    1. Estimar durações usando produtividades reais.
    2. Definir precedências lógicas.
    3. Aplicar CPM para identificar caminho crítico.

    REGRAS OBRIGATÓRIAS:
    1. "responsavel": Selecione EXATAMENTE um nome da lista de disponíveis.
    2. "duracao": Inteiro > 0 em dias úteis.
    3. "dataInicio" e "dataFim": Formato YYYY-MM-DD.
    4. "predecessores" e "sucessores": Array de IDs.
    5. "tipoRelacao": "FS", "SS", "FF", ou "SF".
    
    FORMATO DE RETORNO (JSON Puro):
    {
      "cronograma": [
         { "id": number, "duracao": number, "dataInicio": string, "dataFim": string, "responsavel": string, "predecessores": number[], "sucessores": number[], "tipoRelacao": string, "folga_total": number, "folga_livre": number, "eh_critica": boolean, "justificativa": string }
      ],
      "caminhoCritico": [number],
      "duracaoTotal": number,
      "prazoOtimizado": boolean,
      "alertas": [string]
    }
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text!);
}

// 2. PREDICTIVE ADJUSTER
export async function predictAndAdjustScheduleGemini(
  planejamentoAtual: PlanejamentoItem[],
  dadosReais: PlanejamentoItem[],
  dataDate: string
): Promise<PredictiveAdjusterOutput> {
  const ai = getAiClient();

  // Simplify payload to avoid token limits
  const simplePlan = planejamentoAtual.map(i => ({ id: i.id, desc: i.discriminacao, planStart: i.dataInicio, planEnd: i.dataFim, dur: i.duracao }));
  const simpleReal = dadosReais.map(i => ({ id: i.id, realStart: i.inicioReal, realEnd: i.fimReal, pct: i.percentualConclusao }));

  const prompt = `
    Você é um Especialista em Earned Value Management (EVM).
    Analise o cronograma planejado versus dados reais acumulados e gere recomendações.

    CRONOGRAMA PLANEJADO (Baseline):
    ${JSON.stringify(simplePlan)}

    DADOS REAIS ACUMULADOS (até ${dataDate}):
    ${JSON.stringify(simpleReal)}

    SUA ANÁLISE:
    1. Calcule SPI (Schedule Performance Index).
    2. Identifique atividades ATRASADAS.
    3. Sugira AÇÕES CORRETIVAS.
    4. Gere 3 CENÁRIOS.

    FORMATO RETORNO (JSON):
    {
      "analise": {
        "spi": number,
        "desvioFisico": number,
        "diasAtrasoEstimado": number,
        "tendenciaFinal": "YYYY-MM-DD",
        "variancia": { "planejado": number, "estimadoAtualizado": number, "risco": "BAIXO|MÉDIO|ALTO" }
      },
      "ajustesRecomendados": [
        { "id_atividade": number, "acao": string, "impacto_dias": number, "impacto_custo": number, "razao": string }
      ],
      "cenarios": { "pessimista": "YYYY-MM-DD", "realista": "YYYY-MM-DD", "otimista": "YYYY-MM-DD" }
    }
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text!);
}

// 3. OPTIMIZE CPM ENGINE
export async function optimizeCriticalPathGemini(
  cronograma: PlanejamentoItem[],
  restricoes: any
): Promise<OptimizerOutput> {
  const ai = getAiClient();

  const prompt = `
    Você é um especialista em Planejamento Avançado (CPM, Lean).
    Sugira otimizações para comprimir prazo (Fast-tracking, Crashing).

    CRONOGRAMA ATUAL (Resumo):
    ${JSON.stringify(cronograma.map(i => ({ id: i.id, desc: i.discriminacao, dur: i.duracao, preds: [] /* Simplificacao */ })))}

    RESTRIÇÕES:
    ${JSON.stringify(restricoes)}

    RETORNO (JSON):
    {
      "cronogramaOtimizado": [], // Liste apenas IDs alterados para preview
      "compressaoAlcancada": number,
      "custo_adicional": number,
      "viabilidade": boolean,
      "estrategia": string,
      "impactoRisco": string,
      "detalhes": [
        { "tipo": "fast-track|crash", "afeta_ids": [number], "impacto": "string", "risco": "BAIXO|MÉDIO|ALTO" }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text!);
}

// 4. CONSTRAINT MANAGER
export async function manageConstraintsGemini(
  restricoes: ConstraintItem[],
  cronogramaAtual: PlanejamentoItem[]
): Promise<ConstraintAnalysisOutput> {
  const ai = getAiClient();

  const prompt = `
    Analise as restrições que afetam o cronograma e sugira mitigações.

    RESTRIÇÕES REGISTRADAS:
    ${JSON.stringify(restricoes)}

    CRONOGRAMA:
    ${JSON.stringify(cronogramaAtual.map(i => ({ id: i.id, desc: i.discriminacao, start: i.dataInicio })))}

    RETORNO (JSON):
    {
      "restricoes_criticas": [
        {
          "id": "string",
          "tipo": "MATERIAL|CLIMA|...",
          "descricao": "string",
          "data_impacto": "YYYY-MM-DD",
          "atividades_bloqueadas": [number],
          "mitigacoes": [
            { "acao": "string", "impacto": "string", "viabilidade": "ALTA|MEDIA|BAIXA", "custo_adicional": number }
          ]
        }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text!);
}

// 5. REPORT GENERATOR
export async function generateExecutiveReportGemini(
  planejamento: PlanejamentoItem[],
  dadosReais: any,
  tipoRelatorio: string
): Promise<string> {
  const ai = getAiClient();

  const prompt = `
    Você é um consultor sênior em Gestão de Projetos.
    Gere um RELATÓRIO EXECUTIVO profissional em formato MARKDOWN.

    DADOS DO PROJETO:
    - Total Atividades: ${planejamento.length}
    - Tipo Relatório: ${tipoRelatorio}
    - Dados Reais: ${JSON.stringify(dadosReais)}

    ESTRUTURA DO RELATÓRIO:
    1. Título e Data
    2. Resumo Executivo (Status Geral)
    3. KPIs Principais (SPI, CPI simulado)
    4. Análise de Caminho Crítico
    5. Top 3 Riscos e Mitigações
    6. Recomendações para próxima semana

    Use formatação Markdown rica (bold, listas, tabelas se possível).
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  return response.text || "Erro ao gerar relatório.";
}
