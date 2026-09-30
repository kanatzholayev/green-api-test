import { displayPhone } from '../../../shared/lib/phone';
import type { ChatEvent, ChatState } from './types';

export const initialChatState: ChatState = { chats: [], activeChatId: null };

export function chatReducer(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case 'chat-created': {
      const existing = state.chats.find(chat => chat.id === event.id);
      const chats = existing
        ? state.chats.map(chat => chat.id === event.id ? { ...chat, phone: event.phone, unread: 0 } : chat)
        : [...state.chats, { id: event.id, title: displayPhone(event.phone), phone: event.phone, unread: 0, messages: [] }];
      return { chats, activeChatId: event.id };
    }
    case 'chat-selected': {
      return { activeChatId: event.id, chats: state.chats.map(chat => chat.id === event.id ? { ...chat, unread: 0 } : chat) };
    }
    case 'message-added': {
      const existing = state.chats.find(chat => chat.id === event.chatId);
      if (existing?.messages.some(message => message.id === event.message.id
        || (event.message.remoteId && message.remoteId === event.message.remoteId))) return state;
      const unread = event.message.direction === 'incoming' && state.activeChatId !== event.chatId ? 1 : 0;
      const chat = existing
        ? { ...existing, messages: [...existing.messages, event.message], unread: existing.unread + unread }
        : { id: event.chatId, title: event.title || event.chatId, unread, messages: [event.message] };
      return { ...state, chats: existing
        ? state.chats.map(item => item.id === chat.id ? chat : item)
        : [...state.chats, chat] };
    }
    case 'message-updated': {
      return { ...state, chats: state.chats.map(chat => chat.id === event.chatId ? {
        ...chat, messages: chat.messages.map(message => message.id === event.id ? { ...message, ...event.patch } : message),
      } : chat) };
    }
    case 'message-status': {
      return { ...state, chats: state.chats.map(chat => chat.id === event.chatId ? {
        ...chat, messages: chat.messages.map(message => {
          if (message.remoteId !== event.remoteId) return message;
          if (message.status === 'read') return message;
          // Older queued delivery events must not turn a read message back into sent.
          const rank = { sending: 0, uncertain: 0, failed: 0, sent: 1, delivered: 2, read: 3 };
          return event.status !== 'failed' && rank[event.status] < rank[message.status ?? 'sent']
            ? message : { ...message, status: event.status };
        }),
      } : chat) };
    }
  }
}
