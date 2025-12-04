'use client';

import React, { useState, useEffect } from 'react';
import { formatDateTime } from '../_shared/utils';

interface DateTimeWidgetProps {
    location?: string;
}

export const DateTimeWidget: React.FC<DateTimeWidgetProps> = ({
    location = 'São Paulo, SP - Brasil',
}) => {
    const [dateTime, setDateTime] = useState<{ date: string; time: string }>({
        date: '',
        time: '',
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Atualizar data/hora
        const updateDateTime = () => {
            setDateTime(formatDateTime(new Date()));
        };

        updateDateTime();
        const interval = setInterval(updateDateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex items-center gap-4">
            <div>
                <div className="font-semibold text-sm text-[var(--ds-text-primary)]">
                    {dateTime.date} | {dateTime.time}
                </div>
                <div className="text-xs text-[var(--ds-text-secondary)] flex items-center gap-1">
                    <span>📍</span>
                    {location}
                </div>
            </div>
        </div>
    );
};
