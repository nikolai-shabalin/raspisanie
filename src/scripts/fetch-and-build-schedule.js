import fs from 'fs';
import path from 'path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const SCHEDULE_URL = rawArgs[0];

if (!SCHEDULE_URL) {
  console.error('❌ Ошибка: URL не указан!');
  console.error('📝 Использование: pnpm run generate-schedule -- "https://schedule.mstimetables.ru/..."');
  process.exit(1);
}

const WEEKDAY_NAMES = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

function parseUrlMetadata(urlString) {
  const parsed = new URL(urlString);
  const publicationMatch = parsed.pathname.match(/\/publications\/([^/]+)/);
  const groupMatch = parsed.hash.match(/\/groups\/([^/]+)/);
  const hashQueryRaw = parsed.hash.includes('?') ? parsed.hash.slice(parsed.hash.indexOf('?') + 1) : '';
  const hashParams = new URLSearchParams(hashQueryRaw);

  return {
    publicationId: publicationMatch?.[1] ?? '',
    groupId: groupMatch?.[1] ?? '',
    requestedDate: hashParams.get('date') ?? '',
    hash: parsed.hash,
    origin: parsed.origin,
  };
}

function formatDateRu(date) {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function toDateOnlyUtc(value) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function getWeekRange(startDateIso, endDateIso) {
  const startDate = toDateOnlyUtc(startDateIso);
  const endDate = toDateOnlyUtc(endDateIso);
  return `${formatDateRu(startDate)} - ${formatDateRu(endDate)}`;
}

function getDateByWeekday(startDateIso, weekday) {
  const monday = toDateOnlyUtc(startDateIso);
  const dayDate = new Date(monday);
  dayDate.setUTCDate(monday.getUTCDate() + (weekday - 1));
  return formatDateRu(dayDate);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Ошибка запроса ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

function buildActivities(lessonList) {
  return lessonList.map((lesson) => ({
    subject: lesson.subject?.name ?? '',
    teacher: (lesson.teachers ?? []).map((teacher) => teacher.fio).join(', '),
    room: lesson.cabinet?.name ?? '',
  }));
}

function buildStructuredData(url, meta, lessonsData) {
  const weekdaySet = new Set((lessonsData.bells ?? []).map((bell) => bell.weekday));
  const sortedWeekdays = [...weekdaySet].sort((a, b) => a - b);

  const days = sortedWeekdays.map((weekday, dayIndex) => {
    const dayBells = (lessonsData.bells ?? [])
      .filter((bell) => bell.weekday === weekday)
      .sort((a, b) => a.lesson - b.lesson);

    const slots = dayBells.map((bell) => {
      const slotLessons = (lessonsData.lessons ?? [])
        .filter((lesson) => lesson.weekday === weekday && lesson.lesson === bell.lesson)
        .sort((a, b) => a.startTimeMin - b.startTimeMin);

      return {
        timeSlot: {
          start: bell.startTime,
          end: bell.endTime,
          display: `${bell.startTime}${bell.endTime}`,
        },
        lessons: buildActivities(slotLessons),
      };
    });

    return {
      dayIndex,
      dayName: WEEKDAY_NAMES[weekday] ?? `День ${weekday}`,
      date: getDateByWeekday(lessonsData.startDate, weekday),
      lessons: slots.filter((slot) => slot.lessons.length > 0),
    };
  });

  const nowIso = new Date().toISOString();
  return {
    url,
    title: 'publications',
    timestamp: nowIso,
    weekRange: getWeekRange(lessonsData.startDate, lessonsData.endDate),
    days,
    metadata: {
      date: meta.requestedDate,
      groupId: meta.groupId,
      publicationId: meta.publicationId,
      pageTitle: 'publications',
      lastModified: nowIso,
      contentLength: JSON.stringify(lessonsData).length,
      urlParams: {
        date: meta.requestedDate,
      },
      hash: meta.hash,
    },
  };
}

async function main() {
  console.log('🚀 Запуск генерации расписания...');
  console.log(`🔗 URL: ${SCHEDULE_URL}`);

  const urlMeta = parseUrlMetadata(SCHEDULE_URL);
  if (!urlMeta.publicationId || !urlMeta.groupId || !urlMeta.requestedDate) {
    throw new Error('URL должен содержать publicationId, groupId и date');
  }

  const lessonsData = await fetchJson(`${urlMeta.origin}/api/publications/group/lessons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publicationId: urlMeta.publicationId,
      groupId: urlMeta.groupId,
      date: urlMeta.requestedDate,
    }),
  });

  const result = buildStructuredData(SCHEDULE_URL, urlMeta, lessonsData);
  if (!result.weekRange || result.days.length === 0) {
    throw new Error('Получены неполные данные расписания');
  };

  const outputPath = path.join(process.cwd(), 'src', 'data', 'structured-schedule-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

  console.log(`✅ Расписание сохранено: ${outputPath}`);
  console.log(`📅 Диапазон недели: ${result.weekRange}`);
  console.log(`📊 Найдено дней: ${result.days.length}`);
}

main().catch((error) => {
  console.error('❌ Ошибка генерации расписания:', error.message);
  process.exit(1);
});
