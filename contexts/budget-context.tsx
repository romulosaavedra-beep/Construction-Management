import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';
import type { OrcamentoItem } from '../types';
import { useProjectContext } from './project-context';

export interface Budget {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    last_modified_by?: string;
    version: number;
    is_active: boolean;
    metadata?: Record<string, any>;
}

interface BudgetContextType {
    budgets: Budget[];
    activeBudget: Budget | null;
    setActiveBudget: (budget: Budget | null) => void;
    budgetItems: OrcamentoItem[];
    setBudgetItems: React.Dispatch<React.SetStateAction<OrcamentoItem[]>>;
    loading: boolean;
    fetchBudgets: () => Promise<void>;
    fetchBudgetItems: (budgetId: string) => Promise<void>;
    saveBudgetItems: (budgetId: string, items: OrcamentoItem[]) => Promise<void>;
    createBudget: (projectId: string, name: string, description?: string) => Promise<Budget | null>;
    updateBudget: (budgetId: string, updates: Partial<Budget>) => Promise<void>;
    deleteBudget: (budgetId: string) => Promise<boolean>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { selectedProjectId } = useProjectContext();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
    const [budgetItems, setBudgetItems] = useState<OrcamentoItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch all budgets for a project
    const fetchBudgets = useCallback(async () => {
        if (!selectedProjectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('budgets')
                .select('*')
                .eq('project_id', selectedProjectId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setBudgets(data || []);

            // Auto-select first budget if none selected
            if (data && data.length > 0) {
                // Always select the first budget when loading a project's budgets
                // This works in tandem with the useEffect clearing activeBudget on project change
                setActiveBudget(data[0]);
            }
        } catch (error) {
            console.error('Error fetching budgets:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            // Check if error is related to missing table
            if ((error as any)?.code === '42P01') {
                toast.error('Tabela de orçamentos não encontrada. Execute a migração.');
            } else {
                toast.error('Erro ao carregar orçamentos');
            }
        } finally {
            setLoading(false);
        }
    }, [selectedProjectId]);

    // Fetch items for a specific budget
    const fetchBudgetItems = useCallback(async (budgetId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('budget_items')
                .select('*')
                .eq('budget_id', budgetId)
                .order('display_order', { ascending: true });

            if (error) throw error;

            // Map database format to OrcamentoItem format
            const items: OrcamentoItem[] = data.map(item => ({
                id: item.id,
                nivel: item.nivel,
                pai: item.pai,
                fonte: item.fonte || '',
                codigo: item.codigo || '',
                discriminacao: item.discriminacao,
                unidade: item.unidade || '',
                quantidade: parseFloat(item.quantidade) || 0,
                mat_unit: parseFloat(item.mat_unit) || 0,
                mo_unit: parseFloat(item.mo_unit) || 0,
                expandido: item.expandido ?? true, // Default to true to ensure visibility
                use_total_unit: item.use_total_unit,
                sourceMetadata: item.source_metadata || {}
            }));

            // 🔧 REPAIR HIERARCHY LOGIC
            // Fixes issues where 'pai' references legacy IDs or levels instead of UUIDs
            const idMap = new Map<string, string | number>(); // nivel -> id
            const allIds = new Set<string | number>();

            items.forEach(item => {
                idMap.set(item.nivel, item.id);
                allIds.add(item.id);
            });

            const repairedItems = items.map(item => {
                // If pai is null, it's root. Keep it.
                if (item.pai === null) return item;

                // Check if current pai is valid (exists in allIds)
                if (allIds.has(item.pai)) return item;

                // If not valid, try to infer from nivel
                // e.g. item.nivel = '1.1.1' -> parent nivel = '1.1'
                const parts = item.nivel.split('.');
                if (parts.length > 1) {
                    const parentNivel = parts.slice(0, -1).join('.');
                    const parentId = idMap.get(parentNivel);
                    if (parentId) {
                        return { ...item, pai: parentId };
                    }
                }

                // If inference fails, default to null (root) so it shows up
                return { ...item, pai: null };
            });

            setBudgetItems(repairedItems);
        } catch (error) {
            console.error('Error fetching budget items:', error);
            toast.error('Erro ao carregar itens do orçamento');
        } finally {
            setLoading(false);
        }
    }, []);

    // Save budget items (replaces entire budget)
    const saveBudgetItems = useCallback(async (budgetId: string, items: OrcamentoItem[]) => {
        try {
            // Delete existing items
            const { error: deleteError } = await supabase
                .from('budget_items')
                .delete()
                .eq('budget_id', budgetId);

            if (deleteError) throw deleteError;

            // Insert new items with display_order
            const itemsToInsert = items.map((item, index) => ({
                budget_id: budgetId,
                nivel: item.nivel,
                pai: item.pai,
                fonte: item.fonte || null,
                codigo: item.codigo || null,
                discriminacao: item.discriminacao,
                unidade: item.unidade || null,
                quantidade: item.quantidade,
                mat_unit: item.mat_unit,
                mo_unit: item.mo_unit,
                expandido: item.expandido,
                use_total_unit: item.use_total_unit || false,
                source_metadata: item.sourceMetadata || {},
                display_order: index
            }));

            const { error: insertError } = await supabase
                .from('budget_items')
                .insert(itemsToInsert);

            if (insertError) throw insertError;

            // Update budget's updated_at
            await supabase
                .from('budgets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', budgetId);

            toast.success('Orçamento salvo com sucesso!');
        } catch (error) {
            console.error('Error saving budget items:', error);
            toast.error('Erro ao salvar orçamento');
            throw error;
        }
    }, []);

    // Create a new budget
    const createBudget = useCallback(async (projectId: string, name: string, description?: string) => {
        const targetProjectId = projectId || selectedProjectId;
        if (!targetProjectId) {
            toast.error('Nenhum projeto selecionado');
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('budgets')
                .insert([{
                    project_id: targetProjectId,
                    name,
                    description: description || null
                }])
                .select()
                .single();

            if (error) throw error;

            setBudgets(prev => [data, ...prev]);
            return data;
        } catch (error) {
            console.error('Error creating budget:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            toast.error('Erro ao criar orçamento');
            return null;
        }
    }, [selectedProjectId]);

    // Delete a budget
    const deleteBudget = useCallback(async (budgetId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', budgetId);

            if (error) throw error;

            setBudgets(prev => prev.filter(b => b.id !== budgetId));

            // Clear active budget if it was deleted
            if (activeBudget?.id === budgetId) {
                setActiveBudget(null);
                setBudgetItems([]);
            }

            return true;
        } catch (error) {
            console.error('Error deleting budget:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            toast.error('Erro ao excluir orçamento');
            return false;
        }
    }, [activeBudget]);

    // Update budget metadata
    const updateBudget = useCallback(async (budgetId: string, updates: Partial<Budget>) => {
        try {
            const { error } = await supabase
                .from('budgets')
                .update(updates)
                .eq('id', budgetId);

            if (error) throw error;

            setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, ...updates } : b));

            if (activeBudget?.id === budgetId) {
                setActiveBudget(prev => prev ? { ...prev, ...updates } : null);
            }

            toast.success('Orçamento atualizado');
        } catch (error) {
            console.error('Error updating budget:', error);
            toast.error('Erro ao atualizar orçamento');
        }
    }, [activeBudget]);

    // Auto-fetch budgets when selectedProjectId changes
    useEffect(() => {
        if (selectedProjectId) {
            // Clear previous project's data immediately
            setActiveBudget(null);
            setBudgetItems([]);
            fetchBudgets();
        } else {
            setBudgets([]);
            setActiveBudget(null);
            setBudgetItems([]);
        }
    }, [selectedProjectId, fetchBudgets]);

    // Auto-fetch items when activeBudget changes
    useEffect(() => {
        if (activeBudget) {
            fetchBudgetItems(activeBudget.id);
        } else {
            setBudgetItems([]);
        }
    }, [activeBudget, fetchBudgetItems]);

    return (
        <BudgetContext.Provider value={{
            budgets,
            activeBudget,
            setActiveBudget,
            budgetItems,
            setBudgetItems,
            loading,
            fetchBudgets,
            fetchBudgetItems,
            saveBudgetItems,
            createBudget,
            updateBudget,
            deleteBudget
        }}>
            {children}
        </BudgetContext.Provider>
    );
};

export const useBudgetContext = () => {
    const context = useContext(BudgetContext);
    if (!context) {
        throw new Error('useBudgetContext must be used within BudgetProvider');
    }
    return context;
};
