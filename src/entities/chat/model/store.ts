import { create } from 'zustand';
import { displayPhone } from '../../../shared/lib/phone';
import type { ChatMessage, ChatState, MessageStatus } from './types';

type ChatStore = ChatState & {
  createChat: (id: string, phone: string) => void;
  selectChat: (id: string | null) => void;
  addMessage: (chatId: string, message: ChatMessage, title?: string) => void;
  updateMessage: (chatId: string, id: string, patch: Partial<ChatMessage>) => void;
  setMessageStatus: (chatId: string, remoteId: string, status: MessageStatus) => void;
  reset: () => void;
};

const statusRank: Record<MessageStatus, number> = {
  sending: 0,
  uncertain: 0,
  failed: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export const useChatStore = create<ChatStore>()((set, get) => ({
  chats: [],
  activeChatId: null,
  createChat: (id, phone) => {
    const { chats } = get();
    const existing = chats.find(chat => chat.id === id);
    set({
      activeChatId: id,
      chats: existing
        ? chats.map(chat => (chat.id === id ? { ...chat, phone, unread: 0 } : chat))
        : [...chats, { id, title: displayPhone(phone), phone, unread: 0, messages: [] }],
    });
  },
  selectChat: id =>
    set({
      activeChatId: id,
      chats: get().chats.map(chat => (chat.id === id ? { ...chat, unread: 0 } : chat)),
    }),
  addMessage: (chatId, message, title) => {
    const { chats, activeChatId } = get();
    const existing = chats.find(chat => chat.id === chatId);
    if (
      existing?.messages.some(
        item => item.id === message.id || (message.remoteId && item.remoteId === message.remoteId),
      )
    )
      return;
    const unread = message.direction === 'incoming' && activeChatId !== chatId ? 1 : 0;
    const chat = existing
      ? { ...existing, messages: [...existing.messages, message], unread: existing.unread + unread }
      : { id: chatId, title: title || chatId, unread, messages: [message] };
    set({
      chats: existing ? chats.map(item => (item.id === chat.id ? chat : item)) : [...chats, chat],
    });
  },
  updateMessage: (chatId, id, patch) =>
    set({
      chats: get().chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map(message =>
                message.id === id ? { ...message, ...patch } : message,
              ),
            }
          : chat,
      ),
    }),
  setMessageStatus: (chatId, remoteId, status) =>
    set({
      chats: get().chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map(message => {
                if (message.remoteId !== remoteId) return message;
                if (message.status === 'read') return message;
                return status !== 'failed' &&
                  statusRank[status] < statusRank[message.status ?? 'sent']
                  ? message
                  : { ...message, status };
              }),
            }
          : chat,
      ),
    }),
  reset: () => set({ chats: [], activeChatId: null }),
}));
