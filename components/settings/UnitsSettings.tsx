import React, { useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useUnits } from '../../hooks/useUnits';
import { useConfirm } from '../../utils/useConfirm';
import type { UnitItem } from '../../types';
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
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-[#242830] border-[#3a3e45] text-[#e8eaed]">
                    <DialogHeader>
                        <DialogTitle className="text-white">{currentUnit.id ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
                        <DialogDescription className="text-[#a0a5b0]">
                            Preencha os dados da unidade de medida abaixo.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">Nome <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={currentUnit.name || ''}
                                onChange={e => setCurrentUnit({ ...currentUnit, name: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                required
                                placeholder="Ex: Metro Quadrado"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="symbol" className="text-sm font-medium">Símbolo <span className="text-red-500">*</span></Label>
                            <Input
                                id="symbol"
                                value={currentUnit.symbol || ''}
                                onChange={e => setCurrentUnit({ ...currentUnit, symbol: e.target.value })}
                                className="bg-[#1e2329] border-[#3a3e45] text-white focus-visible:ring-[#0084ff]"
                                required
                                placeholder="Ex: m²"
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
