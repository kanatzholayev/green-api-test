import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGreenApi, GreenApiError, normalizeApiUrl } from '../src/shared/api/green-api';
import { pollNotifications } from '../src/features/receive-messages/model/poll-notifications';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const credentials = { apiUrl: 'https://4100.api.green-api.com', idInstance: '41001234', apiTokenInstance: 'test-token' };

describe('GREEN-API client', () => {
  it('uses Telegram method paths and original chat IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ idMessage: '1' })));
    vi.stubGlobal('fetch', fetchMock);
    await createGreenApi(credentials).sendMessage('10000000', 'Привет');
    expect(fetchMock).toHaveBeenCalledWith('https://4100.api.green-api.com/waInstance41001234/sendMessage/test-token', expect.objectContaining({ method: 'POST', body: JSON.stringify({ chatId: '10000000', message: 'Привет' }) }));
  });
  it('supports a genuinely empty notification response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    expect(await createGreenApi(credentials).receiveNotification(new AbortController().signal)).toBeNull();
  });
  it('does not leak API credentials or response bodies into error messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret-token', { status: 401 })));
    await expect(createGreenApi(credentials).getState()).rejects.toBeInstanceOf(GreenApiError);
    await expect(createGreenApi(credentials).getState()).rejects.not.toThrow('secret-token');
  });
  it('rejects token exfiltration via a custom API hostname', () => {
    expect(normalizeApiUrl('https://4100.api.green-api.com/')).toBe(credentials.apiUrl);
    for (const url of ['https://green-api.com.evil.test', 'http://4100.api.green-api.com', 'https://user@4100.api.green-api.com', 'https://4100.api.green-api.com/path']) expect(() => normalizeApiUrl(url)).toThrow();
  });
});

describe('notification queue', () => {
  it('retries acknowledgement before receiving another event and processes once', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const receiveNotification = vi.fn().mockResolvedValue({ receiptId: 7, body: {} });
    const deleteNotification = vi.fn().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(async () => { controller.abort(); return { result: true }; });
    const processed = vi.fn();
    const running = pollNotifications({ receiveNotification, deleteNotification }, controller.signal, processed, vi.fn());
    await vi.advanceTimersByTimeAsync(1000);
    await running;
    expect(receiveNotification).toHaveBeenCalledTimes(1);
    expect(processed).toHaveBeenCalledTimes(1);
    expect(deleteNotification).toHaveBeenCalledTimes(2);
  });
  it('stops on invalid credentials instead of retrying forever', async () => {
    const state = vi.fn();
    const receiveNotification = vi.fn().mockRejectedValue(new GreenApiError('Неверный токен', 401));
    await pollNotifications({ receiveNotification, deleteNotification: vi.fn() }, new AbortController().signal, vi.fn(), state);
    expect(state).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'stopped' }));
    expect(receiveNotification).toHaveBeenCalledTimes(1);
  });
  it('does not process a receive response after logout', async () => {
    const controller = new AbortController();
    const processed = vi.fn();
    await pollNotifications({ receiveNotification: async () => { controller.abort(); return { receiptId: 1, body: {} }; }, deleteNotification: vi.fn() }, controller.signal, processed, vi.fn());
    expect(processed).not.toHaveBeenCalled();
  });
});
