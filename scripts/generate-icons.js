import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG-шаблон для иконки
const iconSvg = `<svg width="SIZE" height="SIZE" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#667eea"/>
  <rect x="80" y="120" width="352" height="40" rx="20" fill="white"/>
  <rect x="80" y="200" width="280" height="40" rx="20" fill="white"/>
  <rect x="80" y="280" width="320" height="40" rx="20" fill="white"/>
  <rect x="80" y="360" width="240" height="40" rx="20" fill="white"/>
  <text x="256" y="460" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">1М</text>
</svg>`;

// Размеры иконок для PWA
const iconSizes = [48, 72, 96, 144, 192, 512];

// Создаем директорию public если её нет
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Генерируем иконки
iconSizes.forEach(size => {
  const svgContent = iconSvg.replace(/SIZE/g, size);
  const filename = `icon-${size}.png`;
  const filepath = path.join(publicDir, filename);
  
  // Для простоты создаем SVG файлы, которые браузеры могут использовать как PNG
  // В реальном проекте лучше использовать библиотеку типа sharp для конвертации
  const svgFilename = `icon-${size}.svg`;
  const svgFilepath = path.join(publicDir, svgFilename);
  
  fs.writeFileSync(svgFilepath, svgContent);
  console.log(`Создана иконка: ${svgFilename}`);
});

console.log('Все иконки созданы!');
console.log('Примечание: Для продакшена рекомендуется конвертировать SVG в PNG используя библиотеку sharp или аналогичную.');
