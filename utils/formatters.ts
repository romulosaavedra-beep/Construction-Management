
import { regionalHolidaysMock } from '../data/mockData';

export function formatCurrency(value: number): string {
    if (isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

export function formatDate(dateStr: string): string {
    if (!dateStr || !dateStr.includes('-')) return 'N/A';
    try {
        const date = new Date(dateStr + 'T00:00:00');
        return new Intl.DateTimeFormat('pt-BR').format(date);
    } catch (error) {
        const [year, month, day] = dateStr.split('-');
        if (day && month && year) {
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    }
}

export function getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
}

// --- Lógica de Calendário e Dias Úteis ---

export interface WorkScheduleConfig {
    scheduleType: string;
    workOnHolidays: boolean;
    workOnRegionalHolidays?: boolean;
    city?: string;
    state?: string;
}

const FIXED_HOLIDAYS = [
    '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
];

const SCHEDULE_DAYS_MAP: { [key: string]: number[] } = {
    'mon_fri': [1, 2, 3, 4, 5],
    'mon_sat_half': [1, 2, 3, 4, 5, 6],
    'mon_sat_full': [1, 2, 3, 4, 5, 6],
    'mon_sun_half_sat_sun': [0, 1, 2, 3, 4, 5, 6],
    'mon_sun_full': [0, 1, 2, 3, 4, 5, 6],
    'mon_sun_half_sun': [0, 1, 2, 3, 4, 5, 6],
    'mon_sun_full_sun': [0, 1, 2, 3, 4, 5, 6]
};

function isHoliday(date: Date): boolean {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const mmdd = `${month}-${day}`;
    return FIXED_HOLIDAYS.includes(mmdd);
}

function isRegionalHoliday(date: Date, city: string): boolean {
    if (!city || !regionalHolidaysMock[city]) return false;
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const mmdd = `${month}-${day}`;
    return regionalHolidaysMock[city].includes(mmdd);
}

export function isWorkingDay(date: Date, config: WorkScheduleConfig): boolean {
    const dayOfWeek = date.getDay();
    const allowedDays = SCHEDULE_DAYS_MAP[config.scheduleType] || SCHEDULE_DAYS_MAP['mon_fri'];
    if (!allowedDays.includes(dayOfWeek)) return false;
    if (!config.workOnHolidays && isHoliday(date)) return false;
    if (config.city && !config.workOnRegionalHolidays && isRegionalHoliday(date, config.city)) return false;
    return true;
}

export function addWorkingDays(startDateStr: string, durationDays: number, config: WorkScheduleConfig): string {
    if (!startDateStr) return '';
    if (durationDays <= 0) return startDateStr;
    let currentDate = new Date(startDateStr + 'T00:00:00');
    let remainingDuration = Math.max(0, Math.ceil(durationDays) - 1);
    while (!isWorkingDay(currentDate, config)) {
        currentDate.setDate(currentDate.getDate() + 1);
    }
    while (remainingDuration > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (isWorkingDay(currentDate, config)) remainingDuration--;
    }
    return currentDate.toISOString().split('T')[0];
}

export function calculateDurationInWorkingDays(startDateStr: string, endDateStr: string, config: WorkScheduleConfig): number {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    if (end < start) return 0;
    let count = 0;
    let current = new Date(start);
    while (current <= end) {
        if (isWorkingDay(current, config)) count++;
        current.setDate(current.getDate() + 1);
    }
    return count > 0 ? count : 0;
}

export const maskMobilePhone = (value: string)

    : string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
        return cleaned.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    }
    return cleaned.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
};

/**
 * Masks a string as CNPJ or CPF based on length
 * CPF: 999.999.999-99
 * CNPJ: 99.999.999/9999-99
 */
export const maskCNPJCPF = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
        // CPF: 999.999.999-99
        return cleaned
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        // CNPJ: 99.999.999/9999-99
        return cleaned
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    }
};
