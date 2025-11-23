
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { OrcamentoItem } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { formatCurrency } from '../utils/formatters';
import { initialOrcamentoData, DEFAULT_UNITS_DATA } from '../data/mockData';
import { GoogleGenAI, Type } from "@google/genai";

const LOCAL_STORAGE_KEY_VIEW = 'vobi-orcamento-column-widths-view';
const LOCAL_STORAGE_KEY_EDIT = 'vobi-orcamento-column-widths-edit';
const LOCAL_STORAGE_KEY_HIDDEN_COLUMNS = 'vobi-orcamento-hidden-columns';
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

// Helper para navegação com Enter
const handleEnterNavigation = (e: React.KeyboardEvent<HTMLElement>, colId: string) => {
    e.preventDefault();
    const currentInput = e.currentTarget;
    const table = currentInput.closest('table');
    if (!table) return;

    // Busca todos os inputs/selects da mesma coluna na tabela
    const allInputs = Array.from(table.querySelectorAll(`input[data-col-id="${colId}"], select[data-col-id="${colId}"]`)) as HTMLElement[];

    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex !== -1) {
        // Calcula o próximo índice, voltando para o início (0) se chegar ao fim (loop)
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
            className={`w-full border rounded-md p-1 text-xs ${className} 
                ${disabled ? 'cursor-not-allowed bg-[#3a3e45] text-[#a0a5b0] border-[#3a3e45]' : ''}
                ${isSelected ? 'bg-[#0084ff]/20 border-[#0084ff] text-white' : 'bg-[#242830] border-[#3a3e45]'}
            `}
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

    // Update local state when prop changes
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    // Filter units based on search term
    const filteredUnits = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return availableUnits.filter(u =>
            u.symbol.toLowerCase().includes(term) ||
            u.name.toLowerCase().includes(term) ||
            u.category.toLowerCase().includes(term)
        ).slice(0, 50); // Limit results for performance
    }, [searchTerm, availableUnits]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                const exactMatch = availableUnits.find(u => u.symbol.toLowerCase() === searchTerm.toLowerCase());
                if (exactMatch) {
                    if (exactMatch.symbol !== value) onCommit(exactMatch.symbol);
                } else {
                    setSearchTerm(value); // Revert
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
                className={`w-full border rounded-md p-1 text-xs text-center
                    ${isSelected ? 'bg-[#0084ff]/20 border-[#0084ff] text-white' : 'bg-[#242830] border-[#3a3e45]'}
                    focus:ring-1 focus:ring-[#0084ff] outline-none
                `}
                placeholder="-"
            />
            {isOpen && filteredUnits.length > 0 && (
                <div className="absolute top-full left-0 w-64 bg-[#242830] border border-[#3a3e45] rounded-md shadow-xl z-[100] max-h-60 overflow-y-auto mt-1 custom-scrollbar">
                    {filteredUnits.map((unit, index) => (
                        <div
                            key={`${unit.category}-${unit.symbol}-${index}`}
                            onClick={() => handleSelect(unit)}
                            className={`px-3 py-2 cursor-pointer flex justify-between items-center border-b border-[#3a3e45]/30 last:border-0
                                ${index === highlightedIndex ? 'bg-[#0084ff]/20 text-white' : 'text-[#a0a5b0] hover:bg-[#3a3e45]'}
                            `}
                        >
                            <span className="font-bold text-white w-10 text-center bg-[#3a3e45]/50 rounded px-1">{unit.symbol}</span>
                            <span className="text-xs truncate flex-1 text-right pl-2">{unit.name}</span>
                        </div>
                    ))}
                </div>
            )}
            {isOpen && filteredUnits.length === 0 && (
                <div className="absolute top-full left-0 w-48 bg-[#242830] border border-[#3a3e45] rounded-md shadow-xl z-[100] p-2 text-center text-xs text-gray-500 mt-1">
                    Nenhuma unidade encontrada
                </div>
            )}
        </div>
    );
};

// --- Logic Helpers ---

