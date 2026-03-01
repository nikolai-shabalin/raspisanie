# Расписание уроков (Astro)

Проект получает расписание по публичному URL `schedule.mstimetables.ru`, нормализует данные в JSON и рендерит страницу на Astro.

## Что внутри

- Статическая страница Astro со стилями расписания.
- Скрипт генерации данных без `puppeteer` и `cheerio`.
- Автоматическое еженедельное обновление данных через GitHub Actions.

## Структура

```text
src/
├── data/
│   └── structured-schedule-data.json
├── pages/
│   └── index.astro
└── scripts/
    └── fetch-and-build-schedule.js
```

## Установка

```bash
pnpm install
```

## Локальная генерация данных

Скрипт принимает URL расписания с датой в hash-query (`...lessons?date=YYYY-MM-DD`):

```bash
pnpm run generate-schedule -- "https://schedule.mstimetables.ru/publications/4f2464cf-c4d1-4f55-b67a-2f8de64f5ba6#/groups/38/lessons?date=2026-03-02"
```

Результат записывается в:

- `src/data/structured-schedule-data.json`

## Запуск проекта

```bash
pnpm run dev
```

## Автообновление по cron

Файл workflow: `.github/workflows/update-schedule.yml`

- Запуск: суббота 09:00 МСК (`06:00 UTC`, cron: `0 6 * * 6`).
- Вычисляется дата **ближайшего следующего понедельника**.
- Формируется URL с этой датой.
- Генерируется новый `structured-schedule-data.json`.
- Если данные изменились, workflow коммитит файл в `main`.
- После коммита стандартный деплой выполняется существующим `.github/workflows/deploy.yml`.

## Важно

- Стили в `src/pages/index.astro` не меняются этим пайплайном.
- Формат `structured-schedule-data.json` сохранён совместимым с текущей вёрсткой.