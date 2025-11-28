import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export interface ProjectSummary {
    id: string;
    name: string;
    company?: string;
    created_at: string;
}

export const useProjects = () => {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, company, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setProjects(data || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Erro ao carregar projetos.');
        } finally {
            setLoading(false);
        }
    }, []);

    const createProject = async (name: string) => {
        // Check for duplicate name
        const nameExists = projects.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (nameExists) {
            toast.error('Já existe um projeto com este nome.');
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('projects')
                .insert([{ name: name.trim(), settings: {} }]) // Initialize with empty settings
                .select('id, name, company, created_at')
                .single();

            if (error) throw error;

            setProjects(prev => [data, ...prev]);
            toast.success('Projeto criado com sucesso!');
            return data;
        } catch (error) {
            console.error('Error creating project:', error);
            toast.error('Erro ao criar projeto.');
            return null;
        }
    };

    const deleteProject = async (id: string) => {
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProjects(prev => prev.filter(p => p.id !== id));
            toast.success('Projeto excluído com sucesso!');
            return true;
        } catch (error) {
            console.error('Error deleting project:', error);
            toast.error('Erro ao excluir projeto.');
            return false;
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    return {
        projects,
        loading,
        fetchProjects,
        createProject,
        deleteProject
    };
};