const regenerateNiveles = (items: OrcamentoItem[]): OrcamentoItem[] => {
    const newItems = items.map(i => ({ ...i }));

    const processLevel = (parentId: number | null, parentNivel: string) => {
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

const getAllDescendantIds = (items: OrcamentoItem[], parentId: number): number[] => {
    const descendantIds: number[] = [];
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
    const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState(new Set<number>());
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

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
        discriminacao: { enabled: true, name: 'Discriminação' },
        unidade: { enabled: true, name: 'Un.' },
        quantidade: { enabled: true, name: 'Quant.' },
        mat_unit: { enabled: true, name: 'Mat. Unit.' },
        mo_unit: { enabled: true, name: 'M.O Unit.' },
        mat_mo_unit: { enabled: false, name: '' },
    });
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
    const [isRestoreMenuOpen, setRestoreMenuOpen] = useState(false);
    const [allUnits, setAllUnits] = useState<UnitItem[]>([]);

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    const resizingColumnRef = useRef<{ index: number; startX: number; startWidth: number; } | null>(null);
    const measureCellRef = useRef<HTMLSpanElement | null>(null);
    const isInitialMount = useRef(true);
    const restoreButtonRef = useRef<HTMLButtonElement>(null);
    const restoreMenuRef = useRef<HTMLDivElement>(null);

    // Abort Controller Ref for AI
    const abortAiRef = useRef(false);

    useEffect(() => {
        if (!isEditing) {
            setLocalOrcamento(orcamentoData);
        }
    }, [orcamentoData, isEditing]);

    // Load Units
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
            }
            const savedPinned = localStorage.getItem(LOCAL_STORAGE_KEY_PINNED_COLUMNS);
            if (savedPinned) {
                setPinnedColumns(new Set(JSON.parse(savedPinned)));
            } else {
                setPinnedColumns(new Set());
            }
        } catch (e) {
            console.error("Could not load column settings", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_HIDDEN_COLUMNS, JSON.stringify(Array.from(hiddenColumns)));
        } catch (e) {
            console.error("Could not save hidden columns", e);
        }
    }, [hiddenColumns]);

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_PINNED_COLUMNS, JSON.stringify(Array.from(pinnedColumns)));
        } catch (e) {
            console.error("Could not save pinned columns", e);
        }
    }, [pinnedColumns]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isRestoreMenuOpen &&
                restoreButtonRef.current &&
                !restoreButtonRef.current.contains(event.target as Node) &&
                restoreMenuRef.current &&
                !restoreMenuRef.current.contains(event.target as Node)
            ) {
                setRestoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isRestoreMenuOpen]);


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
            { id: 'nivel', label: 'Nível', initialWidth: 100, minWidth: 60 },
            { id: 'fonte', label: 'Fonte', initialWidth: 60, minWidth: 60, align: 'left' },
            { id: 'codigo', label: 'Código', initialWidth: 60, minWidth: 60, align: 'left' },
            { id: 'discriminacao', label: 'Discriminação', initialWidth: 250, minWidth: 150, align: 'left' },
            { id: 'un', label: 'Un.', initialWidth: 60, minWidth: 50, align: 'center' },
            { id: 'quant', label: 'Quant.', initialWidth: 70, minWidth: 70, align: 'right' },
            { id: 'mat_unit', label: 'Mat. Unit.', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mo_unit', label: 'M.O. Unit.', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mat_mo_unit', label: 'Mat.+M.O Unit.', initialWidth: 100, minWidth: 100, align: 'right' },
            { id: 'mat_total', label: 'Mat. Total', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mo_total', label: 'M.O. Total', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'mat_mo_total', label: 'Mat.+M.O Total', initialWidth: 100, minWidth: 100, align: 'right' },
            { id: 'total_nivel', label: 'Total Nível', initialWidth: 80, minWidth: 80, align: 'right' },
            { id: 'percent_nivel', label: '% Nível', initialWidth: 70, minWidth: 70, align: 'right' },
        ];

        if (isEditing) {
            return [
                { id: 'select', label: '', initialWidth: 50, minWidth: 50, resizable: false, align: 'center' },
                ...baseColumns,
                { id: 'action', label: 'Ação', initialWidth: 100, minWidth: 100, align: 'left' },
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

        // First pass: init items with self values
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
                totalNivel: 0, // Will be calculated recursively
                percentNivel: 0,
            });
        });

        // Recursive subtotal calculation
        const calculateSubtotals = (itemId: number) => {
            const item = itemsMap.get(itemId);
            if (!item) return { mat: 0, mo: 0, total: 0 };

            // If item is a leaf, its subtotals are its own calculated totals
            if (!item.hasChildren) {
                item.totalNivel = item.matMoTotal;
                return { mat: item.matUnitTotal, mo: item.moUnitTotal, total: item.totalNivel };
            }

            // If item is a parent, its subtotals are sum of children
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

    const handleSave = () => {
        setOrcamentoData(localOrcamento);
        setIsEditing(false);
        setOriginalOrcamento(null);
        setSelectedIds(new Set());
        setSelectedColumn(null);
        setHistory([]);
        setHistoryIndex(-1);
        alert('Orçamento salvo!');
    };

    const handleExit = () => {
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

    const handleValueCommit = (id: number, field: keyof OrcamentoItem, value: string | number) => {
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

    const handleNivelChange = (id: number, newNivel: string) => {
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

        const idsToMove = new Set<number>([id, ...getAllDescendantIds(localOrcamento, id)]);
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

    const handleNivelKeyDown = (e: React.KeyboardEvent, itemId: number) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();

        const items = [...localOrcamento];
        const currentItem = items.find(i => i.id === itemId);
        if (!currentItem) return;

        let newItems: OrcamentoItem[] = [];

        if (e.shiftKey) { // Outdent (Recuar)
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

        } else { // Indent (Avançar)
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

    const handleDragStart = (e: React.DragEvent, itemId: number) => {
        setDraggedItemId(itemId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetItemId: number) => {
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

    const handleAddNewRow = (afterId: number) => {
        const afterItem = localOrcamento.find(item => item.id === afterId);
        if (!afterItem) return;

        const newId = Math.max(0, ...localOrcamento.map(o => o.id)) + 1;
        const newItem: OrcamentoItem = {
            id: newId, nivel: '', pai: afterItem.pai, fonte: '', codigo: '',
            discriminacao: 'Novo Serviço', unidade: '', quantidade: 0,
            mat_unit: 0, mo_unit: 0, expandido: false,
        };

        const afterIndex = localOrcamento.findIndex(item => item.id === afterId);
        const newOrcamento = [...localOrcamento];
        newOrcamento.splice(afterIndex + 1, 0, newItem);
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const handleDeleteRow = (idToDelete: number) => {
        const idsToDelete = new Set([idToDelete, ...getAllDescendantIds(localOrcamento, idToDelete)]);
        const newOrcamento = localOrcamento.filter(item => !idsToDelete.has(item.id));
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;

        let idsToDelete = new Set<number>();
        for (const id of selectedIds) {
            idsToDelete.add(id);
            const descendants = getAllDescendantIds(localOrcamento, id);
            descendants.forEach(descId => idsToDelete.add(descId));
        }
        const newOrcamento = localOrcamento.filter(item => !idsToDelete.has(item.id));
        updateOrcamento(updateHierarchy(newOrcamento));
        setSelectedIds(new Set());
    };

    const handleDuplicateRow = (idToDuplicate: number) => {
        const originalItem = localOrcamento.find(item => item.id === idToDuplicate);
        if (!originalItem) return;

        const newId = Math.max(0, ...localOrcamento.map(o => o.id)) + 1;
        const newItem: OrcamentoItem = {
            ...originalItem, id: newId,
            discriminacao: `${originalItem.discriminacao} (Cópia)`,
            expandido: false,
        };

        const originalIndex = localOrcamento.findIndex(item => item.id === idToDuplicate);
        const newOrcamento = [...localOrcamento];
        newOrcamento.splice(originalIndex + 1, 0, newItem);
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const handleSelectRow = (id: number) => {
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

    const toggleExpand = (id: number) => {
        updateOrcamento(localOrcamento.map(item => item.id === id ? { ...item, expandido: !item.expandido } : item));
    };

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
        return allUnits.map(u => `Nome: "${u.name}" | Símbolo: "${u.symbol}"`).join('\n');
    };

    const handleAiImport = async () => {
        if (!uploadedFileContent) {
            alert("Nenhum arquivo enviado.");
            return;
        }

        abortAiRef.current = false;
        setIsAiProcessing(true);

        let mappingDescription = '';
        if (isAutoAiMapping) {
            mappingDescription = "Ignore any specific column headers provided below and automatically detect the columns based on their content (e.g., numbers resembling currency are costs, short strings are units, etc.). Infer the data structure intelligently.";
        } else {
            mappingDescription = (Object.entries(columnMapping) as [string, { enabled: boolean; name: string }][])
                .filter(([, value]) => value.enabled && value.name)
                .map(([key, value]) => `A coluna do meu arquivo chamada "${value.name}" corresponde ao campo "${key}".`)
                .join(' ');
        }

        const unitsReference = getStandardizedUnitsReference();

        const prompt = `
            Analise o seguinte conteúdo de um arquivo de orçamento de construção civil. O conteúdo é:
            ---
            ${uploadedFileContent}
            ---
            As regras de mapeamento de colunas são: ${mappingDescription}.
            Sua tarefa é extrair os dados e estruturá-los em um JSON.
            
            TABELA DE REFERÊNCIA DE UNIDADES DE MEDIDA (PADRÃO DO SISTEMA):
            --- INÍCIO DA LISTA DE UNIDADES ---
            ${unitsReference}
            --- FIM DA LISTA DE UNIDADES ---

            Regras Importantes:
            1.  **Estrutura e Hierarquia (LÓGICA DE INFERÊNCIA AVANÇADA):** Se a coluna "nível" (ex: 1, 1.1, 2.1.3) NÃO for fornecida explicitamente no texto, você DEVE inferir a estrutura hierárquica (WBS/EAP) seguindo estritamente este critério lógico:
                *   **Critério para Nível FILHO (Item Executável):**
                    - Qualquer linha que POSSUA valores explícitos de **Quantidade** E **Valor Unitário** (maiores que zero).
                    - Estes são os itens finais da composição.
                
                *   **Critério para Nível PAI (Agrupador/Título):**
                    - Qualquer linha que possua uma Descrição, mas **NÃO POSSUA** Quantidade ou Valor Unitário (ou sejam vazios/zero).
                    - Estes itens servem apenas como cabeçalhos ou categorias para os itens abaixo deles.
                    
                *   **Construção da Numeração:**
                    - Ao identificar um "Pai", inicie ou aprofunde a numeração (ex: de "2" para "2.1").
                    - Ao identificar um "Filho", ele deve herdar a numeração do último "Pai" ativo (ex: se o pai é "2.1.1", o filho será "2.1.1.1", "2.1.1.2", etc.).
                    - A hierarquia pode ser profunda (ex: 2 -> 2.1 -> 2.1.1 -> 2.1.1.1).
                    - **Exemplo de Lógica:**
                        - "Fundação" (Sem qtd/valor) -> Nível 2 (Pai)
                        - "Terraplenagem" (Sem qtd/valor) -> Nível 2.1 (Sub-Pai)
                        - "Estacas" (Sem qtd/valor) -> Nível 2.1.1 (Sub-Pai)
                        - "Estaca Raiz..." (COM qtd 200 e valor 1200) -> Nível 2.1.1.1 (Filho)

            2.  **Unidades (CRÍTICO):** Para cada linha, verifique o valor da unidade no arquivo original.
                - Procure esse valor na tabela de referência acima (compare com "Nome" ou "Símbolo", ignorando maiúsculas/minúsculas).
                - **SE encontrar correspondência:** Preencha o campo "unidade" OBRIGATORIAMENTE com o valor do **Símbolo** listado na tabela. Exemplo: Se o arquivo diz "Metro", e a tabela tem "Nome: Metro | Símbolo: m", você DEVE usar "m".
                - **SE NÃO encontrar correspondência exata:** Tente padronizar para o símbolo mais próximo e comum (ex: "M2", "m2", "metro q" -> "m²").
                - Unidades como "UN", "Unid" devem virar "un".
            
            3.  **FONTE e CÓDIGO (MUITO IMPORTANTE):**
                - **Fonte:** É a ORIGEM/REFERÊNCIA de onde vem o serviço/atividade. Exemplos comuns: "SINAPI", "SICRO", "SEINFRA", "ORSE", "SBC", "Próprio", "Cotação", etc.
                - **Código:** É o CÓDIGO IDENTIFICADOR específico da fonte. Exemplos: "73983/001", "C00123", "SUB-01234", "12345.678", etc.
                
                **⚠️ ATENÇÃO CRÍTICA - NÃO CONFUNDIR:**
                - **"nível"** = Hierarquia pai/filho (ex: "1", "1.1", "1.1.1", "1.1.2", "2", "2.1") → Campo separado
                - **"codigo"** = Identificador da fonte (ex: "73983", "C-00123") → NUNCA será hierárquico como "1.1.1"
                - Se você encontrar valores como "1", "1.1", "1.2" → isso é "nível", NÃO é "codigo"!
                
                **Como identificar:**
                a) **Colunas Separadas:** Se houver colunas com nomes como "Fonte", "Ref", "Referência", "Origem", "Base", "Tabela" → use como "fonte"
                   E colunas como "Código", "Cód", "Cód. Ref", "Item", "Composição", "ID" → use como "codigo"
                
                b) **Mesma Coluna (Formato Combinado):** Se houver uma coluna com valores como:
                   - "SINAPI 73983/001" → fonte: "SINAPI", codigo: "73983/001"
                   - "SICRO C00123-SUB" → fonte: "SICRO", codigo: "C00123-SUB"
                   - "SEINFRA 12345.678/9" → fonte: "SEINFRA", codigo: "12345.678/9"
                   **Regra de Separação:** A primeira palavra em MAIÚSCULAS geralmente é a fonte, o restante é o código.
                
                c) **Identificação Inteligente:** Mesmo que as colunas NÃO sejam especificamente nomeadas "Fonte" ou "Código", identifique-as pelo conteúdo:
                   - Valores curtos e geralmente em maiúsculas como "SINAPI", "SICRO" → provavelmente fonte
                   - Valores alfanuméricos com números, traços, pontos como "73983/001", "C-123" → provavelmente código
                
                d) **Se NÃO houver fonte/código:** Deixe os campos vazios (""). NÃO invente valores.
                
                e) **Se houver dúvida:** É melhor deixar vazio do que preencher incorretamente.
            
            4.  **CUSTOS - DETECÇÃO INTELIGENTE (MUITO IMPORTANTE):**
                
                **Cenário A: Valores Separados (Material + Mão de Obra)**
                Se o arquivo tiver colunas separadas para Material e Mão de Obra:
                - Preencha "mat_unit" com custo unitário de material
                - Preencha "mo_unit" com custo unitário de mão de obra
                - use_total_unit: false (ou omita o campo)
                
                **Cenário B: Apenas Valor Unitário Total**
                Se houver apenas UMA coluna de custo unitário (sem separação Material/M.O.):
                - Coloque o valor total em "mat_unit"
                - mo_unit: 0
                - use_total_unit: true
                
                **Como detectar qual cenário:**
                - **Cenário A**: Se houver colunas como "Material", "Mat", "Materiais", "Mat. Unit." E simultaneamente "M.O.", "Mão de Obra", "MO", "Labor", "M.O. Unit."
                - **Cenário B**: Se houver apenas colunas como "Valor Unit.", "Preço", "Custo Unit.", "P.U.", "Unitário", "Valor", "Custo" (sem separação)
                - **Em caso de dúvida:** Use Cenário B (valor total é mais comum)
                
                **Exemplos:**
                | Entrada | mat_unit | mo_unit | use_total_unit |
                |---------|----------|---------|----------------|
                | Mat: 50.00, M.O: 30.00 | 50.00 | 30.00 | false |
                | Valor Unit: 100.00 | 100.00 | 0 | true |
                | P.U.: 75.50 | 75.50 | 0 | true |
                | Custo: 45.00 | 45.00 | 0 | true |
            
            5.  **Tipos de Dados:** "quantidade", "mat_unit", "mo_unit" devem ser números (float). "discriminacao" é string obrigatória. "fonte", "codigo" e "use_total_unit" são opcionais.
            
            6.  Ignore cabeçalhos e rodapés.

            **Exemplos de Identificação Fonte/Código:**
            - "SINAPI 94521" → fonte: "SINAPI", codigo: "94521"
            - Coluna "Ref: SICRO" + Coluna "Comp: 123.456" → fonte: "SICRO", codigo: "123.456"
            - "Próprio" → fonte: "Próprio", codigo: ""
            - Sem referência visível → fonte: "", codigo: ""

            Retorne APENAS o array de objetos JSON.
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
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
                // Check if Fonte and Codigo columns have data
                const hasFonte = newOrcamentoData.some(item => item.fonte && item.fonte.trim() !== '');
                const hasCodigo = newOrcamentoData.some(item => item.codigo && item.codigo.trim() !== '');

                // Check if all items use total unit value (no separation)
                const allUseTotalUnit = newOrcamentoData.every(item => item.use_total_unit === true);
                // Check if all MO units are zero (alternative condition for hiding columns)
                const allMoUnitZero = newOrcamentoData.every(item => item.mo_unit === 0);

                const shouldHideSplitColumns = allUseTotalUnit || allMoUnitZero;

                // Auto-hide empty columns
                const columnsToHide: string[] = [];
                if (!hasFonte) columnsToHide.push('Fonte');
                if (!hasCodigo) columnsToHide.push('Código');
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

                    // Show success message with auto-hide info
                    let message = "✅ Orçamento importado com sucesso!";

                    // Filter out unit columns for the generic message
                    const genericHiddenCols = columnsToHide.filter(c => !['Mat. Unit.', 'M.O. Unit.', 'Mat. Total', 'M.O. Total'].includes(c));

                    if (genericHiddenCols.length > 0) {
                        message += `\n\nℹ️ Colunas '${genericHiddenCols.join("' e '")}' foram ocultadas automaticamente (sem dados)`;
                    }

                    if (shouldHideSplitColumns) {
                        message += `\n\nℹ️ Colunas 'Mat. Unit.' e 'M.O. Unit.' foram ocultadas automaticamente.\nO orçamento importado usa valor unitário total (sem separação Material/M.O.).`;
                    }

                    alert(message);
                }
            } else {
                if (!abortAiRef.current) {
                    alert("A IA não conseguiu processar o arquivo. Verifique o mapeamento e o conteúdo do arquivo.");
                }
            }

        } catch (error) {
            if (!abortAiRef.current) {
                console.error("Erro ao chamar a API Gemini:", error);
                alert("Ocorreu um erro ao processar o arquivo com a IA. Verifique o console para mais detalhes.");
            }
        } finally {
            if (!abortAiRef.current) {
                setIsAiProcessing(false);
            }
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
        setHiddenColumns(new Set());
        setRestoreMenuOpen(false);
    };

    const handleColumnSelect = (columnId: string) => {
        setSelectedColumn(prev => prev === columnId ? null : columnId);
    };

    const renderRows = (parentId: number | null = null, level = 0): React.ReactElement[] => {
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
                    className={`border-b border-[#3a3e45] hover:bg-[#24282f] text-xs ${isEditing ? 'cursor-move' : ''} ${isDragged ? 'opacity-50' : ''} ${rowBgClass}`}
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
                            ? `bg-[#1e2329] hover:bg-[#24282f]`
                            : `bg-[rgba(42,50,60,0.3)] hover:bg-[#24282f]`;

                        const finalBgClass = isPinned ? 'bg-[#1e2329] group-hover:bg-[#24282f]' : stickyCellBgClass;
                        const isColSelected = selectedColumn === col.id;
                        const cellSelectionClass = isColSelected ? 'bg-[#0084ff]/10' : '';

                        switch (col.id) {
                            case 'select':
                                return isEditing && (
                                    <td key={col.id} className={`px-2 py-2 text-center sticky left-0 z-10 ${stickyCellBgClass}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => handleSelectRow(item.id)}
                                            className="w-4 h-4 bg-[#1e2329] border-[#3a3e45] rounded focus:ring-[#0084ff] accent-[#0084ff]"
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
                                                    className="text-[#0084ff] text-base w-5 h-5 flex items-center justify-center"
                                                >
                                                    {item.expandido ? '◢' : '◥'}
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
                                            <button title="Apagar Linha" onClick={() => handleDeleteRow(item.id)} className="hover:bg-red-500/50 p-1 rounded">🗑️</button>
                                            <button title="Duplicar Linha" onClick={() => handleDuplicateRow(item.id)} className="hover:bg-blue-500/50 p-1 rounded">📋</button>
                                            <button title="Nova Linha Abaixo" onClick={() => handleAddNewRow(item.id)} className="hover:bg-green-500/50 p-1 rounded">➕</button>
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
        nivel: 'Nível',
        fonte: 'Fonte',
        codigo: 'Código',
        discriminacao: 'Discriminação',
        unidade: 'Unidade',
        quantidade: 'Quantidade',
        mat_unit: 'Valor Material Unitário',
        mo_unit: 'Valor Mão de Obra Unitário',
        mat_mo_unit: 'Valor Material + Mão de Obra Unitários',
    };

    return (
        <div>
            {isImportModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]">
                    <div className="bg-[#1e2329] rounded-lg shadow-xl p-6 w-full max-w-2xl transform transition-all relative">

                        {isAiProcessing && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1e2329]/95 rounded-lg transition-opacity duration-300">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 border-4 border-[#3a3e45] rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-[#0084ff] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-1">Processando com IA</h4>
                                <p className="text-sm text-[#a0a5b0] mb-4">Analisando estrutura e padronizando dados...</p>
                                <Button variant="danger" size="sm" onClick={handleStopAi}>
                                    Interromper
                                </Button>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">🤖 Importar Orçamento com IA - Etapa {importStep}/2</h3>
                            <button onClick={resetImport} className="text-2xl">&times;</button>
                        </div>

                        {importStep === 1 && (
                            <div className="text-center">
                                <p className="text-[#a0a5b0] mb-4">Envie seu arquivo de orçamento (.csv, .txt, .xlsx) para a IA processar.</p>
                                <div className="border-2 border-dashed border-[#3a3e45] p-10 rounded-lg">
                                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".csv,.txt,.xlsx,.xls" />
                                    <label htmlFor="file-upload" className="cursor-pointer bg-[#0084ff] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#0066cc]">
                                        Selecionar Arquivo
                                    </label>
                                    <p className="text-xs text-[#a0a5b0] mt-2">ou arraste e solte aqui</p>
                                </div>
                            </div>
                        )}

                        {importStep === 2 && (
                            <div>
                                <div className="mb-6 bg-[#242830] p-3 rounded border border-[#3a3e45] flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="auto-ai"
                                        checked={isAutoAiMapping}
                                        onChange={e => setIsAutoAiMapping(e.target.checked)}
                                        className="h-5 w-5 rounded accent-[#0084ff]"
                                    />
                                    <div>
                                        <label htmlFor="auto-ai" className="font-bold text-white cursor-pointer">Ajuste automático com IA</label>
                                        <p className="text-xs text-[#a0a5b0]">Deixe a IA identificar automaticamente as colunas e a estrutura do arquivo sem configurações manuais.</p>
                                    </div>
                                </div>

                                <div className={`transition-opacity duration-300 ${isAutoAiMapping ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <p className="text-[#a0a5b0] mb-4">Ajude a IA a entender seu arquivo. Marque as colunas que existem e digite o nome exato delas como está no arquivo original.</p>
                                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {(Object.entries(columnMapping) as [string, { enabled: boolean; name: string }][]).map(([key, { enabled, name }]) => (
                                            <div key={key} className="flex items-center gap-4 p-2 bg-[#242830] rounded">
                                                <input type="checkbox" id={`check-${key}`} checked={enabled} onChange={(e) => handleMappingChange(key, 'enabled', e.target.checked)} className="h-5 w-5 rounded accent-[#0084ff]" />
                                                <label htmlFor={`check-${key}`} className="w-48">{columnMappingLabels[key]}</label>
                                                <input type="text" value={name} onChange={(e) => handleMappingChange(key, 'name', e.target.value)} disabled={!enabled} placeholder={`Nome da coluna no arquivo`} className={`flex-1 bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <Button variant="secondary" onClick={() => setImportStep(1)}>Voltar</Button>
                                    <Button variant="primary" onClick={handleAiImport} disabled={isAiProcessing}>
                                        {isAiProcessing ? 'Processando...' : 'Analisar e Preencher'}
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
            <span ref={measureCellRef} aria-hidden="true" className="text-xs absolute invisible whitespace-nowrap z-[-1]"></span>
            <PageHeader title="💰 Orçamento de Obra" subtitle="Estrutura orçamentária completa com 5 níveis hierárquicos" />
            <Card>
                <CardHeader title="Orçamento Detalhado">
                    <div className="flex flex-wrap items-center justify-end gap-4">
                        {!hiddenColumns.has('mat_unit') && (
                            <>
                                <div className="text-right">
                                    <div className="text-xs text-[#a0a5b0]">TOTAL MATERIAIS</div>
                                    <div className="text-lg font-bold text-blue-400">{formatCurrency(grandTotalMaterial)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[#a0a5b0]">TOTAL MÃO DE OBRA</div>
                                    <div className="text-lg font-bold text-yellow-400">{formatCurrency(grandTotalMaoDeObra)}</div>
                                </div>
                            </>
                        )}
                        <div className="text-right">
                            <div className="text-xs text-[#a0a5b0]">VALOR TOTAL DO ORÇAMENTO</div>
                            <div className="text-2xl font-bold text-green-400">{formatCurrency(grandTotalValue)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hiddenColumns.size > 0 && (
                                <div className="relative">
                                    <Button ref={restoreButtonRef} variant="secondary" onClick={() => setRestoreMenuOpen(!isRestoreMenuOpen)}>
                                        Reexibir ({hiddenColumns.size})
                                    </Button>
                                    {isRestoreMenuOpen && (
                                        <div ref={restoreMenuRef} className="absolute right-0 mt-2 w-56 bg-[#242830] border border-[#3a3e45] rounded-md shadow-lg z-[100]">
                                            <ul className="py-1 text-sm text-[#e8eaed] max-h-60 overflow-y-auto">
                                                {columnsConfig.filter(c => hiddenColumns.has(c.id)).map(c => (
                                                    <li key={c.id}>
                                                        <a href="#" onClick={(e) => { e.preventDefault(); handleShowColumn(c.id); }} className="block px-4 py-2 hover:bg-[#3a3e45]">
                                                            {c.label}
                                                        </a>
                                                    </li>
                                                ))}
                                                <li className="border-t border-[#3a3e45] my-1"></li>
                                                <li>
                                                    <a href="#" onClick={(e) => { e.preventDefault(); handleShowAllColumns(); }} className="block px-4 py-2 hover:bg-[#3a3e45] font-semibold">
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
                                    <Button onClick={handleEdit}>✏️ Editar</Button>
                                    <Button onClick={() => setImportModalOpen(true)}>🤖 Importar com IA</Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto border rounded-md border-[#3a3e45]">
                    <table className="w-full text-left text-[#a0a5b0] table-fixed">
                        <colgroup>
                            {visibleColumns.map(({ col, index }) => (
                                <col key={col.id} style={{ width: `${columnWidths[index]}px` }} />
                            ))}
                        </colgroup>
                        <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-30 shadow-sm">
                            <tr>
                                {visibleColumns.map(({ col, index: originalIndex }, visibleIndex) => {
                                    const isSelectCol = col.id === 'select';
                                    const isActionCol = col.id === 'action';
                                    const stickyHeaderClasses =
                                        isSelectCol ? 'sticky left-0 z-40 bg-[#242830]' :
                                            isActionCol ? 'sticky right-0 z-40 bg-[#242830]' : '';
                                    const unhideableColumns = new Set(['select', 'action', 'nivel']);
                                    // Editable columns that support batch delete
                                    const batchEditableColumns = new Set(['fonte', 'codigo', 'discriminacao', 'un', 'quant', 'mat_unit', 'mo_unit']);
                                    const isColSelected = selectedColumn === col.id;
                                    const isPinned = pinnedColumns.has(col.id) && !isEditing;

                                    const stickyStyle: React.CSSProperties = isPinned ? {
                                        position: 'sticky',
                                        left: getStickyLeft(visibleIndex),
                                        zIndex: 30, // Higher than body sticky
                                        backgroundColor: '#242830', // Ensure solid background for header
                                    } : {};

                                    return (
                                        <th
                                            key={col.id}
                                            style={stickyStyle}
                                            className={`group px-2 py-3 relative text-left ${visibleIndex < visibleColumns.length - 1 ? 'border-r border-[#3a3e45]' : ''} ${stickyHeaderClasses} ${isColSelected ? 'bg-[#0084ff]/20' : ''} ${isPinned ? 'shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''}`}
                                        >
                                            {/* View Mode Pin Control - Right Side */}
                                            {!isEditing && (
                                                <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                                    <button
                                                        onClick={() => handleTogglePin(col.id)}
                                                        className="w-5 h-5 rounded-full bg-[#3a3e45] text-white text-[10px] items-center justify-center flex hover:bg-[#0084ff] shadow-md"
                                                        title={isPinned ? "Desafixar Coluna" : "Fixar Coluna"}
                                                    >
                                                        <span className={!isPinned ? 'transform rotate-90' : ''}>📌</span>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Controls Container (Hide & Select) */}
                                            {isEditing && !unhideableColumns.has(col.id) && (
                                                <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity md:flex z-20">
                                                    {batchEditableColumns.has(col.id) && (
                                                        <button
                                                            onClick={() => handleColumnSelect(col.id)}
                                                            className={`w-4 h-4 rounded-full text-white text-[10px] items-center justify-center flex hover:bg-blue-500/80 ${isColSelected ? 'bg-[#0084ff] opacity-100' : 'bg-[#3a3e45]'}`}
                                                            title={`Selecionar coluna ${col.label} (Delete para limpar)`}
                                                        >
                                                            ▼
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleHideColumn(col.id)}
                                                        className="w-4 h-4 rounded-full bg-[#3a3e45] text-white text-xs items-center justify-center flex hover:bg-red-500/80"
                                                        title={`Ocultar ${col.label}`}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            )}

                                            {col.id === 'select' && isEditing && (
                                                <div className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        ref={headerCheckboxRef}
                                                        onChange={handleSelectAll}
                                                        className="w-4 h-4 bg-[#1e2329] border-[#3a3e45] rounded focus:ring-[#0084ff] accent-[#0084ff]"
                                                    />
                                                </div>
                                            )}
                                            {col.id === 'nivel' && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        title={areAllExpanded ? "Recolher Tudo" : "Expandir Tudo"}
                                                        onClick={handleToggleExpandAll}
                                                        className="hover:bg-blue-500/50 p-0.5 rounded text-sm mr-1"
                                                    >
                                                        {areAllExpanded ? '◢' : '◥'}
                                                    </button>
                                                    <span>{col.label}</span>
                                                </div>
                                            )}
                                            {col.id !== 'select' && col.id !== 'nivel' && <span className="pr-6">{col.label}</span>}

                                            {(col.resizable ?? true) && (
                                                <div
                                                    onMouseDown={(e) => handleResizeStart(e, visibleIndex)}
                                                    onDoubleClick={() => handleAutoResize(visibleIndex)}
                                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-10 hover:bg-blue-500/20"
                                                    style={{ transform: 'translateX(50%)' }}
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
            </Card>
        </div>
    );
};

export default Orcamento;
