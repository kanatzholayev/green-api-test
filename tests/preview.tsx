// Development-only browser fixture. Not included in the production entry/build.
import type { Notification } from '../src/shared/api/types';

const queue: Notification[] = [];
let nextReceipt = 1;
let nextMessage = 1;
window.fetch = async (input, init) => {
  const url = new URL(String(input));
  const method = url.pathname.split('/')[2];
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { 'Content-Type': 'application/json' } });
  switch (method) {
    case 'getStateInstance': {
      return json({ stateInstance: 'authorized' });
    }
    case 'getSettings': {
      return json({ typeInstance: 'telegram', incomingWebhook: 'yes', webhookUrl: '' });
    }
    case 'checkAccount': {
      return json({ exist: true, chatId: '10000000' });
    }
    case 'sendMessage': {
      const body = JSON.parse(String(init?.body));
      const idMessage = String(nextMessage++);
      setTimeout(() => {
        queue.push({
          receiptId: nextReceipt++,
          body: {
            typeWebhook: 'incomingMessageReceived',
            senderData: { chatId: body.chatId, senderName: 'Анна' },
            idMessage: `reply-${idMessage}`,
            timestamp: Math.floor(Date.now() / 1000),
            messageData: {
              typeMessage: 'textMessage',
              textMessageData: { textMessage: 'Привет! Да, сообщение получила. Всё работает 👋' },
            },
          },
        });
      }, 500);
      return json({ idMessage });
    }
    case 'receiveNotification': {
      await new Promise<void>(resolve => {
        const signal = init?.signal;
        const done = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', done);
          resolve();
        };
        const timer = setTimeout(done, 500);
        if (signal?.aborted) done();
        else signal?.addEventListener('abort', done, { once: true });
      });
      return json(queue[0] ?? null);
    }
    case 'deleteNotification': {
      queue.shift();
      return json({ result: true });
    }
    default: {
      return json({}, 404);
    }
  }
};
await import('../src/app/main');
