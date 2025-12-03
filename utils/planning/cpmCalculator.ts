// src/utils/planning/cpmCalculator.ts
// Algoritmo de Caminho Crítico (CPM - Critical Path Method)

export interface Activity {
    id: number;
    nome: string;
    duracao: number; // Em dias úteis
    predecessores: number[]; // IDs das atividades predecessoras
    earlyStart?: number;
    earlyFinish?: number;
    lateStart?: number;
    lateFinish?: number;
    float?: number; // Folga
    isCritical?: boolean;
    responsavel?: string;
    percentualConclusao?: number;
}

export interface CPMResult {
    projectDuration: number;
    criticalPath: number[];
    criticalActivities: Activity[];
    activities: Activity[];
}

export class CPMCalculator {
    private activities: Activity[] = [];
    private criticalPath: number[] = [];

    constructor(activities: Activity[]) {
        this.activities = JSON.parse(JSON.stringify(activities)); // Deep clone
    }

    /**
     * CONCEITO: Forward Pass
     * Calcula datas mais cedo (ES - Early Start, EF - Early Finish)
     */
    private forwardPass(): void {
        // Atividades sem predecessores começam no dia 0
        this.activities
            .filter(a => !a.predecessores || a.predecessores.length === 0)
            .forEach(a => {
                a.earlyStart = 0;
                a.earlyFinish = a.duracao;
            });

        // Ordenar por precedência (topological sort)
        const sorted = this.topologicalSort();

        // Calcular ES e EF
        for (const activity of sorted) {
            if (activity.predecessores && activity.predecessores.length > 0) {
                const maxEF = Math.max(
                    ...activity.predecessores.map(predId => {
                        const pred = this.activities.find(a => a.id === predId);
                        return pred?.earlyFinish || 0;
                    })
                );

                activity.earlyStart = maxEF;
                activity.earlyFinish = activity.earlyStart! + activity.duracao;
            }
        }
    }

    /**
     * CONCEITO: Backward Pass
     * Calcula datas mais tarde (LS - Late Start, LF - Late Finish)
     */
    private backwardPass(): void {
        const projectDuration = Math.max(
            ...this.activities.map(a => a.earlyFinish || 0)
        );

        // Atividades sem sucessores devem terminar no dia final
        const activitiesWithoutSuccessors = this.activities.filter(a =>
            !this.activities.some(other =>
                other.predecessores && other.predecessores.includes(a.id)
            )
        );

        activitiesWithoutSuccessors.forEach(a => {
            a.lateFinish = projectDuration;
            a.lateStart = a.lateFinish - a.duracao;
        });

        // Ordenar inversamente
        const sorted = this.topologicalSort().reverse();

        // Calcular LS e LF
        for (const activity of sorted) {
            // Encontrar sucessores
            const sucessores = this.activities.filter(a =>
                a.predecessores && a.predecessores.includes(activity.id)
            );

            if (sucessores.length > 0) {
                const minLS = Math.min(
                    ...sucessores.map(suc => suc.lateStart || projectDuration)
                );

                activity.lateFinish = minLS;
                activity.lateStart = activity.lateFinish - activity.duracao;
            }
        }
    }

    /**
     * CONCEITO: Float (Folga)
     * Quantidade de atraso que uma atividade pode ter sem atrasar o projeto
     */
    private calculateFloat(): void {
        this.activities.forEach(a => {
            a.float = (a.lateStart || 0) - (a.earlyStart || 0);
            a.isCritical = a.float === 0;
        });
    }

    /**
     * CONCEITO: Identificar Caminho Crítico
     * Sequência de atividades críticas (float = 0)
     */
    private identifyCriticalPath(): void {
        const criticalActivities = this.activities.filter(a => a.isCritical);

        // Reconstituir caminho através das predecessoras críticas
        const path: number[] = [];

        // Começar da última atividade crítica (sem sucessores)
        let current = criticalActivities.find(a =>
            !this.activities.some(other =>
                other.predecessores && other.predecessores.includes(a.id)
            )
        );

        while (current) {
            path.unshift(current.id);

            // Encontrar predecessora crítica
            current = criticalActivities.find(a =>
                current!.predecessores && current!.predecessores.includes(a.id)
            );
        }

        this.criticalPath = path;
    }

    /**
     * CONCEITO: Detecção de Ciclos
     * Detecta loops (Atividade A → B → A)
     */
    public detectCycles(): boolean {
        const visited = new Set<number>();
        const recursionStack = new Set<number>();

        const hasCycle = (activityId: number): boolean => {
            visited.add(activityId);
            recursionStack.add(activityId);

            const activity = this.activities.find(a => a.id === activityId);

            if (activity && activity.predecessores) {
                for (const predId of activity.predecessores) {
                    if (!visited.has(predId)) {
                        if (hasCycle(predId)) return true;
                    } else if (recursionStack.has(predId)) {
                        return true;
                    }
                }
            }

            recursionStack.delete(activityId);
            return false;
        };

        for (const activity of this.activities) {
            if (!visited.has(activity.id)) {
                if (hasCycle(activity.id)) return true;
            }
        }

        return false;
    }

    /**
     * Ordenação Topológica (para processar atividades em ordem lógica)
     */
    private topologicalSort(): Activity[] {
        const sorted: Activity[] = [];
        const visited = new Set<number>();

        const visit = (activityId: number): void => {
            if (visited.has(activityId)) return;

            const activity = this.activities.find(a => a.id === activityId);
            if (!activity) return;

            visited.add(activityId);

            // Visitar predecessores primeiro
            if (activity.predecessores) {
                for (const predId of activity.predecessores) {
                    visit(predId);
                }
            }

            sorted.push(activity);
        };

        for (const activity of this.activities) {
            visit(activity.id);
        }

        return sorted;
    }

    /**
     * Método principal - Executar CPM
     */
    public calculate(): CPMResult {
        if (this.detectCycles()) {
            throw new Error('❌ Ciclo detectado no cronograma! Verifique as dependências.');
        }

        this.forwardPass();
        this.backwardPass();
        this.calculateFloat();
        this.identifyCriticalPath();

        return {
            projectDuration: Math.max(...this.activities.map(a => a.earlyFinish || 0)),
            criticalPath: this.criticalPath,
            criticalActivities: this.activities.filter(a => a.isCritical),
            activities: this.activities,
        };
    }

    /**
     * Simular Compressão de Cronograma
     */
    public simulateCompression(activityId: number, newDuration: number) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) return null;

        const oldDuration = activity.duracao;
        activity.duracao = newDuration;

        this.forwardPass();
        this.backwardPass();
        this.calculateFloat();

        const newProjectDuration = Math.max(...this.activities.map(a => a.earlyFinish || 0));
        const timeSaved = oldDuration - newDuration;

        // Restaurar duração original
        activity.duracao = oldDuration;

        return {
            oldDuration,
            newDuration,
            timeSaved,
            newProjectDuration,
            isWorthIt: timeSaved > 0,
        };
    }
}
