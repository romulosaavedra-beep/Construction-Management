import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Card, CardHeader } from '../Card';
import { Button } from '../Button';
import { ResizableTh } from '../Table/ResizableTh';
import { SearchableDropdown } from '../SearchableDropdown';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useColumnWidths } from '../../hooks/useColumnWidths';
import { useConfirm } from '../../utils/useConfirm';
import { maskMobilePhone } from '../../utils/formatters';
import type { Profissional } from '../../types';

interface ProfessionalsSettingsProps {
    projectId?: string;
}

export const ProfessionalsSettings: React.FC<ProfessionalsSettingsProps> = ({ projectId }) => {
    const { professionals, loading, addProfessional, updateProfessional, deleteProfessional, deleteProfessionals } = useProfessionals(projectId);
    const { colWidths, updateColumnWidth } = useColumnWidths('vobi-settings-col-widths');
    const { confirm, alert, dialogState, handleConfirm, handleCancel } = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfissional, setCurrentProfissional] = useState<Partial<Profissional>>({});
    const [phoneError, setPhoneError] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof Profissional; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [customRoles, setCustomRoles] = useState<string[]>([]);

    const [dbRoles, setDbRoles] = useState<string[]>([]);

    useEffect(() => {
        const fetchRoles = async () => {
            const { data, error } = await supabase
                .from('job_titles')
                .select('title')
                .order('title');

            if (data) {
                setDbRoles(data.map(r => r.title));
            }
        };
        fetchRoles();
    }, []);

    // Derived state for roles (unique list from professionals + db roles + custom)
    const roles = useMemo(() => {
        const existingRoles = professionals.map(p => p.cargo);
        return Array.from(new Set([...dbRoles, ...existingRoles, ...customRoles])).sort();
    }, [professionals, customRoles, dbRoles]);

    const filteredAndSortedProfessionals = useMemo(() => {
        let items = [...professionals];

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            items = items.filter(p =>
                p.nome.toLowerCase().includes(search) ||
                p.cargo.toLowerCase().includes(search) ||
                (p.email && p.email.toLowerCase().includes(search)) ||
                (p.telefone && p.telefone.includes(search)) ||
                (p.atividades && p.atividades.toLowerCase().includes(search))
            );
        }

        // Apply sorting
        if (sortConfig) {
            items.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || '').toLowerCase();
                const bVal = String(b[sortConfig.key] || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [professionals, sortConfig, searchTerm]);

    const requestSort = (key: keyof Profissional) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <span className="text-[#4a4e55] ml-1 text-[10px]">▼</span>;
        return <span className="text-[#0084ff] ml-1 text-[10px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const handleAdd = () => {
        if (!projectId) {
            alert({ message: 'Por favor, salve as Configurações Gerais primeiro para criar o projeto.' });
            return;
        }
        setCurrentProfissional({
            cargo: roles[0],
            nome: '',
            email: '',
            telefone: '',
            atividades: ''
        });
        setPhoneError("");
        setIsModalOpen(true);
    };

    const handleEdit = (p: Profissional) => {
        setCurrentProfissional({ ...p });
        setPhoneError("");
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string | number) => {
        const shouldDelete = await confirm({
            title: 'Remover Profissional',
            message: 'Tem certeza que deseja remover este profissional?',
            confirmText: 'Remover',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteProfessional(id);
            const idStr = String(id);
            if (selectedIds.has(idStr)) {
                const newSelected = new Set(selectedIds);
                newSelected.delete(idStr);
                setSelectedIds(newSelected);
            }
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = filteredAndSortedProfessionals.map(p => String(p.id));
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string | number) => {
        const idStr = String(id);
        const newSelected = new Set(selectedIds);
        if (newSelected.has(idStr)) {
            newSelected.delete(idStr);
        } else {
            newSelected.add(idStr);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        const shouldDelete = await confirm({
            title: 'Excluir Profissionais',
            message: `Tem certeza que deseja excluir ${selectedIds.size} profissionais selecionados?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            await deleteProfessionals(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const totalCount = filteredAndSortedProfessionals.length;
    const isAllSelected = totalCount > 0 && selectedIds.size === totalCount;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < totalCount;

    const handleAddRole = () => {
        if (!newRole.trim()) return;
        if (roles.includes(newRole.trim())) {
            alert({ message: 'Este cargo já existe.' });
            return;
        }
        setCustomRoles(prev => [...prev, newRole.trim()]);
        setCurrentProfissional({ ...currentProfissional, cargo: newRole.trim() });
        setNewRole('');
        setIsCreatingRole(false);
    };

    const handleDeleteRole = async (role: string) => {
        const usedByProfessionals = professionals.filter(p => p.cargo === role);
        if (usedByProfessionals.length > 0) {
            alert({ message: `Não é possível excluir o cargo "${role}" pois está sendo usado por ${usedByProfessionals.length} profissional(is).` });
            return;
        }

        const shouldDelete = await confirm({
            title: 'Excluir Cargo',
            message: `Tem certeza que deseja excluir o cargo "${role}"?`,
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (shouldDelete) {
            setCustomRoles(prev => prev.filter(r => r !== role));
            if (currentProfissional.cargo === role) {
                setCurrentProfissional({ ...currentProfissional, cargo: roles[0] });
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setPhoneError("");

        if (!currentProfissional.nome || !currentProfissional.cargo || !currentProfissional.atividades) {
            alert({ message: 'Por favor, preencha todos os campos obrigatórios (Cargo, Nome e Atividades).' });
            return;
        }

        const rawPhone = (currentProfissional.telefone || '').replace(/\D/g, '');
        if (rawPhone.length > 0) {
            if (rawPhone.length !== 11) return setPhoneError("Celular deve ter 11 dígitos.");
            if (rawPhone[2] !== '9') return setPhoneError("Celular deve começar com 9.");
        }

        if (currentProfissional.id) {
            await updateProfessional(currentProfissional as Profissional);
        } else {
            await addProfessional(currentProfissional as Omit<Profissional, 'id'>);
        }
        setIsModalOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader title="Profissionais">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            placeholder="🔍 Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-64 bg-[#1e2329] border border-[#3a3e45] rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0084ff] outline-none"
                        />
                        <Button variant="primary" onClick={handleAdd}>+ Adicionar</Button>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-[#a0a5b0]">
                            {/* HEADER */}
                            <thead className="text-xs text-[#e8eaed] uppercase bg-[#242830] sticky top-0 z-30">
                                <tr>
                                    {/* CHECKBOX: Sticky Left */}
                                    <th className="px-4 py-3 w-[40px] text-center border-b border-[#3a3e45] sticky left-0 z-30 bg-[#242830]">
                                        <input
                                            type="checkbox"
                                            className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                                            checked={isAllSelected}
                                            ref={input => {
                                                if (input) input.indeterminate = isIndeterminate;
                                            }}
                                            onChange={handleSelectAll}
                                            disabled={totalCount === 0}
                                        />
                                    </th>

                                    {/* CARGO */}
                                    <ResizableTh tableId="prof" colKey="cargo" initialWidth="15%" onSort={() => requestSort('cargo')} sortIndicator={getSortIndicator('cargo')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Cargo</ResizableTh>

                                    {/* NOME */}
                                    <ResizableTh tableId="prof" colKey="nome" initialWidth="20%" onSort={() => requestSort('nome')} sortIndicator={getSortIndicator('nome')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Nome</ResizableTh>

                                    {/* EMAIL */}
                                    <ResizableTh tableId="prof" colKey="email" initialWidth="20%" onSort={() => requestSort('email')} sortIndicator={getSortIndicator('email')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Email</ResizableTh>

                                    {/* TELEFONE: Curto */}
                                    <ResizableTh tableId="prof" colKey="telefone" initialWidth="1%" onSort={() => requestSort('telefone')} sortIndicator={getSortIndicator('telefone')} colWidths={colWidths} onUpdateWidth={updateColumnWidth}>Telefone</ResizableTh>

                                    {/* ATIVIDADES: Ocupa o resto do espaço */}
                                    <ResizableTh tableId="prof" colKey="atividades" initialWidth="40%" onSort={() => requestSort('atividades')} sortIndicator={getSortIndicator('atividades')} colWidths={colWidths} onUpdateWidth={updateColumnWidth} className="!border-r-0">Atividades</ResizableTh>

                                    {/* AÇÕES: Sticky Right */}
                                    <th className="px-4 py-3 w-[1%] whitespace-nowrap text-center border-b border-[#3a3e45] sticky right-0 z-30 bg-[#242830]">
                                        {selectedIds.size > 0 ? (
                                            <button
                                                onClick={handleBulkDelete}
                                                className="text-red-400 hover:text-red-300 text-xs font-bold uppercase"
                                            >
                                                Apagar ({selectedIds.size})
                                            </button>
                                        ) : (
                                            "Ações"
                                        )}
                                    </th>
                                </tr>
                            </thead>

                            {/* BODY */}
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-6">Carregando...</td></tr>
                                ) : filteredAndSortedProfessionals.map(p => {
                                    // Lógica de Cores Opacas para Colunas Fixas
                                    const stickyBgClass = selectedIds.has(String(p.id))
                                        ? 'bg-[#1a2736]' // Cor de fundo quando selecionado
                                        : 'bg-[#1e2329] group-hover:bg-[#24282f]'; // Cor normal / hover

                                    return (
                                        <tr key={p.id} className={`group border-b border-[#3a3e45] hover:bg-[#24282f] transition-colors ${selectedIds.has(String(p.id)) ? 'bg-[#0084ff]/10' : ''}`}>

                                            {/* CHECKBOX BODY: Sticky Left */}
                                            <td className={`px-4 py-3 text-center sticky left-0 z-20 ${stickyBgClass}`}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] focus:ring-offset-0 focus:ring-offset-[#242830]"
                                                    checked={selectedIds.has(String(p.id))}
                                                    onChange={() => handleSelectRow(p.id)}
                                                />
                                            </td>

                                            {/* Colunas Fluidas (max-w-[1px]) */}
                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]">{p.cargo}</td>
                                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]">{p.nome}</td>
                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]">{p.email || '-'}</td>

                                            {/* Coluna Curta (w-[1%]) */}
                                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap w-[1%]">{p.telefone || '-'}</td>

                                            {/* Atividades: Fluida e Truncada (mudança de break-words para ellipsis para manter padrão) */}
                                            <td className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[1px]" title={p.atividades}>{p.atividades || '-'}</td>

                                            {/* AÇÕES BODY: Sticky Right */}
                                            <td className={`px-4 py-3 text-center whitespace-nowrap w-[1%] sticky right-0 z-20 ${stickyBgClass}`}>
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(p)} className="text-[#a0a5b0] hover:text-white p-1" title="Editar">✏️</button>
                                                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-500 p-1" title="Excluir">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {!loading && professionals.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum profissional cadastrado.</div>}
                    {!loading && professionals.length > 0 && filteredAndSortedProfessionals.length === 0 && <div className="text-center py-6 text-[#a0a5b0]">Nenhum resultado encontrado para "{searchTerm}".</div>}
                </div>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-lg border border-[#3a3e45]">
                        <div className="flex justify-between items-center p-4 border-b border-[#3a3e45]">
                            <h3 className="text-lg font-semibold text-white">{currentProfissional.id ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#a0a5b0] hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Cargo <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <SearchableDropdown
                                        options={roles}
                                        value={currentProfissional.cargo || ''}
                                        onChange={(val) => setCurrentProfissional({ ...currentProfissional, cargo: val })}
                                        placeholder="Selecione um cargo..."
                                        required
                                        className="flex-1"
                                    />
                                    {!isCreatingRole && <Button variant="secondary" size="sm" onClick={() => setIsCreatingRole(true)} type="button">+ Novo</Button>}
                                    {customRoles.includes(currentProfissional.cargo || '') && (
                                        <button type="button" onClick={() => handleDeleteRole(currentProfissional.cargo!)} className="text-red-400 hover:text-red-500 px-2" title="Excluir cargo">🗑️</button>
                                    )}
                                </div>
                                {isCreatingRole && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            value={newRole}
                                            onChange={e => setNewRole(e.target.value)}
                                            placeholder="Digite o novo cargo"
                                            className="flex-1 bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                            autoFocus
                                        />
                                        <Button variant="primary" size="sm" onClick={handleAddRole} type="button">Adicionar</Button>
                                        <Button variant="secondary" size="sm" onClick={() => { setIsCreatingRole(false); setNewRole(''); }} type="button">Cancelar</Button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={currentProfissional.nome || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, nome: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    placeholder="Ex: João Silva"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={currentProfissional.email || ''}
                                        onChange={e => setCurrentProfissional({ ...currentProfissional, email: e.target.value })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                        placeholder="joao@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={currentProfissional.telefone || ''}
                                        onChange={e => setCurrentProfissional({ ...currentProfissional, telefone: maskMobilePhone(e.target.value) })}
                                        className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                        placeholder="(11) 99999-9999"
                                    />
                                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Atividades <span className="text-red-500">*</span></label>
                                <textarea
                                    value={currentProfissional.atividades || ''}
                                    onChange={e => setCurrentProfissional({ ...currentProfissional, atividades: e.target.value })}
                                    className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 text-sm"
                                    rows={4}
                                    placeholder="Ex: Coordenação de equipes, elaboração de projetos estruturais, fiscalização de obras"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">Cancelar</Button>
                                <Button variant="primary" type="submit">Salvar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            {dialogState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1100] p-4">
                    <div className="bg-[#242830] rounded-lg shadow-2xl w-full max-w-md border border-[#3a3e45] p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">{dialogState.title}</h3>
                        <p className="text-[#a0a5b0] mb-6">{dialogState.message}</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                            <Button variant="danger" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
