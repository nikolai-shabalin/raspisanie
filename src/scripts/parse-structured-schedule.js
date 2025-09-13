import StructuredScheduleParser from '../parser/structured-schedule-parser.js';

const SCHEDULE_URL = 'https://schedule.mstimetables.ru/publications/4f2464cf-c4d1-4f55-b67a-2f8de64f5ba6#/groups/38/lessons?date=2025-09-15';

async function main() {
  console.log('🚀 Запуск структурированного парсера расписания...');
  
  const parser = new StructuredScheduleParser();
  
  try {
    const result = await parser.parseAndSave(SCHEDULE_URL, 'structured-schedule-data.json');
    
    console.log('✅ Структурированный парсинг завершен успешно!');
    console.log(`📁 Данные сохранены в: ${result.savedPath}`);
    console.log(`📅 Диапазон недели: ${result.data.weekRange}`);
    console.log(`📊 Найдено дней: ${result.data.days.length}`);
    
    // Подсчитываем общее количество уроков
    let totalLessons = 0;
    result.data.days.forEach(day => {
      totalLessons += day.lessons.length;
    });
    console.log(`📚 Общее количество временных слотов: ${totalLessons}`);
    
    // Выводим информацию по дням
    console.log('\n📋 Расписание по дням:');
    result.data.days.forEach(day => {
      console.log(`\n${day.dayName} (${day.date}):`);
      day.lessons.forEach((timeSlot, index) => {
        console.log(`  ${timeSlot.timeSlot.start}-${timeSlot.timeSlot.end}:`);
        timeSlot.lessons.forEach(lesson => {
          console.log(`    - ${lesson.subject} | ${lesson.teacher} | ${lesson.room}`);
        });
      });
    });
    
    // Выводим метаданные
    console.log('\n📋 Метаданные:');
    console.log(`URL: ${result.data.url}`);
    console.log(`Заголовок: ${result.data.title}`);
    console.log(`Дата: ${result.data.metadata.date}`);
    console.log(`ID группы: ${result.data.metadata.groupId}`);
    console.log(`ID публикации: ${result.data.metadata.publicationId}`);
    console.log(`Hash: ${result.data.metadata.hash}`);
    
  } catch (error) {
    console.error('❌ Ошибка при парсинге:', error.message);
    process.exit(1);
  }
}

main();
