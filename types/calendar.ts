export type WorkSchedule = 'mon-fri' | 'mon-sat' | 'mon-sun';

export interface CustomHoliday {
    date: string; // Format: "YYYY-MM-DD"
    name: string;
    recurring?: boolean; // Se repete anualmente
}

export interface CalendarConfig {
    workSchedule: WorkSchedule;
    halfDaySaturday: boolean;
    halfDaySunday: boolean;
    customHolidays: CustomHoliday[];
}

export interface HolidayInfo {
    date: Date;
    name: string;
    type: 'national' | 'state' | 'municipal' | 'custom';
}

export interface WorkDayInfo {
    date: Date;
    isWorkDay: boolean;
    isHalfDay: boolean;
    isHoliday: boolean;
    holidayName?: string;
    dayOfWeek: number; // 0 = Domingo, 6 = Sábado
}
