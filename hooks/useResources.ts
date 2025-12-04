import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

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

            // 1. Fetch default resources (System Standard)
            const { data: defaultData, error: defaultError } = await supabase
                .from('default_resources')
                .select('*')
                .order('name');

            if (defaultError) throw defaultError;

            let customData: ResourceItem[] = [];

            // 2. Fetch custom resources (Project Specific)
            if (projectId) {
                const { data, error } = await supabase
                    .from('resources')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('name');

                if (error) throw error;
                customData = data || [];
            }

            // Combine and sort by name
            const allResources = [...(defaultData || []), ...customData].sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            setResources(allResources);
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
        if (!projectId) {
            toast.error('Projeto não identificado');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('resources')
                .insert([{ ...resource, project_id: projectId }])
                .select()
                .single();

            if (error) throw error;

            setResources(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            toast.success('Recurso adicionado com sucesso!');
            return data;
        } catch (error) {
            console.error('Erro ao adicionar recurso:', error);
            toast.error('Erro ao adicionar recurso');
            throw error;
        }
    };

    const updateResource = async (resource: ResourceItem) => {
        if (!resource.project_id) {
            toast.error('Recursos padrão não podem ser editados.');
            return;
        }

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

    const deleteResources = async (ids: string[]) => {
        try {
            const { error } = await supabase
                .from('resources')
                .delete()
                .in('id', ids);

            if (error) throw error;

            setResources(prev => prev.filter(r => !ids.includes(r.id)));
            toast.success('Recursos removidos com sucesso!');
        } catch (error) {
            console.error('Erro ao remover recursos:', error);
            toast.error('Erro ao remover recursos');
            throw error;
        }
    };

    return {
        resources,
        loading,
        addResource,
        updateResource,
        deleteResource,
        deleteResources,
        refreshResources: fetchResources
    };
};
