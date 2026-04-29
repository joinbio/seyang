export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateShort(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatWeekRange(monday: Date): string {
  const sat = new Date(monday);
  sat.setDate(monday.getDate() + 5);
  return `${formatDateShort(monday)} ~ ${formatDateShort(sat)}`;
}

export function getWeekKey(monday: Date): string {
  const year = monday.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((monday.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export const WEEKDAY_KOR = ['월', '화', '수', '목', '금', '토'];
