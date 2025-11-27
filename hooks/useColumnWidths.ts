import { useState, useEffect } from 'react';

export const useColumnWidths = (storageKey: string) => {
    const [colWidths, setColWidths] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try { return JSON.parse(saved); } catch (e) { console.error(e); }
            }
        }
        return {};
    });

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(colWidths));
    }, [colWidths, storageKey]);

    const updateColumnWidth = (tableId: string, colKey: string, width: string | undefined) => {
        setColWidths(prev => {
            const newWidths = { ...prev };
            const key = `${tableId}_${colKey}`;
            if (width) {
                newWidths[key] = width;
            } else {
                delete newWidths[key];
            }
            return newWidths;
        });
    };

    return { colWidths, updateColumnWidth };
};
