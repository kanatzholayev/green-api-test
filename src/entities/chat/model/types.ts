export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'uncertain';

export interface ChatMessage {
  id: string;
  remoteId?: string;
  text: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  status?: MessageStatus;
  error?: string;
}

export interface Chat {
  id: string;
  title: string;
  phone?: string;
  unread: number;
  messages: ChatMessage[];
}

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
}

export type ChatEvent =
  | { type: 'chat-created'; id: string; phone: string }
  | { type: 'chat-selected'; id: string | null }
  | { type: 'message-added'; chatId: string; title?: string; message: ChatMessage }
  | { type: 'message-updated'; chatId: string; id: string; patch: Partial<ChatMessage> }
  | { type: 'message-status'; chatId: string; remoteId: string; status: MessageStatus };
