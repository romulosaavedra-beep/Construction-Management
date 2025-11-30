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
            <Card className="w-full bg-[#1e2329] border-[#3a3e45] text-[#e8eaed] shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-[#3a3e45]">
                    <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                        {title}
                        <span className="text-xs font-normal text-[#a0a5b0] bg-[#242830] px-2 py-0.5 rounded-full border border-[#3a3e45]">
                            {table.getFilteredRowModel().rows.length}
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#a0a5b0]" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={globalFilter ?? ''}
                                onChange={e => setGlobalFilter(e.target.value)}
                                // AJUSTE DE FOCO: Sem ring, borda cinza clara
                                className="w-64 pl-9 bg-[#0f1419] border-[#3a3e45] text-white placeholder:text-[#5f656f] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#71767f] h-9 transition-colors"
                            />
                        </div>

                        {hasSelection && onDelete ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleBulkDelete}
                                        className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#242830] border-[#3a3e45] text-white">
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
                                            className="h-9 w-9 text-[#0084ff] hover:text-[#339dff] hover:bg-[#0084ff]/10 transition-colors"
                                        >
                                            <CirclePlus className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-[#242830] border-[#3a3e45] text-white">
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
                                <TableHeader className="sticky top-0 z-30 bg-[#242830] shadow-sm">
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <TableRow key={headerGroup.id} className="border-b border-[#3a3e45] hover:bg-transparent">
                                            {headerGroup.headers.map(header => {
                                                const isSelect = header.column.id === 'select';
                                                const isActions = header.column.id === 'actions';
                                                const isFluid = (header.column.columnDef.meta as any)?.isFluid;

                                                let stickyClass = '';
                                                const stickyStyle: React.CSSProperties = {};

                                                if (isSelect) {
                                                    stickyClass = 'sticky left-0 z-30 bg-[#242830] border-r border-[#3a3e45]';
                                                    stickyStyle.left = 0;
                                                }
                                                if (isActions) {
                                                    stickyClass = 'sticky right-0 z-30 bg-[#242830] border-l border-[#3a3e45]';
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
                                                            "h-10 px-4 py-3 text-[#a0a5b0] font-medium text-xs uppercase tracking-wider select-none bg-[#242830] relative group",
                                                            stickyClass,
                                                            !isSelect && !isActions && "border-r border-[#3a3e45] last:border-r-0"
                                                        )}
                                                        style={{ ...widthStyle, ...stickyStyle }}
                                                    >
                                                        {header.isPlaceholder ? null : (
                                                            <div className="flex items-center justify-between h-full relative">
                                                                <div
                                                                    {...{
                                                                        className: header.column.getCanSort()
                                                                            ? 'cursor-pointer select-none flex items-center gap-1.5 hover:text-white transition-colors'
                                                                            : 'flex items-center gap-1.5',
                                                                        onClick: header.column.getToggleSortingHandler(),
                                                                    }}
                                                                >
                                                                    {flexRender(
                                                                        header.column.columnDef.header,
                                                                        header.getContext()
                                                                    )}
                                                                    {{
                                                                        asc: <ArrowUp className="h-3 w-3 text-[#a0a5b0]" />,
                                                                        desc: <ArrowDown className="h-3 w-3 text-[#a0a5b0]" />,
                                                                    }[header.column.getIsSorted() as string] ?? (
                                                                        header.column.getCanSort() ? <ArrowUpDown className="h-3 w-3 text-[#3a3e45] group-hover:text-[#a0a5b0]" /> : null
                                                                    )}
                                                                </div>
                                                                
                                                                {header.column.getCanResize() && !isFluid && (
                                                                    <div
                                                                        onMouseDown={header.getResizeHandler()}
                                                                        onTouchStart={header.getResizeHandler()}
                                                                        onDoubleClick={() => header.column.resetSize()}
                                                                        className={cn(
                                                                            "absolute right-0 top-0 h-full w-[1px] cursor-col-resize touch-none z-50 transition-all",
                                                                            "bg-[#3a3e45]",
                                                                            "hover:w-[4px] hover:bg-[#0084ff]",
                                                                            header.column.getIsResizing() && "w-[4px] bg-[#0084ff]"
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
                                            <TableCell colSpan={columns.length} className="h-32 text-center text-[#a0a5b0]">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="h-6 w-6 border-2 border-[#0084ff] border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-sm">Carregando dados...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : table.getRowModel().rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-32 text-center text-[#a0a5b0]">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <Search className="h-8 w-8 text-[#3a3e45] mb-2" />
                                                    <span className="text-sm font-medium text-[#e8eaed]">Nenhum registro encontrado</span>
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
                                                        "border-b border-[#3a3e45] transition-colors group text-[#e8eaed]",
                                                        "hover:bg-[#24282f]",
                                                        "data-[state=selected]:bg-[#161b22] data-[state=selected]:hover:bg-[#1c222b]"
                                                    )}
                                                >
                                                    {row.getVisibleCells().map(cell => {
                                                        const isSelect = cell.column.id === 'select';
                                                        const isActions = cell.column.id === 'actions';
                                                        const isFluid = (cell.column.columnDef.meta as any)?.isFluid;

                                                        let stickyClass = '';
                                                        const stickyStyle: React.CSSProperties = {};
                                                        
                                                        if (isSelect) {
                                                            stickyClass = cn("sticky left-0 z-20 border-r border-[#3a3e45]", isSelected ? "bg-[#161b22]" : "bg-[#1e2329] group-hover:bg-[#24282f]");
                                                            stickyStyle.left = 0;
                                                        }
                                                        if (isActions) {
                                                            stickyClass = cn("sticky right-0 z-20 border-l border-[#3a3e45]", isSelected ? "bg-[#161b22]" : "bg-[#1e2329] group-hover:bg-[#24282f]");
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