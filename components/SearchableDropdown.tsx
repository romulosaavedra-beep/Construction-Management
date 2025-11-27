import React, { useState, useRef, useEffect } from 'react';

interface SearchableDropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    label?: string;
    className?: string;
    onAddNew?: (newValue: string) => void;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Selecione...',
    disabled = false,
    required = false,
    label,
    className = '',
    onAddNew
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

    const handleAddNew = () => {
        if (onAddNew && searchTerm.trim()) {
            onAddNew(searchTerm.trim());
            onChange(searchTerm.trim());
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full bg-[#1e2329] border ${required && !value ? 'border-red-500' : 'border-[#3a3e45]'
                        } rounded-md p-2 text-left focus:ring-2 focus:ring-[#0084ff] outline-none text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                >
                    <span className={value ? 'text-white' : 'text-[#a0a5b0]'}>
                        {value || placeholder}
                    </span>
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#a0a5b0]">
                        {isOpen ? '▲' : '▼'}
                    </span>
                </button>

                {isOpen && !disabled && (
                    <div className="absolute z-50 w-full mt-1 bg-[#242830] border border-[#3a3e45] rounded-md shadow-lg max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-[#3a3e45]">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full bg-[#1e2329] border border-[#3a3e45] rounded p-2 text-sm focus:ring-2 focus:ring-[#0084ff] outline-none"
                                autoFocus
                            />
                        </div>
                        <div className="overflow-y-auto max-h-48 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleSelect(option)}
                                        className={`p-2 cursor-pointer text-sm hover:bg-[#3a3e45] ${option === value ? 'bg-[#0084ff]/20 text-[#0084ff]' : 'text-white'
                                            }`}
                                    >
                                        {option}
                                    </div>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-[#a0a5b0] text-center">
                                    {onAddNew && searchTerm.trim() ? (
                                        <button
                                            type="button"
                                            onClick={handleAddNew}
                                            className="text-[#0084ff] hover:underline w-full text-left"
                                        >
                                            + Criar "{searchTerm}"
                                        </button>
                                    ) : (
                                        'Nenhum resultado encontrado'
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};