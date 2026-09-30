import type { GreenApiCredentials, InstanceSettings, Notification } from './types';

export class GreenApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'GreenApiError';
  }
}

export const normalizeApiUrl = (value: string): string => {
  const url = new URL(value.trim());
  if (
    url.protocol !== 'https:' ||
    !/^([a-z0-9-]+\.)*green-api\.com$/i.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error('Укажите HTTPS-адрес API из кабинета GREEN-API, без пути и параметров.');
  }
  return url.origin;
};

export const errorMessage = (error: unknown): string => {
  if (error instanceof GreenApiError) return error.message;
  if (error instanceof TypeError)
    return 'Не удалось связаться с GREEN-API. Проверьте интернет и адрес API.';
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
};

export const createGreenApi = (credentials: GreenApiCredentials) => {
  const origin = normalizeApiUrl(credentials.apiUrl);
  const base = `${origin}/waInstance${encodeURIComponent(credentials.idInstance)}`;

  const request = async <T>(
    method: string,
    options: {
      verb?: 'GET' | 'POST' | 'DELETE';
      body?: unknown;
      signal?: AbortSignal;
      suffix?: string;
      timeout?: number;
    } = {},
  ): Promise<T> => {
    const url = `${base}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}${options.suffix ?? ''}`;
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(options.timeout ?? 20_000)])
      : AbortSignal.timeout(options.timeout ?? 20_000);
    const response = await fetch(url, {
      method: options.verb ?? 'GET',
      signal,
      ...(options.body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options.body),
      }),
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'GREEN-API отклонил запрос. Проверьте данные получателя и настройки инстанса.',
        401: 'Неверный ID инстанса или API-токен. Подключитесь заново.',
        403: 'Нет доступа к инстансу. Проверьте API-токен и тариф GREEN-API.',
        404: 'Инстанс или метод не найден. Проверьте ID и адрес Telegram API.',
        429: 'Превышен лимит запросов GREEN-API. Подождите немного.',
        469: 'Telegram временно ограничил поиск аккаунтов. Попробуйте позже.',
      };
      throw new GreenApiError(
        messages[response.status] ?? `Ошибка GREEN-API (${response.status}). Попробуйте позже.`,
        response.status,
      );
    }
    const raw = await response.text();
    return (raw ? JSON.parse(raw) : null) as T;
  };

  return {
    getState: () => request<{ stateInstance: string }>('getStateInstance'),
    getSettings: () => request<InstanceSettings>('getSettings'),
    enableReceiving: () =>
      request<{ saveSettings: boolean }>('setSettings', {
        verb: 'POST',
        body: { incomingWebhook: 'yes', webhookUrl: '' },
      }),
    checkAccount: (phone: string) =>
      request<{
        exist?: boolean;
        chatId?: string;
        status?: boolean;
        reason?: string;
        data?: { reason?: string };
      }>('checkAccount', {
        verb: 'POST',
        body: { phoneNumber: Number(phone) },
      }),
    sendMessage: (chatId: string, message: string) =>
      request<{ idMessage: string }>('sendMessage', {
        verb: 'POST',
        body: { chatId, message },
      }),
    receiveNotification: (signal: AbortSignal) =>
      request<Notification | null>('receiveNotification', {
        signal,
        suffix: '?receiveTimeout=20',
        timeout: 30_000,
      }),
    deleteNotification: (receiptId: number, signal: AbortSignal) =>
      request<{ result: boolean }>('deleteNotification', {
        verb: 'DELETE',
        suffix: `/${receiptId}`,
        signal,
      }),
  };
};

export type GreenApi = ReturnType<typeof createGreenApi>;
