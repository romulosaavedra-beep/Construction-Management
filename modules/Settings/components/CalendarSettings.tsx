import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useProjectContext } from '@/contexts/project-context';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCalendar } from '@/hooks/useCalendar';
import { CustomHoliday, WorkSchedule } from '@/types/calendar';
import { useConfirm } from '@/utils/useConfirm';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Calendar as CalendarIcon,
    Save,
    Pencil,
    Undo2,
    Redo2,
    X,
    Plus,
    Trash2,
    Info,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Clock,
    CalendarDays,
    PartyPopper,
    Filter,
    Check,
    RefreshCw
} from "lucide-react";
import { toast } from 'sonner'; // ✅ MUDANÇA: sonner
import { cn } from "@/lib/utils";

interface CalendarSettingsProps {
    projectId?: string;
}

type HolidayType = 'national' | 'state' | 'municipal' | 'custom';

export const CalendarSettings: React.FC<CalendarSettingsProps> = ({ projectId }) => {
    const { selectedProjectId } = useProjectContext();
    const id = projectId || selectedProjectId;

    const { settings, loading, saveSettings, setSettings } = useSettings(id);
    const { holidays: fetchedHolidays, fetchHolidays } = useCalendar(id);

    // Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [originalSettings, setOriginalSettings] = useState<typeof settings | null>(null);
    const [localSettings, setLocalSettings] = useState(settings);
    const [history, setHistory] = useState<typeof settings[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Custom Holiday States
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);
    const [editingHolidayIndex, setEditingHolidayIndex] = useState<number | null>(null);

    const [viewYear, setViewYear] = useState(new Date().getFullYear());

    // Filter States
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const [selectedFilters, setSelectedFilters] = useState<HolidayType[]>(['national', 'state', 'municipal', 'custom']);

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

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Merge fetched holidays with local custom holidays AND APPLY FILTERS
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

        const allHolidays = [...nonCustom, ...localCustom].sort((a, b) => a.date.getTime() - b.date.getTime());

        return allHolidays.filter(h => selectedFilters.includes(h.type as HolidayType));
    }, [fetchedHolidays, localSettings.custom_holidays, viewYear, selectedFilters]);

    const updateSettings = useCallback((updater: React.SetStateAction<typeof settings>) => {
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
            await saveSettings(localSettings);
            setIsEditing(false);
            setOriginalSettings(null);
            setHistory([]);
            setHistoryIndex(-1);
            setEditingHolidayIndex(null);
            clearHolidayInputs();
            toast.success('Configurações de calendário salvas!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar configurações.');
        }
    };

    const handleExit = async () => {
        const confirmExit = await confirm({
            title: 'Descartar Alterações',
            message: 'Tem certeza que deseja sair sem salvar? Todas as alterações serão perdidas.',
            confirmText: 'Sair sem Salvar',
            cancelText: 'Continuar Editando'
        });

        if (!confirmExit) return;

        if (originalSettings) {
            setLocalSettings(originalSettings);
            setSettings(originalSettings);
        }
        setIsEditing(false);
        setOriginalSettings(null);
        setHistory([]);
        setHistoryIndex(-1);
        setEditingHolidayIndex(null);
        clearHolidayInputs();
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

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

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
        const updates: Partial<typeof settings> = { work_schedule: newSchedule };

        if (newSchedule === 'mon-fri') {
            updates.half_day_saturday = false;
            updates.half_day_sunday = false;
        }

        updateSettings({ ...localSettings, ...updates });
    };

    const handleCheckboxChange = (field: 'half_day_saturday' | 'half_day_sunday') => (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSettings({ ...localSettings, [field]: e.target.checked });
    };

    // Holiday Logic
    const clearHolidayInputs = () => {
        setNewHolidayDate('');
        setNewHolidayName('');
        setNewHolidayRecurring(false);
        setEditingHolidayIndex(null);
    };

    const handleSaveCustomHoliday = () => {
        if (!newHolidayDate || !newHolidayName) return;

        const holidayData: CustomHoliday = {
            date: newHolidayDate,
            name: newHolidayName,
            recurring: newHolidayRecurring
        };

        const currentHolidays = [...((localSettings.custom_holidays as CustomHoliday[]) || [])];

        if (editingHolidayIndex !== null) {
            currentHolidays[editingHolidayIndex] = holidayData;
            toast.success('Feriado atualizado!');
        } else {
            currentHolidays.push(holidayData);
            toast.success('Feriado adicionado!');
        }

        updateSettings({
            ...localSettings,
            custom_holidays: currentHolidays
        });

        clearHolidayInputs();
    };

    const handleEditCustomHoliday = (index: number) => {
        const holiday = (localSettings.custom_holidays as CustomHoliday[])[index];
        if (holiday) {
            setNewHolidayDate(holiday.date);
            setNewHolidayName(holiday.name);
            setNewHolidayRecurring(holiday.recurring || false);
            setEditingHolidayIndex(index);
        }
    };

    const removeCustomHoliday = async (index: number) => {
        const confirmDelete = await confirm({
            title: 'Excluir Feriado',
            message: 'Tem certeza que deseja excluir este feriado customizado?',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (!confirmDelete) return;

        const currentHolidays = [...((localSettings.custom_holidays as CustomHoliday[]) || [])];
        currentHolidays.splice(index, 1);

        updateSettings({
            ...localSettings,
            custom_holidays: currentHolidays
        });

        if (editingHolidayIndex === index) {
            clearHolidayInputs();
        }

        toast.success('Feriado removido.');
    };

    // Filter Logic
    const toggleFilter = (type: HolidayType) => {
        setSelectedFilters(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const toggleAllFilters = () => {
        if (selectedFilters.length === 4) {
            setSelectedFilters([]);
        } else {
            setSelectedFilters(['national', 'state', 'municipal', 'custom']);
        }
    };

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Esquerda: Configurações */}
                <div className="space-y-6">
                    <Card className="bg-[var(--ds-bg-base)] border-[var(--ds-border-default)] shadow-sm">
                        <CardHeader className="border-b border-[var(--ds-border-default)] pb-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg font-semibold text-[var(--ds-text-primary)] flex items-center gap-2">
                                <Clock className="w-5 h-5 text-[var(--ds-primary-500)]" />
                                Configurações de Calendário
                            </CardTitle>

                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <div className="flex items-center gap-1 mr-2 bg-[var(--ds-bg-surface)] p-1 rounded-lg border border-[var(--ds-border-default)]">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" onClick={handleUndo} disabled={!canUndo} className="h-7 w-7">
                                                        <Undo2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Desfazer (Ctrl+Z)</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" onClick={handleRedo} disabled={!canRedo} className="h-7 w-7">
                                                        <Redo2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Refazer (Ctrl+Y)</TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Button variant="ghost" onClick={handleExit} className="h-9">
                                            <X className="w-4 h-4 mr-2" /> Cancelar
                                        </Button>
                                        <Button onClick={handleSave} variant="primary" className="h-9">
                                            <Save className="w-4 h-4 mr-2" /> Salvar
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={handleEdit} variant="secondary" className="h-9">
                                        <Pencil className="w-4 h-4 mr-2" /> Editar Calendário
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-6 space-y-6">
                            {/* Padrão de Trabalho */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-[var(--ds-text-primary)] mb-2 block">Escala Semanal</Label>
                                    <select
                                        value={localSettings.work_schedule || 'mon-fri'}
                                        onChange={handleScheduleChange}
                                        disabled={!isEditing}
                                        className="w-full h-10 bg-[var(--ds-bg-base)] border border-[var(--ds-border-default)] rounded-md px-3 py-2 text-sm text-[var(--ds-text-primary)] focus:outline-none focus:border-[var(--ds-border-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="mon-fri">Segunda a Sexta</option>
                                        <option value="mon-sat">Segunda a Sábado</option>
                                        <option value="mon-sun">Segunda a Domingo</option>
                                    </select>
                                </div>

                                <div className="flex flex-row items-center gap-4 pt-8">
                                    <label className={`flex items-center gap-2 ${(localSettings.work_schedule || 'mon-fri') === 'mon-fri' ? 'opacity-50 cursor-not-allowed' : isEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.half_day_saturday || false}
                                            onChange={handleCheckboxChange('half_day_saturday')}
                                            disabled={!isEditing || (localSettings.work_schedule || 'mon-fri') === 'mon-fri'}
                                            className="w-4 h-4 rounded border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span className="text-[var(--ds-text-primary)] text-sm">Sábado Meio Período</span>
                                    </label>

                                    <label className={`flex items-center gap-2 ${(localSettings.work_schedule || 'mon-fri') !== 'mon-sun' ? 'opacity-50 cursor-not-allowed' : isEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.half_day_sunday || false}
                                            onChange={handleCheckboxChange('half_day_sunday')}
                                            disabled={!isEditing || (localSettings.work_schedule || 'mon-fri') !== 'mon-sun'}
                                            className="w-4 h-4 rounded border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-0 focus:ring-offset-0"
                                        />
                                        <span className="text-[var(--ds-text-primary)] text-sm">Domingo Meio Período</span>
                                    </label>
                                </div>
                            </div>

                            {/* Divisor */}
                            <div className="relative py-4 mt-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-[var(--ds-border-default)]" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[var(--ds-bg-base)] px-2 text-[var(--ds-text-secondary)] font-medium flex items-center gap-1">
                                        <PartyPopper className="w-3 h-3" /> Feriados Customizados
                                    </span>
                                </div>
                            </div>

                            {/* Feriados Customizados */}
                            <div className="space-y-6">
                                <div className="flex items-start gap-3 p-3 bg-[var(--ds-primary-bg)] border border-[var(--ds-primary-500)]/20 rounded-md">
                                    <Info className="w-5 h-5 text-[var(--ds-primary-500)] shrink-0 mt-0.5" />
                                    <p className="text-sm text-[var(--ds-text-secondary)]">
                                        Feriados estaduais e municipais (capitais) são incluídos automaticamente. Para outras cidades, adicione manualmente.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Data</Label>
                                            <Input
                                                type="date"
                                                value={newHolidayDate}
                                                onChange={(e) => setNewHolidayDate(e.target.value)}
                                                disabled={!isEditing}
                                                className="[color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nome do Feriado</Label>
                                            <Input
                                                type="text"
                                                value={newHolidayName}
                                                onChange={(e) => setNewHolidayName(e.target.value)}
                                                placeholder="Ex: Aniversário da Cidade"
                                                disabled={!isEditing}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className={`flex items-center gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={newHolidayRecurring}
                                                onChange={(e) => setNewHolidayRecurring(e.target.checked)}
                                                disabled={!isEditing}
                                                className="w-4 h-4 rounded border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] text-[var(--ds-primary-500)] focus:ring-0 focus:ring-offset-0"
                                            />
                                            <span className="text-[var(--ds-text-primary)] text-sm">Repetir Anualmente</span>
                                        </label>

                                        <div className="flex gap-2">
                                            {editingHolidayIndex !== null && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={clearHolidayInputs}
                                                >
                                                    Cancelar
                                                </Button>
                                            )}
                                            <Button
                                                onClick={handleSaveCustomHoliday}
                                                disabled={!isEditing || !newHolidayDate || !newHolidayName}
                                                variant="primary"
                                            >
                                                {editingHolidayIndex !== null ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" /> Adicionar
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {((localSettings.custom_holidays as CustomHoliday[]) || []).length === 0 ? (
                                        <div className="text-center py-8 border border-dashed border-[var(--ds-border-default)] rounded-md">
                                            <p className="text-[var(--ds-text-secondary)] text-sm">Nenhum feriado customizado adicionado.</p>
                                        </div>
                                    ) : (
                                        (localSettings.custom_holidays as CustomHoliday[]).map((h, idx) => (
                                            <div key={idx} className={`flex justify-between items-center bg-[var(--ds-bg-surface)] p-3 rounded border transition-colors group ${editingHolidayIndex === idx ? 'border-[var(--ds-primary-500)] bg-[var(--ds-primary-bg)]' : 'border-[var(--ds-border-default)] hover:border-[var(--ds-border-strong)]'}`}>
                                                <div className="flex flex-col">
                                                    <span className="text-[var(--ds-text-primary)] font-medium text-sm">{h.name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[var(--ds-text-secondary)] text-xs bg-[var(--ds-bg-base)] px-1.5 py-0.5 rounded border border-[var(--ds-border-default)]">
                                                            {new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                        </span>
                                                        {h.recurring && (
                                                            <span className="text-[var(--ds-primary-500)] text-xs bg-[var(--ds-primary-bg)] px-1.5 py-0.5 rounded border border-[var(--ds-primary-500)]/20">
                                                                Anual
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isEditing && (
                                                    <div className="flex items-center gap-1">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEditCustomHoliday(idx)}
                                                                    className="h-8 w-8"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="left">Editar</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeCustomHoliday(idx)}
                                                                    className="h-8 w-8 text-[var(--ds-error)] hover:bg-[var(--ds-error-bg)]"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="left">Remover</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Direita: Visualização */}
                <div className="h-full">
                    <Card className="bg-[var(--ds-bg-base)] border-[var(--ds-border-default)] shadow-sm h-full flex flex-col">
                        <CardHeader className="border-b border-[var(--ds-border-default)] pb-4 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-semibold text-[var(--ds-text-primary)] flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-[var(--ds-primary-500)]" />
                                    Calendário {viewYear}
                                </CardTitle>
                                <span className="text-xs font-normal text-[var(--ds-text-secondary)] bg-[var(--ds-bg-elevated)] px-2 py-0.5 rounded-full border border-[var(--ds-border-default)]">
                                    {displayedHolidays.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Filtro Dropdown */}
                                <div className="relative" ref={filterRef}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                                className={cn(
                                                    "h-8 px-3 text-xs font-medium border transition-colors",
                                                    isFilterOpen
                                                        ? "bg-[var(--ds-primary-bg)] border-[var(--ds-primary-500)] text-[var(--ds-primary-500)]"
                                                        : "bg-[var(--ds-bg-surface)] border-[var(--ds-border-default)] text-[var(--ds-text-secondary)]"
                                                )}
                                            >
                                                <Filter className="w-3.5 h-3.5 mr-2" />
                                                Filtros
                                                {selectedFilters.length < 4 && (
                                                    <span className="ml-2 bg-[var(--ds-primary-500)] text-white text-[10px] px-1.5 rounded-full">
                                                        {selectedFilters.length}
                                                    </span>
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Filtrar Feriados</TooltipContent>
                                    </Tooltip>

                                    {isFilterOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--ds-bg-base)] border border-[var(--ds-border-default)] rounded-md shadow-xl z-50 overflow-hidden">
                                            <div className="p-2 border-b border-[var(--ds-border-default)]">
                                                <div
                                                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--ds-bg-elevated)] rounded cursor-pointer"
                                                    onClick={toggleAllFilters}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedFilters.length === 4 ? 'bg-[var(--ds-primary-500)] border-[var(--ds-primary-500)]' : 'border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)]'}`}>
                                                        {selectedFilters.length === 4 && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="text-sm text-[var(--ds-text-primary)] font-medium">Todos os Feriados</span>
                                                </div>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {[
                                                    { id: 'national', label: 'Feriados Nacionais', color: 'text-green-500' },
                                                    { id: 'state', label: 'Feriados Regionais', color: 'text-blue-500' },
                                                    { id: 'municipal', label: 'Feriados Municipais', color: 'text-yellow-500' },
                                                    { id: 'custom', label: 'Feriados Customizados', color: 'text-purple-500' }
                                                ].map((type) => (
                                                    <div
                                                        key={type.id}
                                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--ds-bg-elevated)] rounded cursor-pointer"
                                                        onClick={() => toggleFilter(type.id as HolidayType)}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedFilters.includes(type.id as HolidayType) ? 'bg-[var(--ds-primary-500)] border-[var(--ds-primary-500)]' : 'border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)]'}`}>
                                                            {selectedFilters.includes(type.id as HolidayType) && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className={`text-sm ${selectedFilters.includes(type.id as HolidayType) ? 'text-[var(--ds-text-primary)]' : 'text-[var(--ds-text-secondary)]'}`}>
                                                            {type.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Navegação de Ano */}
                                <div className="flex items-center gap-1 bg-[var(--ds-bg-surface)] rounded-lg border border-[var(--ds-border-default)] p-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewYear(prev => prev - 1)}
                                        className="h-7 w-7"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-[var(--ds-text-primary)] font-mono font-medium text-sm min-w-[50px] text-center select-none">
                                        {viewYear}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewYear(prev => prev + 1)}
                                        className="h-7 w-7"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 flex-1 overflow-hidden flex flex-col">
                            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                                {displayedHolidays.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--ds-text-secondary)] gap-2 opacity-50">
                                        <CalendarIcon className="w-12 h-12" />
                                        <p className="text-sm">Nenhum feriado encontrado para este filtro.</p>
                                    </div>
                                ) : (
                                    displayedHolidays.map((h, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-[var(--ds-bg-surface)] p-3 rounded-lg border border-[var(--ds-border-default)] hover:border-[var(--ds-border-strong)] transition-colors group">
                                            <div className="flex flex-col items-center justify-center bg-[var(--ds-bg-base)] border border-[var(--ds-border-default)] rounded w-12 h-12 shrink-0 group-hover:border-[var(--ds-primary-500)]/50 transition-colors">
                                                <span className="text-[10px] text-[var(--ds-text-secondary)] uppercase font-bold">
                                                    {h.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                                </span>
                                                <span className="text-lg font-bold text-[var(--ds-text-primary)] leading-none">
                                                    {h.date.getDate()}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-[var(--ds-text-primary)] font-medium truncate">{h.name}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-[var(--ds-text-secondary)]">
                                                        {h.date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                                    </span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border ${h.type === 'national' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                        h.type === 'state' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                            h.type === 'municipal' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                                'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                        }`}>
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
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirm Dialog */}
            <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <DialogContent className="sm:max-w-[400px] bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] shadow-[var(--ds-shadow-2xl)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-[var(--ds-warning)]" />
                            {dialogState.title}
                        </DialogTitle>
                        <DialogDescription className="text-[var(--ds-text-secondary)] pt-2">
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={handleCancel}>{dialogState.cancelText || 'Cancelar'}</Button>
                        <Button variant="destructive" onClick={handleConfirm}>{dialogState.confirmText || 'Confirmar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};
