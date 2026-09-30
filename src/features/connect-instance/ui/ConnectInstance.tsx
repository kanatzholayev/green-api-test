import { useRef, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import { createGreenApi, errorMessage, normalizeApiUrl } from '../../../shared/api/green-api';
import type { GreenApiCredentials } from '../../../shared/api/types';
import styles from './ConnectInstance.module.scss';

const stateErrors: Record<string, string> = {
  notAuthorized: 'Авторизуйте Telegram-инстанс в личном кабинете GREEN-API и подключитесь снова.',
  pendingPassword: 'Завершите ввод пароля Telegram в кабинете GREEN-API.',
  starting: 'Инстанс запускается. Подождите немного и подключитесь снова.',
  blocked: 'Telegram-аккаунт заблокирован. Проверьте его в личном кабинете.',
  suspended: 'Инстанс приостановлен. Проверьте статус в личном кабинете.',
};

export const ConnectInstance = ({ onConnect }: { onConnect: (credentials: GreenApiCredentials) => void }) => {
  const [values, setValues] = useState<GreenApiCredentials>({ idInstance: '', apiTokenInstance: '', apiUrl: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof GreenApiCredentials, string>>>({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState<{ credentials: GreenApiCredentials; hasWebhook: boolean } | null>(null);
  const [saved, setSaved] = useState(false);

  const change = (field: keyof GreenApiCredentials, value: string) => {
    setValues(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    setSetup(null); setSaved(false); setError('');
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof GreenApiCredentials, string>> = {};
    if (!/^\d+$/.test(values.idInstance.trim())) errors.idInstance = values.idInstance.trim() ? 'ID должен содержать только цифры' : 'Укажите idInstance';
    if (!values.apiTokenInstance.trim()) errors.apiTokenInstance = 'Укажите apiTokenInstance';
    try { normalizeApiUrl(values.apiUrl); } catch { errors.apiUrl = values.apiUrl ? 'Например, https://4100.api.green-api.com' : 'Укажите apiUrl'; }
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) void connect(values);
  };

  const connect = async (values: GreenApiCredentials) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setSetup(null); setSaved(false);
    try {
      const credentials = { apiUrl: normalizeApiUrl(values.apiUrl), idInstance: values.idInstance.trim(), apiTokenInstance: values.apiTokenInstance.trim() };
      const api = createGreenApi(credentials);
      const [state, settings] = await Promise.all([api.getState(), api.getSettings()]);
      if (settings.typeInstance !== 'telegram') throw new Error('Этот инстанс не относится к Telegram. Укажите данные Telegram-инстанса.');
      if (state.stateInstance !== 'authorized') throw new Error(stateErrors[state.stateInstance] ?? 'Инстанс пока не готов. Проверьте его в кабинете GREEN-API.');
      if (settings.incomingWebhook !== 'yes' || settings.webhookUrl) {
        setSetup({ credentials, hasWebhook: Boolean(settings.webhookUrl) });
        return;
      }
      onConnect(credentials);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const configure = async () => {
    if (!setup || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await createGreenApi(setup.credentials).enableReceiving();
      if (!result.saveSettings) throw new Error('Настройки не сохранены. Попробуйте ещё раз.');
      setSaved(true); setSetup(null);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.wordmark}>Telegram</div>
        <section className={styles.card}>
          <h1>Подключение</h1>
          <p className={styles.description}>Введите данные инстанса GREEN-API.</p>
          <form className={styles.form} onSubmit={submit} noValidate>
            <TextField label="ID инстанса" value={values.idInstance} onChange={event => change('idInstance', event.target.value)} error={Boolean(fieldErrors.idInstance)} helperText={fieldErrors.idInstance} placeholder="idInstance" autoComplete="off" slotProps={{ htmlInput: { inputMode: 'numeric' } }} disabled={busy} fullWidth />
            <TextField label="API-токен" type="password" value={values.apiTokenInstance} onChange={event => change('apiTokenInstance', event.target.value)} error={Boolean(fieldErrors.apiTokenInstance)} helperText={fieldErrors.apiTokenInstance} placeholder="apiTokenInstance" autoComplete="off" disabled={busy} fullWidth />
            <TextField label="Адрес API" value={values.apiUrl} onChange={event => change('apiUrl', event.target.value)} error={Boolean(fieldErrors.apiUrl)} helperText={fieldErrors.apiUrl} placeholder="https://4100.api.green-api.com" autoComplete="off" slotProps={{ htmlInput: { inputMode: 'url' } }} disabled={busy} fullWidth />
            {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
            {saved ? <Alert severity="success">Настройки сохранены. GREEN-API применяет их до минуты. Затем нажмите «Подключиться».</Alert> : null}
            {setup ? <Alert severity="warning" className={styles.setup}>Нужно включить получение сообщений.{' '}
              {setup.hasWebhook ? 'У инстанса задан webhook. Для работы этого чата его адрес будет очищен, а входящие уведомления включены.' : 'Включите входящие уведомления для получения ответов.'}
              <Button className={styles.setupButton} onClick={() => void configure()} loading={busy}>Настроить получение</Button>
            </Alert> : null}
            <Button className={styles.submit} variant="contained" type="submit" size="large" fullWidth loading={busy}>Подключиться</Button>
          </form>
        </section>
        <a className={styles.help} href="https://console.green-api.com/" target="_blank" rel="noreferrer">Где взять данные?</a>
      </div>
    </main>
  );
};
