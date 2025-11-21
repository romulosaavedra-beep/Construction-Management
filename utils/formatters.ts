
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
    const date = new Date(dateStr + 'T00:00:00'); // Ensure correct timezone interpretation
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

// Configuração padrão (pode ser substituída pelo que vem do Settings)
export interface WorkScheduleConfig {
    scheduleType: string; // 'mon_fri', 'mon_sat_half', etc.
    workOnHolidays: boolean;
    workOnRegionalHolidays?: boolean;
    city?: string;
    state?: string;
}

// Feriados Nacionais Fixos (Brasil) - Mês/Dia
const FIXED_HOLIDAYS = [
    '01-01', // Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência do Brasil
    '10-12', // Nossa Senhora Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '12-25', // Natal
];

// Mapeamento dos dias da semana trabalhados (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
const SCHEDULE_DAYS_MAP: { [key: string]: number[] } = {
    'mon_fri': [1, 2, 3, 4, 5],
    'mon_sat_half': [1, 2, 3, 4, 5, 6],
    'mon_sat_full': [1, 2, 3, 4, 5, 6],
    'mon_sun_half_sat_sun': [0, 1, 2, 3, 4, 5, 6],
    'mon_sun_full': [0, 1, 2, 3, 4, 5, 6], // Antigo, mantido por compatibilidade
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
    
    // Verifica se é dia da semana de trabalho
    if (!allowedDays.includes(dayOfWeek)) return false;

    // Verifica feriado nacional
    if (!config.workOnHolidays && isHoliday(date)) {
        return false;
    }

    // Verifica feriado regional (se houver cidade configurada e a opção estiver desmarcada)
    // A opção workOnRegionalHolidays: true significa que TRABALHA no feriado.
    // Se for false (padrão), NÃO trabalha.
    if (config.city && !config.workOnRegionalHolidays && isRegionalHoliday(date, config.city)) {
        return false;
    }

    return true;
}

export function addWorkingDays(startDateStr: string, durationDays: number, config: WorkScheduleConfig): string {
    if (!startDateStr) return '';
    if (durationDays <= 0) return startDateStr;

    let currentDate = new Date(startDateStr + 'T00:00:00');
    
    // O primeiro dia conta? Em cronogramas, geralmente:
    // Início: Dia 1, Duração: 1 dia -> Fim: Dia 1.
    // Então, se duração é 1, não adicionamos dias, a data fim é igual a data início.
    // O loop abaixo adiciona dias "extras" para chegar à data final.
    // Ex: Dur 1 -> loop 0 vezes. Dur 2 -> loop 1 vez.
    
    let remainingDuration = Math.max(0, Math.ceil(durationDays) - 1);

    // Se o dia de início não for útil, avançamos para o próximo útil antes de começar a contar
    while (!isWorkingDay(currentDate, config)) {
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // const finalStartDate = currentDate.toISOString().split('T')[0]; 

    while (remainingDuration > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        if (isWorkingDay(currentDate, config)) {
            remainingDuration--;
        }
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
        if (isWorkingDay(current, config)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count > 0 ? count : 0;
}
