import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useUnits } from '../../hooks/useUnits';
import { useConfirm } from '../../utils/useConfirm';
import type { UnitItem } from '../../types';
import { DataTable } from '../Table/DataTable';
import { Button } from '../Button';

interface UnitsSettingsProps {
    projectId?: string;
}

export const UnitsSettings: React.FC<UnitsSettingsProps> = ({ projectId }) => {
    const { units, loading, addUnit, updateUnit, deleteUnit, deleteUnits } = useUnits(projectId);
    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUnit, setCurrentUnit] = useState<Partial<UnitItem>>({});

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

    const handleDelete = async (ids: string[]) => {
        if (ids.length === 1) {
            const shouldDelete = await confirm({
                title: 'Remover Unidade',
                message: 'Tem certeza que deseja remover esta unidade?',
                confirmText: 'Remover',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteUnit(ids[0]);
            }
        } else {
            const shouldDelete = await confirm({
                title: 'Excluir Unidades',
                message: `Tem certeza que deseja excluir ${ids.length} unidades selecionadas?`,
                confirmText: 'Excluir',
                cancelText: 'Cancelar'
            });

            if (shouldDelete) {
                await deleteUnits(ids);
            }
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

    const columnHelper = createColumnHelper<UnitItem>();

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
            size: 300,
            meta: { isFluid: true },
            cell: info => <span className="font-medium text-white">{info.getValue()}</span>
        }),
        columnHelper.accessor('symbol', {
            header: 'Abv.',
            size: 100,
            cell: info => <span className="font-mono text-xs">{info.getValue()}</span>
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
    ], [deleteUnit, deleteUnits, confirm]);

    return (
        <>
            <DataTable
                title="Unidades de Medida"
                columns={columns}
                data={units}
                onAdd={handleAdd}
                onDelete={handleDelete}
                isLoading={loading}
            />

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
