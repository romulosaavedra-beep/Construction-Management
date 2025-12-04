
import React from 'react';

interface KpiCardProps {
    label: string;
    value: string | number;
    description?: string;
    children?: React.ReactNode;
    status?: 'success' | 'warning' | 'danger' | 'info';
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, description, children, status = 'info' }) => {
    const statusClasses = {
        success: 'border-l-[#00cc44]',
        warning: 'border-l-[#ffaa00]',
        danger: 'border-l-[#ff4444]',
        info: 'border-l-[#0084ff]',
    };

    return (
        <div className={`bg-[#1e2329] p-5 rounded-lg shadow-lg border-l-4 ${statusClasses[status]}`}>
            <div className="text-xs text-[#a0a5b0] uppercase font-semibold mb-1">{label}</div>
            <div className="text-3xl font-bold text-white mb-2">{value}</div>
            {description && <div className="text-sm text-[#a0a5b0]">{description}</div>}
            {children}
        </div>
    );
};
