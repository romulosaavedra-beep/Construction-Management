import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Card, CardHeader } from '../Card';
import { Button } from '../Button';
import { DataTable } from '../Table/DataTable';
import { SearchableDropdown } from '../SearchableDropdown';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useConfirm } from '../../utils/useConfirm';
import { maskMobilePhone } from '../../utils/formatters';
import type { Profissional } from '../../types';
import toast from 'react-hot-toast';
import { createColumnHelper } from '@tanstack/react-table';

interface ProfessionalsSettingsProps {
    projectId?: string;
}

export const ProfessionalsSettings: React.FC<ProfessionalsSettingsProps> = ({ projectId }) => {
    const { professionals, loading, addProfessional, updateProfessional, deleteProfessional, deleteProfessionals } = useProfessionals(projectId);
    const { confirm, alert, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfissional, setCurrentProfissional] = useState<Partial<Profissional>>({});
    const [phoneError, setPhoneError] = useState("");
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [newRole, setNewRole] = useState('');

    // Roles states
    const [defaultRoles, setDefaultRoles] = useState<string[]>([]);
    const [projectRoles, setProjectRoles] = useState<string[]>([]);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                // Fetch default roles
                const { data: defaultData } = await supabase
                    .from('default_job_titles')
                    .select('title')
                    .order('title');

                if (defaultData) {
                    setDefaultRoles(defaultData.map(r => r.title));
                }

                // Fetch project specific roles
                if (projectId) {
                    const { data: projectData } = await supabase
                        .from('job_titles')
                        .select('title')
                        .eq('project_id', projectId)
                        .order('title');

                    if (projectData) {
                        setProjectRoles(projectData.map(r => r.title));
                    }
                }
            } catch (error) {
                console.error('Error fetching roles:', error);
            }
        };
        fetchRoles();
    }, [projectId]);

    // Derived state for roles
    const roles = useMemo(() => {
        const existingRoles = professionals.map(p => p.cargo);
        return Array.from(new Set([...defaultRoles, ...projectRoles, ...existingRoles])).sort();
    }, [professionals, defaultRoles, projectRoles]);

    const handleAdd = () => {
        if (!projectId) {
            alert({ message: 'Por favor, salve as Configurações Gerais primeiro para criar o projeto.' });
            return;
        }
        setCurrentProfissional({
            cargo: roles[0] || '',
            nome: '',
            email: '',
            telefone: '',
            atividades: ''
        });
        setPhoneError("");
        setIsModalOpen(true);
    };

    const handleEdit = (p: Profissional) => {
        setCurrentProfissional({ ...p });
        setPhoneError("");
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string | number) => {
        const shouldDelete = await confirm({
            title: 'Remover Profissional',
            message: 'Tem certeza que deseja remover este profissional?',
            confirmText: 'Remover',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteProfessional(id);
        }
    };

    const handleAddRole = async () => {
        if (!newRole.trim()) return;
        if (roles.includes(newRole.trim())) {
            alert({ message: 'Este cargo já existe.' });
            return;
        }

        if (!projectId) {
            alert({ message: 'Erro: Projeto não identificado.' });
            return;
        }

        try {
            const { error } = await supabase
                .from('job_titles')
                .insert([{ project_id: projectId, title: newRole.trim() }]);

            if (error) throw error;

            setProjectRoles(prev => [...prev, newRole.trim()]);
            setCurrentProfissional({ ...currentProfissional, cargo: newRole.trim() });
            setNewRole('');
            setIsCreatingRole(false);
            toast.success('Cargo adicionado!');
        } catch (error) {
            console.error('Error adding role:', error);
            toast.error('Erro ao adicionar cargo.');
        }
    };

    const handleDeleteRole = async (role: string) => {
        if (defaultRoles.includes(role)) {
            alert({ message: 'Não é possível excluir cargos padrão do sistema.' });
            return;
        }

        const usedByProfessionals = professionals.filter(p => p.cargo === role);
        if (usedByProfessionals.length > 0) {
            alert({ message: `Não é possível excluir o cargo "${role}" pois está sendo usado por ${usedByProfessionals.length} profissional(is).` });
            return;
        }

        const shouldDelete = await confirm({
            title: 'Excluir Cargo',
            message: `Tem certeza que deseja excluir o cargo "${role}"?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            try {
                const { error } = await supabase
                    .from('job_titles')
                    .delete()
                    .eq('project_id', projectId)
                    .eq('title', role);

                if (error) throw error;

                setProjectRoles(prev => prev.filter(r => r !== role));
                if (currentProfissional.cargo === role) {
                    setCurrentProfissional({ ...currentProfissional, cargo: roles[0] || '' });
                }
                toast.success('Cargo removido!');
            } catch (error) {
                console.error('Error deleting role:', error);
                toast.error('Erro ao remover cargo.');
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneError("");

        if (!currentProfissional.nome || !currentProfissional.cargo || !currentProfissional.atividades) {
            alert({ message: 'Por favor, preencha todos os campos obrigatórios (Cargo, Nome e Atividades).' });
            return;
        }

        const rawPhone = (currentProfissional.telefone || '').replace(/\D/g, '');
        if (rawPhone.length > 0) {
            if (rawPhone.length !== 11) return setPhoneError("Celular deve ter 11 dígitos.");
            if (rawPhone[2] !== '9') return setPhoneError("Celular deve começar com 9.");
        }

        if (currentProfissional.id) {
            await updateProfessional(currentProfissional as Profissional);
        } else {
            await addProfessional(currentProfissional as Omit<Profissional, 'id'>);
        }
        setIsModalOpen(false);
    };

    const columnHelper = createColumnHelper<Profissional>();

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }: any) => (
                <input
                    type="checkbox"
                    className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                    checked={table.getIsAllRowsSelected()}
                    ref={input => {
                        if (input) input.indeterminate = table.getIsSomePageRowsSelected();
                    }}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row }: any) => (
                row.original.project_id ? (
                    <input
                        type="checkbox"
                        className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        ref={input => {
                            if (input) input.indeterminate = row.getIsSomeSelected();
                        }}
                        onChange={row.getToggleSelectedHandler()}
                    />
               ) : null
            ),
            size: 40,
            enableResizing: false,
        },
        columnHelper.accessor('cargo', {
            header: 'Cargo',
            size: 150,
        }),
        columnHelper.accessor('nome', {
            header: 'Nome',
            size: 200,
            cell: info => <span className="font-medium text-white">{info.getValue()}</span>
        }),
        columnHelper.accessor('email', {
            header: 'Email',
            size: 250,
            cell: info => info.getValue() || '-'
        }),
        columnHelper.accessor('telefone', {
            header: 'Telefone',
            size: 120,
            cell: info => <span className="font-mono text-xs">{info.getValue() || '-'}</span>
        }),
        columnHelper.accessor('atividades', {
            header: 'Atividades',
            size: 400,
            meta: { isFluid: true },
            cell: info => <span title={info.getValue()}>{info.getValue() || '-'}</span>
        }),
        {
            id: 'actions',
            header: ({ table }: any) => {
                const selectedCount = table.getSelectedRowModel().rows.length;
                return selectedCount > 0 ? (
                    <button
                        onClick={async () => {
                            const shouldDelete = await confirm({
                                title: 'Excluir Profissionais',
                                message: `Tem certeza que deseja excluir ${selectedCount} profissionais selecionados?`,
                                confirmText: 'Excluir',
                                cancelText: 'Cancelar'
                            });
                            if (shouldDelete) {
                                const ids = table.getSelectedRowModel().rows.map((r: any) => String(r.original.id));
                                await deleteProfessionals(ids);
                                table.resetRowSelection();
                            }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs font-bold uppercase"
                    >
                        Apagar ({selectedCount})
                    </button>
                ) : "Ações";
            },
            cell: ({ row }: any) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(row.original)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                    <button onClick={() => handleDelete(row.original.id)} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
                </div>
            ),
            size: 0,
            minSize: 0,
        }
    ], [deleteProfessionals, confirm]);

    return (
        <>
            <DataTable
                title="Profissionais"
                columns={columns}
                data={professionals}
                onAdd={handleAdd}
                isLoading={loading}
            />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-lg border border-[#3a3e45]">
                        <div className="flex justify-between items-center p-4 border-b border-[#3a3e45]">
                            <h3 className="text-lg font-semibold text-white">{currentProfissional.id ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#a0a5b0] hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Cargo <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <SearchableDropdown
                                        options={roles}
                                        value={currentProfissional.cargo || ''}
                                        onChange={(val) => setCurrentProfissional({ ...currentProfissional, cargo: val })}
                                        placeholder="Selecione um cargo..."
                                        required
                                        className="flex-1"
                                    />
                                    {!isCreatingRole && <Button variant="secondary" size="sm" onClick={() => setIsCreatingRole(true)} type="button">+ Novo</Button>}
                                    {projectRoles.includes(currentProfissional.cargo || '') && (
                                        <button type="button" onClick={() => handleDeleteRole(currentProfissional.cargo!)} className="text-red-400 hover:text-red-500 px-2" title="Excluir cargo">🗑️</button>
                                    )}
                                </div>
                                {isCreatingRole && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            value={newRole}
                                            onChange={e => setNewRole(e.target.value)}
                                            placeholder="Digite o novo cargo"
                                            className="flex-1 bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                            autoFocus
                                        />
                                        <Button variant="primary" size="sm" onClick={handleAddRole} type="button">Adicionar</Button>
                                        <Button variant="secondary" size="sm" onClick={() => { setIsCreatingRole(false); setNewRole(''); }} type="button">Cancelar</Button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={currentProfissional.nome || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, nome: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    placeholder="Ex: João Silva"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={currentProfissional.email || ''}
                                        onChange={e => setCurrentProfissional({ ...currentProfissional, email: e.target.value })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                        placeholder="joao@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={currentProfissional.telefone || ''}
                                        onChange={e => setCurrentProfissional({ ...currentProfissional, telefone: maskMobilePhone(e.target.value) })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                        placeholder="(11) 99999-9999"
                                    />
                                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Atividades <span className="text-red-500">*</span></label>
                                <textarea
                                    value={currentProfissional.atividades || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, atividades: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    rows={4}
                                    placeholder="Ex: Coordenação de equipes, elaboração de projetos estruturais, fiscalização de obras"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                                <Button variant="primary" type="submit">Salvar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            {dialogState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1100] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-md border border-[#3a3e45] p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">{dialogState.title}</h3>
                        <p className="text-[#a0a5b0] mb-6">{dialogState.message}</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                            <Button variant="danger" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
