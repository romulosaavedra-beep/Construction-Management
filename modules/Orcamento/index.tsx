import { useBudgets } from '../../hooks/useBudgets';
import { ModuleHeader } from '@/components/layout';
import { useProjectContext } from '@/contexts/project-context';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { OrcamentoItem } from '@/types';
import { PageHeader } from '@/components/layout';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from '../../utils/formatters';
import { initialOrcamentoData, DEFAULT_UNITS_DATA } from '../../data/mockData';
import { GoogleGenAI, Type } from "@google/genai";
import { useConfirm } from '../../utils/useConfirm';
import { exportToCsv, exportToExcel } from './utils/exportOrcamento';
import {
    Save,
    Pencil,
    Undo2,
    Redo2,
    X,
    Briefcase,
    CheckCircle2,
    Info,
    CirclePlus,
    Trash2,
    FileSpreadsheet,
    FileText,
    Bot,
    Eye,
    EyeOff,
    Pin,
    PinOff,
    ChevronRight,
    ChevronDown,
    Copy,
    MoreHorizontal,
    UploadCloud,
    AlertTriangle,
    Check,
    ArrowDownToLine
} from "lucide-react";
import { cn } from "@/lib/utils";

const LOCAL_STORAGE_KEY_VIEW = 'vobi-orcamento-column-widths-view';
const LOCAL_STORAGE_KEY_EDIT = 'vobi-orcamento-column-widths-edit';
const LOCAL_STORAGE_KEY_HIDDEN_COLUMNS = 'vobi-orcamento-hidden-columns-v2';
const LOCAL_STORAGE_KEY_PINNED_COLUMNS = 'vobi-orcamento-pinned-columns';
const LOCAL_STORAGE_KEY_UNITS = 'vobi-settings-units';

const formatNumberOrDash = (value: number, decimalPlaces = 2): string => {
    if (value === 0 || isNaN(value)) return '-';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
    }).format(value);
};

const formatCurrencyOrDash = (value: number): string => {
    if (value === 0 || isNaN(value)) return '-';
    return formatCurrency(value);
};

// Helper para navega´┐¢´┐¢o com Enter
const handleEnterNavigation = (e: React.KeyboardEvent<HTMLElement>, colId: string) => {
    e.preventDefault();
    const currentInput = e.currentTarget;
    const table = currentInput.closest('table');
    if (!table) return;

    const allInputs = Array.from(table.querySelectorAll(`input[data-col-id="${colId}"], select[data-col-id="${colId}"]`)) as HTMLElement[];

    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % allInputs.length;
        const nextInput = allInputs[nextIndex];

        nextInput.focus();
        if (nextInput instanceof HTMLInputElement) {
            nextInput.select();
        }
    }
};

interface ColumnConfig {
    id: string;
    label: string;
    initialWidth: number;
    minWidth: number;
    align?: 'left' | 'center' | 'right';
    resizable?: boolean;
}

interface UnitItem {
    category: string;
    name: string;
    symbol: string;
}

// --- Components ---

const EditableCell = ({ value, onCommit, isNumeric = false, className = "", onKeyDown, disabled = false, isSelected = false, columnId }: {
    value: string | number;
    onCommit: (newValue: string | number) => void;
    isNumeric?: boolean;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    isSelected?: boolean;
    columnId?: string;
}) => {
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleBlur = () => {
        if (disabled) return;
        if (currentValue !== value) {
            if (isNumeric) {
                onCommit(parseFloat(currentValue as string) || 0);
            } else {
                onCommit(currentValue);
            }
        }
    };

    const handleLocalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (onKeyDown) {
            onKeyDown(e);
            if (e.defaultPrevented) return;
        }

        if (e.key === 'Enter') {
            if (columnId) {
                handleEnterNavigation(e, columnId);
            } else {
                e.currentTarget.blur();
            }
        } else if (e.key === 'Escape') {
            setCurrentValue(value);
            e.currentTarget.blur();
        }
    }

    return (
        <input
            type={isNumeric ? "number" : "text"}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleLocalKeyDown}
            onFocus={e => e.target.select()}
            disabled={disabled}
            data-col-id={columnId}
            className={cn(
                "w-full h-7 rounded px-1.5 text-xs transition-colors focus:outline-none",
                disabled ? "cursor-not-allowed bg-transparent text-secondary" : "bg-surface text-white border border-default focus:border-default",
                isSelected && "bg-accent-500/10 border-accent-500",
                className
            )}
            style={{ textAlign: isNumeric ? 'right' : 'left' }}
        />
    );
};

