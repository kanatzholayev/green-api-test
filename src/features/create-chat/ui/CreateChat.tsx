import { useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import type { GreenApi } from '../../../shared/api/green-api';
import { errorMessage } from '../../../shared/api/green-api';
import { normalizePhone } from '../../../shared/lib/phone';
import styles from './CreateChat.module.scss';

export function CreateChat({ open, api, onClose, onCreate }: {
  open: boolean; api: GreenApi; onClose: () => void; onCreate: (id: string, phone: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  async function create(raw: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const normalized = normalizePhone(raw);
      const account = await api.checkAccount(normalized);
      if (account.status === false) {
        if (account.data?.reason === 'rate_limit_exceeded') throw new Error('Telegram временно ограничил поиск номеров. Попробуйте позже.');
        throw new Error('Поиск номера сейчас недоступен. Проверьте состояние инстанса и попробуйте позже.');
      }
      if (!account.exist || !account.chatId) throw new Error('Не удалось найти получателя. Проверьте номер: аккаунт может отсутствовать или быть скрыт настройками приватности Telegram.');
      onCreate(account.chatId, normalized);
      setPhone(''); onClose();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function close() {
    if (busy) return;
    setError(''); setPhoneError(''); onClose();
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { normalizePhone(phone); setPhoneError(''); void create(phone); }
    catch (cause) { setPhoneError(errorMessage(cause)); }
  }
  return <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
    <form onSubmit={submit} noValidate>
      <DialogTitle>Новый чат</DialogTitle>
      <DialogContent className={styles.content}>
        <p className={styles.description}>Номер с кодом страны</p>
        <TextField autoFocus label="Номер телефона" value={phone} onChange={event => { setPhone(event.target.value); setPhoneError(''); setError(''); }} error={Boolean(phoneError)} helperText={phoneError} placeholder="+7 999 123 45 67" type="tel" autoComplete="tel" disabled={busy} fullWidth />
        {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
      </DialogContent>
      <DialogActions><Button onClick={close} disabled={busy}>Отмена</Button><Button variant="contained" type="submit" loading={busy}>Создать чат</Button></DialogActions>
    </form>
  </Dialog>;
}
