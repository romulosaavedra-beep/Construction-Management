
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";
import { CheckCircle2, X, Info } from "lucide-react";
import type { OrcamentoItem, UnitItem } from '../types';
import { updateHierarchy } from '../utils';

import { DEFAULT_UNITS_DATA } from '../../../data/mockData';

export const useOrcamentoImport = (
    allUnits: UnitItem[],
    setOrcamentoData: (data: OrcamentoItem[]) => void,
    setLocalOrcamento: (data: OrcamentoItem[]) => void,
) => {
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
    const [isAutoAiMapping, setIsAutoAiMapping] = useState(true);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [columnMapping, setColumnMapping] = useState<{ [key: string]: { enabled: boolean; name: string } }>({
        nivel: { enabled: false, name: '' },
        fonte: { enabled: false, name: '' },
        codigo: { enabled: false, name: '' },
        discriminacao: { enabled: true, name: 'Discriminação' },
        unidade: { enabled: true, name: 'Un.' },
        quantidade: { enabled: true, name: 'Quant.' },
        mat_unit: { enabled: true, name: 'Mat. Unit.' },
        mo_unit: { enabled: true, name: 'M.O Unit.' },
        mat_mo_unit: { enabled: false, name: '' },
    });

    const abortAiRef = useRef(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setUploadedFileContent(text);
                setImportStep(2);
            };
            reader.readAsText(file);
        }
    };

    const handleMappingChange = (key: string, field: 'enabled' | 'name', value: boolean | string) => {
        setColumnMapping(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
    };

    const resetImport = () => {
        setImportModalOpen(false);
        setImportStep(1);
        setUploadedFileContent(null);
        setIsAiProcessing(false);
        setIsAutoAiMapping(true);
    };

    const processAiResponseIntoOrcamento = (aiData: any[]): OrcamentoItem[] => {
        if (!Array.isArray(aiData)) {
            console.error("AI response is not an array:", aiData);
            return [];
        }

        const items: Omit<OrcamentoItem, 'id' | 'pai' | 'expandido'>[] = aiData.map(d => ({
            nivel: d.nivel || '',
            discriminacao: d.discriminacao || 'Item sem nome',
            fonte: d.fonte || '',
            codigo: d.codigo || '',
            unidade: d.unidade || '',
            quantidade: parseFloat(d.quantidade) || 0,
            mat_unit: parseFloat(d.mat_unit) || 0,
            mo_unit: parseFloat(d.mo_unit) || 0,
            use_total_unit: d.use_total_unit || false,
        }));

        let idCounter = 1;
        const itemsWithIds = items.map(item => ({ ...item, id: idCounter++ }));

        const nivelMap: { [key: string]: number } = {};
        itemsWithIds.forEach(item => {
            nivelMap[item.nivel] = item.id;
        });

        const structuredItems: OrcamentoItem[] = itemsWithIds.map(item => {
            const nivelParts = item.nivel.split('.');
            const parentNivel = nivelParts.slice(0, -1).join('.');
            const parentId = nivelMap[parentNivel] || null;
            return {
                ...item,
                pai: parentId,
                expandido: true
            };
        });

        return structuredItems;
    };

    const handleStopAi = () => {
        abortAiRef.current = true;
        setIsAiProcessing(false);
    };

    const getStandardizedUnitsReference = () => {
        return allUnits.map(u => `Nome: "${u.name}" | Símbolo: "${u.symbol}"`).join('\n');
    };

    const handleAiImport = async (setHiddenColumns: React.Dispatch<React.SetStateAction<Set<string>>>) => {
        if (!uploadedFileContent) {
            toast.error("Nenhum arquivo enviado.");
            return;
        }

        abortAiRef.current = false;
        setIsAiProcessing(true);

        let mappingDescription = '';
        if (isAutoAiMapping) {
            mappingDescription = "Usando sua inteligência detecte automaticamente as colunas com base em seu conteúdo seguindo o modelo (DE -> PARA), Infira a estrutura de dados de forma inteligente.";
        } else {
            mappingDescription = (Object.entries(columnMapping) as [string, { enabled: boolean; name: string }][])
                .filter(([, value]) => value.enabled && value.name)
                .map(([key, value]) => `A coluna do meu arquivo chamada "${value.name}" corresponde ao campo "${key}".`)
                .join(' ');
        }

        const unitsReference = getStandardizedUnitsReference();

        const prompt = `
            Analise o seguinte conteúdo de um arquivo de orçamento de construção civil. O conteúdo é:
            ---
            ${uploadedFileContent}
            ---
            As regras de mapeamento de colunas são: ${mappingDescription}.
            Sua tarefa é extrair os dados e estruturá-los em um JSON.
            
            TABELA DE REFERÊNCIA DE UNIDADES DE MEDIDA (PADRÃO DO SISTEMA):
            --- INÍCIO DA LISTA DE UNIDADES ---
            ${unitsReference}
            --- FIM DA LISTA DE UNIDADES ---

            Regras Importantes:
            1.  **Estrutura e Hierarquia (LÓGICA DE INFERÊNCIA AVANÇADA):** Se a coluna "nível" (ex: 1, 1.1, 2.1.3) NÃO for fornecida explicitamente no texto, você DEVE inferir a estrutura hierárquica (WBS/EAP) seguindo estritamente este critério lógico:
                *   **Critério para Nível FILHO (Item Executável):**
                    - Qualquer linha que POSSUA valores explícitos de **Quantidade** E **Valor Unitário** (maiores que zero).
                    - Estes são os itens finais da composição.
                
                *   **Critério para Nível PAI (Agrupador/Título):**
                    - Qualquer linha que possua uma Descrição, mas **NÃO POSSUA** Quantidade ou Valor Unitário (ou sejam vazios/zero).
                    - Estes itens servem apenas como cabeçalhos ou categorias para os itens abaixo deles.
                    
                *   **Construção da Numeração:**
                    - Ao identificar um "Pai", inicie ou aprofunde a numeração (ex: de "2" para "2.1").
                    - Ao identificar um "Filho", ele deve herdar a numeração do último "Pai" ativo (ex: se o pai é "2.1.1", o filho será "2.1.1.1", "2.1.1.2", etc.).
                    - A hierarquia pode ser profunda (ex: 2 -> 2.1 -> 2.1.1 -> 2.1.1.1).
                    - **Exemplo de Lógica:**
                        - "Fundação" (Sem qtd/valor) -> Nível 2 (Pai)
                        - "Terraplenagem" (Sem qtd/valor) -> Nível 2.1 (Sub-Pai)
                        - "Estacas" (Sem qtd/valor) -> Nível 2.1.1 (Sub-Pai)
                        - "Estaca Raiz..." (COM qtd 200 e valor 1200) -> Nível 2.1.1.1 (Filho)

            2.  **Unidades (CRÍTICO):** Para cada linha, verifique o valor da unidade no arquivo original.
                - Procure esse valor na tabela de referência acima (compare com "Nome" ou "Símbolo", ignorando maiúsculas/minúsculas).
                - **SE encontrar correspondência:** Preencha o campo "unidade" OBRIGATORIAMENTE com o valor do **Símbolo** listado na tabela. Exemplo: Se o arquivo diz "Metro", e a tabela tem "Nome: Metro | Símbolo: m", você DEVE usar "m".
                - **SE NÃO encontrar correspondência exata:** Tente padronizar para o símbolo mais próximo e comum (ex: "M2", "m2", "metro q" -> "m²").
                - Unidades como "UN", "Unid" devem virar "un".
            
            3.  **FONTE e CÓDIGO (MUITO IMPORTANTE):**
                - **Fonte:** É a ORIGEM/REFERÊNCIA de onde vem o serviço/atividade. Exemplos comuns: "SINAPI", "SICRO", "SEINFRA", "ORSE", "SBC", "Próprio", "Cotação", etc.
                - **Código:** É o CÓDIGO IDENTIFICADOR específico da fonte. Exemplos: "73983/001", "C00123", "SUB-01234", "12345.678", etc.
                
                **⚠️ ATENÇÃO CRÍTICA - NÃO CONFUNDIR:**
                - **"nível"** = Hierarquia pai/filho (ex: "1", "1.1", "1.1.1", "1.1.2", "2", "2.1") → Campo separado
                - **"codigo"** = Identificador da fonte (ex: "73983", "C-00123") → NUNCA será hierárquico como "1.1.1"
                - Se você encontrar valores como "1", "1.1", "1.2" → isso é "nível", NÃO é "codigo"!
                
                **Como identificar:**
                a) **Colunas Separadas:** Se houver colunas com nomes como "Fonte", "Ref", "Referência", "Origem", "Base", "Tabela" → use como "fonte"
                   E colunas como "Código", "Cód", "Cód. Ref", "Item", "Composição", "ID" → use como "codigo"
                
                b) **Mesma Coluna (Formato Combinado):** Se houver uma coluna com valores como:
                   - "SINAPI 73983/001" → fonte: "SINAPI", codigo: "73983/001"
                   - "SICRO C00123-SUB" → fonte: "SICRO", codigo: "C00123-SUB"
                   - "SEINFRA 12345.678/9" → fonte: "SEINFRA", codigo: "12345.678/9"
                   **Regra de Separação:** A primeira palavra em MAIÚSCULAS geralmente é a fonte, o restante é o código.
                
                c) **Identificação Inteligente:** Mesmo que as colunas NÃO sejam especificamente nomeadas "Fonte" ou "Código", identifique-as pelo conteúdo:
                   - Valores curtos e geralmente em maiúsculas como "SINAPI", "SICRO" → provavelmente fonte
                   - Valores alfanuméricos com números, traços, pontos como "73983/001", "C-123" → provavelmente código
                
                d) **Se NÃO houver fonte/código:** Deixe os campos vazios (""). NÃO invente valores.
                
                e) **Se houver dúvida:** É melhor deixar vazio do que preencher incorretamente.
            
            4.  **CUSTOS - DETECÇÃO INTELIGENTE (MUITO IMPORTANTE):**
                
                **Cenário A: Valores Separados (Material + Mão de Obra)**
                Se o arquivo tiver colunas separadas para Material e Mão de Obra:
                - Preencha "mat_unit" com custo unitário de material
                - Preencha "mo_unit" com custo unitário de mão de obra
                - use_total_unit: false (ou omita o campo)
                
                **Cenário B: Apenas Valor Unitário Total**
                Se houver apenas UMA coluna de custo unitário (sem separação Material/M.O.):
                - Coloque o valor total em "mat_unit"
                - mo_unit: 0
                - use_total_unit: true
                
                **Como detectar qual cenário:**
                - **Cenário A**: Se houver colunas como "Material", "Mat", "Materiais", "Mat. Unit." E simultaneamente "M.O.", "Mão de Obra", "MO", "Labor", "M.O. Unit."
                - **Cenário B**: Se houver apenas colunas como "Valor Unit.", "Preço", "Custo Unit.", "P.U.", "Unitário", "Valor", "Custo" (sem separação)
                - **Em caso de dúvida:** Use Cenário B (valor total é mais comum)
                
                **Exemplos:**
                | Entrada | mat_unit | mo_unit | use_total_unit |
                |---------|----------|---------|----------------|
                | Mat: 50.00, M.O: 30.00 | 50.00 | 30.00 | false |
                | Valor Unit: 100.00 | 100.00 | 0 | true |
                | P.U.: 75.50 | 75.50 | 0 | true |
                | Custo: 45.00 | 45.00 | 0 | true |
            
            5.  **Tipos de Dados:** "quantidade", "mat_unit", "mo_unit" devem ser números (float). "discriminacao" é string obrigatória. "fonte", "codigo" e "use_total_unit" são opcionais.
            
            6.  Ignore cabeçalhos e rodapés.

            **Exemplos de Identificação Fonte/Código:**
            - "SINAPI 94521" → fonte: "SINAPI", codigo: "94521"
            - Coluna "Ref: SICRO" + Coluna "Comp: 123.456" → fonte: "SICRO", codigo: "123.456"
            - "Próprio" → fonte: "Próprio", codigo: ""
            - Sem referência visível → fonte: "", codigo: ""

            Retorne APENAS o array de objetos JSON.
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite",
                contents: prompt,
                config: {
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 16384,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                nivel: { type: Type.STRING },
                                fonte: { type: Type.STRING },
                                codigo: { type: Type.STRING },
                                discriminacao: { type: Type.STRING },
                                unidade: { type: Type.STRING },
                                quantidade: { type: Type.NUMBER },
                                mat_unit: { type: Type.NUMBER },
                                mo_unit: { type: Type.NUMBER },
                                use_total_unit: { type: Type.BOOLEAN },
                            },
                        },
                    },
                },
            });

            if (abortAiRef.current) return;

            const jsonStr = response.text.trim();
            const aiData = JSON.parse(jsonStr);
            const newOrcamentoData = processAiResponseIntoOrcamento(aiData);

            if (newOrcamentoData.length > 0) {
                const hasFonte = newOrcamentoData.some(item => item.fonte && item.fonte.trim() !== '');
                const hasCodigo = newOrcamentoData.some(item => item.codigo && item.codigo.trim() !== '');
                const allUseTotalUnit = newOrcamentoData.every(item => item.use_total_unit === true);
                const allMoUnitZero = newOrcamentoData.every(item => item.mo_unit === 0);
                const shouldHideSplitColumns = allUseTotalUnit || allMoUnitZero;

                const columnsToHide: string[] = [];
                if (!hasFonte) columnsToHide.push('Fonte');
                if (!hasCodigo) columnsToHide.push('Código');
                if (shouldHideSplitColumns) {
                    columnsToHide.push('Mat. Unit.', 'M.O. Unit.', 'Mat. Total', 'M.O. Total');
                }

                if (columnsToHide.length > 0) {
                    setHiddenColumns(prev => {
                        const newSet = new Set(prev);
                        if (!hasFonte) newSet.add('fonte');
                        if (!hasCodigo) newSet.add('codigo');
                        if (shouldHideSplitColumns) {
                            newSet.add('mat_unit');
                            newSet.add('mo_unit');
                            newSet.add('mat_total');
                            newSet.add('mo_total');
                        }
                        return newSet;
                    });
                }

                setOrcamentoData(newOrcamentoData);
                setLocalOrcamento(newOrcamentoData);

                if (!abortAiRef.current) {
                    resetImport();

                    // 1. TOAST DE SUCESSO (Verde)
                    toast.custom((t) => (
                        <div className="max-w-md w-full bg-surface shadow-2xl rounded-lg pointer-events-auto border border-default flex ring-1 ring-black ring-opacity-5" >
                            <div className="flex-1 w-0 p-4" >
                                <div className="flex items-start" >
                                    <div className="flex-shrink-0 pt-0.5" >
                                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                                    </div>
                                    < div className="ml-3 flex-1" >
                                        <p className="text-sm font-medium text-white" > Importação Concluída </p>
                                        < p className="mt-1 text-sm text-secondary" > O orçamento foi processado e importado com sucesso.</p>
                                    </div>
                                </div>
                            </div>
                            < div className="flex border-l border-default" >
                                <button
                                    onClick={() => toast.dismiss(t)}
                                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-secondary hover:text-white hover:bg-elevated focus:outline-none transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ), { duration: 4000 });

                    // 2. TOAST DE COLUNAS OCULTAS (Azul - Genérico)
                    const genericHiddenCols = columnsToHide.filter((c: string) => !['Mat. Unit.', 'M.O. Unit.', 'Mat. Total', 'M.O. Total'].includes(c));

                    if (genericHiddenCols.length > 0) {
                        setTimeout(() => {
                            toast.custom((t) => (
                                <div className="max-w-md w-full bg-surface shadow-2xl rounded-lg pointer-events-auto border border-default flex ring-1 ring-black ring-opacity-5" >
                                    <div className="flex-1 w-0 p-4" >
                                        <div className="flex items-start" >
                                            <div className="flex-shrink-0 pt-0.5" >
                                                <Info className="h-10 w-10 text-accent-500" />
                                            </div>
                                            < div className="ml-3 flex-1" >
                                                <p className="text-sm font-medium text-white" > Colunas Ocultadas </p>
                                                < p className="mt-1 text-sm text-secondary" >
                                                    As colunas < span className="text-white font-medium" > {genericHiddenCols.join("' e '")} </span> foram ocultadas automaticamente pois não continham dados.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    < div className="flex border-l border-default" >
                                        <button
                                            onClick={() => toast.dismiss(t)}
                                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-secondary hover:text-white hover:bg-elevated focus:outline-none transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ), { duration: 6000 });
                        }, 300);
                    }

                    // 3. TOAST DE COLUNAS DE CUSTO (Azul - Específico)
                    if (shouldHideSplitColumns) {
                        setTimeout(() => {
                            toast.custom((t) => (
                                <div className="max-w-md w-full bg-surface shadow-2xl rounded-lg pointer-events-auto border border-default flex ring-1 ring-black ring-opacity-5" >
                                    <div className="flex-1 w-0 p-4" >
                                        <div className="flex items-start" >
                                            <div className="flex-shrink-0 pt-0.5" >
                                                <Info className="h-10 w-10 text-accent-500" />
                                            </div>
                                            < div className="ml-3 flex-1" >
                                                <p className="text-sm font-medium text-white" > Formato de Custo Detectado </p>
                                                < p className="mt-1 text-sm text-secondary" >
                                                    O orçamento usa valor unitário total.As colunas de separação(Material / M.O.) foram ocultadas para simplificar a visualização.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    < div className="flex border-l border-default" >
                                        <button
                                            onClick={() => toast.dismiss(t)}
                                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-secondary hover:text-white hover:bg-elevated focus:outline-none transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ), { duration: 7000 });
                        }, 600);
                    }
                }
            } else {
                if (!abortAiRef.current) {
                    toast.error("A IA não conseguiu processar o arquivo. Verifique o mapeamento e o conteúdo do arquivo.");
                }
            }

        } catch (error) {
            if (!abortAiRef.current) {
                console.error("Erro ao chamar a API Gemini:", error);
                toast.error("Ocorreu um erro ao processar o arquivo com a IA.");
            }
        } finally {
            if (!abortAiRef.current) {
                setIsAiProcessing(false);
            }
        }
    };

    return {
        isImportModalOpen,
        setImportModalOpen,
        importStep,
        setImportStep,
        uploadedFileContent,
        columnMapping,
        handleMappingChange,
        isAutoAiMapping,
        setIsAutoAiMapping,
        isAiProcessing,
        handleFileChange,
        handleAiImport,
        resetImport,
        handleStopAi
    };
};
