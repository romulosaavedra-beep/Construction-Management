import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import type { UnitItem } from '../types';

export const useUnits = (projectId?: string) => {
    const [units, setUnits] = useState<UnitItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUnits = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('units')
                .select('*')
                .or(`project_id.eq.${projectId},project_id.is.null`)
                .order('category')
                .order('name');

            if (error) throw error;

            const mapped: UnitItem[] = data.map(u => ({
                id: u.id,
                project_id: u.project_id,
                category: u.category,
                name: u.name,
                symbol: u.symbol
            }));

            setUnits(mapped);
        } catch (error) {
            console.error('Error fetching units:', error);
            toast.error('Erro ao carregar unidades.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const addUnit = async (unit: Omit<UnitItem, 'id'>) => {
        if (!projectId) return;
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
                category: data.category,
                name: data.name,
                symbol: data.symbol
            };

            setUnits(prev => [...prev, newUnit]);
            toast.success('Unidade adicionada!');
        } catch (error) {
            console.error('Error adding unit:', error);
            toast.error('Erro ao adicionar unidade.');
        }
    };

    const updateUnit = async (unit: UnitItem) => {
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

    useEffect(() => {
        if (projectId) {
            fetchUnits();
        }
    }, [projectId, fetchUnits]);

    return {
        units,
        loading,
        addUnit,
        updateUnit,
        deleteUnit
    };
};
