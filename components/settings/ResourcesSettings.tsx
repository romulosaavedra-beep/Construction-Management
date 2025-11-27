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
    const { resources, loading, addResource, updateResource, deleteResource } = useResources(projectId);
    const { colWidths, updateColumnWidth } = useColumnWidths('vobi-settings-sort-resources');
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentResource, setCurrentResource] = useState<Partial<ResourceItem>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof ResourceItem; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Extract unique categories for dropdown
    const categories = useMemo(() => {
        const cats = new Set(resources.map(r => r.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [resources]);

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
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentResource.name || !currentResource.category) return;

        if (currentResource.id) {
            await updateResource(currentResource as ResourceItem);
        } else {
            await addResource(currentResource as Omit<ResourceItem, 'id'>);
        }
        setIsModalOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader title="Recursos">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="🔍 Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-64 bg-[#1e2329] border border-[#3a3e45] rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0084ff] outline-none"
                        />
                        <Button variant="primary" onClick={handleAdd}>+ Adicionar</Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-[#a0a5b0]">
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-10">
                                <tr>
                                    <ResizableTh tableId="resources" colKey="category" initialWidth="40%" onSort={() => requestSort('category')} sortIndicator={getSortIndicator('category')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Categoria</ResizableTh>
                                    <ResizableTh tableId="resources" colKey="name" initialWidth="40%" onSort={() => requestSort('name')} sortIndicator={getSortIndicator('name')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Nome</ResizableTh>
                                    <th className="px-4 py-3 w-[100px] text-center border-l border-[#3a3e45]">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} className="text-center py-6">Carregando...</td></tr>
                                ) : filteredAndSortedResources.map(r => (
                                    <tr key={r.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{r.category}</td>
                                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">{r.name}</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
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
                                ))}
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
                                <SearchableDropdown
                                    label="Categoria"
                                    options={categories}
                                    value={currentResource.category || ''}
                                    onChange={(val) => setCurrentResource({ ...currentResource, category: val })}
                                    onAddNew={(newVal) => setCurrentResource({ ...currentResource, category: newVal })}
                                    placeholder="Selecione ou crie uma categoria"
                                    required
                                />
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
