import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useResources, ResourceItem } from '../../hooks/useResources';
import { useConfirm } from '../../utils/useConfirm';
import { SearchableDropdown } from '../SearchableDropdown';
import { DataTable } from '../Table/DataTable';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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

    // Extract unique categories for dropdown
    const categories = useMemo(() => {
        const cats = new Set(resources.map(r => r.category).filter(Boolean));
        return Array.from(new Set([...cats, ...customCategories])).sort();
    }, [resources, customCategories]);

    const handleAdd = () => {
        if (!projectId) {
            alert('Por favor, salve as Configurações Gerais primeiro para criar o projeto.');
            return;
        }
        setCurrentResource({ category: '' });
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
            }
        } else {
            const shouldDelete = await confirm({
                title: 'Excluir Recursos',
                message: `Tem certeza que deseja excluir ${ids.length} recursos selecionados?`,
                confirmText: 'Excluir',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteResources(ids);
            }
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        const formatted = newCategory.trim().startsWith('@') ? newCategory.trim() : `@${newCategory.trim()}`;
        if (categories.includes(formatted)) {
            alert('Esta categoria já existe.');
            return;
        }
        setCustomCategories(prev => [...prev, formatted]);
        setCurrentResource({ ...currentResource, category: formatted });
        setNewCategory('');
        setIsCreatingCategory(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentResource.name || !currentResource.category) return;

        let resourceToSave = { ...currentResource };

        // Add '@' prefix to category for new resources if not present
        if (!resourceToSave.id && !resourceToSave.category.startsWith('@')) {
            resourceToSave.category = `@${resourceToSave.category}`;
        }

        if (resourceToSave.id) {
            await updateResource(resourceToSave as ResourceItem);
        } else {
            await addResource(resourceToSave as Omit<ResourceItem, 'id'>);
        }
        setIsModalOpen(false);
    };

    const columnHelper = createColumnHelper<ResourceItem>();

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }: any) => (
                <input
                    type="checkbox"
                    className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                    checked={table.getIsAllPageRowsSelected()}
                    ref={input => {
                        if (input) input.indeterminate = table.getIsSomePageRowsSelected();
                    }}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
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
        columnHelper.accessor('category', {
            header: 'Categoria',
            size: 200,
        }),
        columnHelper.accessor('name', {
            header: 'Nome',
            size: 400,
            meta: { isFluid: true },
            cell: info => <span className="font-medium text-white">{info.getValue()}</span>
        }),
        {
            id: 'actions',
            header: 'Ações',
            size: 80,
            enableResizing: false,
            cell: ({ row }: any) => (
                row.original.project_id ? (
                    <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} className="h-8 w-8 text-[#a0a5b0] hover:text-white" title="Editar">
                            ✏️
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete([row.original.id])} className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-900/20" title="Excluir">
                            🗑️
                        </Button>
                    </div>
                ) : (
                    <span className="text-[#4a4e55] text-xs italic">Padrão</span>
                )
            )
        }
    ], [deleteResource, deleteResources, confirm]);

    return (
        <>
            <DataTable
                title="Recursos"
                columns={columns}
                data={resources}
                onAdd={handleAdd}
                onDelete={handleDelete}
                isLoading={loading}
            />

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[450px] bg-[#242830] border-[#3a3e45] text-[#e8eaed]">
                    <DialogHeader>
                        <DialogTitle className="text-white">{currentResource.id ? 'Editar Recurso' : 'Novo Recurso'}</DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            Preencha os dados do recurso abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-sm font-medium">Categoria <span className="text-red-500">*</span></Label>
                            <div className="flex gap-2">
                                <SearchableDropdown
                                    options={categories}
                                    value={currentResource.category || ''}
                                    onChange={(val) => setCurrentResource({ ...currentResource, category: val })}
                                    placeholder="Selecione uma categoria..."
                                    required
                                    className="flex-1"
                                />
                                {!isCreatingCategory && <Button variant="secondary" size="sm" onClick={() => setIsCreatingCategory(true)} type="button">+ Novo</Button>}
                                {customCategories.includes(currentResource.category || '') && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        onClick={() => {
                                            setCustomCategories(prev => prev.filter(c => c !== currentResource.category));
                                            setCurrentResource({ ...currentResource, category: categories[0] || '' });
                                        }}
                                        className="h-9 w-9 text-red-400 hover:text-red-500 hover:bg-red-900/20"
                                        title="Excluir categoria"
                                    >
                                        🗑️
                                    </Button>
                                )}
                            </div>
                            {isCreatingCategory && (
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                        placeholder="Digite a nova categoria (ex: Equipamentos)"
                                        className="flex-1 bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                        autoFocus
                                    />
                                    <Button variant="default" size="sm" onClick={handleAddCategory} type="button" className="bg-[#0084ff] hover:bg-[#0073e6]">Adicionar</Button>
                                    <Button variant="secondary" size="sm" onClick={() => { setIsCreatingCategory(false); setNewCategory(''); }} type="button">Cancelar</Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">Nome <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={currentResource.name || ''}
                                onChange={e => setCurrentResource({ ...currentResource, name: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                required
                                placeholder="Ex: Escavadeira"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                            <Button type="submit" className="bg-[#0084ff] hover:bg-[#0073e6] text-white">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[425px] bg-[#242830] border-[#3a3e45] text-[#e8eaed]">
                    <DialogHeader>
                        <DialogTitle className="text-white">{dialogState.title}</DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
