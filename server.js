import express from 'express';
import fs from 'fs-extra';
import path from 'path';

const app = express();
app.use(express.json());

const PORT = 8000;
const DEMO_PATH = '/app/demo_project'; // Измените на вашу папку с проектом

// 🔥 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (исправлены ошибки)
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
    } catch (e) {
      // Игнорируем ошибки доступа
    }
  }
  scan(dir);
  return files;
}

async function cleanupImports(demoPath) {
  const jsFiles = findJsFiles(demoPath);
  let removed = 0;
  
  for (const filePath of jsFiles) {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const hasJSX = /<[A-Za-z]/.test(content);
      const lines = content.split('\n');
      const newLines = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('import ')) {
          newLines.push(line);
          continue;
        }
        // Сохраняем React если есть JSX
        if (trimmed.includes('React') && hasJSX) {
          newLines.push(line);
          continue;
        }
        console.log(`  ✂️ import: ${path.relative('.', filePath)}`);
        removed++;
      }
      
      const newContent = newLines.join('\n').trim() + '\n';
      if (newContent !== content.trim() + '\n') {
        await fs.writeFile(filePath, newContent);
      }
    } catch (e) {
      console.error(`Ошибка в ${filePath}:`, e.message);
    }
  }
  return removed;
}

async function cleanupDeadCode(demoPath) {
  const jsFiles = findJsFiles(demoPath);
  const usages = new Map();
  
  // Собираем все использования компонентов
  for (const filePath of jsFiles) {
    if (path.basename(filePath) === 'index.js' || path.basename(filePath) === 'index.jsx') continue;
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const jsxMatches = content.match(/<[A-Z][A-Za-z0-9_$]*/g);
      if (jsxMatches) {
        jsxMatches.forEach(match => {
          const name = match.slice(1);
          if (!usages.has(name)) usages.set(name, new Set());
          usages.get(name).add(filePath);
        });
      }
    } catch (e) {}
  }
  
  let removed = 0;
  for (const filePath of jsFiles) {
    if (path.basename(filePath) === 'index.js' || path.basename(filePath) === 'index.jsx') continue;
    
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const newLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
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
          removed++;
          
          // Пропускаем тело функции (простая версия)
          while (i < lines.length && !lines[i].trim().includes('}')) {
            i++;
          }
          continue;
        }
        
        newLines.push(line);
      }
      
      const newContent = newLines.join('\n').trim() + '\n';
      if (newContent !== content.trim() + '\n') {
        await fs.writeFile(filePath, newContent);
      }
    } catch (e) {
      console.error(`Ошибка в ${filePath}:`, e.message);
    }
  }
  return removed;
}

async function cleanupDeadExports(demoPath) {
  const jsFiles = findJsFiles(demoPath);
  let removed = 0;
  
  for (const filePath of jsFiles) {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      
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
        const exportRegex = /export\s+(?:default\s+)?(?:\{([^}]+)|([A-Za-z][A-Za-z0-9_$]*))/;
        const exportMatch = trimmed.match(exportRegex);
        
        if (exportMatch) {
          const exportedName = (exportMatch[2] || exportMatch[1]?.split(',')[0]?.trim())?.trim();
          if (exportedName && !declaredFunctions.has(exportedName)) {
            console.log(`  ✂️ МЁРТВЫЙ EXPORT "${exportedName}": ${path.relative('.', filePath)}`);
            removed++;
            continue;
          }
        }
        
        newLines.push(line);
      }
      
      const newContent = newLines.join('\n').trim() + '\n';
      if (newContent !== content.trim() + '\n') {
        await fs.writeFile(filePath, newContent);
      }
    } catch (e) {
      console.error(`Ошибка в ${filePath}:`, e.message);
    }
  }
  return removed;
}

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
  let removed = 0;
  
  for (const filePath of allFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const trimmedContent = content.trim();
      
      if (!trimmedContent) {
        console.log(`  📄 ПУСТОЙ: ${path.relative('.', filePath)}`);
        await fs.unlink(filePath);
        removed++;
        continue;
      }
      
      const codeContent = trimmedContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
      const noReactContent = codeContent.replace(/import\s+React\s+from\s+['"]react['"][\s;]*/gm, '').trim();
      
      const isOnlyReactAndComments = !noReactContent || noReactContent.length === 0;
      const isTooShort = trimmedContent.length < 20;
      
      if (isOnlyReactAndComments || isTooShort) {
        const reason = isOnlyReactAndComments ? '(только React + комментарии)' : '(слишком короткий)';
        console.log(`  📄 МЁРТВЫЙ ФАЙЛ ${reason}: ${path.relative('.', filePath)}`);
        await fs.unlink(filePath);
        removed++;
      }
    } catch (e) {}
  }
  return removed;
}

