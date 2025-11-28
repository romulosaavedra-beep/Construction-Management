import React, { useState } from 'react';
import type { Module, NavItemType } from '../types';

const navItems: NavItemType[] = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'orcamento', icon: '💰', label: 'Orçamento' },
    { id: 'planejamento', icon: '📅', label: 'Planejamento' },
    { id: 'composicao', icon: '🧱', label: 'Composição de Custos' },
    { id: 'diario', icon: '📝', label: 'Diário de Obra' },
    { id: 'medicao', icon: '📏', label: 'Medição de Obra' },
    { id: 'curva-abc', icon: '📈', label: 'Curva ABC' },
    { id: 'compras', icon: '🛒', label: 'Gestão de Compras' },
    { id: 'financeiro', icon: '💵', label: 'Financeiro' },
    { id: 'clima', icon: '🌤️', label: 'Clima e Tempo' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
];

interface SidebarProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    isMobileMenuOpen: boolean;
    setMobileMenuOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule, isMobileMenuOpen, setMobileMenuOpen }) => {
    const [isPinned, setPinned] = useState(true);

    const isExpanded = isPinned;

    const handleNavItemClick = (moduleId: Module) => {
        setActiveModule(moduleId);
        if (window.innerWidth < 768) {
            setMobileMenuOpen(false);
        }
    };

    return (
        <aside
            className={`
                bg-[#1e2329] text-[#e8eaed] flex flex-col z-[1000] transition-all duration-300 ease-in-out
                fixed md:relative inset-y-0 left-0 transform
                ${isMobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full w-72'}
                md:translate-x-0 
                ${isExpanded ? 'md:w-64' : 'md:w-[70px]'}
                lg:flex border-r border-[#3a3e45]
            `}
        >
            <div className={`flex items-center border-b border-[#3a3e45] transition-all duration-300 ${isExpanded ? 'p-5 h-[60px]' : 'p-0 h-[60px] justify-center'}`}>
                <span className={`text-2xl ${!isExpanded && 'md:hidden'}`}>🏗️</span>
                <h1 className={`text-lg font-bold whitespace-nowrap ml-3 overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'} md:block ${isExpanded ? '' : 'md:hidden'}`}>Gestão de Obras</h1>
            </div>

            <div
                className={`hidden md:flex items-center justify-center cursor-pointer border-b border-[#3a3e45] hover:bg-[#24282f] transition-all duration-200 group ${isExpanded ? 'py-2' : 'py-3'}`}
                onClick={() => setPinned(!isPinned)}
                title={isPinned ? 'Recolher menu' : 'Expandir menu'}
            >
                <div className={`flex items-center gap-2 transition-all duration-200 ${isExpanded ? 'px-4' : ''}`}>
                    <span className={`text-lg transition-transform duration-200 ${!isPinned}`}>
                        {isPinned ? '◀' : '▶'}
                    </span>
                    {isExpanded && (
                        <span className="text-sm text-[#a0a5b0] group-hover:text-white transition-colors">
                            {isPinned ? 'Recolher' : 'Expandir'}
                        </span>
                    )}
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                <ul className="space-y-1">
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleNavItemClick(item.id); }}
                                className={`flex items-center gap-3 h-12 px-5 transition-all duration-200 ease-in-out hover:bg-[#24282f] ${!isExpanded && 'md:justify-center md:px-0'} ${activeModule === item.id ? 'bg-[#0084ff]/20 border-l-4 border-[#0084ff] text-white' : 'text-[#a0a5b0]'}`}
                                title={!isExpanded ? item.label : undefined}
                            >
                                <span className="text-xl w-6 text-center flex-shrink-0">{item.icon}</span>
                                <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                                    {item.label}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};
