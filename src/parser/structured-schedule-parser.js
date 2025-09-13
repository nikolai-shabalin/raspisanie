import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class StructuredScheduleParser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });

    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      if (request.resourceType() === 'image' || 
          request.resourceType() === 'stylesheet' ||
          request.resourceType() === 'font') {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  async parseSchedule(url) {
    try {
      console.log('🌐 Переходим на страницу:', url);
      await this.page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const scheduleData = await this.page.evaluate(() => {
        const data = {
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
          weekRange: '',
          days: [],
          metadata: {}
        };

        // Извлекаем диапазон недели
        const dateRangeElement = document.querySelector('.date-range');
        if (dateRangeElement) {
          data.weekRange = dateRangeElement.textContent?.trim() || '';
        }

        // Извлекаем данные по дням недели
        const dayColumns = document.querySelectorAll('.lessons-col');
        
        dayColumns.forEach((dayColumn, dayIndex) => {
          const dayData = {
            dayIndex: dayIndex,
            dayName: '',
            date: '',
            lessons: []
          };

          // Извлекаем название дня и дату
          const weekdayName = dayColumn.querySelector('.weekday-name');
          if (weekdayName) {
            const dayText = weekdayName.textContent?.trim() || '';
            const parts = dayText.split('-');
            if (parts.length >= 2) {
              dayData.dayName = parts[0].trim();
              dayData.date = parts[1].trim();
            }
          }

          // Извлекаем уроки из таблицы
          const table = dayColumn.querySelector('.table-lessons');
          if (table) {
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach((row, rowIndex) => {
              const timeCell = row.querySelector('td.time');
              const lessonCell = row.querySelector('td:last-child');
              
              if (timeCell && lessonCell) {
                const timeText = timeCell.textContent?.trim() || '';
                const lessonText = lessonCell.textContent?.trim() || '';
                
                // Пропускаем строки без времени или с "Нет занятий"
                if (timeText && timeText !== '#' && !lessonText.includes('Нет занятий')) {
                  // Парсим время
                  const timeDivs = timeCell.querySelectorAll('div');
                  let startTime = '';
                  let endTime = '';
                  
                  if (timeDivs.length >= 2) {
                    startTime = timeDivs[0].textContent?.trim() || '';
                    endTime = timeDivs[1].textContent?.trim() || '';
                  }

                  // Парсим уроки
                  const lessonElements = lessonCell.querySelectorAll('.lesson');
                  const lessons = [];
                  
                  lessonElements.forEach(lessonEl => {
                    const spans = lessonEl.querySelectorAll('span');
                    const divs = lessonEl.querySelectorAll('div');
                    
                    const lesson = {
                      subject: '',
                      teacher: '',
                      room: ''
                    };
                    
                    if (spans.length > 0) {
                      lesson.subject = spans[0].textContent?.trim() || '';
                    }
                    
                    if (divs.length > 1) {
                      lesson.teacher = divs[1].textContent?.trim() || '';
                    }
                    
                    if (divs.length > 2) {
                      lesson.room = divs[2].textContent?.trim() || '';
                    }
                    
                    // Добавляем урок только если есть предмет
                    if (lesson.subject) {
                      lessons.push(lesson);
                    }
                  });

                  // Если нет структурированных уроков, создаем один из текста
                  if (lessons.length === 0 && lessonText) {
                    const parts = lessonText.split(/\s+/);
                    if (parts.length >= 3) {
                      lessons.push({
                        subject: parts[0] || '',
                        teacher: parts[1] || '',
                        room: parts[2] || ''
                      });
                    }
                  }

                  // Добавляем временной слот с уроками
                  if (lessons.length > 0) {
                    dayData.lessons.push({
                      timeSlot: {
                        start: startTime,
                        end: endTime,
                        display: timeText
                      },
                      lessons: lessons
                    });
                  }
                }
              }
            });
          }

          data.days.push(dayData);
        });

        // Извлекаем метаданные
        data.metadata = {
          date: new URLSearchParams(window.location.search).get('date') || '',
          groupId: new URLSearchParams(window.location.search).get('group') || '',
          publicationId: window.location.pathname.split('/').pop() || '',
          pageTitle: document.title,
          lastModified: document.lastModified,
          contentLength: document.documentElement.innerHTML.length,
          urlParams: Object.fromEntries(new URLSearchParams(window.location.search)),
          hash: window.location.hash
        };

        return data;
      });

      return scheduleData;
    } catch (error) {
      console.error('Ошибка при парсинге:', error);
      throw error;
    }
  }

  async saveToJson(data, filename = 'structured-schedule-data.json') {
    const outputPath = path.join(process.cwd(), 'src', 'data', filename);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`📁 Структурированные данные сохранены в: ${outputPath}`);

    // Создаем упрощенную версию для Astro
    const simplifiedData = {
      weekRange: data.weekRange,
      days: data.days.map(day => ({
        dayName: day.dayName,
        date: day.date,
        lessons: day.lessons.map(timeSlot => ({
          time: `${timeSlot.timeSlot.start}-${timeSlot.timeSlot.end}`,
          activities: timeSlot.lessons.map(lesson => ({
            subject: lesson.subject,
            teacher: lesson.teacher,
            room: lesson.room
          }))
        }))
      })),
      metadata: data.metadata
    };

    const simplifiedPath = path.join(process.cwd(), 'src', 'data', 'schedule-simplified.json');
    fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedData, null, 2), 'utf8');
    console.log(`📄 Упрощенные данные сохранены в: ${simplifiedPath}`);

    return outputPath;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async parseAndSave(url, filename) {
    try {
      await this.init();
      const data = await this.parseSchedule(url);
      const savedPath = await this.saveToJson(data, filename);
      return { data, savedPath };
    } finally {
      await this.close();
    }
  }
}

export default StructuredScheduleParser;
