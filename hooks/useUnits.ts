import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';
import type { UnitItem } from '../types';

export const useUnits = (projectId?: string) => {
    const [units, setUnits] = useState<UnitItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUnits = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch default units (System Standard)
            const { data: defaultData, error: defaultError } = await supabase
                .from('default_units')
                .select('*')
                .order('category')
                .order('name');

            if (defaultError) throw defaultError;

            let customData: UnitItem[] = [];

            // 2. Fetch custom units (Project Specific)
            if (projectId) {
                const { data, error } = await supabase
                    .from('units')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('category')
                    .order('name');

                if (error) throw error;
                customData = data || [];
            }

            // Combine and sort by category, then name
            const allUnits = [...(defaultData || []), ...customData].sort((a, b) => {
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return a.name.localeCompare(b.name);
            });

            setUnits(allUnits);
        } catch (error) {
            console.error('Error fetching units:', error);
            toast.error('Erro ao carregar unidades.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const addUnit = async (unit: Omit<UnitItem, 'id'>) => {
        if (!projectId) {
            toast.error('Projeto não identificado');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('units')
                .insert([{
                    project_id: projectId,
                    category: unit.category,
                    name: unit.name,
                    symbol: unit.symbol
                }])
                .select()
                .single();

            if (error) throw error;

            const newUnit: UnitItem = {
                id: data.id,
                project_id: data.project_id,
                category: data.category,
                name: data.name,
                symbol: data.symbol
            };

            setUnits(prev => [...prev, newUnit].sort((a, b) => {
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return a.name.localeCompare(b.name);
            }));
            toast.success('Unidade adicionada!');
        } catch (error) {
            console.error('Error adding unit:', error);
            toast.error('Erro ao adicionar unidade.');
        }
    };

    const updateUnit = async (unit: UnitItem) => {
        if (!unit.project_id) {
            toast.error('Unidades padrão não podem ser editadas.');
            return;
        }

        try {
            const { error } = await supabase
                .from('units')
                .update({
                    category: unit.category,
                    name: unit.name,
                    symbol: unit.symbol
                })
                .eq('id', unit.id);

            if (error) throw error;

            setUnits(prev => prev.map(u => u.id === unit.id ? unit : u));
            toast.success('Unidade atualizada!');
        } catch (error) {
            console.error('Error updating unit:', error);
            toast.error('Erro ao atualizar unidade.');
        }
    };

    const deleteUnit = async (id: string) => {
        try {
            const { error } = await supabase
                .from('units')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setUnits(prev => prev.filter(u => u.id !== id));
            toast.success('Unidade removida!');
        } catch (error) {
            console.error('Error deleting unit:', error);
            toast.error('Erro ao remover unidade.');
        }
    };

    const deleteUnits = async (ids: string[]) => {
        try {
            const { error } = await supabase
                .from('units')
                .delete()
                .in('id', ids);

            if (error) throw error;

            setUnits(prev => prev.filter(u => !ids.includes(u.id)));
            toast.success('Unidades removidas!');
        } catch (error) {
            console.error('Error deleting units:', error);
            toast.error('Erro ao remover unidades.');
        }
    };

    useEffect(() => {
        fetchUnits();
    }, [projectId, fetchUnits]);

    return {
        units,
        loading,
        addUnit,
        updateUnit,
        deleteUnit,
        deleteUnits
    };
};
