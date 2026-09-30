import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../src/pages/chat/ui/ChatPage';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = () => {};
      unobserve = () => {};
      disconnect = () => {};
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('connects, creates a phone chat, sends text and renders the incoming reply in that chat', async () => {
  const nativeComputedStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => nativeComputedStyle(element));
  const user = userEvent.setup();
  const requests: string[] = [];
  let sent = false;
  let acknowledged = false;
  const controllerSignals: AbortSignal[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = new URL(url).pathname.split('/')[2];
      requests.push(method);
      const json = (value: unknown) => Response.json(value);
      if (method === 'getStateInstance') return json({ stateInstance: 'authorized' });
      if (method === 'getSettings')
        return json({ typeInstance: 'telegram', incomingWebhook: 'yes', webhookUrl: '' });
      if (method === 'checkAccount') {
        expect(JSON.parse(String(init?.body))).toEqual({ phoneNumber: 79_991_234_567 });
        return json({ exist: true, chatId: '10000000' });
      }
      if (method === 'sendMessage') {
        expect(JSON.parse(String(init?.body))).toEqual({
          chatId: '10000000',
          message: 'Привет, Анна!',
        });
        sent = true;
        return json({ idMessage: 'sent-1' });
      }
      if (method === 'deleteNotification') {
        acknowledged = true;
        return json({ result: true });
      }
      if (method === 'receiveNotification') {
        if (init?.signal) controllerSignals.push(init.signal);
        if (sent && !acknowledged)
          return json({
            receiptId: 9,
            body: {
              typeWebhook: 'incomingMessageReceived',
              idMessage: 'reply-1',
              timestamp: Math.floor(Date.now() / 1000),
              senderData: { chatId: '10000000', senderName: 'Анна' },
              messageData: {
                typeMessage: 'textMessage',
                textMessageData: { textMessage: 'Привет! Получила.' },
              },
            },
          });
        return json(null);
      }
      throw new Error(`Unexpected method: ${method}`);
    }),
  );
  render(<ChatPage />);
  await user.type(screen.getByLabelText('ID инстанса'), '41001234');
  await user.type(screen.getByLabelText('API-токен'), 'test-token');
  await user.type(screen.getByLabelText('Адрес API'), 'https://4100.api.green-api.com');
  await user.click(screen.getByRole('button', { name: /Подключиться/ }));
  await user.click(await screen.findByRole('button', { name: 'Новый чат' }));
  await user.type(screen.getByLabelText('Номер телефона'), '+7 999 123 45 67');
  await user.click(screen.getByRole('button', { name: 'Создать чат' }));
  const composer = await screen.findByRole('textbox', { name: 'Текст сообщения' });
  await user.type(composer, 'Привет, Анна!{Enter}');
  const log = screen.getByRole('log', { name: 'Сообщения' });
  await waitFor(() => expect(log.textContent).toContain('Привет! Получила.'));
  expect(log.textContent).toContain('Привет, Анна!');
  expect(log.textContent!.indexOf('Привет, Анна!')).toBeLessThan(
    log.textContent!.indexOf('Привет! Получила.'),
  );
  expect(screen.getByRole('option', { name: /\+7 999 123 45 67/ })).toBeTruthy();
  await waitFor(() => expect(acknowledged).toBe(true));
  expect(requests).toContain('deleteNotification');
  await user.click(screen.getByRole('button', { name: 'Выйти' }));
  await user.click(
    within(await screen.findByRole('dialog', { name: 'Выйти?' })).getByRole('button', {
      name: 'Выйти',
    }),
  );
  expect(await screen.findByRole('heading', { name: 'Подключение' })).toBeTruthy();
  expect(controllerSignals.every(signal => signal.aborted)).toBe(true);
});
