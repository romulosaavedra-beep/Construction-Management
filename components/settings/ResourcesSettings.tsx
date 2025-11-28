import React, { useState, useMemo } from 'react';
import { Card, CardHeader } from '../Card';
import { Button } from '../Button';
import { ResizableTh } from '../Table/ResizableTh';
import { useResources, ResourceItem } from '../../hooks/useResources';
import { useColumnWidths } from '../../hooks/useColumnWidths';
import { useConfirm } from '../../utils/useConfirm';
import { SearchableDropdown } from '../SearchableDropdown';

interface ResourcesSettingsProps {
    projectId?: string;
}

export const ResourcesSettings: React.FC<ResourcesSettingsProps> = ({ projectId }) => {
    const { resources, loading, addResource, updateResource, deleteResource, deleteResources } = useResources(projectId);
    const { colWidths, updateColumnWidth } = useColumnWidths('vobi-settings-sort-resources');
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentResource, setCurrentResource] = useState<Partial<ResourceItem>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof ResourceItem; direction: 'asc' | 'desc' } | null>({ key: 'category', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [customCategories, setCustomCategories] = useState<string[]>([]);

    // Extract unique categories for dropdown
    const categories = useMemo(() => {
        const cats = new Set(resources.map(r => r.category).filter(Boolean));
        return Array.from(new Set([...cats, ...customCategories])).sort();
    }, [resources, customCategories]);

    const filteredAndSortedResources = useMemo(() => {
        let items = [...resources];

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            items = items.filter(r =>
                r.name.toLowerCase().includes(search) ||
                r.category.toLowerCase().includes(search)
            );
        }

        // Apply sorting
        if (sortConfig) {
            items.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '').toLowerCase();
                const bVal = String(b[sortConfig.key] || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [resources, sortConfig, searchTerm]);

    const requestSort = (key: keyof ResourceItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <span className="text-[#4a4e55] ml-1 text-[10px]">▼</span>;
        return <span className="text-[#0084ff] ml-1 text-[10px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

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

    const handleDelete = async (id: string) => {
        const shouldDelete = await confirm({
            title: 'Remover Recurso',
            message: 'Tem certeza que deseja remover este recurso?',
            confirmText: 'Remover',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteResource(id);
            if (selectedIds.has(id)) {
                const newSelected = new Set(selectedIds);
                newSelected.delete(id);
                setSelectedIds(newSelected);
            }
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const userResources = filteredAndSortedResources.filter(r => r.project_id).map(r => r.id);
            setSelectedIds(new Set(userResources));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        const shouldDelete = await confirm({
            title: 'Excluir Recursos',
            message: `Tem certeza que deseja excluir ${selectedIds.size} recursos selecionados?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteResources(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const userResourcesCount = filteredAndSortedResources.filter(r => r.project_id).length;
    const isAllSelected = userResourcesCount > 0 && selectedIds.size === userResourcesCount;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < userResourcesCount;

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

    return (
        <>
            <Card>
                <CardHeader title="Recursos">
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            placeholder="🔍 Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-32 bg-[#1e2329] border border-[#3a3e45] rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0084ff] outline-none"
                        />
                        <Button variant="primary" onClick={handleAdd}>+ Adicionar</Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-[#a0a5b0]">
                            {/* HEADER */}
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-30 shadow-sm">
                                <tr>
                                    {/* CHECKBOX: Sticky Left */}
                                    <th className="px-4 py-3 w-0 text-center sticky left-0 z-30 bg-[#242830] border-r border-[#3a3e45]">
                                        <input
                                            type="checkbox"
                                            className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                                            checked={isAllSelected}
                                            ref={input => {
                                                if (input) input.indeterminate = isIndeterminate;
                                            }}
                                            onChange={handleSelectAll}
                                            disabled={userResourcesCount === 0}
                                        />
                                    </th>

                                    {/* CATEGORIA */}
                                    <ResizableTh
                                        tableId="resources"
                                        colKey="category"
                                        initialWidth="30%"
                                        onSort={() => requestSort('category')}
                                        sortIndicator={getSortIndicator('category')}
                                        colWidths={colWidths}
                                        onUpdateWidth={updateColumnWidth}
                                    >
                                        Categoria
                                    </ResizableTh>

                                    {/* NOME: Adicionado !border-r-0 para remover a borda direita */}
                                    <ResizableTh
                                        tableId="resources"
                                        colKey="name"
                                        initialWidth="70%"
                                        onSort={() => requestSort('name')}
                                        sortIndicator={getSortIndicator('name')}
                                        colWidths={colWidths}
                                        onUpdateWidth={updateColumnWidth}
                                        className=""
                                    >
                                        Nome
                                    </ResizableTh>

                                    {/* AÇÕES: Sticky Right + Sem bordas laterais */}
                                    <th className="px-4 py-3 w-0 whitespace-nowrap text-center sticky right-0 z-30 bg-[#242830]">
                                        {selectedIds.size > 0 ? (
                                            <button
                                                onClick={handleBulkDelete}
                                                className="text-red-400 hover:text-red-300 text-xs font-bold uppercase"
                                            >
                                                Apagar ({selectedIds.size})
                                            </button>
                                        ) : (
                                            "Ações"
                                        )}
                                    </th>
                                </tr>
                            </thead>

                            {/* BODY */}
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-6">Carregando...</td></tr>
                                ) : filteredAndSortedResources.map(r => {
                                    // Lógica de Cores Opacas para Colunas Fixas
                                    // Normal: #1e2329 (Cor do Card)
                                    // Hover: #262b33 (Um pouco mais claro que o card)
                                    // Selected: #1a2736 (Azulado escuro opaco)
                                    const stickyBgClass = selectedIds.has(r.id)
                                        ? 'bg-[#1a2736]'
                                        : 'bg-[#1e2329] group-hover:bg-[#24282f]';

                                    return (
                                        <tr key={r.id} className={`group border-b border-[#3a3e45] hover:bg-[#24282f] transition-colors ${selectedIds.has(r.id) ? 'bg-[#0084ff]/10' : ''}`}>

                                            {/* CHECKBOX BODY: Sticky Left */}
                                            <td className={`px-4 py-3 text-center sticky left-0 z-20 ${stickyBgClass}`}>
                                                {r.project_id && (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                                                        checked={selectedIds.has(r.id)}
                                                        onChange={() => handleSelectRow(r.id)}
                                                    />
                                                )}
                                            </td>

                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]">
                                                {r.category}
                                            </td>

                                            {/* NOME: Sem borda direita visualmente devido à sobreposição ou remoção no header */}
                                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]">
                                                {r.name}
                                            </td>

                                            {/* AÇÕES BODY: Sticky Right */}
                                            <td className={`px-4 py-3 text-center whitespace-nowrap w-[1%] sticky right-0 z-20 ${stickyBgClass}`}>
                                                {r.project_id ? (
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleEdit(r)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                                                        <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[#4a4e55] text-xs italic">Padrão</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {!loading && resources.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum recurso cadastrado.</div>}
                    {!loading && resources.length > 0 && filteredAndSortedResources.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum resultado encontrado para "{searchTerm}".</div>}
                </div>
            </Card>

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
