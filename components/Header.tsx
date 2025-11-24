
import React, { useState, useEffect } from 'react';

export const Header: React.FC = () => {
    const [dateTime, setDateTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        };
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR');
    };

    return (
        <header className="hidden md:flex bg-[#1a1d24] px-5 py-3 border-b border-[#3a3e45] items-center justify-between flex-shrink-0 h-[60px]">
            <div className="flex items-center gap-4">
                <div>
                    <div className="font-semibold text-base">{formatDate(dateTime)} | {formatTime(dateTime)}</div>
                    <div className="text-xs text-[#a0a5b0]">📍 São Paulo, SP - Brasil</div>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-[#1e2329] px-4 py-1 rounded-lg">
                <span className="text-2xl">☀️</span>
                <div>
                    <div className="font-bold text-lg">26°C</div>
                    <div className="text-xs text-[#a0a5b0]">65% 💧 | Parcialmente nublado</div>
                </div>
            </div>
        </header>
    );
};
