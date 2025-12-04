import React, { useState, useEffect, useRef, useMemo } from 'react';

interface UnitItem {
    category: string;
    name: string;
    symbol: string;
}

interface UnitAutocompleteCellProps {
    value: string;
    onCommit: (newValue: string) => void;
    availableUnits: UnitItem[];
    isSelected?: boolean;
    columnId?: string;
    handleEnterNavigation?: (e: React.KeyboardEvent<HTMLElement>, colId: string) => void;
}

export const UnitAutocompleteCell: React.FC<UnitAutocompleteCellProps> = ({
    value,
    onCommit,
    availableUnits,
    isSelected = false,
    columnId,
    handleEnterNavigation
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
            } else if (columnId && handleEnterNavigation) {
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
                    ${isSelected ? 'bg-[#0084ff]/20 border-[#0084ff] text-white' : 'bg-[#242830] border-default'}
                    focus:ring-1 focus:ring-[#0084ff] outline-none
                `}
                placeholder="-"
            />
            {isOpen && filteredUnits.length > 0 && (
                <div className="absolute top-full left-0 w-64 bg-[#242830] border border-default rounded-md shadow-xl z-[100] max-h-60 overflow-y-auto mt-1 custom-scrollbar">
                    {filteredUnits.map((unit, index) => (
                        <div
                            key={`${unit.category}-${unit.symbol}-${index}`}
                            onClick={() => handleSelect(unit)}
                            className={`px-3 py-2 cursor-pointer flex justify-between items-center border-b border-default/30 last:border-0
                                ${index === highlightedIndex ? 'bg-[#0084ff]/20 text-white' : 'text-secondary hover:bg-[#3a3e45]'}
                            `}
                        >
                            <span className="font-bold text-white w-10 text-center bg-[#3a3e45]/50 rounded px-1">{unit.symbol}</span>
                            <span className="text-xs truncate flex-1 text-right pl-2">{unit.name}</span>
                        </div>
                    ))}
                </div>
            )}
            {isOpen && filteredUnits.length === 0 && (
                <div className="absolute top-full left-0 w-48 bg-[#242830] border border-default rounded-md shadow-xl z-[100] p-2 text-center text-xs text-gray-500 mt-1">
                    Nenhuma unidade encontrada
                </div>
            )}
        </div>
    );
};
