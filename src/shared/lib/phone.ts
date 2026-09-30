export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) throw new Error('Введите номер телефона с кодом страны.');
  const digits = trimmed.replace(/\D/g, '');
  if (!/^[1-9]\d{6,14}$/.test(digits)) throw new Error('Номер должен содержать от 7 до 15 цифр и код страны.');
  return digits;
}

export function displayPhone(phone: string): string {
  if (/^7\d{10}$/.test(phone)) return `+${phone[0]} ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
  return `+${phone}`;
}
