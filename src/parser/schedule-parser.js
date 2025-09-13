import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class ScheduleParser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Устанавливаем User-Agent для избежания блокировки
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Устанавливаем размер окна
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async parseSchedule(url) {
    try {
      console.log('Переходим на страницу:', url);
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Ждем загрузки контента
      await this.page.waitForTimeout(3000);

      // Извлекаем данные расписания
      const scheduleData = await this.page.evaluate(() => {
        const data = {
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
          groups: [],
          lessons: [],
          metadata: {}
        };

        // Извлекаем информацию о группах
        const groupElements = document.querySelectorAll('[data-group], .group, .group-item');
        groupElements.forEach((element, index) => {
          const groupData = {
            id: element.dataset.group || element.id || index,
            name: element.textContent?.trim() || element.querySelector('.group-name')?.textContent?.trim() || '',
            element: element.outerHTML
          };
          data.groups.push(groupData);
        });

        // Извлекаем информацию об уроках
        const lessonElements = document.querySelectorAll('[data-lesson], .lesson, .lesson-item, .schedule-item');
        lessonElements.forEach((element, index) => {
          const lessonData = {
            id: element.dataset.lesson || element.id || index,
            time: element.querySelector('.time, .lesson-time')?.textContent?.trim() || '',
            subject: element.querySelector('.subject, .lesson-subject')?.textContent?.trim() || '',
            teacher: element.querySelector('.teacher, .lesson-teacher')?.textContent?.trim() || '',
            room: element.querySelector('.room, .lesson-room')?.textContent?.trim() || '',
            group: element.querySelector('.group, .lesson-group')?.textContent?.trim() || '',
            element: element.outerHTML
          };
          data.lessons.push(lessonData);
        });

        // Извлекаем метаданные
        data.metadata = {
          date: new URLSearchParams(window.location.search).get('date') || '',
          groupId: new URLSearchParams(window.location.search).get('group') || '',
          publicationId: window.location.pathname.split('/').pop() || '',
          pageTitle: document.title,
          lastModified: document.lastModified,
          contentLength: document.documentElement.innerHTML.length
        };

        // Пытаемся найти данные в JSON формате на странице
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.textContent) {
            try {
              // Ищем JSON данные в скриптах
              const jsonMatch = script.textContent.match(/\{.*\}/);
              if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[0]);
                data.scriptData = jsonData;
              }
            } catch (e) {
              // Игнорируем ошибки парсинга JSON
            }
          }
        });

        // Извлекаем все текстовое содержимое для анализа
        data.fullText = document.body.textContent || '';
        
        // Извлекаем все ссылки
        data.links = Array.from(document.querySelectorAll('a')).map(link => ({
          href: link.href,
          text: link.textContent?.trim() || '',
          title: link.title || ''
        }));

        // Извлекаем все изображения
        data.images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt || '',
          title: img.title || ''
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

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Данные сохранены в: ${outputPath}`);
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

export default ScheduleParser;
