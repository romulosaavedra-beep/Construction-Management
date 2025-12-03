// src/services/geminiPlanning.ts
import { GoogleGenAI } from "@google/genai";
import type { EvmMetrics } from '../utils/planning/evmCalculator';
import type { Activity } from '../utils/planning/cpmCalculator';

// IMPORTANTE: Configure a API Key no arquivo .env
// GEMINI_API_KEY=sua_chave_aqui

export interface DeviationAnalysis {
    causas: Array<{
        id: number;
        causa: string;
        severidade: number; // 1-10
        impacto_cronograma_dias: number;
        impacto_orcamento_reais: number;
        evidencia: string;
    }>;
}

export interface ActionRecommendation {
    acoes: Array<{
        id: number;
        titulo: string;
        descricao: string;
        atividades_afetadas: number[];
        dias_economizados: number;
        custo_adicional: number;
        roi: number;
        prazo_implementacao: string;
        risco: string;
        razao: string;
    }>;
}

export class GeminiPlanningService {
    private client: GoogleGenAI | null = null;
    private apiKey: string;

    // Configurações movidas para propriedades da classe para serem reutilizadas nas chamadas
    private readonly modelName = 'gemini-2.5-pro';
    private readonly generationConfig = {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 16384,
    };

    constructor(apiKey?: string) {
        this.apiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';

        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY não configurada. Funcionalidades de IA desabilitadas.');
            return;
        }

