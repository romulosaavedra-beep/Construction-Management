import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export interface ResourceItem {
    id: string;
    project_id?: string;
    name: string;
    category: string;
}

export const useResources = (projectId?: string) => {
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchResources = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('resources')
                .select('*')
                .order('name');

            if (projectId) {
                // Fetch project-specific resources AND global resources (project_id is null)
                query = query.or(`project_id.eq.${projectId},project_id.is.null`);
            } else {
                // If no project selected, only fetch global resources
                query = query.is('project_id', null);
            }

            const { data, error } = await query;

            if (error) throw error;
            setResources(data || []);
        } catch (error) {
            console.error('Erro ao buscar recursos:', error);
            toast.error('Erro ao carregar recursos');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const addResource = async (resource: Omit<ResourceItem, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('resources')
                .insert([{ ...resource, project_id: projectId }])
                .select()
                .single();

            if (error) throw error;

            setResources(prev => [...prev, data]);
            toast.success('Recurso adicionado com sucesso!');
            return data;
        } catch (error) {
            console.error('Erro ao adicionar recurso:', error);
            toast.error('Erro ao adicionar recurso');
            throw error;
        }
    };

    const updateResource = async (resource: ResourceItem) => {
        try {
            const { error } = await supabase
                .from('resources')
                .update({ name: resource.name, category: resource.category })
                .eq('id', resource.id);

            if (error) throw error;

            setResources(prev => prev.map(r => r.id === resource.id ? resource : r));
            toast.success('Recurso atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar recurso:', error);
            toast.error('Erro ao atualizar recurso');
            throw error;
        }
    };

    const deleteResource = async (id: string) => {
        try {
            const { error } = await supabase
                .from('resources')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setResources(prev => prev.filter(r => r.id !== id));
            toast.success('Recurso removido com sucesso!');
        } catch (error) {
            console.error('Erro ao remover recurso:', error);
            toast.error('Erro ao remover recurso');
            throw error;
        }
    };

    return {
        resources,
        loading,
        addResource,
        updateResource,
        deleteResource,
        refreshResources: fetchResources
    };
};
