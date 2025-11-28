import { useState, useEffect, useCallback } from 'react';
import { useSettings } from './useSettings.ts';
import { CalendarConfig, HolidayInfo, WorkSchedule, CustomHoliday } from '../types/calendar.ts';
import { getHolidaysForYear, isWorkDay, calculateWorkDays, addWorkDays, getWorkDaysBetween } from '../utils/calendarUtils.ts';

export const useCalendar = (projectId?: string) => {
    const { settings, loading: settingsLoading } = useSettings(projectId);
    const [config, setConfig] = useState<CalendarConfig | null>(null);
    const [holidays, setHolidays] = useState<HolidayInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!settingsLoading && settings) {
            const newConfig: CalendarConfig = {
                workSchedule: (settings.work_schedule as WorkSchedule) || 'mon-fri',
                halfDaySaturday: settings.half_day_saturday || false,
                halfDaySunday: settings.half_day_sunday || false,
                customHolidays: (settings.custom_holidays as CustomHoliday[]) || []
            };
            setConfig(newConfig);
            setLoading(false);
        }
    }, [settings, settingsLoading]);

    const fetchHolidays = useCallback(async (year: number) => {
        if (!config) return [];
        // Use city/state from settings if available
        const city = settings.cidade;
        const state = settings.estado;
        const fetchedHolidays = await getHolidaysForYear(year, state, city);

        // Merge with custom holidays for that year
        const customHolidaysForYear = config.customHolidays.filter(h => {
            const hYear = parseInt(h.date.split('-')[0]);
            return h.recurring || hYear === year;
        }).map(h => ({
            date: new Date(h.recurring ? `${year}-${h.date.split('-')[1]}-${h.date.split('-')[2]}` : h.date),
            name: h.name,
            type: 'custom' as const
        }));

        // Combine and sort
        const allHolidays = [...fetchedHolidays, ...customHolidaysForYear].sort((a, b) => a.date.getTime() - b.date.getTime());
        setHolidays(allHolidays);
        return allHolidays;
    }, [config, settings.cidade, settings.estado]);

    // Wrapper functions that use the current config
    const checkIsWorkDay = useCallback(async (date: Date) => {
        if (!config) return { date, isWorkDay: true, isHalfDay: false, isHoliday: false, dayOfWeek: date.getDay() };
        return isWorkDay(date, config, settings.cidade, settings.estado);
    }, [config, settings.cidade, settings.estado]);

    const calcWorkDays = useCallback(async (start: Date, end: Date) => {
        if (!config) return 0;
        return calculateWorkDays(start, end, config, settings.cidade, settings.estado);
    }, [config, settings.cidade, settings.estado]);

    const addDays = useCallback(async (start: Date, days: number) => {
        if (!config) return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        return addWorkDays(start, days, config, settings.cidade, settings.estado);
    }, [config, settings.cidade, settings.estado]);

    const getDaysBetween = useCallback(async (start: Date, end: Date) => {
        if (!config) return [];
        return getWorkDaysBetween(start, end, config, settings.cidade, settings.estado);
    }, [config, settings.cidade, settings.estado]);

    return {
        config,
        holidays,
        loading: loading || settingsLoading,
        fetchHolidays,
        isWorkDay: checkIsWorkDay,
        calculateWorkDays: calcWorkDays,
        addWorkDays: addDays,
        getWorkDaysBetween: getDaysBetween
    };
};
