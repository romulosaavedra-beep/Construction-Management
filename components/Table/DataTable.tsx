import React, { useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    RowSelectionState,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    title: string;
    searchPlaceholder?: string;
    onAdd?: () => void;
    onDelete?: (ids: string[]) => Promise<void>;
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
        <Card className="w-full bg-[#1e2329] border-[#3a3e45] text-[#e8eaed]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">{title}</CardTitle>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder={searchPlaceholder}
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        className="w-64 bg-[#0f1419] border-[#3a3e45] text-white placeholder:text-gray-500 focus-visible:ring-[#0084ff]"
                    />
                    {hasSelection && onDelete ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                        >
                            Excluir ({selectedIds.length})
                        </Button>
                    ) : (
                        onAdd && <Button onClick={onAdd} className="bg-[#0084ff] hover:bg-[#0073e6] text-white">
                            + Adicionar
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-[#3a3e45] overflow-hidden">
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar relative">
                        <Table>
                            <TableHeader className="sticky top-0 z-30 bg-[#242830]">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id} className="border-b-[#3a3e45] hover:bg-transparent">
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
                                                <TableHead
                                                    key={header.id}
                                                    className={cn(
                                                        "h-10 px-4 py-3 text-[#e8eaed] font-semibold select-none bg-[#242830]",
                                                        stickyClass,
                                                        !isSelect && !isActions && "border-r border-[#3a3e45] last:border-r-0"
                                                    )}
                                                    style={{ ...widthStyle }}
                                                >
                                                    {header.isPlaceholder ? null : (
                                                        <div className="flex items-center justify-between h-full relative group">
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
                                                                    asc: <span className="text-[#0084ff] text-[10px] ml-1">▲</span>,
                                                                    desc: <span className="text-[#0084ff] text-[10px] ml-1">▼</span>,
                                                                }[header.column.getIsSorted() as string] ?? null}
                                                            </div>
                                                            {header.column.getCanResize() && !isFluid && (
                                                                <div
                                                                    onMouseDown={header.getResizeHandler()}
                                                                    onTouchStart={header.getResizeHandler()}
                                                                    onDoubleClick={() => table.resetColumnSizing()}
                                                                    className={cn(
                                                                        "resizer absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 bg-[#0084ff]",
                                                                        header.column.getIsResizing() && "opacity-100 bg-[#0084ff] w-1"
                                                                    )}
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </TableHead>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-[#a0a5b0]">
                                            Carregando...
                                        </TableCell>
                                    </TableRow>
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-[#a0a5b0]">
                                            Nenhum registro encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    table.getRowModel().rows.map(row => {
                                        const isSelected = row.getIsSelected();
                                        return (
                                            <TableRow
                                                key={row.id}
                                                data-state={isSelected && "selected"}
                                                className={cn(
                                                    "border-b-[#3a3e45] hover:bg-[#24282f] transition-colors",
                                                    isSelected && "bg-[#0084ff]/10 hover:bg-[#0084ff]/20"
                                                )}
                                            >
                                                {row.getVisibleCells().map(cell => {
                                                    const isSelect = cell.column.id === 'select';
                                                    const isActions = cell.column.id === 'actions';
                                                    const isFluid = (cell.column.columnDef.meta as any)?.isFluid;

                                                    let stickyClass = '';
                                                    const stickyBg = isSelected
                                                        ? 'bg-[#1a2736]' // Fallback for sticky selection
                                                        : 'bg-[#1e2329] group-hover:bg-[#24282f]'; // Match row bg

                                                    // We need to ensure sticky cells match the row background
                                                    // Since we are using shadcn TableRow which handles hover/selection on TR,
                                                    // sticky cells need to inherit or match.
                                                    // For now, let's hardcode the background for sticky cells to avoid transparency issues.

                                                    if (isSelect) stickyClass = cn("sticky left-0 z-20", stickyBg);
                                                    if (isActions) stickyClass = cn("sticky right-0 z-20", stickyBg);

                                                    const widthStyle: React.CSSProperties = isFluid ? { minWidth: cell.column.columnDef.minSize } : {
                                                        width: cell.column.getSize(),
                                                        minWidth: cell.column.columnDef.minSize,
                                                    };

                                                    return (
                                                        <TableCell
                                                            key={cell.id}
                                                            className={cn(
                                                                "px-4 py-3 text-[#e8eaed]",
                                                                stickyClass,
                                                                !isSelect && !isActions && "whitespace-nowrap overflow-hidden text-ellipsis"
                                                            )}
                                                            style={{ ...widthStyle }}
                                                        >
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
