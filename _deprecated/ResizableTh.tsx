import React, { useRef } from 'react';

interface ResizableThProps {
    tableId: string;
    colKey: string;
    children: React.ReactNode;
    initialWidth?: string;
    className?: string;
    onSort?: () => void;
    sortIndicator?: React.ReactNode;
    colWidths: Record<string, string>;
    onUpdateWidth: (tableId: string, colKey: string, width: string | undefined) => void;
}

export const ResizableTh: React.FC<ResizableThProps> = ({
    tableId,
    colKey,
    children,
    initialWidth,
    className = "",
    onSort,
    sortIndicator,
    colWidths,
    onUpdateWidth
}) => {
    const thRef = useRef<HTMLTableHeaderCellElement>(null);
    const savedWidth = colWidths[`${tableId}_${colKey}`];
    const currentWidth = savedWidth === 'auto' ? 'auto' : (savedWidth || initialWidth);

    const handleResetWidth = () => {
        onUpdateWidth(tableId, colKey, 'auto');
        if (thRef.current) {
            thRef.current.style.width = 'auto';
            thRef.current.style.minWidth = 'auto';
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.detail === 2) {
            e.preventDefault();
            e.stopPropagation();
            handleResetWidth();
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const th = thRef.current;
        if (!th) return;

        const startX = e.pageX;
        const startWidth = th.offsetWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.pageX - startX);
            if (newWidth > 50) {
                th.style.width = `${newWidth}px`;
                th.style.minWidth = `${newWidth}px`;
            }
        };

        const onMouseUp = () => {
            if (th) {
                onUpdateWidth(tableId, colKey, `${th.offsetWidth}px`);
                th.classList.remove('resizing');
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        th.classList.add('resizing');
    };

    return (
        <th
            ref={thRef}
            className={`px-4 py-3 relative bg-[#242830] border-r border-[#3a3e45] last:border-r-0 select-none ${className}`}
            style={{ width: currentWidth, minWidth: currentWidth }}
        >
            <div className="flex items-center justify-between h-full">
                <span
                    onClick={onSort}
                    className={`flex items-center truncate ${onSort ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                >
                    {children} {sortIndicator}
                </span>
                <div
                    className="resizer"
                    onMouseDown={handleMouseDown}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleResetWidth();
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </th>
    );
};
