const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

export const formatTime = (timestamp: number) => timeFormatter.format(timestamp);
export const dayKey = (timestamp: number) => new Date(timestamp).toDateString();
export const formatDay = (timestamp: number): string =>
  dayKey(timestamp) === dayKey(Date.now()) ? 'Сегодня' : dayFormatter.format(timestamp);
