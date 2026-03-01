import fs from 'fs-extra';
import path from 'path';

async function fullCleanup() {
  console.log('🚀=== 🧹 ПОЛНЫЙ TREE-SHAKING ===');
  
  const demoPath = path.join(process.cwd(), 'demo_project');
  
  // PASS 1: Импорты
  console.log('\n📦 PASS 1: Удаляем импорты...');
  await cleanupImports(demoPath);
  
  // PASS 2: Dead code (функции/стрелки/const)
  console.log('\n🗑️ PASS 2: Удаляем dead code...');
  await cleanupDeadCode(demoPath);
  
  // PASS 3: Мёртвые экспорты
  console.log('\n📤 PASS 3: Мёртвые экспорты...');
  await cleanupDeadExports(demoPath);
  
  // PASS 4: Файлы только с комментариями + пустые
  console.log('\n📄 PASS 4: Мертвые файлы...');
  await cleanupDeadFiles(demoPath);
  
  // PASS 5: Пустые папки
  console.log('\n📁 PASS 5: Пустые папки...');
  await cleanupEmptyFolders(demoPath);
  
  console.log('\n🎉 TREE-SHAKING ЗАВЕРШЕН!');
}

async function cleanupImports(demoPath) {
  const jsFiles = findJsFiles(demoPath);
  
  for (const filePath of jsFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    const hasJSX = /<[A-Za-z]/.test(content);
    const lines = content.split('\n');
    const newLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import ')) {
        newLines.push(line);
        continue;
      }
      if (trimmed.includes('React') && hasJSX) {
        newLines.push(line);
        continue;
      }
      console.log(`  ✂️ import: ${path.relative('.', filePath)}`);
    }
    
    const newContent = newLines.join('\n').trim() + '\n';
    if (newContent !== content.trim() + '\n') {
      fs.writeFileSync(filePath, newContent);
    }
  }
}

// ✅ PASS 2: УДАЛЯЕМ export const deadUtil = () => {}
async function cleanupDeadCode(demoPath) {
  const jsFiles = findJsFiles(demoPath);
  const usages = new Map();
  
  // Собираем JSX использования
  for (const filePath of jsFiles) {
    if (path.basename(filePath) === 'index.js' || path.basename(filePath) === 'index.jsx') continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const jsxMatches = content.match(/<[A-Z][A-Za-z0-9_$]*/g);
    if (jsxMatches) {
      jsxMatches.forEach(match => {
        const name = match.slice(1);
        if (!usages.has(name)) usages.set(name, new Set());
        usages.get(name).add(filePath);
      });
    }
  }
  
  for (const filePath of jsFiles) {
    if (path.basename(filePath) === 'index.js' || path.basename(filePath) === 'index.jsx') continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // ✅ Ловим ВСЕ типы dead code:
      // 1. function Component()
      // 2. const Component = () => {}
      // 3. export const deadUtil = () => {}
      // 4. const deadUtil = () => {}
      const deadCodePatterns = [
        /(?:export\s+)?(?:function|const|let|var)\s+([A-Z][A-Za-z0-9_$]*)\s*(?:=|\()/,
        /export\s+const\s+([a-z][A-Za-z0-9_$]*)\s*=\s*\(/
      ];
      
      let isDeadCode = false;
      let name = '';
      
      for (const pattern of deadCodePatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          name = match[1];
          const fileUsages = usages.get(name) || new Set();
          if (fileUsages.size === 0) {
            isDeadCode = true;
            break;
          }
        }
      }
      
      if (isDeadCode) {
        console.log(`  🗑️ ${name}(): ${path.relative('.', filePath)}`);
        
        // Удаляем блок до }
        let braceCount = trimmed.includes('{') ? 1 : 0;
        if (trimmed.includes('=>')) braceCount = 1; // стрелочные
        
        i++;
        while (i < lines.length && braceCount > 0) {
          const currentLine = lines[i];
          for (const char of currentLine) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
          i++;
        }
        i--;
        continue;
      }
      
      newLines.push(line);
    }
    
    const newContent = newLines.join('\n').trim() + '\n';
    if (newContent !== content.trim() + '\n') {
      fs.writeFileSync(filePath, newContent);
    }
  }
}

