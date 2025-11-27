import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import type { Fornecedor } from '../types';

export const useSuppliers = (projectId?: string) => {
    const [suppliers, setSuppliers] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSuppliers = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('project_id', projectId)
                .order('name');

            if (error) throw error;

            const mapped: Fornecedor[] = data.map(s => ({
                id: s.id,
                nome: s.name,
                contato: s.contact_name,
                email: s.email,
                telefone: s.phone,
                cnpj: s.cnpj,
                endereco: s.address,
                link: s.link
            }));

            setSuppliers(mapped);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            toast.error('Erro ao carregar fornecedores.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const addSupplier = async (supplier: Omit<Fornecedor, 'id'>) => {
        if (!projectId) return;
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .insert([{
                    project_id: projectId,
                    name: supplier.nome,
                    contact_name: supplier.contato,
                    email: supplier.email,
                    phone: supplier.telefone,
                    cnpj: supplier.cnpj,
                    address: supplier.endereco,
                    link: supplier.link
                }])
                .select()
                .single();

            if (error) throw error;

            const newSupplier: Fornecedor = {
                id: data.id,
                nome: data.name,
                contato: data.contact_name,
                email: data.email,
                telefone: data.phone,
                cnpj: data.cnpj,
                endereco: data.address,
                link: data.link
            };

            setSuppliers(prev => [...prev, newSupplier]);
            toast.success('Fornecedor adicionado!');
        } catch (error) {
            console.error('Error adding supplier:', error);
            toast.error('Erro ao adicionar fornecedor.');
        }
    };

    const updateSupplier = async (supplier: Fornecedor) => {
        try {
            const { error } = await supabase
                .from('suppliers')
                .update({
                    name: supplier.nome,
                    contact_name: supplier.contato,
                    email: supplier.email,
                    phone: supplier.telefone,
                    cnpj: supplier.cnpj,
                    address: supplier.endereco,
                    link: supplier.link
                })
                .eq('id', supplier.id);

            if (error) throw error;

            setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
            toast.success('Fornecedor atualizado!');
        } catch (error) {
            console.error('Error updating supplier:', error);
            toast.error('Erro ao atualizar fornecedor.');
        }
    };

    const deleteSupplier = async (id: string | number) => {
        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuppliers(prev => prev.filter(s => s.id !== id));
            toast.success('Fornecedor removido!');
        } catch (error) {
            console.error('Error deleting supplier:', error);
            toast.error('Erro ao remover fornecedor.');
        }
    };

    const deleteSuppliers = async (ids: (string | number)[]) => {
        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .in('id', ids);

            if (error) throw error;

            setSuppliers(prev => prev.filter(s => !ids.includes(s.id)));
            toast.success('Fornecedores removidos!');
        } catch (error) {
            console.error('Error deleting suppliers:', error);
            toast.error('Erro ao remover fornecedores.');
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchSuppliers();
        }
    }, [projectId, fetchSuppliers]);

    return {
        suppliers,
        loading,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        deleteSuppliers
    };
};
