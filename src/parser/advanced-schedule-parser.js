import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class AdvancedScheduleParser {
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
    
    // Устанавливаем User-Agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Устанавливаем размер окна
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Перехватываем сетевые запросы
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      // Блокируем ненужные ресурсы для ускорения
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

      // Ждем загрузки динамического контента
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Пытаемся найти и кликнуть на элементы интерфейса
      try {
        // Ищем кнопки или элементы для загрузки данных
        const loadButtons = await this.page.$$('button, .btn, [role="button"]');
        for (const button of loadButtons) {
          const text = await this.page.evaluate(el => el.textContent?.toLowerCase(), button);
          if (text && (text.includes('загрузить') || text.includes('показать') || text.includes('расписание'))) {
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (e) {
        console.log('Не удалось найти кнопки загрузки');
      }

      // Извлекаем данные с помощью более детального анализа
      const scheduleData = await this.page.evaluate(() => {
        const data = {
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
          groups: [],
          lessons: [],
          teachers: [],
          rooms: [],
          timeSlots: [],
          metadata: {},
          rawHtml: document.documentElement.outerHTML
        };

        // Функция для безопасного получения текста
        const getText = (element) => {
          return element ? element.textContent?.trim() : '';
        };

        // Функция для поиска элементов по различным селекторам
        const findElements = (selectors) => {
          const elements = [];
          selectors.forEach(selector => {
            try {
              const found = document.querySelectorAll(selector);
              elements.push(...Array.from(found));
            } catch (e) {
              // Игнорируем ошибки селекторов
            }
          });
          return elements;
        };

        // Извлекаем группы
        const groupSelectors = [
          '[data-group-id]',
          '[data-group]',
          '.group',
          '.group-item',
          '.group-name',
          '[class*="group"]',
          'select option',
          '.dropdown-item'
        ];
        
        const groupElements = findElements(groupSelectors);
        groupElements.forEach((element, index) => {
          const groupData = {
            id: element.dataset.groupId || element.dataset.group || element.id || index,
            name: getText(element),
            value: element.value || '',
            href: element.href || '',
            className: element.className || '',
            attributes: Array.from(element.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {})
          };
          
          if (groupData.name && groupData.name.length > 0) {
            data.groups.push(groupData);
          }
        });

        // Извлекаем уроки
        const lessonSelectors = [
          '[data-lesson]',
          '.lesson',
          '.lesson-item',
          '.schedule-item',
          '.timetable-item',
          '[class*="lesson"]',
          '[class*="schedule"]',
          'tr',
          '.row'
        ];
        
        const lessonElements = findElements(lessonSelectors);
        lessonElements.forEach((element, index) => {
          // Ищем подэлементы с информацией об уроке
          const timeElement = element.querySelector('.time, .lesson-time, [class*="time"]') || 
                             element.querySelector('td:first-child, th:first-child');
          const subjectElement = element.querySelector('.subject, .lesson-subject, [class*="subject"]') ||
                                element.querySelector('td:nth-child(2), th:nth-child(2)');
          const teacherElement = element.querySelector('.teacher, .lesson-teacher, [class*="teacher"]') ||
                                element.querySelector('td:nth-child(3), th:nth-child(3)');
          const roomElement = element.querySelector('.room, .lesson-room, [class*="room"]') ||
                             element.querySelector('td:nth-child(4), th:nth-child(4)');
          const groupElement = element.querySelector('.group, .lesson-group, [class*="group"]') ||
                              element.querySelector('td:nth-child(5), th:nth-child(5)');

          const lessonData = {
            id: element.dataset.lesson || element.id || index,
            time: getText(timeElement),
            subject: getText(subjectElement),
            teacher: getText(teacherElement),
            room: getText(roomElement),
            group: getText(groupElement),
            fullText: getText(element),
            className: element.className || '',
            attributes: Array.from(element.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {}),
            html: element.outerHTML
          };

          // Добавляем урок если есть хотя бы время или предмет
          if (lessonData.time || lessonData.subject) {
            data.lessons.push(lessonData);
          }
        });

        // Извлекаем уникальных преподавателей
        const teachers = new Set();
        data.lessons.forEach(lesson => {
          if (lesson.teacher) {
            teachers.add(lesson.teacher);
          }
        });
        data.teachers = Array.from(teachers);

        // Извлекаем уникальные аудитории
        const rooms = new Set();
        data.lessons.forEach(lesson => {
          if (lesson.room) {
            rooms.add(lesson.room);
          }
        });
        data.rooms = Array.from(rooms);

        // Извлекаем временные слоты
        const timeSlots = new Set();
        data.lessons.forEach(lesson => {
          if (lesson.time) {
            timeSlots.add(lesson.time);
          }
        });
        data.timeSlots = Array.from(timeSlots).sort();

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

        // Ищем данные в скриптах
        const scripts = document.querySelectorAll('script');
        data.scriptData = [];
        scripts.forEach((script, index) => {
          if (script.textContent) {
            try {
              // Ищем различные форматы данных
              const patterns = [
                /window\.__INITIAL_STATE__\s*=\s*({.*?});/,
                /window\.__DATA__\s*=\s*({.*?});/,
                /var\s+\w+\s*=\s*({.*?});/,
                /const\s+\w+\s*=\s*({.*?});/,
                /let\s+\w+\s*=\s*({.*?});/
              ];
              
              patterns.forEach(pattern => {
                const match = script.textContent.match(pattern);
                if (match) {
                  try {
                    const jsonData = JSON.parse(match[1]);
                    data.scriptData.push({
                      scriptIndex: index,
                      pattern: pattern.toString(),
                      data: jsonData
                    });
                  } catch (e) {
                    // Игнорируем ошибки парсинга JSON
                  }
                }
              });
            } catch (e) {
              // Игнорируем ошибки
            }
          }
        });

        // Извлекаем все ссылки
        data.links = Array.from(document.querySelectorAll('a')).map(link => ({
          href: link.href,
          text: getText(link),
          title: link.title || '',
          className: link.className || ''
        }));

        // Извлекаем все изображения
        data.images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          title: img.title || '',
          className: img.className || ''
        }));

        // Извлекаем все формы
        data.forms = Array.from(document.querySelectorAll('form')).map(form => ({
          action: form.action || '',
          method: form.method || '',
          className: form.className || '',
          inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || '',
            value: input.value || '',
            placeholder: input.placeholder || '',
            className: input.className || ''
          }))
        }));

        return data;
      });

      return scheduleData;
    } catch (error) {
      console.error('Ошибка при парсинге:', error);
      throw error;
    }
  }

  async saveToJson(data, filename = 'schedule-data.json') {
    const outputPath = path.join(process.cwd(), 'src', 'data', filename);
    
    // Создаем директорию если не существует
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Сохраняем основные данные
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`📁 Основные данные сохранены в: ${outputPath}`);

    // Сохраняем HTML для анализа
    const htmlPath = path.join(process.cwd(), 'src', 'data', 'schedule-raw.html');
    fs.writeFileSync(htmlPath, data.rawHtml, 'utf8');
    console.log(`📄 HTML сохранен в: ${htmlPath}`);

    // Сохраняем только уроки в отдельном файле
    const lessonsPath = path.join(process.cwd(), 'src', 'data', 'lessons.json');
    fs.writeFileSync(lessonsPath, JSON.stringify(data.lessons, null, 2), 'utf8');
    console.log(`📚 Уроки сохранены в: ${lessonsPath}`);

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

export default AdvancedScheduleParser;
