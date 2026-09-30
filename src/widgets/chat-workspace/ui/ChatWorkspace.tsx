import { createContext, forwardRef, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { ChatBox } from '@mui/x-chat';
import type {
  ChatAdapter,
  ChatConversation,
  ChatMessage as XChatMessage,
} from '@mui/x-chat/headless';
import { createGreenApi, errorMessage, GreenApiError } from '../../../shared/api/green-api';
import type { GreenApiCredentials } from '../../../shared/api/types';
import { formatTime } from '../../../shared/lib/date';
import { useChatStore, type Chat, type ChatMessage } from '../../../entities/chat';
import { CreateChat } from '../../../features/create-chat';
import { useReceiveMessages } from '../../../features/receive-messages';
import styles from './ChatWorkspace.module.scss';

const connectionTitle = {
  connecting: 'Подключение…',
  online: 'Подключено',
  retrying: 'Переподключение…',
  stopped: 'Нет подключения',
} as const;

const chromeContext = createContext({
  instanceId: '',
  onCreate: () => {},
  onLogout: () => {},
});

const ConversationsPane = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ children, className, ...props }, ref) => {
    const { instanceId, onCreate, onLogout } = useContext(chromeContext);
    return (
      <div ref={ref} className={`${styles.conversationsPane} ${className ?? ''}`} {...props}>
        <header className={styles.sidebarHeader}>
          <h1>Чаты</h1>
          <Button onClick={onCreate}>Новый чат</Button>
        </header>
        {children}
        <footer className={styles.sidebarFooter}>
          <span className={styles.instanceLabel}>Инстанс {instanceId}</span>
          <Button onClick={onLogout}>Выйти</Button>
        </footer>
      </div>
    );
  },
);

