import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import type { Profissional } from '../types';

export const useProfessionals = (projectId?: string) => {
    const [professionals, setProfessionals] = useState<Profissional[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchProfessionals = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('professionals')
                .select('*')
                .eq('project_id', projectId)
                .order('name');

            if (error) throw error;

            const mapped: Profissional[] = data.map(p => ({
                id: p.id,
                cargo: p.role,
                nome: p.name,
                email: p.email,
                telefone: p.phone,
                atividades: p.activities
            }));

            setProfessionals(mapped);
        } catch (error) {
            console.error('Error fetching professionals:', error);
            toast.error('Erro ao carregar profissionais.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const addProfessional = async (prof: Omit<Profissional, 'id'>) => {
        if (!projectId) return;
        try {
            const { data, error } = await supabase
                .from('professionals')
                .insert([{
                    project_id: projectId,
                    role: prof.cargo,
                    name: prof.nome,
                    email: prof.email,
                    phone: prof.telefone,
                    activities: prof.atividades
                }])
                .select()
                .single();

            if (error) throw error;

            const newProf: Profissional = {
                id: data.id,
                cargo: data.role,
                nome: data.name,
                email: data.email,
                telefone: data.phone,
                atividades: data.activities
            };

            setProfessionals(prev => [...prev, newProf]);
            toast.success('Profissional adicionado!');
        } catch (error) {
            console.error('Error adding professional:', error);
            toast.error('Erro ao adicionar profissional.');
        }
    };

    const updateProfessional = async (prof: Profissional) => {
        try {
            const { error } = await supabase
                .from('professionals')
                .update({
                    role: prof.cargo,
                    name: prof.nome,
                    email: prof.email,
                    phone: prof.telefone,
                    activities: prof.atividades
                })
                .eq('id', prof.id);

            if (error) throw error;

            setProfessionals(prev => prev.map(p => p.id === prof.id ? prof : p));
            toast.success('Profissional atualizado!');
        } catch (error) {
            console.error('Error updating professional:', error);
            toast.error('Erro ao atualizar profissional.');
        }
    };

    const deleteProfessional = async (id: string | number) => {
        try {
            const { error } = await supabase
                .from('professionals')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProfessionals(prev => prev.filter(p => p.id !== id));
            toast.success('Profissional removido!');
        } catch (error) {
            console.error('Error deleting professional:', error);
            toast.error('Erro ao remover profissional.');
        }
    };

    const deleteProfessionals = async (ids: (string | number)[]) => {
        try {
            const { error } = await supabase
                .from('professionals')
                .delete()
                .in('id', ids);

            if (error) throw error;

            setProfessionals(prev => prev.filter(p => !ids.includes(p.id)));
            toast.success('Profissionais removidos!');
        } catch (error) {
            console.error('Error deleting professionals:', error);
            toast.error('Erro ao remover profissionais.');
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchProfessionals();
        }
    }, [projectId, fetchProfessionals]);

    return {
        professionals,
        loading,
        addProfessional,
        updateProfessional,
        deleteProfessional,
        deleteProfessionals
    };
};
