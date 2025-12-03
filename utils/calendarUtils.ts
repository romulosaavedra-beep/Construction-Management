import holidays from 'holidays-calendar-brazil';
import { CalendarConfig, HolidayInfo, WorkDayInfo } from '@/types/calendar.ts';
import { STATE_HOLIDAYS, MUNICIPAL_HOLIDAYS } from '@/data/regionalHolidays.ts';

// Helper to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const getHolidaysForYear = async (year: number, state?: string, city?: string): Promise<HolidayInfo[]> => {
    const holidayList: HolidayInfo[] = [];

    // 1. National Holidays from library
    try {
        const data = holidays.Year(year);
        if (data && data.months) {
            // data.months is an array of month numbers (1-12)
            const months = data.months as unknown as number[];

            for (const month of months) {
                const monthData = holidays.Month(year, month);
                if (monthData && monthData.days) {
                    // monthData.days is an array of day numbers
                    const days = monthData.days as unknown as number[];

                    for (const day of days) {
                        const name = holidays.Day(year, month, day);
                        if (name) {
                            holidayList.push({
                                date: new Date(year, month - 1, day),
                                name: name as string,
                                type: 'national'
                            });
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error fetching national holidays:", e);
    }

    // 2. State Holidays
    if (state && STATE_HOLIDAYS[state]) {
        STATE_HOLIDAYS[state].forEach(h => {
            const [month, day] = h.date.split('-').map(Number);
            holidayList.push({
                date: new Date(year, month - 1, day),
                name: h.name,
                type: 'state'
            });
        });
    }

    // 3. Municipal Holidays (Capitals)
    if (city && state) {
        const key = `${city}-${state}`;
        if (MUNICIPAL_HOLIDAYS[key]) {
            MUNICIPAL_HOLIDAYS[key].forEach(h => {
                const [month, day] = h.date.split('-').map(Number);
                holidayList.push({
                    date: new Date(year, month - 1, day),
                    name: h.name,
                    type: 'municipal'
                });
            });
        }
    }

    return holidayList.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const isWorkDay = async (date: Date, config: CalendarConfig, city?: string, state?: string): Promise<WorkDayInfo> => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    const dateStr = formatDate(date);

    // Check Custom Holidays
    const customHoliday = config.customHolidays.find(h => {
        if (h.recurring) {
            return h.date.slice(5) === dateStr.slice(5);
        }
        return h.date === dateStr;
    });

    if (customHoliday) {
        return {
            date,
            isWorkDay: false,
            isHalfDay: false,
            isHoliday: true,
            holidayName: customHoliday.name,
            dayOfWeek
        };
    }

    // Check National/Regional Holidays
    const holidaysList = await getHolidaysForYear(year, state, city);
    const holiday = holidaysList.find(h =>
        h.date.getDate() === day &&
        h.date.getMonth() === month &&
        h.date.getFullYear() === year
    );

    if (holiday) {
        return {
            date,
            isWorkDay: false,
            isHalfDay: false,
            isHoliday: true,
            holidayName: holiday.name,
            dayOfWeek
        };
    }

    // Check Schedule
    let isWorkDay = true;
    let isHalfDay = false;

    if (dayOfWeek === 0) { // Sunday
        if (config.workSchedule === 'mon-sun') {
            isWorkDay = true;
            if (config.halfDaySunday) {
                isHalfDay = true;
            }
        } else {
            isWorkDay = false;
        }
    } else if (dayOfWeek === 6) { // Saturday
        if (config.workSchedule === 'mon-fri') {
            isWorkDay = false;
        } else {
            // mon-sat, mon-sun...
            isWorkDay = true;
            if (config.halfDaySaturday) {
                isHalfDay = true;
            }
        }
    }

    return {
        date,
        isWorkDay,
        isHalfDay,
        isHoliday: false,
        dayOfWeek
    };
};

export const calculateWorkDays = async (startDate: Date, endDate: Date, config: CalendarConfig, city?: string, state?: string): Promise<number> => {
    let count = 0;
    const curDate = new Date(startDate);
    const end = new Date(endDate);

    // Normalize times to avoid infinite loops or partial days issues
    curDate.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (curDate <= end) {
        const info = await isWorkDay(curDate, config, city, state);
        if (info.isWorkDay) {
            count += info.isHalfDay ? 0.5 : 1;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

export const addWorkDays = async (startDate: Date, days: number, config: CalendarConfig, city?: string, state?: string): Promise<Date> => {
    const curDate = new Date(startDate);
    curDate.setHours(0, 0, 0, 0);

    let daysAdded = 0;

    // Safety break to avoid infinite loop
    let safety = 0;
    const MAX_ITERATIONS = 365 * 10;

    while (daysAdded < days && safety < MAX_ITERATIONS) {
        curDate.setDate(curDate.getDate() + 1);
        const info = await isWorkDay(curDate, config, city, state);
        if (info.isWorkDay) {
            daysAdded += info.isHalfDay ? 0.5 : 1;
        }
        safety++;
    }

    return curDate;
};

export const getWorkDaysBetween = async (start: Date, end: Date, config: CalendarConfig, city?: string, state?: string): Promise<Date[]> => {
    const days: Date[] = [];
    const curDate = new Date(start);
    const endDate = new Date(end);

    curDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    while (curDate <= endDate) {
        const info = await isWorkDay(curDate, config, city, state);
        if (info.isWorkDay) {
            days.push(new Date(curDate));
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return days;
};
