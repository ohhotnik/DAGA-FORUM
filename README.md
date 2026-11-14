# KARATEL TEST — форум

Форум-сообщество с тёмным оформлением и оранжевыми акцентами. Это самостоятельный дизайн по мотивам игрового форума, не копия закрытого кода или официальных материалов Black Russia.

## Что есть
- Регистрация и вход по email/паролю через Firebase Authentication.
- Разделы: новости, жалобы, предложения, вопросы и помощь, жалобы на игроков.
- Создание тем и ответы.
- Загрузка последних 100 тем из Firebase Realtime Database.
- Адаптация под телефон.

## Запуск на компьютере
1. Установи Node.js LTS.
2. Распакуй архив и открой папку `karatel-test-forum`.
3. В терминале выполни:
   ```bash
   npm install
   npm run dev
   ```
4. Открой адрес, который покажет Vite (обычно http://localhost:5173).

## Настройка Firebase
1. Открой Firebase Console: https://console.firebase.google.com/
2. Выбери проект `karatel-test-d4905`.
3. Authentication → Sign-in method → включи **Email/Password**.
4. Realtime Database → Rules → вставь содержимое `database.rules.json` → Publish.
5. В Firebase Console → Project settings → Your apps проверь конфигурацию веб-приложения.

## Публикация
Собери сайт командой `npm run build`. Папка `dist` — готовая сборка для Firebase Hosting, GitHub Pages (с настройкой base path) или другого статического хостинга.

Для Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# выбери существующий проект karatel-test-d4905, public directory: dist,
# configure as a single-page app: No
npm run build
firebase deploy
```

## Важно о безопасности
- Firebase web apiKey в клиентском приложении — идентификатор проекта, а не пароль администратора. Не публикуй приватные ключи сервисных аккаунтов.
- Перед запуском для реальных пользователей проверь и ужесточи правила базы. Текущие правила дают всем чтение тем, а создавать тему/комментарий разрешают вошедшим пользователям от своего UID.
- В текущей версии нет отдельной роли администратора, жалобы не отправляются автоматически модераторам, нет загрузки аватаров и восстановления пароля.
- Не используй персональные данные в публичных темах.
