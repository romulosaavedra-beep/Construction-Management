
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { handleEnterNavigation } from '../utils';
import type { UnitItem } from '../types';

interface UnitAutocompleteCellProps {
    value: string;
    onCommit: (newValue: string) => void;
    availableUnits: UnitItem[];
    isSelected?: boolean;
    columnId?: string;
}

export const UnitAutocompleteCell: React.FC<UnitAutocompleteCellProps> = ({
    value,
    onCommit,
    availableUnits,
    isSelected = false,
    columnId
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
                    isSelected && "bg-accent-500/25 border-accent-500"
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