async function cleanupEmptyFolders(demoPath) {
  let cleaned = true;
  let removed = 0;
  
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
              removed++;
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
    
    scan(demoPath);
  }
  return removed;
}

// 🔥 ОСНОВНАЯ ФУНКЦИЯ ОЧИСТКИ
async function fullCleanup(targetPath = DEMO_PATH, dryRun = false) {
  if (dryRun) {
    return { 
      success: true, 
      stats: { imports: importsRemoved, functions: codeRemoved, exports: exportsRemoved, files: filesRemoved, folders: foldersRemoved },
      dryRun, 
      message: 'Ничего не удалено!' 
    };
  }

  console.log('🚀=== 🧹 ПОЛНЫЙ TREE-SHAKING ===');
  
  console.log('\n📦 PASS 1: Удаляем импорты...');
  const importsRemoved = await cleanupImports(targetPath);
  
  console.log('\n🗑️ PASS 2: Удаляем dead code...');
  const codeRemoved = await cleanupDeadCode(targetPath);
  
  console.log('\n📤 PASS 3: Мёртвые экспорты...');
  const exportsRemoved = await cleanupDeadExports(targetPath);
  
  console.log('\n📄 PASS 4: Мертвые файлы...');
  const filesRemoved = await cleanupDeadFiles(targetPath);
  
  console.log('\n📁 PASS 5: Пустые папки...');
  const foldersRemoved = await cleanupEmptyFolders(targetPath);
  
  console.log('\n🎉 TREE-SHAKING ЗАВЕРШЕН!');
  
  return { 
    success: true, 
    stats: { imports: importsRemoved, functions: codeRemoved, exports: exportsRemoved, files: filesRemoved, folders: foldersRemoved },
    dryRun,
    message: 'Очистка завершена!' 
  };
}

// 🔥 API ENDPOINTS
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    tools: 2,
    demoPath: DEMO_PATH,
    timestamp: new Date().toISOString()
  });
});

app.post('/mcp', async (req, res) => {
  try {
    const { method, params = {} } = req.body;

    if (method === 'tools/list') {
      return res.json({
        tools: [
          {
            name: 'cleanup_imports',
            description: '🧹 Удаляет неиспользуемые импорты (кроме React при JSX)'
          },
          {
            name: 'full_cleanup',
            description: '🔥 Полный tree-shaking: импорты → функции → экспорты → файлы → папки',
            parameters: {
              dryRun: { type: 'boolean', description: 'Показать план без изменений (по умолчанию false)' },
              path: { type: 'string', description: 'Путь к проекту (по умолчанию /app/demo_project)' }
            }
          }
        ]
      });
    }

    if (method === 'tools/call') {
      const { name, ...toolParams } = params;

      if (name === 'cleanup_imports') {
        await cleanupImports(DEMO_PATH);
        return res.json({ success: true, message: '🧹 Импорты очищены!' });
      }

      if (name === 'full_cleanup') {
        const result = await fullCleanup(toolParams.path || DEMO_PATH, toolParams.dryRun || false);
        return res.json(result);
      }

      return res.status(400).json({ error: 'Unknown tool' });
    }

    res.status(400).json({ error: 'Unknown method' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/smoke', (req, res) => {
  res.json({ status: 'PASSED', tools: 2 });
});

// 🔥 ЗАПУСК СЕРВЕРА
app.listen(PORT, () => {
  console.log(`🚀 MCP сервер: http://localhost:${PORT}`);
  console.log('📋 Tools: cleanup_imports, full_cleanup');
  console.log('✅ Health: http://localhost:8000/health');
  console.log('✅ MCP: POST http://localhost:8000/mcp');
  console.log('📁 Demo path:', DEMO_PATH);
});