const preview = (chat: Chat): string => {
  const last = chat.messages.at(-1);
  return last ? `${last.direction === 'outgoing' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений';
};

const toBoxStatus = (status: ChatMessage['status']): XChatMessage['status'] => {
  if (status === 'failed' || status === 'uncertain') return 'error';
  if (status === 'read') return 'read';
  return status === 'sending' ? 'sending' : 'sent';
};

const toBoxMessage = (chat: Chat, message: ChatMessage): XChatMessage => ({
  id: message.id,
  conversationId: chat.id,
  role: message.direction === 'outgoing' ? 'user' : 'assistant',
  parts: [{ type: 'text', text: message.text }],
  createdAt: new Date(message.timestamp).toISOString(),
  status: toBoxStatus(message.status),
  author:
    message.direction === 'incoming'
      ? { id: chat.id, displayName: chat.title }
      : { id: 'self', displayName: 'Вы' },
});

const toBoxConversation = (chat: Chat): ChatConversation => {
  const last = chat.messages.at(-1);
  return {
    id: chat.id,
    title: chat.title,
    subtitle: preview(chat),
    unreadCount: chat.unread || undefined,
    readState: chat.unread ? 'unread' : 'read',
    lastMessageAt: last ? new Date(last.timestamp).toISOString() : undefined,
  };
};

const messageText = (message: XChatMessage): string =>
  message.parts.reduce((text, part) => (part.type === 'text' ? text + part.text : text), '');

const localeText = {
  composerInputPlaceholder: 'Сообщение',
  composerInputAriaLabel: 'Текст сообщения',
  composerSendButtonLabel: 'Отправить сообщение',
  conversationListNoConversationsLabel: 'Пока нет чатов',
  threadNoMessagesLabel: 'Нет сообщений',
  threadNoMessagesHelperText: 'Напишите сообщение, чтобы начать переписку',
  retryButtonLabel: 'Повторить',
  messageListLabel: 'Сообщения',
  conversationListLandmarkLabel: 'Чаты',
  threadLandmarkLabel: 'Переписка',
  conversationHeaderBackLabel: 'Назад к чатам',
  conversationHeaderNewChatLabel: 'Новый чат',
  composerLandmarkLabel: 'Текст сообщения',
  messageTimestampLabel: (dateTime: string) => formatTime(Date.parse(dateTime)),
  conversationTimestampLabel: (dateTime: string) => formatTime(Date.parse(dateTime)),
};

export const ChatWorkspace = ({
  credentials,
  onLogout,
}: {
  credentials: GreenApiCredentials;
  onLogout: () => void;
}) => {
  const api = useMemo(() => createGreenApi(credentials), [credentials]);
  const {
    chats: chatsState,
    activeChatId,
    selectChat,
    createChat,
    reset,
    addMessage,
    updateMessage,
  } = useChatStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const receiving = useReceiveMessages(api);
  const activeChat = chatsState.find(chat => chat.id === activeChatId);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      reset();
    };
  }, [reset]);

  const chats = [...chatsState].sort(
    (a, b) => (b.messages.at(-1)?.timestamp ?? 0) - (a.messages.at(-1)?.timestamp ?? 0),
  );
  const conversations = chats.map(toBoxConversation);
  const messages = activeChat
    ? activeChat.messages.map(message => toBoxMessage(activeChat, message))
    : [];

  const adapter = useMemo<ChatAdapter>(
    () => ({
      sendMessage: async ({ message, conversationId }) => {
        const chatId = conversationId ?? message.conversationId;
        const text = messageText(message).trim();
        if (!chatId || !text) throw new Error('Не удалось отправить сообщение.');
        updateMessage(chatId, message.id, { status: 'sending', error: undefined });
        addMessage(chatId, {
          id: message.id,
          text,
          timestamp: message.createdAt ? Date.parse(message.createdAt) : Date.now(),
          direction: 'outgoing',
          status: 'sending',
        });
        try {
          const result = await api.sendMessage(chatId, text);
          if (!result?.idMessage) throw new Error('GREEN-API не вернул подтверждение отправки.');
          if (mounted.current)
            updateMessage(chatId, message.id, { remoteId: result.idMessage, status: 'sent' });
          return new ReadableStream({
            start: controller => {
              controller.close();
            },
          });
        } catch (cause) {
          const definiteFailure = cause instanceof GreenApiError && (cause.status ?? 500) < 500;
          if (mounted.current)
            updateMessage(chatId, message.id, {
              status: definiteFailure ? 'failed' : 'uncertain',
              error: errorMessage(cause),
            });
          throw cause;
        }
      },
    }),
    [api, addMessage, updateMessage],
  );

  const chrome = useMemo(
    () => ({
      instanceId: credentials.idInstance,
      onCreate: () => setCreateOpen(true),
      onLogout: () => setLogoutOpen(true),
    }),
    [credentials.idInstance],
  );

  return (
    <chromeContext.Provider value={chrome}>
      <main className={styles.page}>
        {chats.length === 0 ? (
          <ConversationsPane className={styles.emptyList} role="navigation" aria-label="Чаты">
            <div className={styles.emptySidebar}>Пока нет чатов</div>
          </ConversationsPane>
        ) : null}
        <ChatBox
          className={styles.chatBox}
          sx={{ height: '100%', '--ChatBox-conversationListWidth': '320px' }}
          adapter={adapter}
          currentUser={{ id: 'self', role: 'user', displayName: 'Вы' }}
          roleDisplayNames={{ user: 'Вы', assistant: 'Собеседник' }}
          conversations={conversations}
          messages={messages}
          activeConversationId={activeChatId ?? undefined}
          onActiveConversationChange={id => selectChat(id ?? null)}
          features={{
            conversationList: true,
            dateDivider: true,
            unreadMarker: true,
            attachments: false,
            helperText: false,
            suggestions: false,
            streamingIndicator: false,
          }}
          localeText={localeText}
          slots={{ conversationsPane: ConversationsPane, messageActions: null }}
          slotProps={{
            composerInput: { maxLength: 4096, maxRows: 5 },
            composerRoot: { disabled: !activeChat },
            conversationHeaderActions: {
              children: (
                <div
                  className={`${styles.connectionStatus} ${styles[receiving.status]}`}
                  role="status"
                >
                  <span className={styles.connectionDot} />
                  {connectionTitle[receiving.status]}
                </div>
              ),
            },
          }}
        />
        {receiving.error ? (
          <Alert
            className={styles.receivingAlert}
            severity={receiving.status === 'stopped' ? 'error' : 'warning'}
          >
            {errorMessage(receiving.error)}{' '}
            {receiving.status === 'stopped'
              ? 'Выйдите и подключите инстанс заново.'
              : 'Получение сообщений возобновится автоматически.'}
          </Alert>
        ) : null}
      </main>
      <CreateChat
        open={createOpen}
        api={api}
        onClose={() => setCreateOpen(false)}
        onCreate={(id, phone) => createChat(id, phone)}
      />
      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <DialogTitle>Выйти?</DialogTitle>
        <DialogContent>Чаты этой сессии будут удалены.</DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutOpen(false)}>Отмена</Button>
          <Button onClick={onLogout}>Выйти</Button>
        </DialogActions>
      </Dialog>
    </chromeContext.Provider>
  );
};
