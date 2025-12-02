import { useState, useEffect, useCallback } from 'react';
import { OrcamentoItem } from '../../../types';

interface UseOrcamentoDataProps {
    orcamentoData: OrcamentoItem[];
    setOrcamentoData: (data: OrcamentoItem[]) => void;
}

export const useOrcamentoData = ({ orcamentoData, setOrcamentoData }: UseOrcamentoDataProps) => {
    const [localOrcamento, setLocalOrcamento] = useState<OrcamentoItem[]>(orcamentoData);
    const [isEditing, setIsEditing] = useState(false);
    const [originalOrcamento, setOriginalOrcamento] = useState<OrcamentoItem[] | null>(null);
    const [history, setHistory] = useState<OrcamentoItem[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    useEffect(() => {
        if (!isEditing) {
            setLocalOrcamento(orcamentoData);
        }
    }, [orcamentoData, isEditing]);

    const updateOrcamento = useCallback((updater: React.SetStateAction<OrcamentoItem[]>) => {
        setLocalOrcamento(currentData => {
            const newData = typeof updater === 'function' ? (updater as any)(currentData) : updater;
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

    const handleEdit = () => {
        const deepCopy = JSON.parse(JSON.stringify(localOrcamento));
        setOriginalOrcamento(deepCopy);
        setHistory([deepCopy]);
        setHistoryIndex(0);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (originalOrcamento) {
            setLocalOrcamento(originalOrcamento);
        }
        setIsEditing(false);
        setHistory([]);
        setHistoryIndex(-1);
        setOriginalOrcamento(null);
    };

    const handleSaveData = async () => {
        setOrcamentoData(localOrcamento);
        setIsEditing(false);
        setHistory([]);
        setHistoryIndex(-1);
        setOriginalOrcamento(null);
    };

    return {
        localOrcamento,
        setLocalOrcamento,
        isEditing,
        setIsEditing,
        history,
        historyIndex,
        updateOrcamento,
        handleUndo,
        handleRedo,
        handleEdit,
        handleCancelEdit,
        handleSaveData
    };
};
