import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useResources, ResourceItem } from '../../hooks/useResources';
import { useConfirm } from '../../utils/useConfirm';
import { SearchableDropdown } from '../SearchableDropdown';
import { DataTable } from '../Table/DataTable';
import { Button } from '../Button';

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
                        <button onClick={() => handleEdit(row.original)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                        <button onClick={() => handleDelete([row.original.id])} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
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
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-md border border-[#3a3e45]">
                        <div className="flex justify-between items-center p-4 border-b border-[#3a3e45]">
                            <h3 className="text-lg font-semibold text-white">{currentResource.id ? 'Editar Recurso' : 'Novo Recurso'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#a0a5b0] hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoria <span className="text-red-500">*</span></label>
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
                                        <button type="button" onClick={() => {
                                            setCustomCategories(prev => prev.filter(c => c !== currentResource.category));
                                            setCurrentResource({ ...currentResource, category: categories[0] || '' });
                                        }} className="text-red-400 hover:text-red-500 px-2" title="Excluir categoria">🗑️</button>
                                    )}
                                </div>
                                {isCreatingCategory && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            value={newCategory}
                                            onChange={e => setNewCategory(e.target.value)}
                                            placeholder="Digite a nova categoria (ex: Equipamentos)"
                                            className="flex-1 bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                            autoFocus
                                        />
                                        <Button variant="primary" size="sm" onClick={handleAddCategory} type="button">Adicionar</Button>
                                        <Button variant="secondary" size="sm" onClick={() => { setIsCreatingCategory(false); setNewCategory(''); }} type="button">Cancelar</Button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={currentResource.name || ''}
                                    onChange={e => setCurrentResource({ ...currentResource, name: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    required
                                    placeholder="Ex: Escavadeira"
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
