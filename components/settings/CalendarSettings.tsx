import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GeneralSettingsData } from '../../hooks/useSettings';
import { Button } from '../Button';
import { useCalendar } from '../../hooks/useCalendar';
import { CustomHoliday, WorkSchedule } from '../../types/calendar';
import { useConfirm } from '../../utils/useConfirm';
import { Card, CardHeader } from '../Card';
import toast from 'react-hot-toast';

interface CalendarSettingsProps {
    settings: GeneralSettingsData;
    onUpdate: (settings: GeneralSettingsData) => void;
    onSave: (updatedSettings: GeneralSettingsData) => Promise<void>;
}

export const CalendarSettings: React.FC<CalendarSettingsProps> = ({ settings, onUpdate, onSave }) => {
    const { holidays: fetchedHolidays, fetchHolidays } = useCalendar(settings.id);

    // Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [originalSettings, setOriginalSettings] = useState<GeneralSettingsData | null>(null);
    const [localSettings, setLocalSettings] = useState<GeneralSettingsData>(settings);
    const [history, setHistory] = useState<GeneralSettingsData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());

    const { confirm, dialogState, handleConfirm, handleCancel } = useConfirm();

    // Sync local settings with props when not editing
    useEffect(() => {
        if (!isEditing) {
            setLocalSettings(settings);
        }
    }, [settings, isEditing]);

    useEffect(() => {
        fetchHolidays(viewYear);
    }, [viewYear, fetchHolidays, settings.custom_holidays]);

    // Merge fetched holidays (national/regional) with local custom holidays for display
    const displayedHolidays = useMemo(() => {
        const nonCustom = fetchedHolidays.filter(h => h.type !== 'custom');

        const localCustom = (localSettings.custom_holidays || []).filter((h: CustomHoliday) => {
            const hYear = parseInt(h.date.split('-')[0]);
            return h.recurring || hYear === viewYear;
        }).map((h: CustomHoliday) => ({
            date: new Date(h.recurring ? `${viewYear}-${h.date.split('-')[1]}-${h.date.split('-')[2]}` : h.date),
            name: h.name,
            type: 'custom' as const
        }));

        return [...nonCustom, ...localCustom].sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [fetchedHolidays, localSettings.custom_holidays, viewYear]);

    const updateSettings = useCallback((updater: React.SetStateAction<GeneralSettingsData>) => {
        setLocalSettings(currentData => {
            const newData = typeof updater === 'function' ? updater(currentData) : updater;
            const newDataCopy = JSON.parse(JSON.stringify(newData));
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newDataCopy);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            return newData;
        });
    }, [history, historyIndex]);

    const handleEdit = () => {
        const deepCopy = JSON.parse(JSON.stringify(localSettings));
        setOriginalSettings(deepCopy);
        setHistory([deepCopy]);
        setHistoryIndex(0);
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            await onSave(localSettings);
            setIsEditing(false);
            setOriginalSettings(null);
            setHistory([]);
            setHistoryIndex(-1);
        } catch (error) {
            console.error(error);
        }
    };

    const handleExit = async () => {
        const confirmExit = await confirm({
            title: 'Confirmar Saída',
            message: 'Tem certeza que deseja sair sem salvar? Todas as alterações serão perdidas.',
            confirmText: 'Sair sem Salvar',
            cancelText: 'Cancelar'
        });

        if (!confirmExit) return;

        if (originalSettings) {
            setLocalSettings(originalSettings);
            onUpdate(originalSettings);
        }
        setIsEditing(false);
        setOriginalSettings(null);
        setHistory([]);
        setHistoryIndex(-1);
    };

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setLocalSettings(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setLocalSettings(history[newIndex]);
        }
    }, [history, historyIndex]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isEditing) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z';
            const isRedo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'y';

            if (isUndo) {
                e.preventDefault();
                handleUndo();
            } else if (isRedo) {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, handleUndo, handleRedo]);

    const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSchedule = e.target.value as WorkSchedule;
        const updates: Partial<GeneralSettingsData> = { work_schedule: newSchedule };

        // Clear checkboxes when switching to mon-fri
        if (newSchedule === 'mon-fri') {
            updates.half_day_saturday = false;
            updates.half_day_sunday = false;
        }

        updateSettings({ ...localSettings, ...updates });
    };

    const handleCheckboxChange = (field: 'half_day_saturday' | 'half_day_sunday') => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ ...localSettings, [field]: e.target.checked });
    };

    const addCustomHoliday = () => {
        if (!newHolidayDate || !newHolidayName) return;

        const newHoliday: CustomHoliday = {
            date: newHolidayDate,
            name: newHolidayName,
            recurring: newHolidayRecurring
        };

        const currentHolidays = (localSettings.custom_holidays as CustomHoliday[]) || [];
        updateSettings({
            ...localSettings,
            custom_holidays: [...currentHolidays, newHoliday]
        });

        setNewHolidayDate('');
        setNewHolidayName('');
        setNewHolidayRecurring(false);
    };

    const removeCustomHoliday = async (index: number) => {
        const confirmDelete = await confirm({
            title: 'Excluir Feriado',
            message: 'Tem certeza que deseja excluir este feriado customizado?',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (!confirmDelete) return;

        const currentHolidays = (localSettings.custom_holidays as CustomHoliday[]) || [];
        const newHolidays = [...currentHolidays];
        newHolidays.splice(index, 1);
        updateSettings({
            ...localSettings,
            custom_holidays: newHolidays
        });
    };

    return (
        <div>
            <div className="flex justify-end gap-1 mb-4">
                {isEditing ? (
                    <>
                        <Button variant="primary" onClick={handleSave}>💾 Salvar</Button>
                        <Button variant="secondary" onClick={handleExit}>Sair sem Salvar</Button>
                        <Button size="sm" variant="secondary" onClick={handleUndo} disabled={historyIndex <= 0}>↩️</Button>
                        <Button size="sm" variant="secondary" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>↪️</Button>
                    </>
                ) : (
                    <Button onClick={handleEdit}>✏️ Editar</Button>
                )}
            </div>

            <Card>
                <CardHeader title="📅 Padrão de Trabalho" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Escala Semanal</label>
                        <select
                            value={localSettings.work_schedule || 'mon-fri'}
                            onChange={handleScheduleChange}
                            disabled={!isEditing}
                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <option value="mon-fri">Segunda a Sexta</option>
                            <option value="mon-sat">Segunda a Sábado</option>
                            <option value="mon-sun">Segunda a Domingo</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-3 pt-6">
                        <label className={`flex items-center gap-2 ${(localSettings.work_schedule || 'mon-fri') === 'mon-fri' ? 'opacity-50 cursor-not-allowed' : isEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <input
                                type="checkbox"
                                checked={localSettings.half_day_saturday || false}
                                onChange={handleCheckboxChange('half_day_saturday')}
                                disabled={!isEditing || (localSettings.work_schedule || 'mon-fri') === 'mon-fri'}
                                className="w-4 h-4 rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-white text-sm">Sábado Meio Período</span>
                        </label>

                        <label className={`flex items-center gap-2 ${(localSettings.work_schedule || 'mon-fri') !== 'mon-sun' ? 'opacity-50 cursor-not-allowed' : isEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <input
                                type="checkbox"
                                checked={localSettings.half_day_sunday || false}
                                onChange={handleCheckboxChange('half_day_sunday')}
                                disabled={!isEditing || (localSettings.work_schedule || 'mon-fri') !== 'mon-sun'}
                                className="w-4 h-4 rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-white text-sm">Domingo Meio Período</span>
                        </label>
                    </div>
                </div>
            </Card>

            <Card>
                <CardHeader title="🎉 Feriados Customizados" />
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                    <p className="text-sm text-blue-300">
                        ℹ️ Feriados estaduais e municipais (capitais) são incluídos automaticamente. Para cidades que não são capitais, adicione os feriados municipais manualmente.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Data</label>
                        <input
                            type="date"
                            value={newHolidayDate}
                            onChange={(e) => setNewHolidayDate(e.target.value)}
                            disabled={!isEditing}
                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Nome do Feriado</label>
                        <input
                            type="text"
                            value={newHolidayName}
                            onChange={(e) => setNewHolidayName(e.target.value)}
                            placeholder="Ex: Aniversário da Empresa"
                            disabled={!isEditing}
                            className="w-full bg-[#1e2329] border border-[#3a3e45] rounded-md p-2 focus:ring-2 focus:ring-[#0084ff] outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div className="pb-3">
                        <label className={`flex items-center gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <input
                                type="checkbox"
                                checked={newHolidayRecurring}
                                onChange={(e) => setNewHolidayRecurring(e.target.checked)}
                                disabled={!isEditing}
                                className="w-4 h-4 rounded border-[#3a3e45] bg-[#1e2329] text-[#0084ff] focus:ring-[#0084ff] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-white text-sm">Repetir Anualmente</span>
                        </label>
                    </div>
                    <Button onClick={addCustomHoliday} disabled={!isEditing || !newHolidayDate || !newHolidayName}>
                        Adicionar
                    </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {((localSettings.custom_holidays as CustomHoliday[]) || []).length === 0 ? (
                        <p className="text-[#a0a5b0] text-sm italic">Nenhum feriado customizado.</p>
                    ) : (
                        (localSettings.custom_holidays as CustomHoliday[]).map((h, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-[#1e2329] p-3 rounded border border-[#3a3e45]">
                                <div>
                                    <span className="text-white font-medium">{h.name}</span>
                                    <span className="text-[#a0a5b0] text-sm ml-2">
                                        {h.date} {h.recurring && '(Anual)'}
                                    </span>
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={() => removeCustomHoliday(idx)}
                                        className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-500/10"
                                        title="Excluir feriado customizado"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
                {isEditing && ((localSettings.custom_holidays as CustomHoliday[]) || []).length > 0 && (
                    <p className="text-xs text-[#a0a5b0] mt-2 text-right">
                        * Clique no ícone <span className="text-red-400">✕</span> para remover um feriado.
                    </p>
                )}
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Próximos Feriados</h3>
                    <div className="flex items-center gap-2 bg-[#1e2329] rounded-lg border border-[#3a3e45] px-3 py-1.5">
                        <button
                            onClick={() => setViewYear(prev => prev - 1)}
                            className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45] rounded px-2 py-1 transition-all"
                            title="Ano anterior"
                        >
                            ◀
                        </button>
                        <span className="text-white font-mono font-semibold min-w-[60px] text-center">{viewYear}</span>
                        <button
                            onClick={() => setViewYear(prev => prev + 1)}
                            className="text-[#a0a5b0] hover:text-white hover:bg-[#3a3e45] rounded px-2 py-1 transition-all"
                            title="Próximo ano"
                        >
                            ▶
                        </button>
                    </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {displayedHolidays.length === 0 ? (
                        <p className="text-[#a0a5b0] text-sm italic">Nenhum feriado encontrado para este ano.</p>
                    ) : (
                        displayedHolidays.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-[#1e2329] p-3 rounded border border-[#3a3e45]">
                                <div className={`w-2 h-2 rounded-full ${h.type === 'national' ? 'bg-green-500' :
                                    h.type === 'state' ? 'bg-blue-500' :
                                        h.type === 'municipal' ? 'bg-yellow-500' : 'bg-purple-500'
                                    }`} />
                                <div className="flex-1">
                                    <div className="text-white font-medium">{h.name}</div>
                                    <div className="text-xs text-[#a0a5b0]">
                                        {h.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#3a3e45] text-[10px] uppercase tracking-wider">
                                            {h.type === 'national' ? 'Nacional' :
                                                h.type === 'state' ? 'Estadual' :
                                                    h.type === 'municipal' ? 'Municipal' : 'Customizado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Confirm Dialog */}
            {dialogState.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2100] p-4">
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
        </div>
    );
};
