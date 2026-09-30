import type { ChatEvent, MessageStatus } from './types';

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};

export const parseNotification = (value: unknown): ChatEvent | null => {
  const body = record(value);
  const sender = record(body.senderData);
  const data = record(body.messageData);
  const chatId = typeof sender.chatId === 'string' ? sender.chatId : '';
  // Telegram groups use negative identifiers; this UI only supports private conversations.
  if (chatId.startsWith('-') || chatId.endsWith('@g.us')) return null;
  if (chatId && body.typeWebhook === 'incomingMessageReceived' && typeof body.idMessage === 'string') {
    const text = data.typeMessage === 'textMessage'
      ? record(data.textMessageData).textMessage
      : (data.typeMessage === 'extendedTextMessage'
        ? record(data.extendedTextMessageData).text : undefined);
    if (typeof text !== 'string') return null;
    return {
      type: 'message-added', chatId,
      title: typeof sender.senderName === 'string' ? sender.senderName : chatId,
      message: {
        id: body.idMessage, remoteId: body.idMessage, text, direction: 'incoming',
        timestamp: typeof body.timestamp === 'number' ? body.timestamp * 1000 : Date.now(),
      },
    };
  }
  if (body.typeWebhook === 'outgoingMessageStatus' && typeof body.chatId === 'string' && typeof body.idMessage === 'string') {
    const statuses: Record<string, MessageStatus> = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed', noAccount: 'failed' };
    const status = typeof body.status === 'string' ? statuses[body.status] : undefined;
    if (status) return { type: 'message-status', chatId: body.chatId, remoteId: body.idMessage, status };
  }
  return null;
};
