import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ColumnConfig } from '../types';
import { getCellContentAsString } from '../utils';

const LOCAL_STORAGE_KEY_VIEW = 'vobi-orcamento-column-widths-view';
const LOCAL_STORAGE_KEY_EDIT = 'vobi-orcamento-column-widths-edit';
const LOCAL_STORAGE_KEY_HIDDEN_COLUMNS = 'vobi-orcamento-hidden-columns-v2';
const LOCAL_STORAGE_KEY_PINNED_COLUMNS = 'vobi-orcamento-pinned-columns';

interface UseOrcamentoColumnsProps {
    isEditing: boolean;
    processedOrcamento: any[];
}

export const useOrcamentoColumns = ({ isEditing, processedOrcamento }: UseOrcamentoColumnsProps) => {
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(['mat_mo_total']));
    const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const [areSettingsLoaded, setAreSettingsLoaded] = useState(false);

    const resizingColumnRef = useRef<{ index: number; startX: number; startWidth: number; } | null>(null);
    const measureCellRef = useRef<HTMLSpanElement | null>(null);
    const isInitialMount = useRef(true);

    // Load Settings
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

    // Save Settings
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

    // Load/Save Widths
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
    }, [columnsConfig, processedOrcamento, visibleColumns]);

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
    };

    return {
        hiddenColumns,
        setHiddenColumns,
        pinnedColumns,
        columnWidths,
        columnsConfig,
        visibleColumns,
        getStickyLeft,
        handleResizeStart,
        handleAutoResize,
        handleTogglePin,
        handleHideColumn,
        handleShowColumn,
        handleShowAllColumns,
        measureCellRef
    };
};
