import fs from 'fs-extra';
import path from 'path';

async function cleanupDemo() {
  console.log('🧹 ОЧИСТКА ИМПОРТОВ');
  
  const demoPath = path.join(process.cwd(), 'demo_project');
  console.log('📂 Ищем в:', demoPath);
  
  const jsFiles = [];
  
  function scan(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(fullPath);
        } else if (/\.(js|jsx|ts|tsx)$/.test(item.name)) {
          jsFiles.push(fullPath);
        }
      }
    } catch (e) {}
  }
  
  scan(demoPath);
  console.log(`📁 Найдено файлов: ${jsFiles.length}`);
  
  let totalRemoved = 0;
  
  for (const filePath of jsFiles) {
    console.log(`\n🔍 ${path.relative(process.cwd(), filePath)}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // ✅ ТОЧНАЯ проверка JSX: < + буква/заглавная буква (теги и компоненты)
    const hasJSX = /<[A-Za-z]/.test(content);
    console.log(`  JSX в файле: ${hasJSX}`);
    
    const lines = content.split('\n');
    const newLines = [];
    let removed = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // НЕ импорт - ОСТАЕТСЯ
      if (!trimmed.startsWith('import ')) {
        newLines.push(line);
        continue;
      }
      
      console.log(`  📥 "${trimmed}"`);
      
      // React: оставляем ТОЛЬКО если есть JSX
      if (trimmed.includes('React')) {
        if (hasJSX) {
          console.log(`  ✅ React нужен (JSX: ${hasJSX})`);
        } else {
          console.log(`  ✂️ УДАЛЯЕМ React (нет JSX)`);
          removed++;
          continue;
        }
      } else {
        // Все остальные импорты УДАЛЯЕМ
        console.log(`  ✂️ УДАЛЯЕМ другой import`);
        removed++;
        continue;
      }
      
      newLines.push(line);
    }
    
    if (removed > 0) {
      const newContent = newLines.join('\n').trim() + '\n';
      fs.writeFileSync(filePath, newContent);
      console.log(`  ✅ ИЗМЕНЕН (${removed} строк удалено)`);
      totalRemoved += removed;
    }
  }
  
  console.log(`\n🎉 УДАЛЕНО: ${totalRemoved} строк`);
}

cleanupDemo();