const UnitAutocompleteCell = ({ value, onCommit, availableUnits, isSelected = false, columnId }: {
    value: string;
    onCommit: (newValue: string) => void;
    availableUnits: UnitItem[];
    isSelected?: boolean;
    columnId?: string;
}) => {
    const [searchTerm, setSearchTerm] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    const filteredUnits = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return availableUnits.filter(u =>
            u.symbol.toLowerCase().includes(term) ||
            u.name.toLowerCase().includes(term) ||
            u.category.toLowerCase().includes(term)
        ).slice(0, 50);
    }, [searchTerm, availableUnits]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                const exactMatch = availableUnits.find(u => u.symbol.toLowerCase() === searchTerm.toLowerCase());
                if (exactMatch) {
                    if (exactMatch.symbol !== value) onCommit(exactMatch.symbol);
                } else {
                    setSearchTerm(value);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [availableUnits, searchTerm, value, onCommit]);

    const handleSelect = (unit: UnitItem) => {
        setSearchTerm(unit.symbol);
        setIsOpen(false);
        onCommit(unit.symbol);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, filteredUnits.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            if (isOpen && filteredUnits.length > 0) {
                e.preventDefault();
                handleSelect(filteredUnits[highlightedIndex]);
            } else if (columnId) {
                handleEnterNavigation(e, columnId);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm(value);
            inputRef.current?.blur();
        } else if (e.key === 'Tab') {
            setIsOpen(false);
            const exactMatch = availableUnits.find(u => u.symbol.toLowerCase() === searchTerm.toLowerCase());
            if (exactMatch && exactMatch.symbol !== value) {
                onCommit(exactMatch.symbol);
            }
        }
    };

    const handleFocus = () => {
        setIsOpen(true);
        setHighlightedIndex(0);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                data-col-id={columnId}
                onChange={e => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                    setHighlightedIndex(0);
                }}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-full h-7 rounded px-1.5 text-xs text-center transition-colors focus:outline-none",
                    "bg-surface text-white border border-default focus:border-default",
                    isSelected && "bg-accent-500/10 border-accent-500"
                )}
                placeholder="-"
            />
            {isOpen && filteredUnits.length > 0 && (
                <div className="absolute top-full left-0 w-64 bg-surface border border-default rounded-md shadow-xl z-[100] max-h-60 overflow-y-auto mt-1 custom-scrollbar">
                    {filteredUnits.map((unit, index) => (
                        <div
                            key={`${unit.category}-${unit.symbol}-${index}`}
                            onClick={() => handleSelect(unit)}
                            className={cn(
                                "px-3 py-2 cursor-pointer flex justify-between items-center border-b border-default/30 last:border-0 transition-colors",
                                index === highlightedIndex ? "bg-accent-500/20 text-white" : "text-secondary hover:bg-elevated"
                            )}
                        >
                            <span className="font-bold text-white w-10 text-center bg-elevated/50 rounded px-1">{unit.symbol}</span>
                            <span className="text-xs truncate flex-1 text-right pl-2">{unit.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Logic Helpers ---

const regenerateNiveles = (items: OrcamentoItem[]): OrcamentoItem[] => {
    const newItems = items.map(i => ({ ...i }));

    const processLevel = (parentId: string | number | null, parentNivel: string) => {
        let siblingIndex = 1;
        const children = newItems.filter(item => item.pai === parentId);
        for (const child of children) {
            const newNivel = parentNivel ? `${parentNivel}.${siblingIndex}` : `${siblingIndex}`;
            child.nivel = newNivel;
            siblingIndex++;
            processLevel(child.id, child.nivel);
        }
    };

    processLevel(null, '');
    return newItems;
}

const getAllDescendantIds = (items: OrcamentoItem[], parentId: string | number): (string | number)[] => {
    const descendantIds: (string | number)[] = [];
    const children = items.filter(item => item.pai === parentId);
    for (const child of children) {
        descendantIds.push(child.id);
        descendantIds.push(...getAllDescendantIds(items, child.id));
    }
    return descendantIds;
};

const updateHierarchy = (items: OrcamentoItem[]): OrcamentoItem[] => {
    const parentIds = new Set(items.map(i => i.pai).filter(p => p !== null));
    const cleanedItems = items.map(item => {
        if (parentIds.has(item.id)) {
            return {
                ...item,
                unidade: '',
                quantidade: 0,
                mat_unit: 0,
                mo_unit: 0,
            };
        }
        return item;
    });
    return regenerateNiveles(cleanedItems);
};

interface OrcamentoProps {
    orcamentoData: OrcamentoItem[];
    setOrcamentoData: (data: OrcamentoItem[]) => void;
}

const Orcamento: React.FC<OrcamentoProps> = ({ orcamentoData, setOrcamentoData }) => {
    const [localOrcamento, setLocalOrcamento] = useState<OrcamentoItem[]>(orcamentoData);
    const [isEditing, setIsEditing] = useState(false);
    const [originalOrcamento, setOriginalOrcamento] = useState<OrcamentoItem[] | null>(null);
    const [draggedItemId, setDraggedItemId] = useState<string | number | null>(null);
    const [selectedIds, setSelectedIds] = useState(new Set<string | number>());
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
    const [restoreMenuOpen, setRestoreMenuOpen] = useState(false);

    const [history, setHistory] = useState<OrcamentoItem[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
    const [isAutoAiMapping, setIsAutoAiMapping] = useState(true);
    const [columnMapping, setColumnMapping] = useState<{ [key: string]: { enabled: boolean; name: string } }>({
        nivel: { enabled: false, name: '' },
        fonte: { enabled: false, name: '' },
        codigo: { enabled: false, name: '' },
        discriminacao: { enabled: true, name: 'Discrimina´┐¢´┐¢o' },
        unidade: { enabled: true, name: 'Un.' },
        quantidade: { enabled: true, name: 'Quant.' },
        mat_unit: { enabled: true, name: 'Mat. Unit.' },
        mo_unit: { enabled: true, name: 'M.O Unit.' },
        mat_mo_unit: { enabled: false, name: '' },
    });
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(['mat_mo_total']));
    const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
    const [allUnits, setAllUnits] = useState<UnitItem[]>([]);
    const [areSettingsLoaded, setAreSettingsLoaded] = useState(false);

    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    const { selectedProjectId } = useProjectContext();
    const { budgets, activeBudget, setActiveBudget, createBudget, deleteBudget, saveBudgetItems, updateBudget, budgetItems } = useBudgets(selectedProjectId);

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const resizingColumnRef = useRef<{ index: number; startX: number; startWidth: number; } | null>(null);
    const measureCellRef = useRef<HTMLSpanElement | null>(null);
    const isInitialMount = useRef(true);

    const abortAiRef = useRef(false);

    useEffect(() => {
        if (!isEditing) {
            setLocalOrcamento(orcamentoData);
        }
    }, [orcamentoData, isEditing]);

    // Sync budgetItems from useBudgets to localOrcamento when activeBudget changes
    useEffect(() => {
        if (activeBudget && budgetItems && budgetItems.length > 0) {
            setLocalOrcamento(budgetItems);
            setOrcamentoData(budgetItems);
        } else if (!activeBudget) {
            setLocalOrcamento([]);
            setOrcamentoData([]);
        } else if (activeBudget && (!budgetItems || budgetItems.length === 0)) {
            setLocalOrcamento([]);
            setOrcamentoData([]);
        }
    }, [budgetItems, activeBudget]);

    useEffect(() => {
        try {
            const savedUnits = localStorage.getItem(LOCAL_STORAGE_KEY_UNITS);
            if (savedUnits) {
                setAllUnits(JSON.parse(savedUnits));
            } else {
                setAllUnits(DEFAULT_UNITS_DATA);
            }
        } catch (e) {
            console.error("Failed to load units", e);
            setAllUnits(DEFAULT_UNITS_DATA);
        }
    }, []);

    useEffect(() => {
        try {
            const savedHidden = localStorage.getItem(LOCAL_STORAGE_KEY_HIDDEN_COLUMNS);
            if (savedHidden) {
                setHiddenColumns(new Set(JSON.parse(savedHidden)));
            } else {
                localStorage.setItem(LOCAL_STORAGE_KEY_HIDDEN_COLUMNS, JSON.stringify(Array.from(hiddenColumns)));
            }
            const savedPinned = localStorage.getItem(LOCAL_STORAGE_KEY_PINNED_COLUMNS);
            if (savedPinned) {
                setPinnedColumns(new Set(JSON.parse(savedPinned)));
            } else {
                setPinnedColumns(new Set());
            }
            setAreSettingsLoaded(true);
        } catch (e) {
            console.error("Could not load column settings", e);
            setAreSettingsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!areSettingsLoaded) return;
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_HIDDEN_COLUMNS, JSON.stringify(Array.from(hiddenColumns)));
        } catch (e) {
            console.error("Could not save hidden columns", e);
        }
    }, [hiddenColumns, areSettingsLoaded]);

    useEffect(() => {
        if (!areSettingsLoaded) return;
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_PINNED_COLUMNS, JSON.stringify(Array.from(pinnedColumns)));
        } catch (e) {
            console.error("Could not save pinned columns", e);
        }
    }, [pinnedColumns, areSettingsLoaded]);

    const updateOrcamento = useCallback((updater: React.SetStateAction<OrcamentoItem[]>) => {
        setLocalOrcamento(currentData => {
            const newData = typeof updater === 'function' ? updater(currentData) : updater;
            const newDataCopy = JSON.parse(JSON.stringify(newData));
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newDataCopy);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            return newData;
        });
    }, [history, historyIndex]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setLocalOrcamento(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setLocalOrcamento(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleClearSelectedColumn = useCallback(() => {
        if (!selectedColumn || !isEditing) return;

        const fieldMap: { [key: string]: keyof OrcamentoItem } = {
            'fonte': 'fonte',
            'codigo': 'codigo',
            'discriminacao': 'discriminacao',
            'un': 'unidade',
            'quant': 'quantidade',
            'mat_unit': 'mat_unit',
            'mo_unit': 'mo_unit'
        };

        const field = fieldMap[selectedColumn];
        if (!field) return;

        updateOrcamento(prev => prev.map(item => {
            const isService = item.unidade !== '' || field === 'discriminacao' || field === 'fonte' || field === 'codigo';
            if (!isService) return item;

            let newValue: any = '';
            if (field === 'quantidade' || field === 'mat_unit' || field === 'mo_unit') {
                newValue = 0;
            }

            return { ...item, [field]: newValue };
        }));
    }, [selectedColumn, isEditing, updateOrcamento]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEditing) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z';
            const isRedo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'y';

            if (isUndo) {
                e.preventDefault();
                handleUndo();
            } else if (isRedo) {
                e.preventDefault();
                handleRedo();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedColumn) {
                e.preventDefault();
                handleClearSelectedColumn();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, handleUndo, handleRedo, selectedColumn, handleClearSelectedColumn]);

    const columnsConfig = useMemo((): ColumnConfig[] => {
        const baseColumns: ColumnConfig[] = [
            { id: 'nivel', label: 'N´┐¢vel', initialWidth: 100, minWidth: 60 },
            { id: 'fonte', label: 'Fonte', initialWidth: 60, minWidth: 60, align: 'left' },
            { id: 'codigo', label: 'C´┐¢digo', initialWidth: 60, minWidth: 60, align: 'left' },
            { id: 'discriminacao', label: 'Discrimina´┐¢´┐¢o', initialWidth: 250, minWidth: 150, align: 'left' },
            { id: 'un', label: 'Un.', initialWidth: 60, minWidth: 50, align: 'center' },
            { id: 'quant', label: 'Quant.', initialWidth: 70, minWidth: 70, align: 'right' },
            { id: 'mat_unit', label: 'Mat. Unit.', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mo_unit', label: 'M.O. Unit.', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mat_mo_unit', label: 'Mat.+M.O Unit.', initialWidth: 100, minWidth: 100, align: 'right' },
            { id: 'mat_total', label: 'Mat. Total', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mo_total', label: 'M.O. Total', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mat_mo_total', label: 'Mat.+M.O Total', initialWidth: 100, minWidth: 100, align: 'right' },
            { id: 'total_nivel', label: 'Total N´┐¢vel', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'percent_nivel', label: '% N´┐¢vel', initialWidth: 70, minWidth: 70, align: 'right' },
        ];

        if (isEditing) {
            return [
                { id: 'select', label: '', initialWidth: 50, minWidth: 50, resizable: false, align: 'center' },
                ...baseColumns,
                { id: 'action', label: 'A´┐¢´┐¢o', initialWidth: 100, minWidth: 100, align: 'left' },
            ];
        }
        return baseColumns;
    }, [isEditing]);

    const [columnWidths, setColumnWidths] = useState<number[]>([]);

    useEffect(() => {
        const key = isEditing ? LOCAL_STORAGE_KEY_EDIT : LOCAL_STORAGE_KEY_VIEW;
        let loaded = false;
        try {
            const savedWidthsJSON = localStorage.getItem(key);
            if (savedWidthsJSON) {
                const parsedWidths = JSON.parse(savedWidthsJSON);
                if (Array.isArray(parsedWidths) && parsedWidths.length === columnsConfig.length) {
                    setColumnWidths(parsedWidths);
                    loaded = true;
                }
            }
        } catch (e) {
            console.error("Could not load column widths", e);
        }

        if (!loaded) {
            setColumnWidths(columnsConfig.map(c => c.initialWidth));
        }
    }, [isEditing, columnsConfig]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (columnWidths.length === 0) {
            return;
        }
        const key = isEditing ? LOCAL_STORAGE_KEY_EDIT : LOCAL_STORAGE_KEY_VIEW;
        try {
            localStorage.setItem(key, JSON.stringify(columnWidths));
        } catch (e) {
            console.error("Could not save column widths", e);
        }
    }, [columnWidths, isEditing]);

    const visibleColumns = useMemo(() => {
        return columnsConfig
            .map((col, index) => ({ col, index }))
            .filter(({ col }) => !hiddenColumns.has(col.id));
    }, [columnsConfig, hiddenColumns]);

    const getStickyLeft = useCallback((columnIndex: number) => {
        let left = 0;
        for (let i = 0; i < columnIndex; i++) {
            const { col, index } = visibleColumns[i];
            if (pinnedColumns.has(col.id)) {
                left += columnWidths[index];
            }
        }
        return left;
    }, [visibleColumns, pinnedColumns, columnWidths]);

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizingColumnRef.current) return;

        const { index, startX, startWidth } = resizingColumnRef.current;
        const diffX = e.clientX - startX;
        const newWidth = startWidth + diffX;
        const minWidth = columnsConfig[index].minWidth;

        if (newWidth >= minWidth) {
            setColumnWidths(prevWidths => {
                const newWidths = [...prevWidths];
                newWidths[index] = newWidth;
                return newWidths;
            });
        }
    }, [columnsConfig]);

    const handleResizeEnd = useCallback(() => {
        resizingColumnRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }, [handleResizeMove]);

    const handleResizeStart = (e: React.MouseEvent, visibleIndex: number) => {
        e.preventDefault();
        const originalIndex = visibleColumns[visibleIndex].index;
        resizingColumnRef.current = {
            index: originalIndex,
            startX: e.clientX,
            startWidth: columnWidths[originalIndex],
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const getCellContentAsString = useCallback((item: any, columnId: string): string => {
        const isService = !item.hasChildren;

        switch (columnId) {
            case 'nivel': return item.nivel;
            case 'fonte': return isService ? item.fonte : '';
            case 'codigo': return isService ? item.codigo : '';
            case 'discriminacao': return item.discriminacao;
            case 'un': return item.unidade || '-';
            case 'quant': return isService ? formatNumberOrDash(item.quantidade) : '-';
            case 'mat_unit': return isService ? formatCurrencyOrDash(item.mat_unit) : '-';
            case 'mo_unit': return isService ? formatCurrencyOrDash(item.mo_unit) : '-';
            case 'mat_mo_unit': return isService ? formatCurrencyOrDash(item.matMoUnit) : '-';
            case 'mat_total': return formatCurrencyOrDash(item.matUnitTotal);
            case 'mo_total': return formatCurrencyOrDash(item.moUnitTotal);
            case 'mat_mo_total': return formatCurrencyOrDash(item.matMoTotal);
            case 'total_nivel': return formatCurrencyOrDash(item.totalNivel);
            case 'percent_nivel': return item.percentNivel > 0 ? item.percentNivel.toFixed(2) + '%' : '-';
            default: return '';
        }
    }, []);

    const processedOrcamento = useMemo(() => {
        const itemsMap = new Map();
        const parentIds = new Set(localOrcamento.map(i => i.pai).filter(p => p !== null));
        let grandTotal = 0;

        localOrcamento.forEach(item => {
            const isParent = parentIds.has(item.id);
            const matTotal = item.quantidade * item.mat_unit;
            const moTotal = item.quantidade * item.mo_unit;

            itemsMap.set(item.id, {
                ...item,
                hasChildren: isParent,
                matMoUnit: item.mat_unit + item.mo_unit,
                matUnitTotal: matTotal,
                moUnitTotal: moTotal,
                matMoTotal: matTotal + moTotal,
                totalNivel: 0,
                percentNivel: 0,
            });
        });

        const calculateSubtotals = (itemId: string | number) => {
            const item = itemsMap.get(itemId);
            if (!item) return { mat: 0, mo: 0, total: 0 };

            if (!item.hasChildren) {
                item.totalNivel = item.matMoTotal;
                return { mat: item.matUnitTotal, mo: item.moUnitTotal, total: item.totalNivel };
            }

            let sumMat = 0;
            let sumMo = 0;
            let sumTotal = 0;

            localOrcamento.filter(child => child.pai === itemId).forEach(child => {
                const childTotals = calculateSubtotals(child.id);
                sumMat += childTotals.mat;
                sumMo += childTotals.mo;
                sumTotal += childTotals.total;
            });

            item.matUnitTotal = sumMat;
            item.moUnitTotal = sumMo;
            item.matMoTotal = sumMat + sumMo;
            item.totalNivel = sumTotal;

            return { mat: sumMat, mo: sumMo, total: sumTotal };
        };

        localOrcamento.filter(item => item.pai === null).forEach(root => {
            const totals = calculateSubtotals(root.id);
            grandTotal += totals.total;
        });

        itemsMap.forEach(item => {
            item.percentNivel = grandTotal > 0 ? (item.totalNivel / grandTotal) * 100 : 0;
        });

        return Array.from(itemsMap.values());
    }, [localOrcamento]);

    const handleAutoResize = useCallback((visibleIndex: number) => {
        const originalIndex = visibleColumns[visibleIndex].index;
        const column = columnsConfig[originalIndex];

        if (!column || !(column.resizable ?? true) || !measureCellRef.current) return;

        const measureElement = measureCellRef.current;
        measureElement.className = 'text-xs uppercase font-bold absolute invisible whitespace-nowrap z-[-1]';
        measureElement.textContent = column.label;
        let maxWidth = measureElement.offsetWidth;
        measureElement.className = 'text-xs absolute invisible whitespace-nowrap z-[-1]';

        const specialFontWeightClasses: { [key: string]: string } = {
            nivel: 'font-medium',
            discriminacao: 'font-medium',
            mat_mo_unit: 'font-semibold',
            mat_mo_total: 'font-semibold',
            total_nivel: 'font-bold',
        };
        const fontWeightClass = specialFontWeightClasses[column.id];

        if (fontWeightClass) {
            measureElement.classList.add(fontWeightClass);
        }

        processedOrcamento.forEach(item => {
            const text = getCellContentAsString(item, column.id);
            measureElement.textContent = text;
            const width = measureElement.offsetWidth;
            if (width > maxWidth) {
                maxWidth = width;
            }
        });

        if (fontWeightClass) {
            measureElement.classList.remove(fontWeightClass);
        }

        const extraPadding = column.id === 'nivel' ? 40 : 18;
        const finalWidth = Math.max(column.minWidth, maxWidth + extraPadding);

        setColumnWidths(prev => {
            const newWidths = [...prev];
            newWidths[originalIndex] = finalWidth;
            return newWidths;
        });
    }, [columnsConfig, processedOrcamento, getCellContentAsString, visibleColumns]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            const numSelected = selectedIds.size;
            const numRows = localOrcamento.length;
            headerCheckboxRef.current.checked = numSelected === numRows && numRows > 0;
            headerCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numRows;
        }
    }, [selectedIds, localOrcamento.length]);

    const handleEdit = () => {
        const deepCopy = JSON.parse(JSON.stringify(localOrcamento));
        setOriginalOrcamento(deepCopy);
        setHistory([deepCopy]);
        setHistoryIndex(0);
        setIsEditing(true);
        setSelectedColumn(null);
    };

    const handleSave = async () => {
        if (activeBudget) {
            try {
                // 1. Save budget name (if changed)
                await updateBudget(activeBudget.id, { name: activeBudget.name });

                // 2. Save budget items
                await saveBudgetItems(activeBudget.id, localOrcamento);

                toast.success('Or´┐¢amento salvo com sucesso!');
            } catch (error) {
                console.error('Error saving budget:', error);
                toast.error('Erro ao salvar or´┐¢amento');
                return; // Don't reset state if save failed
            }
        } else {
            toast.error('Nenhum or´┐¢amento selecionado para salvar.');
            return;
        }

        setOrcamentoData(localOrcamento);
        setIsEditing(false);
        setOriginalOrcamento(null);
        setSelectedIds(new Set());
        setSelectedColumn(null);
        setHistory([]);
        setHistoryIndex(-1);
    };

    const handleExit = async () => {
        const confirmExit = await confirm({
            title: 'Confirmar Sa´┐¢da',
            message: 'Tem certeza que deseja sair sem salvar? Todas as altera´┐¢´┐¢es ser´┐¢o perdidas.',
            confirmText: 'Sair sem Salvar',
            cancelText: 'Cancelar'
        });

        if (!confirmExit) {
            return;
        }

        if (originalOrcamento) {
            setLocalOrcamento(originalOrcamento);
        }
        setIsEditing(false);
        setOriginalOrcamento(null);
        setSelectedIds(new Set());
        setSelectedColumn(null);
        setHistory([]);
        setHistoryIndex(-1);
    };

    const handleValueCommit = (id: string | number, field: keyof OrcamentoItem, value: string | number) => {
        updateOrcamento(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'unidade' && (value === '' || value === '-')) {
                    updatedItem.quantidade = 0;
                    updatedItem.mat_unit = 0;
                    updatedItem.mo_unit = 0;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleNivelChange = (id: string | number, newNivel: string) => {
        const currentItem = localOrcamento.find(i => i.id === id);
        if (!currentItem || currentItem.nivel === newNivel) return;

        const parts = newNivel.split('.').filter(p => p);
        if (parts.length === 0) return;

        const newParentNivel = parts.slice(0, -1).join('.');
        const newParent = localOrcamento.find(i => i.nivel === newParentNivel);
        const newParentId = newParentNivel === '' ? null : (newParent ? newParent.id : 'INVALID');

        if (newParentId === 'INVALID') return;

        let p = newParent;
        while (p) {
            if (p.id === id) return;
            p = p.pai ? localOrcamento.find(i => i.id === p.pai) : null;
        }

        const idsToMove = new Set<string | number>([id, ...getAllDescendantIds(localOrcamento, id)]);
        const itemsToMove = localOrcamento.filter(i => idsToMove.has(i.id));
        const remainingItems = localOrcamento.filter(i => !idsToMove.has(i.id));

        const mainItemToMove = itemsToMove.find(i => i.id === id);
        if (mainItemToMove) {
            mainItemToMove.pai = newParentId;
        }

        let insertionIndex = -1;
        if (newParentId !== null) {
            const childrenOfNewParent = remainingItems.filter(i => i.pai === newParentId);
            const lastChildOfNewParent = childrenOfNewParent[childrenOfNewParent.length - 1];

            if (lastChildOfNewParent) {
                const lastDescendantIds = getAllDescendantIds(remainingItems, lastChildOfNewParent.id);
                const lastId = lastDescendantIds.length > 0 ? lastDescendantIds[lastDescendantIds.length - 1] : lastChildOfNewParent.id;
                insertionIndex = remainingItems.findIndex(i => i.id === lastId) + 1;
            } else {
                insertionIndex = remainingItems.findIndex(i => i.id === newParentId) + 1;
            }
        } else {
            const lastRootItem = [...remainingItems].reverse().find(i => i.pai === null);
            insertionIndex = lastRootItem ? remainingItems.findIndex(i => i.id === lastRootItem.id) + 1 : 0;
        }

        if (insertionIndex === -1) insertionIndex = remainingItems.length;

        remainingItems.splice(insertionIndex, 0, ...itemsToMove);
        updateOrcamento(updateHierarchy(remainingItems));
    };

    const handleNivelKeyDown = (e: React.KeyboardEvent, itemId: string | number) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();

        const items = [...localOrcamento];
        const currentItem = items.find(i => i.id === itemId);
        if (!currentItem) return;

        let newItems: OrcamentoItem[] = [];

        if (e.shiftKey) { // Outdent
            const parentItem = items.find(i => i.id === currentItem.pai);
            if (!parentItem) return;

            const blockIds = new Set([itemId, ...getAllDescendantIds(items, itemId)]);
            const newBlockToMove = items
                .filter(i => blockIds.has(i.id))
                .map(item => item.id === itemId ? { ...item, pai: parentItem.pai } : { ...item });

            const remainingItems = items.filter(i => !blockIds.has(i.id));
            const parentAndItsDescendantsIds = [parentItem.id, ...getAllDescendantIds(remainingItems, parentItem.id)];
            const lastIdInParentFamily = parentAndItsDescendantsIds[parentAndItsDescendantsIds.length - 1];
            const insertionIndex = remainingItems.findIndex(i => i.id === lastIdInParentFamily) + 1;

            remainingItems.splice(insertionIndex, 0, ...newBlockToMove);
            newItems = remainingItems;

        } else { // Indent
            const parentId = currentItem.pai;
            const currentItemIndexInFlatArray = items.findIndex(i => i.id === itemId);

            let precedingSibling: OrcamentoItem | undefined = undefined;
            for (let i = currentItemIndexInFlatArray - 1; i >= 0; i--) {
                const potentialSibling = items[i];
                if (potentialSibling && potentialSibling.pai === parentId) {
                    precedingSibling = potentialSibling;
                    break;
                }
            }

            if (!precedingSibling) return;

            const newParent = precedingSibling;
            const blockIds = new Set([itemId, ...getAllDescendantIds(items, itemId)]);

            const newBlockToMove = items
                .filter(i => blockIds.has(i.id))
                .map(item => item.id === itemId ? { ...item, pai: newParent.id } : item);

            const remainingItems = items.filter(i => !blockIds.has(i.id));

            const newParentAndItsDescendantsIds = [newParent.id, ...getAllDescendantIds(remainingItems, newParent.id)];
            const lastIdInNewParentFamily = newParentAndItsDescendantsIds[newParentAndItsDescendantsIds.length - 1];
            const insertionIndex = remainingItems.findIndex(i => i.id === lastIdInNewParentFamily) + 1;

            const originalParentIds = new Set(items.map(i => i.pai).filter(p => p !== null));
            const finalRemainingItems = remainingItems.map(i => {
                if (i.id === newParent.id) {
                    const becomesParent = !originalParentIds.has(newParent.id);
                    return {
                        ...i,
                        expandido: true,
                        ...(becomesParent && { unidade: '', quantidade: 0, mat_unit: 0, mo_unit: 0 })
                    };
                }
                return i;
            });

            finalRemainingItems.splice(insertionIndex, 0, ...newBlockToMove);
            newItems = finalRemainingItems;
        }

        if (newItems.length > 0) {
            updateOrcamento(updateHierarchy(newItems));
        }
    };

    const handleDragStart = (e: React.DragEvent, itemId: string | number) => {
        setDraggedItemId(itemId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetItemId: string | number) => {
        e.preventDefault();
        if (draggedItemId === null || draggedItemId === targetItemId) {
            setDraggedItemId(null);
            return;
        }

        const items = [...localOrcamento];
        const draggedItem = items.find(i => i.id === draggedItemId)!;
        const targetItem = items.find(i => i.id === targetItemId)!;

        const blockIds = new Set([draggedItemId, ...getAllDescendantIds(items, draggedItemId)]);
        if (blockIds.has(targetItemId)) {
            setDraggedItemId(null);
            return;
        }

        const blockToMove = items.filter(i => blockIds.has(i.id));
        const remainingItems = items.filter(i => !blockIds.has(i.id));

        const mainItemToMove = blockToMove.find(i => i.id === draggedItemId);
        if (mainItemToMove) {
            mainItemToMove.pai = targetItem.pai;
        }

        const targetDescendantIds = getAllDescendantIds(remainingItems, targetItemId);
        const lastRelevantId = targetDescendantIds.length > 0 ? targetDescendantIds[targetDescendantIds.length - 1] : targetItemId;
        const insertionIndex = remainingItems.findIndex(i => i.id === lastRelevantId) + 1;

        remainingItems.splice(insertionIndex, 0, ...blockToMove);
        updateOrcamento(updateHierarchy(remainingItems));
        setDraggedItemId(null);
    };

    const handleAddNewRow = (afterId: string | number) => {
        const afterItem = localOrcamento.find(item => item.id === afterId);
        if (!afterItem) return;

        const newId = crypto.randomUUID();
        const newItem: OrcamentoItem = {
            id: newId, nivel: '', pai: afterItem.pai, fonte: '', codigo: '',
            discriminacao: 'Novo Servi´┐¢o', unidade: '', quantidade: 0,
            mat_unit: 0, mo_unit: 0, expandido: false,
        };

        const afterIndex = localOrcamento.findIndex(item => item.id === afterId);
        const newOrcamento = [...localOrcamento];
        newOrcamento.splice(afterIndex + 1, 0, newItem);
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const handleDeleteRow = (idToDelete: string | number) => {
        const idsToDelete = new Set([idToDelete, ...getAllDescendantIds(localOrcamento, idToDelete)]);
        const newOrcamento = localOrcamento.filter(item => !idsToDelete.has(item.id));
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;

        let idsToDelete = new Set<string | number>();
        for (const id of selectedIds) {
            idsToDelete.add(id);
            const descendants = getAllDescendantIds(localOrcamento, id);
            descendants.forEach(descId => idsToDelete.add(descId));
        }
        const newOrcamento = localOrcamento.filter(item => !idsToDelete.has(item.id));
        updateOrcamento(updateHierarchy(newOrcamento));
        setSelectedIds(new Set());
    };

    const handleDuplicateRow = (idToDuplicate: string | number) => {
        const originalItem = localOrcamento.find(item => item.id === idToDuplicate);
        if (!originalItem) return;

        const newId = crypto.randomUUID();
        const newItem: OrcamentoItem = {
            ...originalItem, id: newId,
            discriminacao: `${originalItem.discriminacao} (C´┐¢pia)`,
            expandido: false,
        };

        const originalIndex = localOrcamento.findIndex(item => item.id === idToDuplicate);
        const newOrcamento = [...localOrcamento];
        newOrcamento.splice(originalIndex + 1, 0, newItem);
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const toggleExpand = (id: string | number) => {
        updateOrcamento(prev => prev.map(item =>
            item.id === id ? { ...item, expandido: !item.expandido } : item
        ));
    };

    const handleSelectRow = (id: string | number) => {
        setSelectedIds(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
            return newSelection;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === localOrcamento.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(localOrcamento.map(item => item.id)));
        }
    };

    const areAllExpanded = useMemo(() => {
        const parentItems = processedOrcamento.filter(item => item.hasChildren);
        if (parentItems.length === 0) {
            return true;
        }
        return parentItems.every(item => item.expandido);
    }, [processedOrcamento]);

    const handleToggleExpandAll = () => {
        const shouldExpand = !areAllExpanded;
        updateOrcamento(prev => prev.map(item => ({ ...item, expandido: shouldExpand })));
    };

    const handleTogglePin = (columnId: string) => {
        setPinnedColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(columnId)) {
                newSet.delete(columnId);
            } else {
                newSet.add(columnId);
            }
            return newSet;
        });
    };

    const { grandTotalValue, grandTotalMaterial, grandTotalMaoDeObra } = useMemo(() => {
        const materialTotal = processedOrcamento
            .filter(item => item.unidade !== '' && item.unidade !== '-')
            .reduce((acc, item) => acc + item.matUnitTotal, 0);

        const moTotal = processedOrcamento
            .filter(item => item.unidade !== '' && item.unidade !== '-')
            .reduce((acc, item) => acc + item.moUnitTotal, 0);

        const grandTotal = processedOrcamento.reduce((acc, item) => item.pai === null ? acc + item.totalNivel : acc, 0);

        return {
            grandTotalValue: grandTotal,
            grandTotalMaterial: materialTotal,
            grandTotalMaoDeObra: moTotal,
        };
    }, [processedOrcamento]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setUploadedFileContent(text);
                setImportStep(2);
            };
            reader.readAsText(file);
        }
    };

    const handleMappingChange = (key: string, field: 'enabled' | 'name', value: boolean | string) => {
        setColumnMapping(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
    };

    const resetImport = () => {
        setImportModalOpen(false);
        setImportStep(1);
        setUploadedFileContent(null);
        setIsAiProcessing(false);
        setIsAutoAiMapping(true);
    }

    const processAiResponseIntoOrcamento = (aiData: any[]): OrcamentoItem[] => {
        if (!Array.isArray(aiData)) {
            console.error("AI response is not an array:", aiData);
            return [];
        }

        const items: Omit<OrcamentoItem, 'id' | 'pai' | 'expandido'>[] = aiData.map(d => ({
            nivel: d.nivel || '',
            discriminacao: d.discriminacao || 'Item sem nome',
            fonte: d.fonte || '',
            codigo: d.codigo || '',
            unidade: d.unidade || '',
            quantidade: parseFloat(d.quantidade) || 0,
            mat_unit: parseFloat(d.mat_unit) || 0,
            mo_unit: parseFloat(d.mo_unit) || 0,
            use_total_unit: d.use_total_unit || false,
        }));

        let idCounter = 1;
        const itemsWithIds = items.map(item => ({ ...item, id: idCounter++ }));

        const nivelMap: { [key: string]: number } = {};
        itemsWithIds.forEach(item => {
            nivelMap[item.nivel] = item.id;
        });

        const structuredItems: OrcamentoItem[] = itemsWithIds.map(item => {
            const nivelParts = item.nivel.split('.');
            const parentNivel = nivelParts.slice(0, -1).join('.');
            const parentId = nivelMap[parentNivel] || null;
            return {
                ...item,
                pai: parentId,
                expandido: true
            };
        });

        return structuredItems;
    };

    const handleStopAi = () => {
        abortAiRef.current = true;
        setIsAiProcessing(false);
    };

    const getStandardizedUnitsReference = () => {
        return allUnits.map(u => `Nome: "${u.name}" | S´┐¢mbolo: "${u.symbol}"`).join('\n');
    };

    const handleAiImport = async () => {
        if (!uploadedFileContent) {
            toast.error("Nenhum arquivo enviado.");
            return;
        }

        abortAiRef.current = false;
        setIsAiProcessing(true);

        let mappingDescription = '';
        if (isAutoAiMapping) {
            mappingDescription = "Usando sua intelig´┐¢ncia detecte automaticamente as colunas com base em seu conte´┐¢do seguindo o modelo (DE ? PARA), Infira a estrutura de dados de forma inteligente.";
        } else {
            mappingDescription = (Object.entries(columnMapping) as [string, { enabled: boolean; name: string }][])
                .filter(([, value]) => value.enabled && value.name)
                .map(([key, value]) => `A coluna do meu arquivo chamada "${value.name}" corresponde ao campo "${key}".`)
                .join(' ');
        }

        const unitsReference = getStandardizedUnitsReference();

        const prompt = `
            Analise o seguinte conte´┐¢do de um arquivo de or´┐¢amento de constru´┐¢´┐¢o civil. O conte´┐¢do ´┐¢:
            ---
            ${uploadedFileContent}
            ---
            As regras de mapeamento de colunas s´┐¢o: ${mappingDescription}.
            Sua tarefa ´┐¢ extrair os dados e estrutur´┐¢-los em um JSON.
            
            TABELA DE REFER´┐¢NCIA DE UNIDADES DE MEDIDA (PADR´┐¢O DO SISTEMA):
            --- IN´┐¢CIO DA LISTA DE UNIDADES ---
            ${unitsReference}
            --- FIM DA LISTA DE UNIDADES ---

            Regras Importantes:
            1.  **Estrutura e Hierarquia (L´┐¢GICA DE INFER´┐¢NCIA AVAN´┐¢ADA):** Se a coluna "n´┐¢vel" (ex: 1, 1.1, 2.1.3) N´┐¢O for fornecida explicitamente no texto, voc´┐¢ DEVE inferir a estrutura hier´┐¢rquica (WBS/EAP) seguindo estritamente este crit´┐¢rio l´┐¢gico:
                *   **Crit´┐¢rio para N´┐¢vel FILHO (Item Execut´┐¢vel):**
                    - Qualquer linha que POSSUA valores expl´┐¢citos de **Quantidade** E **Valor Unit´┐¢rio** (maiores que zero).
                    - Estes s´┐¢o os itens finais da composi´┐¢´┐¢o.
                
                *   **Crit´┐¢rio para N´┐¢vel PAI (Agrupador/T´┐¢tulo):**
                    - Qualquer linha que possua uma Descri´┐¢´┐¢o, mas **N´┐¢O POSSUA** Quantidade ou Valor Unit´┐¢rio (ou sejam vazios/zero).
                    - Estes itens servem apenas como cabe´┐¢alhos ou categorias para os itens abaixo deles.
                    
                *   **Constru´┐¢´┐¢o da Numera´┐¢´┐¢o:**
                    - Ao identificar um "Pai", inicie ou aprofunde a numera´┐¢´┐¢o (ex: de "2" para "2.1").
                    - Ao identificar um "Filho", ele deve herdar a numera´┐¢´┐¢o do ´┐¢ltimo "Pai" ativo (ex: se o pai ´┐¢ "2.1.1", o filho ser´┐¢ "2.1.1.1", "2.1.1.2", etc.).
                    - A hierarquia pode ser profunda (ex: 2 -> 2.1 -> 2.1.1 -> 2.1.1.1).
                    - **Exemplo de L´┐¢gica:**
                        - "Funda´┐¢´┐¢o" (Sem qtd/valor) -> N´┐¢vel 2 (Pai)
                        - "Terraplenagem" (Sem qtd/valor) -> N´┐¢vel 2.1 (Sub-Pai)
                        - "Estacas" (Sem qtd/valor) -> N´┐¢vel 2.1.1 (Sub-Pai)
                        - "Estaca Raiz..." (COM qtd 200 e valor 1200) -> N´┐¢vel 2.1.1.1 (Filho)

            2.  **Unidades (CR´┐¢TICO):** Para cada linha, verifique o valor da unidade no arquivo original.
                - Procure esse valor na tabela de refer´┐¢ncia acima (compare com "Nome" ou "S´┐¢mbolo", ignorando mai´┐¢sculas/min´┐¢sculas).
                - **SE encontrar correspond´┐¢ncia:** Preencha o campo "unidade" OBRIGATORIAMENTE com o valor do **S´┐¢mbolo** listado na tabela. Exemplo: Se o arquivo diz "Metro", e a tabela tem "Nome: Metro | S´┐¢mbolo: m", voc´┐¢ DEVE usar "m".
                - **SE N´┐¢O encontrar correspond´┐¢ncia exata:** Tente padronizar para o s´┐¢mbolo mais pr´┐¢ximo e comum (ex: "M2", "m2", "metro q" -> "m´┐¢").
                - Unidades como "UN", "Unid" devem virar "un".
            
            3.  **FONTE e C´┐¢DIGO (MUITO IMPORTANTE):**
                - **Fonte:** ´┐¢ a ORIGEM/REFER´┐¢NCIA de onde vem o servi´┐¢o/atividade. Exemplos comuns: "SINAPI", "SICRO", "SEINFRA", "ORSE", "SBC", "Pr´┐¢prio", "Cota´┐¢´┐¢o", etc.
                - **C´┐¢digo:** ´┐¢ o C´┐¢DIGO IDENTIFICADOR espec´┐¢fico da fonte. Exemplos: "73983/001", "C00123", "SUB-01234", "12345.678", etc.
                
                **?? ATEN´┐¢´┐¢O CR´┐¢TICA - N´┐¢O CONFUNDIR:**
                - **"n´┐¢vel"** = Hierarquia pai/filho (ex: "1", "1.1", "1.1.1", "1.1.2", "2", "2.1") ? Campo separado
                - **"codigo"** = Identificador da fonte (ex: "73983", "C-00123") ? NUNCA ser´┐¢ hier´┐¢rquico como "1.1.1"
                - Se voc´┐¢ encontrar valores como "1", "1.1", "1.2" ? isso ´┐¢ "n´┐¢vel", N´┐¢O ´┐¢ "codigo"!
                
                **Como identificar:**
                a) **Colunas Separadas:** Se houver colunas com nomes como "Fonte", "Ref", "Refer´┐¢ncia", "Origem", "Base", "Tabela" ? use como "fonte"
                   E colunas como "C´┐¢digo", "C´┐¢d", "C´┐¢d. Ref", "Item", "Composi´┐¢´┐¢o", "ID" ? use como "codigo"
                
                b) **Mesma Coluna (Formato Combinado):** Se houver uma coluna com valores como:
                   - "SINAPI 73983/001" ? fonte: "SINAPI", codigo: "73983/001"
                   - "SICRO C00123-SUB" ? fonte: "SICRO", codigo: "C00123-SUB"
                   - "SEINFRA 12345.678/9" ? fonte: "SEINFRA", codigo: "12345.678/9"
                   **Regra de Separa´┐¢´┐¢o:** A primeira palavra em MAI´┐¢SCULAS geralmente ´┐¢ a fonte, o restante ´┐¢ o c´┐¢digo.
                
                c) **Identifica´┐¢´┐¢o Inteligente:** Mesmo que as colunas N´┐¢O sejam especificamente nomeadas "Fonte" ou "C´┐¢digo", identifique-as pelo conte´┐¢do:
                   - Valores curtos e geralmente em mai´┐¢sculas como "SINAPI", "SICRO" ? provavelmente fonte
                   - Valores alfanum´┐¢ricos com n´┐¢meros, tra´┐¢os, pontos como "73983/001", "C-123" ? provavelmente c´┐¢digo
                
                d) **Se N´┐¢O houver fonte/c´┐¢digo:** Deixe os campos vazios (""). N´┐¢O invente valores.
                
                e) **Se houver d´┐¢vida:** ´┐¢ melhor deixar vazio do que preencher incorretamente.
            
            4.  **CUSTOS - DETEC´┐¢´┐¢O INTELIGENTE (MUITO IMPORTANTE):**
                
                **Cen´┐¢rio A: Valores Separados (Material + M´┐¢o de Obra)**
                Se o arquivo tiver colunas separadas para Material e M´┐¢o de Obra:
                - Preencha "mat_unit" com custo unit´┐¢rio de material
                - Preencha "mo_unit" com custo unit´┐¢rio de m´┐¢o de obra
                - use_total_unit: false (ou omita o campo)
                
                **Cen´┐¢rio B: Apenas Valor Unit´┐¢rio Total**
                Se houver apenas UMA coluna de custo unit´┐¢rio (sem separa´┐¢´┐¢o Material/M.O.):
                - Coloque o valor total em "mat_unit"
                - mo_unit: 0
                - use_total_unit: true
                
                **Como detectar qual cen´┐¢rio:**
                - **Cen´┐¢rio A**: Se houver colunas como "Material", "Mat", "Materiais", "Mat. Unit." E simultaneamente "M.O.", "M´┐¢o de Obra", "MO", "Labor", "M.O. Unit."
                - **Cen´┐¢rio B**: Se houver apenas colunas como "Valor Unit.", "Pre´┐¢o", "Custo Unit.", "P.U.", "Unit´┐¢rio", "Valor", "Custo" (sem separa´┐¢´┐¢o)
                - **Em caso de d´┐¢vida:** Use Cen´┐¢rio B (valor total ´┐¢ mais comum)
                
                **Exemplos:**
                | Entrada | mat_unit | mo_unit | use_total_unit |
                |---------|----------|---------|----------------|
                | Mat: 50.00, M.O: 30.00 | 50.00 | 30.00 | false |
                | Valor Unit: 100.00 | 100.00 | 0 | true |
                | P.U.: 75.50 | 75.50 | 0 | true |
                | Custo: 45.00 | 45.00 | 0 | true |
            
            5.  **Tipos de Dados:** "quantidade", "mat_unit", "mo_unit" devem ser n´┐¢meros (float). "discriminacao" ´┐¢ string obrigat´┐¢ria. "fonte", "codigo" e "use_total_unit" s´┐¢o opcionais.
            
            6.  Ignore cabe´┐¢alhos e rodap´┐¢s.

            **Exemplos de Identifica´┐¢´┐¢o Fonte/C´┐¢digo:**
            - "SINAPI 94521" ? fonte: "SINAPI", codigo: "94521"
            - Coluna "Ref: SICRO" + Coluna "Comp: 123.456" ? fonte: "SICRO", codigo: "123.456"
            - "Pr´┐¢prio" ? fonte: "Pr´┐¢prio", codigo: ""
            - Sem refer´┐¢ncia vis´┐¢vel ? fonte: "", codigo: ""

            Retorne APENAS o array de objetos JSON.
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-lite",
                contents: prompt,
                config: {
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 16384,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                nivel: { type: Type.STRING },
                                fonte: { type: Type.STRING },
                                codigo: { type: Type.STRING },
                                discriminacao: { type: Type.STRING },
                                unidade: { type: Type.STRING },
                                quantidade: { type: Type.NUMBER },
                                mat_unit: { type: Type.NUMBER },
                                mo_unit: { type: Type.NUMBER },
                                use_total_unit: { type: Type.BOOLEAN },
                            },
                        },
                    },
                },
            });

            if (abortAiRef.current) return;

            const jsonStr = response.text.trim();
            const aiData = JSON.parse(jsonStr);
            const newOrcamentoData = processAiResponseIntoOrcamento(aiData);

            if (newOrcamentoData.length > 0) {
                const hasFonte = newOrcamentoData.some(item => item.fonte && item.fonte.trim() !== '');
                const hasCodigo = newOrcamentoData.some(item => item.codigo && item.codigo.trim() !== '');
                const allUseTotalUnit = newOrcamentoData.every(item => item.use_total_unit === true);
                const allMoUnitZero = newOrcamentoData.every(item => item.mo_unit === 0);
                const shouldHideSplitColumns = allUseTotalUnit || allMoUnitZero;

                const columnsToHide: string[] = [];
                if (!hasFonte) columnsToHide.push('Fonte');
                if (!hasCodigo) columnsToHide.push('C´┐¢digo');
                if (shouldHideSplitColumns) {
                    columnsToHide.push('Mat. Unit.', 'M.O. Unit.', 'Mat. Total', 'M.O. Total');
                }

                if (columnsToHide.length > 0) {
                    setHiddenColumns(prev => {
                        const newSet = new Set(prev);
                        if (!hasFonte) newSet.add('fonte');
                        if (!hasCodigo) newSet.add('codigo');
                        if (shouldHideSplitColumns) {
                            newSet.add('mat_unit');
                            newSet.add('mo_unit');
                            newSet.add('mat_total');
                            newSet.add('mo_total');
                        }
                        return newSet;
                    });
                }

                setOrcamentoData(newOrcamentoData);
                setLocalOrcamento(newOrcamentoData);

                if (!abortAiRef.current) {
                    resetImport();

                    // 1. TOAST DE SUCESSO (Verde)
                    toast.custom((t) => (
                        <div className="max-w-md w-full bg-surface shadow-2xl rounded-lg pointer-events-auto border border-default flex ring-1 ring-black ring-opacity-5">
                            <div className="flex-1 w-0 p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm font-medium text-white">
                                            Importa´┐¢´┐¢o Conclu´┐¢da
                                        </p>
                                        <p className="mt-1 text-sm text-secondary">
                                            O or´┐¢amento foi processado e importado com sucesso.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-l border-default">
                                <button
                                    onClick={() => toast.dismiss(t)}
                                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-secondary hover:text-white hover:bg-elevated focus:outline-none transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ), { duration: 4000 });

                    // 2. TOAST DE COLUNAS OCULTAS (Azul - Gen´┐¢rico)
                    const genericHiddenCols = columnsToHide.filter(c => !['Mat. Unit.', 'M.O. Unit.', 'Mat. Total', 'M.O. Total'].includes(c));

                    if (genericHiddenCols.length > 0) {
                        setTimeout(() => {
                            toast.custom((t) => (
                                <div className="max-w-md w-full bg-surface shadow-2xl rounded-lg pointer-events-auto border border-default flex ring-1 ring-black ring-opacity-5">
                                    <div className="flex-1 w-0 p-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0 pt-0.5">
                                                <Info className="h-10 w-10 text-accent-500" />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <p className="text-sm font-medium text-white">
                                                    Colunas Ocultadas
                                                </p>
                                                <p className="mt-1 text-sm text-secondary">
                                                    As colunas <span className="text-white font-medium">{genericHiddenCols.join("' e '")}</span> foram ocultadas automaticamente pois n´┐¢o continham dados.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex border-l border-default">
                                        <button
                                            onClick={() => toast.dismiss(t)}
                                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-secondary hover:text-white hover:bg-elevated focus:outline-none transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ), { duration: 6000 });
                        }, 300); // Pequeno delay para efeito cascata
                    }

                    // 3. TOAST DE COLUNAS DE CUSTO (Azul - Espec´┐¢fico)
                    if (shouldHideSplitColumns) {
                        setTimeout(() => {
                            toast.custom((t) => (
                                <div className="max-w-md w-full bg-surface shadow-2xl rounded-lg pointer-events-auto border border-default flex ring-1 ring-black ring-opacity-5">
                                    <div className="flex-1 w-0 p-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0 pt-0.5">
                                                <Info className="h-10 w-10 text-accent-500" />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <p className="text-sm font-medium text-white">
                                                    Formato de Custo Detectado
                                                </p>
                                                <p className="mt-1 text-sm text-secondary">
                                                    O or´┐¢amento usa valor unit´┐¢rio total. As colunas de separa´┐¢´┐¢o (Material/M.O.) foram ocultadas para simplificar a visualiza´┐¢´┐¢o.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex border-l border-default">
                                        <button
                                            onClick={() => toast.dismiss(t)}
                                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-secondary hover:text-white hover:bg-elevated focus:outline-none transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ), { duration: 7000 });
                        }, 600); // Delay maior para aparecer por ´┐¢ltimo
                    }
                }
            } else {
                if (!abortAiRef.current) {
                    toast.error("A IA n´┐¢o conseguiu processar o arquivo. Verifique o mapeamento e o conte´┐¢do do arquivo.");
                }
            }

        } catch (error) {
            if (!abortAiRef.current) {
                console.error("Erro ao chamar a API Gemini:", error);
                toast.error("Ocorreu um erro ao processar o arquivo com a IA.");
            }
        } finally {
            if (!abortAiRef.current) {
                setIsAiProcessing(false);
            }
        }
    };

    const handleExportCsv = () => {
        exportToCsv(localOrcamento, 'orcamento_vobi');
        toast.success('Exporta´┐¢´┐¢o CSV iniciada!');
    };

    const handleExportExcel = async () => {
        try {
            await exportToExcel(localOrcamento, 'orcamento_vobi', hiddenColumns);
            toast.success('Exporta´┐¢´┐¢o Excel iniciada!');
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            toast.error('Erro ao exportar Excel');
        }
    };

    const handleHideColumn = (columnId: string) => {
        setHiddenColumns(prev => new Set(prev).add(columnId));
    };

    const handleShowColumn = (columnId: string) => {
        setHiddenColumns(prev => {
            const newSet = new Set(prev);
            newSet.delete(columnId);
            return newSet;
        });
    };

    const handleShowAllColumns = () => {
        setHiddenColumns(new Set(['mat_mo_total']));
        setRestoreMenuOpen(false);
    };

    const handleColumnSelect = (columnId: string) => {
        setSelectedColumn(prev => prev === columnId ? null : columnId);
    };

    const renderRows = (parentId: string | number | null = null, level = 0): React.ReactElement[] => {
        const itemsToRender = processedOrcamento.filter(item => item.pai === parentId);

        return itemsToRender.flatMap(item => {
            const hasChildren = item.hasChildren;
            const isService = !hasChildren;
            const isDragged = draggedItemId === item.id;
            const rowBgClass = isService ? '' : 'bg-[rgba(42,50,60,0.3)]';

            const row = (
                <tr
                    key={item.id}
                    data-row-id={item.id}
                    draggable={isEditing}
                    onDragStart={e => handleDragStart(e, item.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, item.id)}
                    className={`border-b border-default hover:bg-elevated text-xs ${isEditing ? 'cursor-move' : ''} ${isDragged ? 'opacity-50' : ''} ${rowBgClass}`}
                >
                    {visibleColumns.map(({ col }, visibleIndex) => {
                        const isPinned = pinnedColumns.has(col.id) && !isEditing;
                        const stickyLeft = isPinned ? getStickyLeft(visibleIndex) : undefined;

                        const stickyStyle: React.CSSProperties = isPinned ? {
                            position: 'sticky',
                            left: stickyLeft,
                            zIndex: 20,
                        } : {};

                        const stickyCellBgClass = isService
                            ? `bg-surface hover:bg-elevated`
                            : `bg-[rgba(42,50,60,0.3)] hover:bg-elevated`;

                        const finalBgClass = isPinned ? 'bg-surface group-hover:bg-elevated' : stickyCellBgClass;
                        const isColSelected = selectedColumn === col.id;
                        const cellSelectionClass = isColSelected ? 'bg-accent-500/10' : '';

                        switch (col.id) {
                            case 'select':
                                return isEditing && (
                                    <td key={col.id} className={`px-2 py-2 text-center sticky left-0 z-10 ${stickyCellBgClass}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => handleSelectRow(item.id)}
                                            className="w-4 h-4 bg-surface border-default rounded focus:ring-accent-500 accent-accent-500"
                                        />
                                    </td>
                                );
                            case 'nivel':
                                return (
                                    <td key={col.id} style={{ paddingLeft: `${level * 10 + 8}px`, ...stickyStyle }} className={`py-2 whitespace-nowrap text-left ${cellSelectionClass} ${finalBgClass}`}>
                                        <div className="flex items-center gap-2">
                                            {hasChildren ? (
                                                <button
                                                    onClick={() => toggleExpand(item.id)}
                                                    title={item.expandido ? "Recolher" : "Expandir"}
                                                    className="text-accent-500 text-base w-5 h-5 flex items-center justify-center"
                                                >
                                                    {item.expandido ? '?' : '?'}
                                                </button>
                                            ) : <div className="w-5"></div>}
                                            {isEditing
                                                ? <EditableCell value={item.nivel} onCommit={newValue => handleNivelChange(item.id, newValue as string)} onKeyDown={e => handleNivelKeyDown(e, item.id)} className="font-medium text-white w-16" isSelected={isColSelected} columnId={col.id} />
                                                : <span className="font-medium text-white">{item.nivel}</span>
                                            }
                                        </div>
                                    </td>
                                );
                            case 'fonte': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 ${cellSelectionClass} ${finalBgClass}`}>{isEditing && isService ? <EditableCell value={item.fonte} onCommit={newValue => handleValueCommit(item.id, 'fonte', newValue)} isSelected={isColSelected} columnId={col.id} /> : (isService ? item.fonte : '')}</td>;
                            case 'codigo': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 ${cellSelectionClass} ${finalBgClass}`}>{isEditing && isService ? <EditableCell value={item.codigo} onCommit={newValue => handleValueCommit(item.id, 'codigo', newValue)} isSelected={isColSelected} columnId={col.id} /> : (isService ? item.codigo : '')}</td>;
                            case 'discriminacao': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 font-medium text-white ${cellSelectionClass} ${finalBgClass}`}>{isEditing ? <EditableCell value={item.discriminacao} onCommit={newValue => handleValueCommit(item.id, 'discriminacao', newValue)} isSelected={isColSelected} columnId={col.id} /> : item.discriminacao}</td>;
                            case 'un': return (
                                <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-center ${cellSelectionClass} ${finalBgClass}`}>
                                    {isEditing && isService ? (
                                        <UnitAutocompleteCell
                                            value={item.unidade}
                                            onCommit={(val) => handleValueCommit(item.id, 'unidade', val)}
                                            availableUnits={allUnits}
                                            isSelected={isColSelected}
                                            columnId={col.id}
                                        />
                                    ) : (item.unidade || '-')}
                                </td>
                            );
                            case 'quant': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right ${cellSelectionClass} ${finalBgClass}`}>{isEditing && isService ? <EditableCell value={item.quantidade} onCommit={newValue => handleValueCommit(item.id, 'quantidade', newValue)} isNumeric disabled={item.unidade === '' || item.unidade === '-'} isSelected={isColSelected} columnId={col.id} /> : (isService ? formatNumberOrDash(item.quantidade) : '-')}</td>;
                            case 'mat_unit': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right ${cellSelectionClass} ${finalBgClass}`}>{isEditing && isService ? <EditableCell value={item.mat_unit} onCommit={newValue => handleValueCommit(item.id, 'mat_unit', newValue)} isNumeric disabled={item.unidade === '' || item.unidade === '-'} isSelected={isColSelected} columnId={col.id} /> : (isService ? formatCurrencyOrDash(item.mat_unit) : '-')}</td>;
                            case 'mo_unit': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right ${cellSelectionClass} ${finalBgClass}`}>{isEditing && isService ? <EditableCell value={item.mo_unit} onCommit={newValue => handleValueCommit(item.id, 'mo_unit', newValue)} isNumeric disabled={item.unidade === '' || item.unidade === '-'} isSelected={isColSelected} columnId={col.id} /> : (isService ? formatCurrencyOrDash(item.mo_unit) : '-')}</td>;
                            case 'mat_mo_unit': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right font-semibold ${finalBgClass}`}>{isService ? formatCurrencyOrDash(item.matMoUnit) : '-'}</td>;
                            case 'mat_total': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right ${finalBgClass}`}>{formatCurrencyOrDash(item.matUnitTotal)}</td>;
                            case 'mo_total': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right ${finalBgClass}`}>{formatCurrencyOrDash(item.moUnitTotal)}</td>;
                            case 'mat_mo_total': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right font-semibold ${finalBgClass}`}>{formatCurrencyOrDash(item.matMoTotal)}</td>;
                            case 'total_nivel': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right font-bold text-white ${finalBgClass}`}>{formatCurrencyOrDash(item.totalNivel)}</td>;
                            case 'percent_nivel': return <td key={col.id} style={stickyStyle} className={`px-2 py-2 text-right ${finalBgClass}`}>{item.percentNivel > 0 ? item.percentNivel.toFixed(2) + '%' : '-'}</td>;
                            case 'action':
                                return isEditing && (
                                    <td key={col.id} className={`px-2 py-2 sticky right-0 z-10 ${stickyCellBgClass}`}>
                                        <div className="flex items-center gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(item.id)} className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-400/10">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Apagar Linha</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDuplicateRow(item.id)} className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Duplicar Linha</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => handleAddNewRow(item.id)} className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-400/10">
                                                            <CirclePlus className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Nova Linha Abaixo</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </td>
                                );
                            default: return null;
                        }
                    })}
                </tr>
            );

            return item.expandido ? [row, ...renderRows(item.id, level + 1)] : [row];
        });
    };

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const columnMappingLabels: { [key: string]: string } = {
        nivel: 'N´┐¢vel',
        fonte: 'Fonte',
        codigo: 'C´┐¢digo',
        discriminacao: 'Discrimina´┐¢´┐¢o',
        unidade: 'Unidade',
        quantidade: 'Quantidade',
        mat_unit: 'Valor Material Unit´┐¢rio',
        mo_unit: 'Valor M´┐¢o de Obra Unit´┐¢rio',
        mat_mo_unit: 'Valor Material + M´┐¢o de Obra Unit´┐¢rios',
    };

    return (
        <div className="space-y-6">
            {isImportModalOpen && (
                <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogContent className="bg-surface border-default text-white sm:max-w-[700px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-accent-500" />
                                Importar Or´┐¢amento com IA - Etapa {importStep}/2
                            </DialogTitle>
                            <DialogDescription className="text-secondary">
                                {importStep === 1 ? "Envie seu arquivo para an´┐¢lise." : "Configure o mapeamento das colunas."}
                            </DialogDescription>
                        </DialogHeader>

                        {isAiProcessing && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface/95 rounded-lg transition-opacity duration-300">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 border-4 border-default rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-1">Processando com IA</h4>
                                <p className="text-sm text-secondary mb-4">Analisando estrutura e padronizando dados...</p>
                                <Button variant="destructive" size="sm" onClick={handleStopAi}>
                                    Interromper
                                </Button>
                            </div>
                        )}

                        {importStep === 1 && (
                            <div className="text-center py-8">
                                <div className="border-2 border-dashed border-default p-10 rounded-lg hover:border-accent-500/50 transition-colors bg-base/50">
                                    <UploadCloud className="w-12 h-12 text-accent-500 mx-auto mb-4" />
                                    <p className="text-primary font-medium mb-2">Arraste e solte seu arquivo aqui</p>
                                    <p className="text-sm text-secondary mb-6">Suporta .csv, .txt, .xlsx, .xls</p>
                                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".csv,.txt,.xlsx,.xls" />
                                    <label htmlFor="file-upload">
                                        <Button variant="default" className="bg-accent-500 hover:bg-accent-600 text-white cursor-pointer" asChild>
                                            <span>Selecionar Arquivo</span>
                                        </Button>
                                    </label>
                                </div>
                            </div>
                        )}

                        {importStep === 2 && (
                            <div className="space-y-6">
                                <div className="bg-surface p-4 rounded-lg border border-default flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="auto-ai"
                                        checked={isAutoAiMapping}
                                        onChange={e => setIsAutoAiMapping(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-default bg-base text-accent-500 focus:ring-0 focus:ring-offset-0"
                                    />
                                    <div>
                                        <label htmlFor="auto-ai" className="font-medium text-white cursor-pointer block mb-1">Ajuste autom´┐¢tico com IA (Recomendado)</label>
                                        <p className="text-xs text-secondary">A IA identificar´┐¢ automaticamente as colunas e a estrutura do arquivo, ignorando cabe´┐¢alhos irrelevantes.</p>
                                    </div>
                                </div>

                                <div className={`space-y-4 transition-opacity duration-300 ${isAutoAiMapping ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    <p className="text-sm text-secondary">Mapeamento manual das colunas (opcional):</p>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {(Object.entries(columnMapping) as [string, { enabled: boolean; name: string }][]).map(([key, { enabled, name }]) => (
                                            <div key={key} className="flex items-center gap-3 p-2 bg-base rounded border border-default">
                                                <input
                                                    type="checkbox"
                                                    id={`check-${key}`}
                                                    checked={enabled}
                                                    onChange={(e) => handleMappingChange(key, 'enabled', e.target.checked)}
                                                    className="h-4 w-4 rounded border-default bg-surface text-accent-500 focus:ring-0"
                                                />
                                                <label htmlFor={`check-${key}`} className="w-40 text-sm text-primary">{columnMappingLabels[key]}</label>
                                                <Input
                                                    value={name}
                                                    onChange={(e) => handleMappingChange(key, 'name', e.target.value)}
                                                    disabled={!enabled}
                                                    placeholder={`Nome da coluna no arquivo`}
                                                    className="flex-1 h-8 bg-surface border-default text-xs"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {importStep === 2 && (
                                <Button variant="ghost" onClick={() => setImportStep(1)} className="text-secondary hover:text-white hover:bg-elevated">Voltar</Button>
                            )}
                            {importStep === 2 && (
                                <Button onClick={handleAiImport} disabled={isAiProcessing} className="bg-accent-500 hover:bg-accent-600 text-white">
                                    {isAiProcessing ? 'Processando...' : 'Analisar e Importar'}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <span ref={measureCellRef} aria-hidden="true" className="text-xs absolute invisible whitespace-nowrap z-[-1]"></span>

            <ModuleHeader
                title="Or´┐¢amento de Obra"
                subtitle="Gerencie a estrutura anal´┐¢tica, custos e insumos do projeto"
                icon={FileSpreadsheet}
                showBudgetSelector={true}
            />

            <Card className="bg-surface border-default shadow-sm">
                <CardHeader className="border-b border-default pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2 shrink-0">
                                <FileText className="w-5 h-5 text-accent-500" />
                                Planilha Or´┐¢ament´┐¢ria
                            </CardTitle>

                            {/* Budget Name - Editable only in edit mode, or empty state message */}
                            {(() => {
                                return activeBudget ? (
                                    isEditing ? (
                                        <Input
                                            value={activeBudget.name}
                                            onChange={(e) => setActiveBudget({ ...activeBudget, name: e.target.value })}
                                            className="h-8 bg-base border-default text-white focus-visible:ring-0 focus-visible:border-accent-500 max-w-md"
                                            placeholder="Nome do Or´┐¢amento"
                                        />
                                    ) : (
                                        <span className="text-sm text-secondary font-normal">
                                            {activeBudget.name}
                                        </span>
                                    )
                                ) : (
                                    <span className="text-sm text-secondary italic">
                                        Crie um novo or´┐¢amento
                                    </span>
                                );
                            })()}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Totals - Visible only when not editing and has budget */}
                            {!isEditing && activeBudget && !hiddenColumns.has('mat_unit') && (
                                <div className="flex gap-4 mr-4 bg-base px-3 py-1.5 rounded-lg border border-default">
                                    <div className="text-right">
                                        <div className="text-[10px] text-secondary uppercase font-bold">Materiais</div>
                                        <div className="text-sm font-bold text-blue-400">{formatCurrency(grandTotalMaterial)}</div>
                                    </div>
                                    <div className="w-px bg-elevated"></div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-secondary uppercase font-bold">M´┐¢o de Obra</div>
                                        <div className="text-sm font-bold text-yellow-400">{formatCurrency(grandTotalMaoDeObra)}</div>
                                    </div>
                                    <div className="w-px bg-elevated"></div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-secondary uppercase font-bold">Total Geral</div>
                                        <div className="text-sm font-bold text-green-400">{formatCurrency(grandTotalValue)}</div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <TooltipProvider>
                                {isEditing ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                        {selectedIds.size > 0 && (
                                            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="bg-red-500 hover:bg-red-600 text-white">
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Apagar ({selectedIds.size})
                                            </Button>
                                        )}

                                        <div className="flex items-center gap-1 mr-2 bg-base p-1 rounded-lg border border-default">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" onClick={handleUndo} disabled={!canUndo} className="h-7 w-7 text-secondary hover:text-white hover:bg-elevated">
                                                        <Undo2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Desfazer</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" onClick={handleRedo} disabled={!canRedo} className="h-7 w-7 text-secondary hover:text-white hover:bg-elevated">
                                                        <Redo2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Refazer</TooltipContent>
                                            </Tooltip>
                                        </div>

                                        <Button variant="ghost" onClick={handleExit} className="text-secondary hover:text-white hover:bg-elevated">
                                            <X className="w-4 h-4 mr-2" /> Cancelar
                                        </Button>
                                        <Button onClick={handleSave} className="bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-blue-900/20">
                                            <Save className="w-4 h-4 mr-2" /> Salvar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {/* Dropdown Menu for Export/Columns */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="bg-surface border-default text-secondary hover:text-white hover:bg-surface">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-surface border-default text-primary w-56">
                                                <DropdownMenuLabel>Op´┐¢´┐¢es</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-elevated" />

                                                {/* Export Options */}
                                                <DropdownMenuItem onClick={handleExportCsv} className="cursor-pointer hover:bg-elevated">
                                                    <FileText className="w-4 h-4 mr-2 text-accent-500" />
                                                    Exportar CSV
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer hover:bg-elevated">
                                                    <ArrowDownToLine className="w-4 h-4 mr-2 text-accent-500" />
                                                    Exportar Excel
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator className="bg-elevated" />

                                                {/* Hidden Columns Submenu */}
                                                {hiddenColumns.size > 0 && (
                                                    <>
                                                        <DropdownMenuLabel className="text-xs">Colunas Ocultas</DropdownMenuLabel>
                                                        {columnsConfig.filter(c => hiddenColumns.has(c.id)).map(c => (
                                                            <DropdownMenuItem key={c.id} onClick={() => handleShowColumn(c.id)} className="cursor-pointer hover:bg-elevated text-sm">
                                                                <Eye className="w-4 h-4 mr-2 text-accent-500" />
                                                                {c.label}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator className="bg-elevated" />
                                                        <DropdownMenuItem onClick={handleShowAllColumns} className="cursor-pointer hover:bg-elevated font-semibold text-accent-500">
                                                            Mostrar Todas
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Import IA Button - Following Settings UI pattern */}
                                        <Button
                                            onClick={() => setImportModalOpen(true)}
                                            className="bg-surface border border-default hover:bg-elevated text-white"
                                        >
                                            <Bot className="w-4 h-4 mr-2 text-accent-500" />
                                            Importar IA
                                        </Button>

                                        {/* Edit Button - Following Settings UI pattern */}
                                        <Button
                                            onClick={handleEdit}
                                            className="bg-surface border border-default hover:bg-elevated text-white"
                                        >
                                            <Pencil className="w-4 h-4 mr-2 text-accent-500" />
                                            Editar
                                        </Button>
                                    </div>
                                )}
                            </TooltipProvider>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {activeBudget ? (
                        <div className="overflow-x-auto border border-default rounded-lg shadow-sm">
                            <table className="w-full text-left text-secondary table-fixed table-separate-borders">
                                <colgroup>
                                    {visibleColumns.map(({ col, index }) => (
                                        <col key={col.id} style={{ width: `${columnWidths[index]}px` }} />
                                    ))}
                                </colgroup>
                                <thead className="text-xs text-primary uppercase bg-surface sticky top-0 z-30 shadow-sm">
                                    <tr>
                                        {visibleColumns.map(({ col, index: originalIndex }, visibleIndex) => {
                                            const isSelectCol = col.id === 'select';
                                            const isActionCol = col.id === 'action';
                                            const stickyHeaderClasses =
                                                isSelectCol ? 'sticky left-0 z-40 bg-surface' :
                                                    isActionCol ? 'sticky right-0 z-40 bg-surface' : '';
                                            const unhideableColumns = new Set(['select', 'action', 'nivel']);
                                            const batchEditableColumns = new Set(['fonte', 'codigo', 'discriminacao', 'un', 'quant', 'mat_unit', 'mo_unit']);
                                            const isColSelected = selectedColumn === col.id;
                                            const isPinned = pinnedColumns.has(col.id) && !isEditing;

                                            const stickyStyle: React.CSSProperties = isPinned ? {
                                                position: 'sticky',
                                                left: getStickyLeft(visibleIndex),
                                                zIndex: 30,
                                                backgroundColor: '#242830',
                                            } : {};

                                            return (
                                                <th
                                                    key={col.id}
                                                    style={stickyStyle}
                                                    className={`group px-2 py-3 relative text-left border-b border-default ${visibleIndex < visibleColumns.length - 1 ? 'border-r border-default' : ''} ${stickyHeaderClasses} ${isColSelected ? 'bg-accent-500/10' : ''} ${isPinned ? 'shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}`}
                                                >
                                                    {/* Pin Control */}
                                                    {!isEditing && (
                                                        <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                                            <button
                                                                onClick={() => handleTogglePin(col.id)}
                                                                className="w-5 h-5 rounded bg-elevated text-secondary hover:text-white items-center justify-center flex hover:bg-accent-500 transition-colors"
                                                                title={isPinned ? "Desafixar" : "Fixar"}
                                                            >
                                                                {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Hide/Select Controls */}
                                                    {!unhideableColumns.has(col.id) && (
                                                        <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                            {isEditing && batchEditableColumns.has(col.id) && (
                                                                <button
                                                                    onClick={() => handleColumnSelect(col.id)}
                                                                    className={`w-4 h-4 rounded text-white text-[10px] items-center justify-center flex hover:bg-blue-500/80 ${isColSelected ? 'bg-accent-500 opacity-100' : 'bg-elevated'}`}
                                                                    title="Selecionar coluna"
                                                                >
                                                                    <ChevronDown className="w-3 h-3" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handleHideColumn(col.id)}
                                                                className="w-4 h-4 rounded bg-elevated text-secondary hover:text-white text-xs items-center justify-center flex hover:bg-red-500/80 transition-colors"
                                                                title="Ocultar coluna"
                                                            >
                                                                <EyeOff className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {col.id === 'select' && isEditing && (
                                                        <div className="flex justify-center">
                                                            <input
                                                                type="checkbox"
                                                                ref={headerCheckboxRef}
                                                                onChange={handleSelectAll}
                                                                className="w-3.5 h-3.5 bg-surface border-default rounded focus:ring-0 accent-accent-500 cursor-pointer"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1">
                                                        {col.id === 'nivel' && (
                                                            <button
                                                                title={areAllExpanded ? "Recolher Tudo" : "Expandir Tudo"}
                                                                onClick={handleToggleExpandAll}
                                                                className="hover:bg-elevated p-0.5 rounded text-accent-500 mr-1 transition-colors"
                                                            >
                                                                {areAllExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                            </button>
                                                        )}
                                                        <span className={cn("font-semibold tracking-wider", col.id !== 'select' && col.id !== 'nivel' && "pr-4")}>
                                                            {col.label}
                                                        </span>
                                                    </div>

                                                    {(col.resizable ?? true) && (
                                                        <div
                                                            onMouseDown={(e) => handleResizeStart(e, visibleIndex)}
                                                            onDoubleClick={() => handleAutoResize(visibleIndex)}
                                                            className="absolute top-0 right-[-1px] h-full w-[3px] cursor-col-resize z-10 hover:bg-accent-500 transition-colors"
                                                        />
                                                    )}
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {renderRows()}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <FileSpreadsheet className="w-16 h-16 text-secondary mb-4" />
                            <h3 className="text-lg font-semibold text-secondary mb-2">Nenhum or´┐¢amento selecionado</h3>
                            <p className="text-sm text-secondary mb-4">Selecione um or´┐¢amento existente ou crie um novo para come´┐¢ar</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Di´┐¢logo de Confirma´┐¢´┐¢o Centralizado */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[400px] bg-surface border-default text-primary shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            {dialogState.title}
                        </DialogTitle>
                        <DialogDescription className="text-secondary pt-2">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={handleCancel} className="text-secondary hover:text-white hover:bg-elevated">{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm} className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20">{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Orcamento;
