import React, { useState, useEffect } from 'react';

interface EditableCellProps {
    value: string | number;
    onCommit: (newValue: string | number) => void;
    isNumeric?: boolean;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    isSelected?: boolean;
    columnId?: string;
    handleEnterNavigation?: (e: React.KeyboardEvent<HTMLElement>, colId: string) => void;
}

export const EditableCell: React.FC<EditableCellProps> = ({
    value,
    onCommit,
    isNumeric = false,
    className = "",
    onKeyDown,
    disabled = false,
    isSelected = false,
    columnId,
    handleEnterNavigation
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
            if (columnId && handleEnterNavigation) {
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
