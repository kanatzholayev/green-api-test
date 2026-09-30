import { describe, expect, it } from 'vitest';
import { chatReducer, initialChatState } from '../src/entities/chat/model/reducer';
import { parseNotification } from '../src/entities/chat/model/notification';
import type { ChatEvent } from '../src/entities/chat/model/types';
import { normalizePhone } from '../src/shared/lib/phone';

const incoming = (id = 'remote-1'): ChatEvent => ({ type: 'message-added', chatId: '12345', title: 'Анна', message: { id, remoteId: id, text: 'Привет', timestamp: 1000, direction: 'incoming' } });

describe('chat state', () => {
  it('deduplicates notifications after a failed acknowledgement', () => {
    const state = chatReducer(initialChatState, incoming());
    expect(chatReducer(state, incoming())).toBe(state);
    expect(state.chats[0].unread).toBe(1);
  });
  it('merges phone-created and notification-created chats by the actual chat ID', () => {
    const state = chatReducer(chatReducer(initialChatState, incoming()), { type: 'chat-created', id: '12345', phone: '79991234567' });
    expect(state.chats).toHaveLength(1);
    expect(state.chats[0].messages).toHaveLength(1);
    expect(state.chats[0].unread).toBe(0);
    expect(state.activeChatId).toBe('12345');
  });
  it('only counts unread messages outside the selected chat', () => {
    const state = chatReducer(chatReducer(initialChatState, { type: 'chat-created', id: '12345', phone: '79991234567' }), incoming());
    expect(state.chats[0].unread).toBe(0);
    const next = chatReducer(chatReducer(state, { type: 'chat-selected', id: null }), incoming('remote-2'));
    expect(next.chats[0].unread).toBe(1);
    expect(chatReducer(next, { type: 'chat-selected', id: '12345' }).chats[0].unread).toBe(0);
  });
  it('keeps read status when older delivery events arrive', () => {
    const state = chatReducer(initialChatState, { type: 'message-added', chatId: '1', message: { id: 'local', remoteId: 'remote', text: 'Test', direction: 'outgoing', timestamp: 1, status: 'read' } });
    const result = chatReducer(state, { type: 'message-status', chatId: '1', remoteId: 'remote', status: 'delivered' });
    expect(result.chats[0].messages[0].status).toBe('read');
  });
  it('shows a delivery failure after API accepted the message', () => {
    const state = chatReducer(initialChatState, { type: 'message-added', chatId: '1', message: { id: 'local', remoteId: 'remote', text: 'Test', direction: 'outgoing', timestamp: 1, status: 'sent' } });
    expect(chatReducer(state, { type: 'message-status', chatId: '1', remoteId: 'remote', status: 'failed' }).chats[0].messages[0].status).toBe('failed');
  });
});

describe('Telegram notifications', () => {
  const base = { typeWebhook: 'incomingMessageReceived', idMessage: '123', timestamp: 1763115112, senderData: { chatId: '10000000', senderName: 'Анна' } };
  it('parses plain and extended text without rendering HTML', () => {
    for (const messageData of [
      { typeMessage: 'textMessage', textMessageData: { textMessage: '<b>Привет</b>' } },
      { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: '<b>Привет</b>' } },
    ]) {
      expect(parseNotification({ ...base, messageData })).toMatchObject({ type: 'message-added', chatId: '10000000', message: { text: '<b>Привет</b>', timestamp: 1763115112000 } });
    }
  });
  it('ignores media, groups, and unknown events', () => {
    expect(parseNotification({ ...base, messageData: { typeMessage: 'imageMessage' } })).toBeNull();
    expect(parseNotification({ ...base, senderData: { chatId: '-100123' }, messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Группа' } } })).toBeNull();
    expect(parseNotification(null)).toBeNull();
  });
});

describe('phone input', () => {
  it('accepts international numbers and rejects ambiguous input', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
    expect(normalizePhone('+375 29 123 45 67')).toBe('375291234567');
    expect(() => normalizePhone('abc79991234567')).toThrow();
    expect(() => normalizePhone('0123456789')).toThrow();
  });
});
