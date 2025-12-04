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
                ${disabled ? 'cursor-not-allowed bg-elevated text-secondary border-default' : ''}
                ${isSelected ? 'bg-accent-500/20 border-accent-500 text-white' : 'bg-surface border-default'}
            `}
            style={{ textAlign: isNumeric ? 'right' : 'left' }}
        />
    );
};
