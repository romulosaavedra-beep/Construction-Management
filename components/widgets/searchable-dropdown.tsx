import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableDropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    // Label removido daqui para ser controlado externamente pelo componente pai
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Selecione...',
    disabled = false,
    required = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={cn("relative w-full", className)} ref={dropdownRef}>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        // ESTILO IDÊNTICO AO INPUT DO SHADCN (h-10, cores, bordas)
                        "flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 py-2 text-sm ring-offset-background",
                        "border-default",
                        "placeholder:text-secondary",
                        "focus:outline-none focus:border-[#71767f]", // Foco cinza claro
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        required && !value ? "border-red-500" : "",
                        value ? "text-white" : "text-secondary"
                    )}
                >
                    <span className="truncate">
                        {value || placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 text-white" />
                </button>

                {isOpen && !disabled && (
                    <div className="absolute z-50 w-full mt-1 bg-surface border border-default rounded-md shadow-xl max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-default sticky top-0 bg-surface z-10">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-secondary" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full bg-base border border-default rounded-sm py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-[#71767f] placeholder:text-secondary"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-48 custom-scrollbar p-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleSelect(option)}
                                        className={cn(
                                            "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                            "hover:bg-[#242830] hover:text-white",
                                            option === value ? "text-accent-500 font-medium bg-[#0084ff]/10" : "text-primary"
                                        )}
                                    >
                                        {option}
                                    </div>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-secondary text-center">
                                    Nenhum resultado.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};