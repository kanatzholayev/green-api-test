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
