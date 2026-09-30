import { lazy, Suspense, useState } from 'react';
import { CircularProgress } from '@mui/material';
import type { GreenApiCredentials } from '../../../shared/api/types';
import { ConnectInstance } from '../../../features/connect-instance';
import styles from './ChatPage.module.scss';
const ChatWorkspace = lazy(() => import('../../../widgets/chat-workspace').then(module => ({ default: module.ChatWorkspace })));

export function ChatPage() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(null);
  return credentials
    ? <Suspense fallback={<div className={styles.loading}><CircularProgress /></div>}><ChatWorkspace credentials={credentials} onLogout={() => setCredentials(null)} /></Suspense>
    : <ConnectInstance onConnect={setCredentials} />;
}
