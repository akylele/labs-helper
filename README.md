# Система учёта лабораторных работ

## Требования

- Node.js 14+
- MongoDB (локально или MongoDB Atlas)

## Установка и запуск

### 1. Backend

```bash
cd backend

# Настройте .env файл (уже создан с дефолтными значениями)
# TEACHER_LOGIN=teacher
# TEACHER_PASSWORD=teacher123

# Запуск
npm start
```

### 2. Frontend

```bash
cd frontend
npm start
```

## Использование

### Для студентов
1. Зарегистрируйтесь на `/register` (укажите фамилию и пароль)
2. Добавляйте лабораторные работы с ссылкой на GitLab MR
3. Отслеживайте статус проверки

### Для преподавателя
1. Войдите с логином `teacher` и паролем `teacher123`
2. Просматривайте все работы студентов
3. Принимайте или отклоняйте работы

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/register | Регистрация студента |
| POST | /api/auth/login | Вход |
| GET | /api/auth/me | Проверка токена |
| GET | /api/submissions/my | Мои работы (студент) |
| POST | /api/submissions | Добавить работу |
| GET | /api/submissions/all | Все работы (преподаватель) |
| PATCH | /api/submissions/:id/status | Изменить статус |

