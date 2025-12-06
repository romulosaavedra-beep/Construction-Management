import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from '@/components/data-table/DataTable';
import { SearchableDropdown } from '@/components/widgets/searchable-dropdown';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useConfirm } from '@/utils/useConfirm';
import { maskMobilePhone } from '@/utils/formatters';
import type { Profissional } from '@/types';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import {
    Pencil,
    Trash2,
    Plus,
    CirclePlus,
    User,
    Mail,
    Phone,
    Briefcase,
    FileText,
    Check,
    X,
    Users
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip";

interface ProfessionalsSettingsProps {
    projectId?: string;
}

export const ProfessionalsSettings: React.FC<ProfessionalsSettingsProps> = ({ projectId }) => {
    const { professionals, loading, addProfessional, updateProfessional, deleteProfessional, deleteProfessionals } = useProfessionals(projectId);
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

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
        const existingRoles = professionals.map(p => p.cargo).filter(Boolean);
        return Array.from(new Set([...defaultRoles, ...projectRoles, ...existingRoles])).sort();
    }, [professionals, defaultRoles, projectRoles]);

    const handleAdd = () => {
        if (!projectId) {
            toast.error('Selecione um projeto primeiro.');
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

    const handleDelete = async (ids: string[]) => {
        if (ids.length === 1) {
            const shouldDelete = await confirm({
                title: 'Remover Profissional',
                message: 'Tem certeza que deseja remover este profissional?',
                confirmText: 'Remover',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteProfessional(ids[0]);
                toast.success('Profissional removido.');
            }
        } else {
            const shouldDelete = await confirm({
                title: 'Excluir Profissionais',
                message: `Tem certeza que deseja excluir ${ids.length} profissionais selecionados?`,
                confirmText: 'Excluir Seleção',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteProfessionals(ids);
                toast.success(`${ids.length} profissionais removidos.`);
            }
        }
    };

    const handleAddRole = async () => {
        if (!newRole.trim()) return;
        if (roles.includes(newRole.trim())) {
            toast.error('Este cargo já existe.');
            return;
        }

        if (!projectId) {
            toast.error('Erro: Projeto não identificado.');
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
            toast.error('Não é possível excluir cargos padrão do sistema.');
            return;
        }

        const usedByProfessionals = professionals.filter(p => p.cargo === role);
        if (usedByProfessionals.length > 0) {
            toast.error(`Cargo em uso por ${usedByProfessionals.length} profissional(is).`);
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
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        const rawPhone = (currentProfissional.telefone || '').replace(/\D/g, '');
        if (rawPhone.length > 0) {
            if (rawPhone.length !== 11) {
                setPhoneError("Celular deve ter 11 dígitos.");
                return;
            }
            if (rawPhone[2] !== '9') {
                setPhoneError("Celular deve começar com 9.");
                return;
            }
        }

        try {
            if (currentProfissional.id) {
                await updateProfessional(currentProfissional as Profissional);
                toast.success('Profissional atualizado!');
            } else {
                await addProfessional(currentProfissional as Omit<Profissional, 'id'>);
                toast.success('Profissional criado!');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar profissional.');
        }
    };

    const columnHelper = createColumnHelper<Profissional>();

    const columns = useMemo(() => [
        // 1. Checkbox Column (Fixed 48px)
        {
            id: 'select',
            header: ({ table }: any) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        className="rounded border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-[var(--ds-primary-500)] focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer transition-colors"
                        checked={table.getIsAllPageRowsSelected()}
                        ref={input => {
                            if (input) input.indeterminate = table.getIsSomePageRowsSelected();
                        }}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                </div>
            ),
            cell: ({ row }: any) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        className="rounded border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-[var(--ds-primary-500)] focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer transition-colors"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                </div>
            ),
            size: 48,
            minSize: 48,
            enableResizing: false,
        },
        // 2. Cargo
        columnHelper.accessor('cargo', {
            header: 'Cargo',
            size: 350,
            minSize: 200,
            cell: info => (
                <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-[var(--ds-text-secondary)]" />
                    <span className="text-[var(--ds-text-primary)]">{info.getValue()}</span>
                </div>
            )
        }),
        // 3. Nome
        columnHelper.accessor('nome', {
            header: 'Nome',
            size: 250,
            minSize: 150,
            cell: info => (
                <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[var(--ds-text-secondary)]" />
                    <span className="font-medium text-[var(--ds-text-primary)]">{info.getValue()}</span>
                </div>
            )
        }),
        // 4. Email
        columnHelper.accessor('email', {
            header: 'Email',
            size: 250,
            minSize: 150,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{info.getValue()}</span>
                </div>
            ) : <span className="text-[var(--ds-text-tertiary)]">-</span>
        }),
        // 5. Telefone
        columnHelper.accessor('telefone', {
            header: 'Telefone',
            size: 160,
            minSize: 120,
            cell: info => info.getValue() ? (
                <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs">{info.getValue()}</span>
                </div>
            ) : <span className="text-[var(--ds-text-tertiary)]">-</span>
        }),
        // 6. Atividades (Fluid)
        columnHelper.accessor('atividades', {
            header: 'Atividades',
            size: 300,
            minSize: 250,
            meta: { isFluid: true },
            cell: info => (
                <div className="flex items-center gap-2 text-[var(--ds-text-secondary)]" title={info.getValue()}>
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{info.getValue() || '-'}</span>
                </div>
            )
        }),
        // 7. Actions (Fixed Right)
        {
            id: 'actions',
            header: 'Ações',
            size: 100,
            minSize: 100,
            enableResizing: false,
            cell: ({ row }: any) => (
                <div className="flex justify-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(row.original)}
                                className="h-8 w-8"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">Editar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete([row.original.id])}
                                className="h-8 w-8 text-[var(--ds-error)] hover:text-[var(--ds-error-hover)] hover:bg-[var(--ds-error-bg)]"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">Excluir</TooltipContent>
                    </Tooltip>
                </div>
            )
        }
    ], [deleteProfessional, deleteProfessionals, confirm]);

    return (
        <TooltipProvider>
            <DataTable
                title={
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-[var(--ds-primary-500)]" />
                        Profissionais
                    </div>
                }
                columns={columns}
                data={professionals}
                onAdd={handleAdd}
                onDelete={handleDelete}
                isLoading={loading}
                searchPlaceholder="Buscar profissionais..."
                initialSorting={[{ id: 'nome', desc: false }]}
            />

            {/* Modal Criar/Editar */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[550px] bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-2xl)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {currentProfissional.id ? (
                                <Pencil className="w-4 h-4 text-[var(--ds-primary-500)]" />
                            ) : (
                                <CirclePlus className="w-4 h-4 text-[var(--ds-primary-500)]" />
                            )}
                            {currentProfissional.id ? 'Editar Profissional' : 'Novo Profissional'}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--ds-text-secondary)]">
                            Preencha os dados do profissional abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        {/* Cargo com Seleção Avançada */}
                        <div className="space-y-2">
                            <Label required>Cargo</Label>

                            <div className="flex items-center gap-2 bg-[var(--ds-bg-surface)] p-1 rounded-[var(--ds-radius-md)] border border-[var(--ds-border-default)]">
                                {isCreatingRole ? (
                                    <div className="flex items-center w-full animate-in fade-in slide-in-from-left-2">
                                        <Input
                                            value={newRole}
                                            onChange={e => setNewRole(e.target.value)}
                                            placeholder="Novo cargo..."
                                            className="flex-1 bg-transparent border-none h-8"
                                            autoFocus
                                        />
                                        <div className="w-px h-4 bg-[var(--ds-border-default)] mx-1" />
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" onClick={handleAddRole} type="button" className="h-8 w-8 text-[var(--ds-primary-500)] hover:bg-[var(--ds-primary-500)]/10">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Confirmar</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" onClick={() => { setIsCreatingRole(false); setNewRole(''); }} type="button" className="h-8 w-8">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Cancelar</TooltipContent>
                                        </Tooltip>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <SearchableDropdown
                                                options={roles}
                                                value={currentProfissional.cargo || ''}
                                                onChange={(val) => setCurrentProfissional({ ...currentProfissional, cargo: val })}
                                                placeholder="Selecione um cargo..."
                                                required
                                                className="w-full border-none bg-transparent"
                                            />
                                        </div>

                                        <div className="w-px h-4 bg-[var(--ds-border-default)] mx-1" />

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setIsCreatingRole(true)}
                                                    type="button"
                                                    className="h-8 w-8 text-[var(--ds-primary-500)] hover:bg-[var(--ds-primary-500)]/10"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Novo Cargo</TooltipContent>
                                        </Tooltip>

                                        {projectRoles.includes(currentProfissional.cargo || '') && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        type="button"
                                                        onClick={() => handleDeleteRole(currentProfissional.cargo!)}
                                                        className="h-8 w-8 text-[var(--ds-error)] hover:bg-[var(--ds-error-bg)]"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Excluir Cargo</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Nome */}
                        <div className="space-y-2">
                            <Label required>Nome</Label>
                            <Input
                                value={currentProfissional.nome || ''}
                                onChange={e => setCurrentProfissional({ ...currentProfissional, nome: e.target.value })}
                                placeholder="Ex: João Silva"
                                required
                                fullWidth
                            />
                        </div>

                        {/* Email e Telefone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={currentProfissional.email || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, email: e.target.value })}
                                    placeholder="joao@exemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    value={currentProfissional.telefone || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, telefone: maskMobilePhone(e.target.value) })}
                                    placeholder="(11) 99999-9999"
                                    error={!!phoneError}
                                />
                                {phoneError && <FormMessage type="error">{phoneError}</FormMessage>}
                            </div>
                        </div>

                        {/* Atividades */}
                        <div className="space-y-2">
                            <Label required>Atividades</Label>
                            <Textarea
                                value={currentProfissional.atividades || ''}
                                onChange={e => setCurrentProfissional({ ...currentProfissional, atividades: e.target.value })}
                                className="bg-[var(--ds-bg-surface)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)]"
                                rows={4}
                                placeholder="Ex: Coordenação de equipes, elaboração de projetos estruturais"
                                required
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                            <Button type="submit" variant="primary">Salvar Alterações</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[400px] bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] shadow-[var(--ds-shadow-2xl)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-[var(--ds-error)]" />
                            {dialogState.title}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--ds-text-secondary)] pt-2">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};
