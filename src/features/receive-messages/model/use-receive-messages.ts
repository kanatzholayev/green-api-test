import { useEffect, useState, type Dispatch } from 'react';
import type { GreenApi } from '../../../shared/api/green-api';
import type { ChatEvent } from '../../../entities/chat';
import { parseNotification } from '../../../entities/chat';
import { pollNotifications, type ReceivingState } from './poll-notifications';

export function useReceiveMessages(api: GreenApi, dispatch: Dispatch<ChatEvent>): ReceivingState {
  const [state, setState] = useState<ReceivingState>({ status: 'connecting' });
  useEffect(() => {
    const controller = new AbortController();
    void pollNotifications(api, controller.signal, notification => {
      const event = parseNotification(notification.body);
      if (event) dispatch(event);
    }, setState);
    return () => controller.abort();
  }, [api, dispatch]);
  return state;
}
