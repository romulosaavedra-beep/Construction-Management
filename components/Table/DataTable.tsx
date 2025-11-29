import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    RowSelectionState,
    ColumnResizeMode,
    Header,
} from '@tanstack/react-table';
import { Card, CardHeader } from '../Card';
import { Button } from '../Button';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    title: string;
    searchPlaceholder?: string;
    onAdd?: () => void;
    onDelete?: (ids: string[]) => Promise<void>;
    onEdit?: (original: TData) => void;
    onRowClick?: (original: TData) => void;
    isLoading?: boolean;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    title,
    searchPlaceholder = "🔍 Buscar...",
    onAdd,
    onDelete,
    isLoading = false,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [globalFilter, setGlobalFilter] = useState('');

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            rowSelection,
            globalFilter,
        },
        enableRowSelection: true,
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        columnResizeMode: 'onChange',
        defaultColumn: {
            minSize: 50,
            maxSize: 800,
        },
    });

    const selectedIds = Object.keys(rowSelection);
    const hasSelection = selectedIds.length > 0;

    const handleBulkDelete = async () => {
        if (onDelete && hasSelection) {
            const selectedRows = table.getSelectedRowModel().rows;
            const ids = selectedRows.map(r => (r.original as any).id);
            await onDelete(ids);
            setRowSelection({});
        }
    };

    return (
        <Card>
            <CardHeader title={title}>
                <div className="flex items-center gap-1">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        className="w-64 bg-[#1e2329] border border-[#3a3e45] rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0084ff] outline-none"
                    />
                    {onAdd && <Button variant="primary" onClick={onAdd}>+ Adicionar</Button>}
                </div>
            </CardHeader>
            <div className="overflow-x-auto">
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left text-[#a0a5b0]" style={{ minWidth: table.getTotalSize() }}>
                        <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-30 shadow-sm">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        const isSelect = header.column.id === 'select';
                                        const isActions = header.column.id === 'actions';
                                        const isFluid = (header.column.columnDef.meta as any)?.isFluid;

                                        // Sticky styles
                                        let stickyClass = '';
                                        if (isSelect) stickyClass = 'sticky left-0 z-30 bg-[#242830] border-r border-[#3a3e45]';
                                        if (isActions) stickyClass = 'sticky right-0 z-30 bg-[#242830]';

                                        // Width styles
                                        const widthStyle: React.CSSProperties = isFluid ? { minWidth: header.column.columnDef.minSize } : {
                                            width: header.getSize(),
                                            minWidth: header.column.columnDef.minSize,
                                        };

                                        return (
                                            <th
                                                key={header.id}
                                                className={`px-4 py-3 relative bg-[#242830] select-none group ${stickyClass} ${!isSelect && !isActions ? 'border-r border-[#3a3e45] last:border-r-0' : ''}`}
                                                style={{ ...widthStyle }}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <div className="flex items-center justify-between h-full">
                                                        {/* Header Content */}
                                                        <div
                                                            {...{
                                                                className: header.column.getCanSort()
                                                                    ? 'cursor-pointer select-none flex items-center gap-1 hover:text-white transition-colors'
                                                                    : '',
                                                                onClick: header.column.getToggleSortingHandler(),
                                                            }}
                                                        >
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                            {{
                                                                asc: <span className="text-[#0084ff] text-[10px]">▲</span>,
                                                                desc: <span className="text-[#0084ff] text-[10px]">▼</span>,
                                                            }[header.column.getIsSorted() as string] ?? null}
                                                        </div>

                                                        {/* Resizer */}
                                                        {header.column.getCanResize() && !isFluid && (
                                                            <div
                                                                onMouseDown={header.getResizeHandler()}
                                                                onTouchStart={header.getResizeHandler()}
                                                                onDoubleClick={() => table.resetColumnSizing()}
                                                                className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''
                                                                    }`}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={columns.length} className="text-center py-6">Carregando...</td></tr>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <tr><td colSpan={columns.length} className="text-center py-6 text-[#a0a5b0]">Nenhum registro encontrado.</td></tr>
                            ) : (
                                table.getRowModel().rows.map(row => {
                                    const isSelected = row.getIsSelected();
                                    return (
                                        <tr
                                            key={row.id}
                                            className={`group border-b border-[#3a3e45] hover:bg-[#24282f] transition-colors ${isSelected ? 'bg-[#0084ff]/10' : ''}`}
                                        >
                                            {row.getVisibleCells().map(cell => {
                                                const isSelect = cell.column.id === 'select';
                                                const isActions = cell.column.id === 'actions';
                                                const isFluid = (cell.column.columnDef.meta as any)?.isFluid;

                                                let stickyClass = '';
                                                // Logic for sticky background color on hover/selection
                                                const stickyBg = isSelected
                                                    ? 'bg-[#1a2736]'
                                                    : 'bg-[#1e2329] group-hover:bg-[#24282f]';

                                                if (isSelect) stickyClass = `sticky left-0 z-20 ${stickyBg}`;
                                                if (isActions) stickyClass = `sticky right-0 z-20 ${stickyBg}`;

                                                // Width styles for cell
                                                const widthStyle: React.CSSProperties = isFluid ? { minWidth: cell.column.columnDef.minSize } : {
                                                    width: cell.column.getSize(),
                                                    minWidth: cell.column.columnDef.minSize,
                                                };

                                                return (
                                                    <td
                                                        key={cell.id}
                                                        className={`px-4 py-3 ${stickyClass} ${!isSelect && !isActions ? 'whitespace-nowrap overflow-hidden text-ellipsis' : ''}`}
                                                        style={{ ...widthStyle }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
}
