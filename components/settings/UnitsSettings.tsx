import React, { useState, useMemo } from 'react';
import { Card, CardHeader } from '../Card';
import { Button } from '../Button';
import { ResizableTh } from '../Table/ResizableTh';
import { useUnits } from '../../hooks/useUnits';
import { useColumnWidths } from '../../hooks/useColumnWidths';
import { useConfirm } from '../../utils/useConfirm';
import type { UnitItem } from '../../types';

interface UnitsSettingsProps {
    projectId?: string;
}

export const UnitsSettings: React.FC<UnitsSettingsProps> = ({ projectId }) => {
    const { units, loading, addUnit, updateUnit, deleteUnit } = useUnits(projectId);
    const { colWidths, updateColumnWidth } = useColumnWidths('vobi-settings-sort-units');
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUnit, setCurrentUnit] = useState<Partial<UnitItem>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof UnitItem; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAndSortedUnits = useMemo(() => {
        let items = [...units];

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            items = items.filter(u =>
                u.name.toLowerCase().includes(search) ||
                u.symbol.toLowerCase().includes(search) ||
                u.category.toLowerCase().includes(search)
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
    }, [units, sortConfig, searchTerm]);

    const requestSort = (key: keyof UnitItem) => {
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
        setCurrentUnit({ category: '@Usuário' });
        setIsModalOpen(true);
    };

    const handleEdit = (u: UnitItem) => {
        setCurrentUnit({ ...u });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        const shouldDelete = await confirm({
            title: 'Remover Unidade',
            message: 'Tem certeza que deseja remover esta unidade?',
            confirmText: 'Remover',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteUnit(id);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUnit.name || !currentUnit.symbol || !currentUnit.category) return;

        if (currentUnit.id) {
            await updateUnit(currentUnit as UnitItem);
        } else {
            await addUnit(currentUnit as Omit<UnitItem, 'id'>);
        }
        setIsModalOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader title="Unidades de Medida">
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
                                    <ResizableTh tableId="units" colKey="category" initialWidth="20%" onSort={() => requestSort('category')} sortIndicator={getSortIndicator('category')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Categoria</ResizableTh>
                                    <ResizableTh tableId="units" colKey="name" initialWidth="30%" onSort={() => requestSort('name')} sortIndicator={getSortIndicator('name')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Nome</ResizableTh>
                                    <ResizableTh tableId="units" colKey="symbol" initialWidth="20%" onSort={() => requestSort('symbol')} sortIndicator={getSortIndicator('symbol')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Símbolo</ResizableTh>
                                    <th className="px-4 py-3 w-[100px] text-center border-l border-[#3a3e45]">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center py-6">Carregando...</td></tr>
                                ) : filteredAndSortedUnits.map(u => (
                                    <tr key={u.id} className="border-b border-[#3a3e45] hover:bg-[#24282f]">
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis">{u.category}</td>
                                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis">{u.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{u.symbol}</td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            {u.project_id ? (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(u)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                                                    <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
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
                    {!loading && units.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhuma unidade cadastrada.</div>}
                    {!loading && units.length > 0 && filteredAndSortedUnits.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum resultado encontrado para "{searchTerm}".</div>}
                </div>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-md border border-[#3a3e45]">
                        <div className="flex justify-between items-center p-4 border-b border-[#3a3e45]">
                            <h3 className="text-lg font-semibold text-white">{currentUnit.id ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#a0a5b0] hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            {currentUnit.id && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Categoria</label>
                                    <select
                                        value={currentUnit.category}
                                        onChange={e => setCurrentUnit({ ...currentUnit, category: e.target.value })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    >
                                        <option value="Dimensional">Dimensional</option>
                                        <option value="Peso">Peso</option>
                                        <option value="Volume">Volume</option>
                                        <option value="Serviço">Serviço</option>
                                        <option value="Tempo">Tempo</option>
                                        <option value="Outros">Outros</option>
                                        <option value="@Usuário">@Usuário</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={currentUnit.name || ''}
                                    onChange={e => setCurrentUnit({ ...currentUnit, name: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    required
                                    placeholder="Ex: Metro Quadrado"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Símbolo <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={currentUnit.symbol || ''}
                                    onChange={e => setCurrentUnit({ ...currentUnit, symbol: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    required
                                    placeholder="Ex: m²"
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
