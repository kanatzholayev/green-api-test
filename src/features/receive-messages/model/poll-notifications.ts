import { GreenApiError, type GreenApi } from '../../../shared/api/green-api';
import type { Notification } from '../../../shared/api/types';

export type ReceivingState = { status: 'connecting' | 'online' | 'retrying' | 'stopped'; error?: unknown };

export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(); return; }
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

export async function pollNotifications(
  api: Pick<GreenApi, 'receiveNotification' | 'deleteNotification'>,
  signal: AbortSignal,
  onNotification: (notification: Notification) => void,
  onState: (state: ReceivingState) => void,
): Promise<void> {
  let failures = 0;
  // Keep a pending receipt until acknowledged. A failed DELETE must never advance the queue.
  let pending: Notification | null = null;
  onState({ status: 'connecting' });
  while (!signal.aborted) {
    try {
      if (!pending) {
        pending = await api.receiveNotification(signal);
        if (signal.aborted) return;
        if (pending) onNotification(pending);
      }
      if (pending) {
        const deleted = await api.deleteNotification(pending.receiptId, signal);
        if (!deleted?.result) throw new Error('GREEN-API не подтвердил обработку уведомления. Повторяем запрос.');
        pending = null;
      }
      if (signal.aborted) return;
      failures = 0;
      onState({ status: 'online' });
      // Bound the request rate even if the service immediately returns an empty response.
      await abortableDelay(250, signal);
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof GreenApiError && [401, 403, 404].includes(error.status ?? 0)) {
        onState({ status: 'stopped', error });
        return;
      }
      onState({ status: 'retrying', error });
      await abortableDelay(Math.min(1000 * 2 ** failures++, 20_000), signal);
    }
  }
}
