import AdvancedScheduleParser from '../parser/advanced-schedule-parser.js';

// Получаем URL из аргументов командной строки
const SCHEDULE_URL = process.argv[2];

// Проверяем, что URL передан
if (!SCHEDULE_URL) {
  console.error('❌ Ошибка: URL не указан!');
  console.error('📝 Использование: pnpm run parse "https://schedule.mstimetables.ru/..."');
  console.error('📝 Пример: pnpm run parse "https://schedule.mstimetables.ru/publications/4f2464cf-c4d1-4f55-b67a-2f8de64f5ba6#/groups/38/lessons?date=2025-09-22"');
  process.exit(1);
}

async function main() {
  console.log('🚀 Запуск парсера расписания...');
  console.log(`🔗 URL: ${SCHEDULE_URL}`);
  
  const parser = new AdvancedScheduleParser();
  
  try {
    const result = await parser.parseAndSave(SCHEDULE_URL, 'schedule-data.json');
    
    console.log('✅ Парсинг завершен успешно!');
    console.log(`📁 Данные сохранены в: ${result.savedPath}`);
    console.log(`📊 Найдено групп: ${result.data.groups.length}`);
    console.log(`📚 Найдено уроков: ${result.data.lessons.length}`);
    console.log(`👨‍🏫 Найдено преподавателей: ${result.data.teachers.length}`);
    console.log(`🏢 Найдено аудиторий: ${result.data.rooms.length}`);
    console.log(`⏰ Найдено временных слотов: ${result.data.timeSlots.length}`);
    console.log(`🔗 Найдено ссылок: ${result.data.links.length}`);
    console.log(`🖼️ Найдено изображений: ${result.data.images.length}`);
    console.log(`📝 Найдено форм: ${result.data.forms.length}`);
    console.log(`📜 Найдено скриптов с данными: ${result.data.scriptData.length}`);
    
    // Выводим краткую информацию о данных
    console.log('\n📋 Краткая информация о данных:');
    console.log(`URL: ${result.data.url}`);
    console.log(`Заголовок: ${result.data.title}`);
    console.log(`Дата: ${result.data.metadata.date}`);
    console.log(`ID группы: ${result.data.metadata.groupId}`);
    console.log(`ID публикации: ${result.data.metadata.publicationId}`);
    console.log(`Hash: ${result.data.metadata.hash}`);
    
    // Показываем примеры данных
    if (result.data.lessons.length > 0) {
      console.log('\n📚 Пример урока:');
      console.log(JSON.stringify(result.data.lessons[0], null, 2));
    }
    
    if (result.data.groups.length > 0) {
      console.log('\n👥 Пример группы:');
      console.log(JSON.stringify(result.data.groups[0], null, 2));
    }
    
    if (result.data.scriptData.length > 0) {
      console.log('\n📜 Найдены данные в скриптах:');
      result.data.scriptData.forEach((script, index) => {
        console.log(`Скрипт ${index + 1}: ${Object.keys(script.data).length} свойств`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при парсинге:', error.message);
    process.exit(1);
  }
}

main();
