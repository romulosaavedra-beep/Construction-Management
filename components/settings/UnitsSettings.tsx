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
    const { units, loading, addUnit, updateUnit, deleteUnit, deleteUnits } = useUnits(projectId);
    const { colWidths, updateColumnWidth } = useColumnWidths('vobi-settings-sort-units');
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUnit, setCurrentUnit] = useState<Partial<UnitItem>>({});
    const [sortConfig, setSortConfig] = useState<{ key: keyof UnitItem; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
            if (selectedIds.has(id)) {
                const newSelected = new Set(selectedIds);
                newSelected.delete(id);
                setSelectedIds(newSelected);
            }
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const userUnits = filteredAndSortedUnits.filter(u => u.project_id).map(u => u.id);
            setSelectedIds(new Set(userUnits));
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
            title: 'Excluir Unidades',
            message: `Tem certeza que deseja excluir ${selectedIds.size} unidades selecionadas?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteUnits(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const userUnitsCount = filteredAndSortedUnits.filter(u => u.project_id).length;
    const isAllSelected = userUnitsCount > 0 && selectedIds.size === userUnitsCount;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < userUnitsCount;

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
                            {/* HEADER */}
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-30">
                                <tr>
                                    {/* CHECKBOX: Sticky Left */}
                                    <th className="px-4 py-3 w-[40px] text-center border-b border-[#3a3e45] sticky left-0 z-30 bg-[#242830]">
                                        <input
                                            type="checkbox"
                                            className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                                            checked={isAllSelected}
                                            ref={input => {
                                                if (input) input.indeterminate = isIndeterminate;
                                            }}
                                            onChange={handleSelectAll}
                                            disabled={userUnitsCount === 0}
                                        />
                                    </th>

                                    {/* CATEGORIA: 50% */}
                                    <ResizableTh
                                        tableId="units"
                                        colKey="category"
                                        initialWidth="50%"
                                        onSort={() => requestSort('category')}
                                        sortIndicator={getSortIndicator('category')}
                                        colWidths={colWidths}
                                        onUpdateWidth={updateColumnWidth}
                                    >
                                        Categoria
                                    </ResizableTh>

                                    {/* NOME: 50% */}
                                    <ResizableTh
                                        tableId="units"
                                        colKey="name"
                                        initialWidth="50%"
                                        onSort={() => requestSort('name')}
                                        sortIndicator={getSortIndicator('name')}
                                        colWidths={colWidths}
                                        onUpdateWidth={updateColumnWidth}
                                    >
                                        Nome
                                    </ResizableTh>

                                    {/* SÍMBOLO: 1% + Sem borda direita (!border-r-0) */}
                                    <ResizableTh
                                        tableId="units"
                                        colKey="symbol"
                                        initialWidth="1%"
                                        onSort={() => requestSort('symbol')}
                                        sortIndicator={getSortIndicator('symbol')}
                                        colWidths={colWidths}
                                        onUpdateWidth={updateColumnWidth}
                                        className="!border-r-0"
                                    >
                                        Abv.
                                    </ResizableTh>

                                    {/* AÇÕES: Sticky Right + Sem borda esquerda */}
                                    <th className="px-4 py-3 w-[1%] whitespace-nowrap text-center border-b border-[#3a3e45] sticky right-0 z-30 bg-[#242830]">
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
                                    <tr><td colSpan={5} className="text-center py-6">Carregando...</td></tr>
                                ) : filteredAndSortedUnits.map(u => {
                                    // Lógica de Cores Opacas para Colunas Fixas
                                    const stickyBgClass = selectedIds.has(u.id)
                                        ? 'bg-[#1a2736]'
                                        : 'bg-[#1e2329] group-hover:bg-[#262b33]';

                                    return (
                                        <tr key={u.id} className={`group border-b border-[#3a3e45] hover:bg-[#262b33] transition-colors ${selectedIds.has(u.id) ? 'bg-[#0084ff]/10' : ''}`}>

                                            {/* CHECKBOX BODY: Sticky Left */}
                                            <td className={`px-4 py-3 text-center sticky left-0 z-20 ${stickyBgClass}`}>
                                                {u.project_id && (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                                                        checked={selectedIds.has(u.id)}
                                                        onChange={() => handleSelectRow(u.id)}
                                                    />
                                                )}
                                            </td>

                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]">
                                                {u.category}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]">
                                                {u.name}
                                            </td>

                                            {/* SÍMBOLO: Sem borda direita visualmente */}
                                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap w-[1%]">
                                                {u.symbol}
                                            </td>

                                            {/* AÇÕES BODY: Sticky Right */}
                                            <td className={`px-4 py-3 text-center whitespace-nowrap w-[1%] sticky right-0 z-20 ${stickyBgClass}`}>
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
                                    );
                                })}
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
