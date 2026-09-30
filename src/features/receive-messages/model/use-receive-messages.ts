import { useEffect, useState } from 'react';
import type { GreenApi } from '../../../shared/api/green-api';
import { parseNotification } from '../../../entities/chat';
import { pollNotifications, type ReceivingState } from './poll-notifications';

export const useReceiveMessages = (api: GreenApi): ReceivingState => {
  const [state, setState] = useState<ReceivingState>({ status: 'connecting' });
  useEffect(() => {
    const controller = new AbortController();
    void pollNotifications(
      api,
      controller.signal,
      notification => {
        parseNotification(notification.body);
      },
      setState,
    );
    return () => controller.abort();
  }, [api]);
  return state;
};