async function cleanupDeadExports(demoPath) {
  const jsFiles = findJsFiles(demoPath);
  
  for (const filePath of jsFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const declaredFunctions = new Set();
    const funcRegex = /(?:function|const|let|var)\s+([A-Za-z][A-Za-z0-9_$]*)\s*(?:=|\()/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      declaredFunctions.add(match[1]);
    }
    
    const lines = content.split('\n');
    const newLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      const exportMatches = [
        /export\s+(?:default\s+)?(?:function|const|let|var)\s+([A-Za-z][A-Za-z0-9_$]*)/,
        /export\s*\{([^}]+)\}/,
        /export\s+default\s+([A-Za-z][A-Za-z0-9_$]*)/
      ];
      
      let shouldRemove = false;
      let exportedName = '';
      
      for (const regex of exportMatches) {
        const exportMatch = trimmed.match(regex);
        if (exportMatch) {
          exportedName = exportMatch[1] || exportMatch[2]?.split(',')[0]?.trim();
          if (exportedName && !declaredFunctions.has(exportedName)) {
            console.log(`  ✂️ МЁРТВЫЙ EXPORT "${exportedName}": ${path.relative('.', filePath)}`);
            shouldRemove = true;
            break;
          }
        }
      }
      
      if (!shouldRemove) {
        newLines.push(line);
      }
    }
    
    const newContent = newLines.join('\n').trim() + '\n';
    if (newContent !== content.trim() + '\n') {
      fs.writeFileSync(filePath, newContent);
    }
  }
}

// ✅ PASS 4: Расширенная очистка мертвых файлов
async function cleanupDeadFiles(demoPath) {
  const allFiles = [];
  
  function scan(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(fullPath);
        } else if (/\.(js|jsx|ts|tsx)$/.test(item.name)) {
          allFiles.push(fullPath);
        }
      }
    } catch (e) {}
  }
  
  scan(demoPath);
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const trimmedContent = content.trim();
      
      if (!trimmedContent) {
        console.log(`  📄 ПУСТОЙ: ${path.relative('.', filePath)}`);
        fs.unlinkSync(filePath);
        continue;
      }
      
      // ✅ УДАЛЯЕМ если:
      // 1. ТОЛЬКО React импорт
      // 2. React импорт + комментарии
      // 3. ТОЛЬКО комментарии
      // 4. Очень короткие файлы (< 20 символов)
      
      const codeContent = trimmedContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
      const noReactContent = codeContent.replace(/import\s+React\s+from\s+['"]react['"][\s;]*/gm, '').trim();
      
      const isOnlyReactAndComments = !noReactContent || noReactContent.length === 0;
      const isTooShort = trimmedContent.length < 20;
      
      if (isOnlyReactAndComments || isTooShort) {
        const reason = isOnlyReactAndComments ? 
          '(только React + комментарии)' : 
          '(слишком короткий)';
        console.log(`  📄 МЁРТВЫЙ ФАЙЛ ${reason}: ${path.relative('.', filePath)}`);
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }
}

async function cleanupEmptyFolders(demoPath) {
  let cleaned = true;
  
  while (cleaned) {
    cleaned = false;
    
    function scan(dir) {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        let hasContent = false;
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            scan(fullPath);
          } else {
            hasContent = true;
          }
        }
        
        if (!hasContent) {
          try {
            const remaining = fs.readdirSync(dir);
            if (remaining.length === 0) {
              console.log(`  📁 ПУСТАЯ: ${path.relative('.', dir)}`);
              fs.rmdirSync(dir);
              cleaned = true;
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
    
    scan(demoPath);
  }
}

function findJsFiles(dir) {
  const files = [];
  function scan(directory) {
    try {
      const items = fs.readdirSync(directory, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) {
          scan(fullPath);
        } else if (/\.(js|jsx|ts|tsx)$/.test(item.name)) {
          files.push(fullPath);
        }
      }
    } catch (e) {}
  }
  scan(dir);
  return files;
}

fullCleanup();
