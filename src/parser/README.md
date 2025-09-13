# Парсер расписания

Этот парсер предназначен для извлечения данных с сайта расписания `https://schedule.mstimetables.ru/`.

## Возможности

- 🕷️ **Полный парсинг страницы** - извлекает все доступные данные
- 📚 **Уроки** - время, предмет, преподаватель, аудитория, группа
- 👥 **Группы** - список всех групп
- 👨‍🏫 **Преподаватели** - уникальный список преподавателей
- 🏢 **Аудитории** - список всех аудиторий
- ⏰ **Временные слоты** - все времена занятий
- 🔗 **Ссылки** - все ссылки на странице
- 🖼️ **Изображения** - все изображения
- 📝 **Формы** - все формы и их поля
- 📜 **Данные из скриптов** - JSON данные из JavaScript

## Использование

### Установка зависимостей

```bash
npm install
# или
pnpm install
```

### Запуск парсера

```bash
npm run parse
# или
pnpm parse
```

### Результат

Парсер создаст следующие файлы в папке `src/data/`:

- `schedule-data.json` - полные данные расписания
- `lessons.json` - только уроки
- `schedule-raw.html` - исходный HTML страницы

## Структура данных

### Основные данные (schedule-data.json)

```json
{
  "url": "https://schedule.mstimetables.ru/...",
  "title": "Заголовок страницы",
  "timestamp": "2025-01-27T...",
  "groups": [...],
  "lessons": [...],
  "teachers": [...],
  "rooms": [...],
  "timeSlots": [...],
  "metadata": {...},
  "links": [...],
  "images": [...],
  "forms": [...],
  "scriptData": [...],
  "rawHtml": "..."
}
```

### Урок

```json
{
  "id": "lesson-1",
  "time": "09:00-10:30",
  "subject": "Математика",
  "teacher": "Иванов И.И.",
  "room": "А-101",
  "group": "Группа 1",
  "fullText": "Полный текст элемента",
  "className": "lesson-item",
  "attributes": {...},
  "html": "<div>...</div>"
}
```

### Группа

```json
{
  "id": "group-1",
  "name": "Группа 1",
  "value": "1",
  "href": "/groups/1",
  "className": "group-item",
  "attributes": {...}
}
```

## Настройка

Для изменения URL расписания отредактируйте файл `src/scripts/parse-schedule.js`:

```javascript
const SCHEDULE_URL = 'https://schedule.mstimetables.ru/your-url-here';
```

## Требования

- Node.js 18+
- Puppeteer (устанавливается автоматически)
- Cheerio (устанавливается автоматически)

## Устранение неполадок

### Ошибка "Browser not found"

```bash
npx puppeteer browsers install chrome
```

### Таймаут загрузки

Увеличьте таймаут в файле `advanced-schedule-parser.js`:

```javascript
await this.page.goto(url, { 
  waitUntil: 'networkidle0',
  timeout: 120000  // 2 минуты
});
```

### Блокировка сайтом

Попробуйте изменить User-Agent или добавить задержки между запросами.
