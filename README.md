# Telegram-чат через GREEN-API

Личные текстовые чаты через свой Telegram-инстанс: подключение, диалог по номеру, отправка и получение. React, Vite, MUI, `@mui/x-chat`.

## Запуск

Node.js 22+, npm.

```sh
npm ci
npm run dev
```

Обычно http://127.0.0.1:5173. Дальше: `npm test`, `npm run lint`, `npm run build`.

## Подключение

[Telegram-инстанс](https://console.green-api.com/) в состоянии `authorized`. В форму — `idInstance`, `apiTokenInstance` и `apiUrl` из кабинета, например `https://4100.api.green-api.com`.

Для входящих нужны `incomingWebhook: "yes"` и пустой `webhookUrl`; иначе приложение предложит настроить. Сессия только в памяти вкладки, история Telegram не подгружается.

- [SendMessage](https://green-api.com/telegram/docs/api/sending/SendMessage/)
- [CheckAccount](https://green-api.com/telegram/docs/api/service/CheckAccount/)
- [ReceiveNotification](https://green-api.com/telegram/docs/api/receiving/technology-http-api/ReceiveNotification/)
- [DeleteNotification](https://green-api.com/telegram/docs/api/receiving/technology-http-api/DeleteNotification/)
