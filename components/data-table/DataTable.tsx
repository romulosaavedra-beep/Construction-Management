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
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CirclePlus, Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    title: string | React.ReactNode;
    searchPlaceholder?: string;
    onAdd?: () => void;
    onDelete?: (ids: string[]) => Promise<void>;
    isLoading?: boolean;
    initialSorting?: { id: string; desc: boolean }[];
}

export function DataTable<TData, TValue>({
    columns,
    data,
    title,
    searchPlaceholder = "Buscar...",
    onAdd,
    onDelete,
    isLoading = false,
    initialSorting = [],
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>(initialSorting);
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
        <TooltipProvider>
            <Card className="w-full bg-base border-border text-primary shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
                    <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                        {title}
                        <span className="text-xs font-normal text-secondary bg-elevated px-2 py-0.5 rounded-full border border-border">
                            {table.getFilteredRowModel().rows.length}
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-secondary" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={globalFilter ?? ''}
                                onChange={e => setGlobalFilter(e.target.value)}
                                className="w-64 pl-9 bg-surface border-border text-primary placeholder:text-disabled focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border-strong h-9 transition-colors"
                            />
                        </div>

                        {hasSelection && onDelete ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleBulkDelete}
                                        className="h-9 w-9 text-error hover:text-error hover:bg-error-bg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-elevated border-border text-primary">
                                    <p>Excluir {selectedIds.length} selecionados</p>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            onAdd && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={onAdd}
                                            size="icon"
                                            variant="ghost"
                                            className="h-9 w-9 text-accent-500 hover:text-accent-400 hover:bg-accent-50 transition-colors"
                                        >
                                            <CirclePlus className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-elevated border-border text-primary">
                                        <p>Adicionar Novo</p>
                                    </TooltipContent>
                                </Tooltip>
                            )
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar relative">
                            <Table style={{ width: table.getTotalSize(), minWidth: '100%' }}>
                                <TableHeader className="sticky top-0 z-30 bg-elevated shadow-sm">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                                            {headerGroup.headers.map(header => {
                                                const isSelect = header.column.id === 'select';
                                                const isActions = header.column.id === 'actions';
                                                const isFluid = (header.column.columnDef.meta as any)?.isFluid;

                                                let stickyClass = '';
                                                const stickyStyle: React.CSSProperties = {};

                                                if (isSelect) {
                                                    stickyClass = 'sticky left-0 z-30 bg-elevated border-r border-border';
                                                    stickyStyle.left = 0;
                                                }
                                                if (isActions) {
                                                    stickyClass = 'sticky right-0 z-30 bg-elevated border-l border-border';
                                                    stickyStyle.right = 0;
                                                }

                                                const widthStyle: React.CSSProperties = isFluid ? {
                                                    minWidth: header.column.columnDef.minSize
                                                } : {
                                                    width: header.getSize(),
                                                    minWidth: header.column.columnDef.minSize,
                                                };

                                                return (
                                                    <TableHead
                                                        key={header.id}
                                                        className={cn(
                                                            "h-10 px-4 py-3 text-secondary font-medium text-xs uppercase tracking-wider select-none bg-elevated relative group",
                                                            stickyClass,
                                                            !isSelect && !isActions && "border-r border-border last:border-r-0"
                                                        )}
                                                        style={{ ...widthStyle, ...stickyStyle }}
                                                    >
                                                        {header.isPlaceholder ? null : (
                                                            <div className="flex items-center justify-between h-full relative">
                                                                <div
                                                                    {...{
                                                                        className: header.column.getCanSort()
                                                                            ? 'cursor-pointer select-none flex items-center gap-1.5 hover:text-primary transition-colors'
                                                                            : 'flex items-center gap-1.5',
                                                                        onClick: header.column.getToggleSortingHandler(),
                                                                    }}
                                                                >
                                                                    {flexRender(
                                                                        header.column.columnDef.header,
                                                                        header.getContext()
                                                                    )}
                                                                    {{
                                                                        asc: <ArrowUp className="h-3 w-3 text-secondary" />,
                                                                        desc: <ArrowDown className="h-3 w-3 text-secondary" />,
                                                                    }[header.column.getIsSorted() as string] ?? (
                                                                            header.column.getCanSort() ? <ArrowUpDown className="h-3 w-3 text-border-default group-hover:text-secondary" /> : null
                                                                        )}
                                                                </div>

                                                                {header.column.getCanResize() && !isFluid && (
                                                                    <div
                                                                        onMouseDown={header.getResizeHandler()}
                                                                        onTouchStart={header.getResizeHandler()}
                                                                        onDoubleClick={() => header.column.resetSize()}
                                                                        className={cn(
                                                                            "absolute right-0 top-0 h-full w-[1px] cursor-col-resize touch-none z-50 transition-all",
                                                                            "bg-border",
                                                                            "hover:w-[4px] hover:bg-accent-500",
                                                                            header.column.getIsResizing() && "w-[4px] bg-accent-500"
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
                                            <TableCell colSpan={columns.length} className="h-32 text-center text-secondary">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="h-6 w-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-sm">Carregando dados...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : table.getRowModel().rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-32 text-center text-secondary">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <Search className="h-8 w-8 text-border mb-2" />
                                                    <span className="text-sm font-medium text-primary">Nenhum registro encontrado</span>
                                                    <span className="text-xs">Tente ajustar seus filtros ou adicione um novo item.</span>
                                                </div>
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
                                                        "border-b border-border transition-colors group text-primary",
                                                        "hover:bg-surface",
                                                        "data-[state=selected]:bg-accent-50 data-[state=selected]:hover:bg-accent-50"
                                                    )}
                                                >
                                                    {row.getVisibleCells().map(cell => {
                                                        const isSelect = cell.column.id === 'select';
                                                        const isActions = cell.column.id === 'actions';
                                                        const isFluid = (cell.column.columnDef.meta as any)?.isFluid;

                                                        let stickyClass = '';
                                                        const stickyStyle: React.CSSProperties = {};

                                                        if (isSelect) {
                                                            stickyClass = cn(
                                                                "sticky left-0 z-20 border-r border-[var(--ds-border-default)]",
                                                                isSelected ? "bg-[var(--ds-bg-active)]" : "bg-[var(--ds-bg-base)] group-hover:bg-[var(--ds-bg-hover)]"
                                                            );
                                                            stickyStyle.left = 0;
                                                        }
                                                        if (isActions) {
                                                            stickyClass = cn(
                                                                "sticky right-0 z-20 border-l border-[var(--ds-border-default)]",
                                                                isSelected ? "bg-[var(--ds-bg-active)]" : "bg-[var(--ds-bg-base)] group-hover:bg-[var(--ds-bg-hover)]"
                                                            );
                                                            stickyStyle.right = 0;
                                                        }

                                                        const widthStyle: React.CSSProperties = isFluid ? {
                                                            minWidth: cell.column.columnDef.minSize
                                                        } : {
                                                            width: cell.column.getSize(),
                                                            minWidth: cell.column.columnDef.minSize,
                                                        };

                                                        return (
                                                            <TableCell
                                                                key={cell.id}
                                                                className={cn(
                                                                    "px-4 py-3 text-sm",
                                                                    stickyClass,
                                                                    !isSelect && !isActions && "whitespace-nowrap overflow-hidden text-ellipsis"
                                                                )}
                                                                style={{ ...widthStyle, ...stickyStyle }}
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
        </TooltipProvider>
    );
}