        // Inicialização do novo SDK
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }

    /**
     * PROMPT 1: Análise de Desvios
     * Identifica causas raiz dos problemas no cronograma
     */
    async analyzeDeviations(
        metrics: EvmMetrics,
        activities: Activity[]
    ): Promise<DeviationAnalysis> {
        if (!this.client) {
            return { causas: [] };
        }

        // Filtrar atividades com problemas
        const problematicActivities = activities.filter(a =>
            a.isCritical && (a.percentualConclusao || 0) < 50
        );

        const prompt = `
Você é um engenheiro sênior especializado em gestão de obras. Analise o seguinte cronograma:

MÉTRICAS EVM (Earned Value Management):
- CPI (Cost Performance Index): ${metrics.cpi.toFixed(2)} ${metrics.cpi < 1 ? '[SOBRE-ORÇAMENTO]' : '[SOB-ORÇAMENTO]'}
- SPI (Schedule Performance Index): ${metrics.spi.toFixed(2)} ${metrics.spi < 1 ? '[ATRASADO]' : '[ADIANTADO]'}
- Variação de Cronograma: R$ ${metrics.sv.toLocaleString('pt-BR')}
- Variação de Custo: R$ ${metrics.cv.toLocaleString('pt-BR')}
- % Conclusão Real: ${metrics.percentComplete.toFixed(1)}%

ATIVIDADES CRÍTICAS COM PROBLEMAS (${problematicActivities.length}):
${problematicActivities.slice(0, 10).map(a => `
  • ${a.nome}
    - Duração planejada: ${a.duracao} dias
    - % Concluído: ${a.percentualConclusao || 0}%
    - Folga: ${a.float || 0} dias (CRÍTICA)
    - Responsável: ${a.responsavel || 'Não atribuído'}
`).join('\n')}

TAREFA:
Identifique as 3-5 causas raiz dos desvios observados. Para cada causa:
1. Descrição clara e objetiva
2. Severidade (escala 1-10, onde 10 é crítico)
3. Impacto no cronograma (em dias)
4. Impacto no orçamento (em R$)
5. Evidência que comprova esta causa

FOQUE EM:
- Atividades críticas atrasadas
- Desvios significativos (CPI/SPI < 0.9)
- Padrões recorrentes

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional.

FORMATO DE RESPOSTA:
{
  "causas": [
    {
      "id": 1,
      "causa": "Descrição objetiva da causa raiz",
      "severidade": 8,
      "impacto_cronograma_dias": 5,
      "impacto_orcamento_reais": 50000,
      "evidencia": "O que evidencia esta causa (cite métricas)"
    }
  ]
}
`;

        try {
            // Chamada atualizada para o novo SDK
            const response = await this.client.models.generateContent({
                model: this.modelName,
                contents: prompt,
                config: this.generationConfig
            });

            const text = response.text;

            // Limpar resposta (remover markdown se houver)
            const jsonText = text.replace(/``````\n?/g, '').trim();

            return JSON.parse(jsonText);
        } catch (error) {
            console.error('Erro ao analisar desvios com Gemini:', error);
            return { causas: [] };
        }
    }

    /**
     * PROMPT 2: Recomendações de Ação
     * Sugere ações corretivas priorizadas
     */
    async generateRecommendations(
        deviations: DeviationAnalysis,
        activities: Activity[],
        constraints: {
            maxBudget: number;
            maxResourceIncrease: number;
        }
    ): Promise<ActionRecommendation> {
        if (!this.client) {
            return { acoes: [] };
        }

        // Atividades que podem ser comprimidas
        const compressibleActivities = activities
            .filter(a => a.isCritical && a.duracao > 5)
            .map(a => ({
                id: a.id,
                nome: a.nome,
                duracao_atual: a.duracao,
                duracao_minima: Math.max(a.duracao * 0.6, 1),
                responsavel: a.responsavel || 'Não atribuído',
            }));

        const prompt = `
Você é um consultor especializado em otimização de cronogramas. 

PROBLEMAS IDENTIFICADOS:
${JSON.stringify(deviations.causas, null, 2)}

ATIVIDADES QUE PODEM SER OTIMIZADAS (${compressibleActivities.length}):
${compressibleActivities.slice(0, 10).map(a => `
  • ${a.nome}
    - Duração atual: ${a.duracao_atual} dias
    - Duração mínima possível: ${a.duracao_minima} dias
    - Responsável: ${a.responsavel}
`).join('\n')}

RESTRIÇÕES DO PROJETO:
- Orçamento adicional disponível: R$ ${constraints.maxBudget.toLocaleString('pt-BR')}
- Aumento máximo de recursos: ${constraints.maxResourceIncrease * 100}%
- Prazo é CRÍTICO (não pode atrasar mais)

TAREFA:
Gere 5 ações corretivas VIÁVEIS, ordenadas por impacto/custo (ROI):

Para cada ação, forneça:
1. Título conciso
2. Descrição detalhada (como implementar)
3. Atividades afetadas (IDs)
4. Dias economizados no cronograma
5. Custo adicional necessário (R$)
6. ROI (retorno sobre investimento)
7. Prazo para implementar
8. Nível de risco
9. Justificativa técnica

PRIORIZE:
- Ações com maior ROI (dias economizados / custo)
- Atividades críticas (float = 0)
- Implementação rápida (< 1 semana)
- Baixo risco

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional.

FORMATO DE RESPOSTA:
{
  "acoes": [
    {
      "id": 1,
      "titulo": "Comprimir Fundação usando equipes extras",
      "descricao": "Aumentar equipe de 8 para 12 pessoas trabalhando em turnos",
      "atividades_afetadas": [1, 2],
      "dias_economizados": 5,
      "custo_adicional": 25000,
      "roi": 0.0002,
      "prazo_implementacao": "3 dias",
      "risco": "Baixo - atividade simples",
      "razao": "Atividade crítica com bom histórico de desempenho"
    }
  ]
}
`;

        try {
            // Chamada atualizada para o novo SDK
            const response = await this.client.models.generateContent({
                model: this.modelName,
                contents: prompt,
                config: this.generationConfig
            });

            const text = response.text;

            const jsonText = text.replace(/``````\n?/g, '').trim();

            return JSON.parse(jsonText);
        } catch (error) {
            console.error('Erro ao gerar recomendações com Gemini:', error);
            return { acoes: [] };
        }
    }

    /**
     * PROMPT 3: Análise Rápida de Texto
     * Para perguntas gerais sobre o projeto
     */
    async askQuestion(
        question: string,
        context: {
            metrics?: EvmMetrics;
            activities?: Activity[];
        }
    ): Promise<string> {
        if (!this.client) {
            return 'Serviço de IA não disponível. Configure GEMINI_API_KEY no arquivo .env';
        }

        const prompt = `
Você é um assistente especializado em gestão de obras.

CONTEXTO DO PROJETO:
${context.metrics ? `
Métricas EVM:
- CPI: ${context.metrics.cpi.toFixed(2)}
- SPI: ${context.metrics.spi.toFixed(2)}
- % Conclusão: ${context.metrics.percentComplete}%
` : ''}

${context.activities ? `
Atividades Críticas: ${context.activities.filter(a => a.isCritical).length}
Total de Atividades: ${context.activities.length}
` : ''}

PERGUNTA DO USUÁRIO:
${question}

Responda de forma clara, objetiva e profissional. Use dados do contexto quando relevante.
`;

        try {
            // Chamada atualizada para o novo SDK
            const response = await this.client.models.generateContent({
                model: this.modelName,
                contents: prompt,
                config: this.generationConfig
            });

            return response.text;
        } catch (error) {
            console.error('Erro ao responder pergunta:', error);
            return 'Desculpe, não foi possível processar sua pergunta.';
        }
    }

    /**
     * Verificar se IA está disponível
     */
    isAvailable(): boolean {
        return !!this.client && !!this.apiKey;
    }
}

// Instância singleton (usar em todo app)
export const geminiService = new GeminiPlanningService();
