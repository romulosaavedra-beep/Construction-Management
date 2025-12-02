import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import type { OrcamentoItem } from '../types';

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

export const useBudgets = (projectId?: string) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
    const [budgetItems, setBudgetItems] = useState<OrcamentoItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch all budgets for a project
    const fetchBudgets = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('budgets')
                .select('*')
                .eq('project_id', projectId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setBudgets(data || []);

            // Auto-select first budget if none selected
            if (data && data.length > 0 && !activeBudget) {
                setActiveBudget(data[0]);
            }
        } catch (error) {
            console.error('Error fetching budgets:', error);
            toast.error('Erro ao carregar orçamentos');
        } finally {
            setLoading(false);
        }
    }, [projectId, activeBudget]);

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
                expandido: item.expandido,
                use_total_unit: item.use_total_unit,
                sourceMetadata: item.source_metadata
            }));

            setBudgetItems(items);
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
    const createBudget = useCallback(async (name: string, description?: string) => {
        if (!projectId) {
            toast.error('Nenhum projeto selecionado');
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('budgets')
                .insert([{
                    project_id: projectId,
                    name,
                    description: description || null
                }])
                .select()
                .single();

            if (error) throw error;

            setBudgets(prev => [data, ...prev]);
            toast.success('Orçamento criado com sucesso!');
            return data;
        } catch (error) {
            console.error('Error creating budget:', error);
            toast.error('Erro ao criar orçamento');
            return null;
        }
    }, [projectId]);

    // Delete a budget
    const deleteBudget = useCallback(async (budgetId: string) => {
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

            toast.success('Orçamento excluído');
        } catch (error) {
            console.error('Error deleting budget:', error);
            toast.error('Erro ao excluir orçamento');
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

    // Auto-fetch budgets when projectId changes
    useEffect(() => {
        if (projectId) {
            fetchBudgets();
        } else {
            setBudgets([]);
            setActiveBudget(null);
            setBudgetItems([]);
        }
    }, [projectId, fetchBudgets]);

    // Auto-fetch items when activeBudget changes
    useEffect(() => {
        if (activeBudget) {
            fetchBudgetItems(activeBudget.id);
        } else {
            setBudgetItems([]);
        }
    }, [activeBudget, fetchBudgetItems]);

    return {
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
    };
};
