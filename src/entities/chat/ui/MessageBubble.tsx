import { Button, Tooltip } from '@mui/material';
import { formatTime } from '../../../shared/lib/date';
import type { ChatMessage } from '../model/types';
import styles from './MessageBubble.module.scss';

const statusLabels = { sending: 'Отправляется', sent: 'Принято GREEN-API', delivered: 'Доставлено', read: 'Прочитано', failed: 'Не отправлено', uncertain: 'Отправка не подтверждена' };
export function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const outgoing = message.direction === 'outgoing';
  const unsuccessful = message.status === 'failed' || message.status === 'uncertain';
  return <div className={`${styles.row} ${outgoing ? styles.outgoing : ''}`}>
    <div className={styles.bubble}>
      <p>{message.text}</p>
      <div className={styles.meta}><time dateTime={new Date(message.timestamp).toISOString()}>{formatTime(message.timestamp)}</time>
        {outgoing && message.status ? <Tooltip title={statusLabels[message.status]}><span className={`${styles.status} ${message.status === 'read' ? styles.read : ''} ${unsuccessful ? styles.failed : ''}`} aria-label={statusLabels[message.status]}>
          {message.status === 'sending' ? '…' : unsuccessful ? '!' : message.status === 'delivered' || message.status === 'read' ? '✓✓' : '✓'}
        </span></Tooltip> : null}
      </div>
      {unsuccessful ? <div className={styles.failure}><span>{message.error ?? 'Не удалось доставить сообщение.'}</span>
        {message.status === 'failed' ? <Button size="small" onClick={onRetry}>Повторить</Button> : <span>Проверьте переписку в Telegram перед повторной отправкой.</span>}
      </div> : null}
    </div>
  </div>;
}
