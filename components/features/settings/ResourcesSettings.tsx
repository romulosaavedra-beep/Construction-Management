import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useResources, ResourceItem } from '@/hooks/useResources';
import { useConfirm } from '@/utils/useConfirm';
import { SearchableDropdown } from '@/components/widgets/searchable-dropdown';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Pencil,
    Trash2,
    Plus,
    CirclePlus,
    X,
    Check,
    Package
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip";
import { toast } from 'sonner'; // ✅ MUDANÇA: sonner

interface ResourcesSettingsProps {
    projectId?: string;
}

export const ResourcesSettings: React.FC<ResourcesSettingsProps> = ({ projectId }) => {
    const { resources, loading, addResource, updateResource, deleteResource, deleteResources } = useResources(projectId);
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentResource, setCurrentResource] = useState<Partial<ResourceItem>>({});
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [customCategories, setCustomCategories] = useState<string[]>([]);

    const categories = useMemo(() => {
        const cats = new Set(resources.map(r => r.category).filter(Boolean));
        return Array.from(new Set([...cats, ...customCategories])).sort();
    }, [resources, customCategories]);

    const handleAdd = () => {
        if (!projectId) {
            toast.error('Selecione um projeto primeiro.');
            return;
        }
        setCurrentResource({
            category: categories[0] || ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (r: ResourceItem) => {
        setCurrentResource({ ...r });
        setIsModalOpen(true);
    };

    const handleDelete = async (ids: string[]) => {
        if (ids.length === 1) {
            const shouldDelete = await confirm({
                title: 'Remover Recurso',
                message: 'Tem certeza que deseja remover este recurso?',
                confirmText: 'Remover',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteResource(ids[0]);
                toast.success('Recurso removido.');
            }
        } else {
            const shouldDelete = await confirm({
                title: 'Excluir Recursos',
                message: `Tem certeza que deseja excluir ${ids.length} recursos selecionados?`,
                confirmText: 'Excluir Seleção',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteResources(ids);
                toast.success(`${ids.length} recursos removidos.`);
            }
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        const formatted = newCategory.trim().startsWith('@') ? newCategory.trim() : `@${newCategory.trim()}`;
        if (categories.includes(formatted)) {
            toast.error('Esta categoria já existe.');
            return;
        }
        setCustomCategories(prev => [...prev, formatted]);
        setCurrentResource({ ...currentResource, category: formatted });
        setNewCategory('');
        setIsCreatingCategory(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentResource.name || !currentResource.category) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        let resourceToSave = { ...currentResource };

        if (!resourceToSave.id && resourceToSave.category && !resourceToSave.category.startsWith('@')) {
            resourceToSave.category = `@${resourceToSave.category}`;
        }

        try {
            if (resourceToSave.id) {
                await updateResource(resourceToSave as ResourceItem);
                toast.success('Recurso atualizado!');
            } else {
                await addResource(resourceToSave as Omit<ResourceItem, 'id'>);
                toast.success('Recurso criado!');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar recurso.');
        }
    };

    const columnHelper = createColumnHelper<ResourceItem>();

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }: any) => {
                const rows = table.getRowModel().rows;
                const userRows = rows.filter((r: any) => r.original.project_id);
                const allUserRowsSelected = userRows.length > 0 && userRows.every((r: any) => r.getIsSelected());
                const someUserRowsSelected = userRows.some((r: any) => r.getIsSelected());

                return (
                    <div className="flex justify-center">
                        <input
                            type="checkbox"
                            className="rounded border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-[var(--ds-primary-500)] focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer transition-colors"
                            checked={allUserRowsSelected}
                            ref={input => {
                                if (input) input.indeterminate = someUserRowsSelected && !allUserRowsSelected;
                            }}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                userRows.forEach((row: any) => row.toggleSelected(checked));
                            }}
                            disabled={userRows.length === 0}
                        />
                    </div>
                );
            },
            cell: ({ row }: any) => (
                row.original.project_id ? (
                    <div className="flex justify-center">
                        <input
                            type="checkbox"
                            className="rounded border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-[var(--ds-primary-500)] focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer transition-colors"
                            checked={row.getIsSelected()}
                            disabled={!row.getCanSelect()}
                            onChange={row.getToggleSelectedHandler()}
                        />
                    </div>
                ) : null
            ),
            size: 48,
            minSize: 48,
            enableResizing: false,
        },
        columnHelper.accessor('category', {
            header: 'Categoria',
            size: 300,
            minSize: 250,
            cell: info => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--ds-bg-elevated)] text-[var(--ds-text-secondary)] border border-[var(--ds-border-default)]">
                    {info.getValue()}
                </span>
            )
        }),
        columnHelper.accessor('name', {
            header: 'Nome do Recurso',
            size: 400,
            minSize: 250,
            meta: { isFluid: true },
            cell: info => (
                <span className="font-medium text-[var(--ds-text-primary)] pl-1">{info.getValue()}</span>
            )
        }),
        {
            id: 'actions',
            header: 'Ações',
            size: 100,
            minSize: 100,
            enableResizing: false,
            cell: ({ row }: any) => (
                row.original.project_id ? (
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
                            <TooltipContent side="bottom" align="end">
                                <p>Editar</p>
                            </TooltipContent>
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
                            <TooltipContent side="bottom" align="end">
                                <p>Excluir</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <span className="text-[var(--ds-text-disabled)] text-[10px] uppercase font-bold tracking-wider">Padrão</span>
                    </div>
                )
            )
        }
    ], [deleteResource, deleteResources, confirm]);

    return (
        <TooltipProvider>
            <DataTable
                title={
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[var(--ds-primary-500)]" />
                        Recursos
                    </div>
                }
                columns={columns}
                data={resources}
                onAdd={handleAdd}
                onDelete={handleDelete}
                isLoading={loading}
                searchPlaceholder="Buscar recursos..."
                initialSorting={[{ id: 'category', desc: false }]}
            />

            {/* Modal Criar/Editar */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[450px] bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-2xl)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {currentResource.id ? (
                                <Pencil className="w-4 h-4 text-[var(--ds-primary-500)]" />
                            ) : (
                                <CirclePlus className="w-4 h-4 text-[var(--ds-primary-500)]" />
                            )}
                            {currentResource.id ? 'Editar Recurso' : 'Novo Recurso'}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--ds-text-secondary)]">
                            Gerencie os recursos (equipamentos, ferramentas) disponíveis para a obra.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-5 py-4">
                        {/* Categoria com Seleção Avançada */}
                        <div className="space-y-2">
                            <Label required>Categoria</Label>

                            <div className="flex items-center gap-2 bg-[var(--ds-bg-surface)] p-1 rounded-lg border border-[var(--ds-border-default)]">
                                {isCreatingCategory ? (
                                    <div className="flex items-center w-full animate-in fade-in slide-in-from-left-2">
                                        <Input
                                            value={newCategory}
                                            onChange={e => setNewCategory(e.target.value)}
                                            placeholder="Nova categoria..."
                                            className="flex-1 bg-transparent border-none h-8"
                                            autoFocus
                                        />
                                        <div className="w-px h-4 bg-[var(--ds-border-default)] mx-1" />
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={handleAddCategory}
                                                    type="button"
                                                    className="h-8 w-8 text-[var(--ds-primary-500)] hover:bg-[var(--ds-primary-bg)]"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Confirmar</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => { setIsCreatingCategory(false); setNewCategory(''); }}
                                                    type="button"
                                                    className="h-8 w-8"
                                                >
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
                                                options={categories}
                                                value={currentResource.category || ''}
                                                onChange={(val) => setCurrentResource({ ...currentResource, category: val })}
                                                placeholder="Selecione..."
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
                                                    onClick={() => setIsCreatingCategory(true)}
                                                    type="button"
                                                    className="h-8 w-8 text-[var(--ds-primary-500)] hover:bg-[var(--ds-primary-bg)]"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Nova Categoria</TooltipContent>
                                        </Tooltip>

                                        {customCategories.includes(currentResource.category || '') && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        type="button"
                                                        onClick={() => {
                                                            setCustomCategories(prev => prev.filter(c => c !== currentResource.category));
                                                            setCurrentResource({ ...currentResource, category: categories[0] || '' });
                                                        }}
                                                        className="h-8 w-8 text-[var(--ds-error)] hover:bg-[var(--ds-error-bg)]"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Excluir Categoria</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Nome do Recurso */}
                        <div className="space-y-2">
                            <Label required>Nome do Recurso</Label>
                            <Input
                                value={currentResource.name || ''}
                                onChange={e => setCurrentResource({ ...currentResource, name: e.target.value })}
                                required
                                placeholder="Ex: Escavadeira Hidráulica"
                                fullWidth
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary">
                                Salvar Alterações
                            </Button>
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
                        <Button variant="ghost" onClick={handleCancel}>
                            {dialogState.cancelText || 'Cancelar'}
                        </Button>
                        <Button variant="destructive" onClick={handleConfirm}>
                            {dialogState.confirmText || 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};
