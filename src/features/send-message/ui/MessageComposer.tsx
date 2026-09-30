import { useRef, useState } from 'react';
import { Button, TextField } from '@mui/material';
import styles from './MessageComposer.module.scss';

export const MessageComposer = ({ onSend }: { onSend: (text: string) => Promise<void> }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const submit = async () => {
    if (!text.trim() || busyRef.current || text.length > 4096) return;
    busyRef.current = true; setBusy(true);
    const draft = text;
    setText('');
    try { await onSend(draft); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <div className={styles.area}>
    <form className={styles.composer} onSubmit={event => { event.preventDefault(); void submit(); }}>
      <TextField aria-label="Текст сообщения" placeholder="Сообщение" value={text} onChange={event => setText(event.target.value)} multiline minRows={1} maxRows={5} slotProps={{ htmlInput: { maxLength: 4096, 'aria-label': 'Текст сообщения' } }} fullWidth variant="standard" onKeyDown={event => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
          return;
        }

        event.preventDefault(); void submit();
      }} />
      <Button variant="contained" type="submit" aria-label="Отправить сообщение" loading={busy} disabled={!text.trim() || text.length > 4096}>Отправить</Button>
    </form>
    {text.length > 3500 ? <div className={styles.hint}>{text.length} / 4096</div> : null}
  </div>;
};
