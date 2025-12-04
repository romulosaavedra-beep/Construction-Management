import React from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import { ColumnConfig } from '../types';

interface OrcamentoToolbarProps {
    hiddenColumns: Set<string>;
    grandTotalMaterial: number;
    grandTotalMaoDeObra: number;
    grandTotalValue: number;
    isRestoreMenuOpen: boolean;
    setRestoreMenuOpen: (open: boolean) => void;
    columnsConfig: ColumnConfig[];
    handleShowColumn: (id: string) => void;
    handleShowAllColumns: () => void;
    isEditing: boolean;
    selectedIds: Set<number>;
    handleDeleteSelected: () => void;
    handleSave: () => void;
    handleExit: () => void;
    handleUndo: () => void;
    canUndo: boolean;
    handleRedo: () => void;
    canRedo: boolean;
    handleExportCsv: () => void;
    handleExportExcel: () => void;
    handleEdit: () => void;
    setImportModalOpen: (open: boolean) => void;
    restoreButtonRef: React.RefObject<HTMLButtonElement | null>;
    restoreMenuRef: React.RefObject<HTMLDivElement | null>;
}

export const OrcamentoToolbar: React.FC<OrcamentoToolbarProps> = ({
    hiddenColumns,
    grandTotalMaterial,
    grandTotalMaoDeObra,
    grandTotalValue,
    isRestoreMenuOpen,
    setRestoreMenuOpen,
    columnsConfig,
    handleShowColumn,
    handleShowAllColumns,
    isEditing,
    selectedIds,
    handleDeleteSelected,
    handleSave,
    handleExit,
    handleUndo,
    canUndo,
    handleRedo,
    canRedo,
    handleExportCsv,
    handleExportExcel,
    handleEdit,
    setImportModalOpen,
    restoreButtonRef,
    restoreMenuRef
}) => {
    return (
        <div className="flex flex-wrap items-center justify-end gap-4">
            {!hiddenColumns.has('mat_unit') && (
                <>
                    <div className="text-right">
                        <div className="text-xs text-secondary">TOTAL MATERIAIS</div>
                        <div className="text-lg font-bold text-blue-400">{formatCurrency(grandTotalMaterial)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-secondary">TOTAL MÃO DE OBRA</div>
                        <div className="text-lg font-bold text-yellow-400">{formatCurrency(grandTotalMaoDeObra)}</div>
                    </div>
                </>
            )}
            <div className="text-right">
                <div className="text-xs text-secondary">VALOR TOTAL DO ORÇAMENTO</div>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(grandTotalValue)}</div>
            </div>
            <div className="flex items-center gap-2">
                {hiddenColumns.size > 0 && (
                    <div className="relative">
                        <Button ref={restoreButtonRef} variant="secondary" onClick={() => setRestoreMenuOpen(!isRestoreMenuOpen)}>
                            Reexibir ({hiddenColumns.size})
                        </Button>
                        {isRestoreMenuOpen && (
                            <div ref={restoreMenuRef} className="absolute right-0 mt-2 w-56 bg-[#242830] border border-default rounded-md shadow-lg z-[100]">
                                <ul className="py-1 text-sm text-primary max-h-60 overflow-y-auto">
                                    {columnsConfig.filter(c => hiddenColumns.has(c.id)).map(c => (
                                        <li key={c.id}>
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleShowColumn(c.id); }} className="block px-4 py-2 hover:bg-elevated">
                                                {c.label}
                                            </a>
                                        </li>
                                    ))}
                                    <li className="border-t border-default my-1"></li>
                                    <li>
                                        <a href="#" onClick={(e) => { e.preventDefault(); handleShowAllColumns(); }} className="block px-4 py-2 hover:bg-elevated font-semibold">
                                            Reexibir Todas
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                {isEditing && selectedIds.size > 0 && (
                    <Button variant="danger" onClick={handleDeleteSelected}>
                        Apagar ({selectedIds.size})
                    </Button>
                )}
                {isEditing ? (
                    <>
                        <Button variant="primary" onClick={handleSave}>💾 Salvar</Button>
                        <Button variant="secondary" onClick={handleExit}>Sair sem Salvar</Button>
                        <Button size="sm" variant="secondary" onClick={handleUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">↩️</Button>
                        <Button size="sm" variant="secondary" onClick={handleRedo} disabled={!canRedo} title="Refazer (Ctrl+Y)">↪️</Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" onClick={handleExportCsv} title="Exportar CSV">📄 CSV</Button>
                        <Button variant="secondary" onClick={handleExportExcel} title="Exportar Excel">📊 Excel</Button>
                        <Button onClick={handleEdit}>✏️ Editar</Button>
                        <Button onClick={() => setImportModalOpen(true)}>🤖 Importar com IA</Button>
                    </>
                )}
            </div>
        </div>
    );
};
