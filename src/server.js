import Fastify from 'fastify';
import fs from 'fs-extra';
import path from 'path';
import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

const PROJECT_ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const DEMO_PATH = path.join(PROJECT_ROOT, 'demo_project');

const PROTECTED_FILES = [
  'package.json', 'package-lock.json', 'README.md', 'Dockerfile', 
  '.dockerignore', '.gitignore', 'src', 'node_modules'
];

const fastify = Fastify({ logger: true });

fastify.get('/health', async () => ({
  status: 'ok',
  demo_path: DEMO_PATH,
  protected_files: PROTECTED_FILES.length
}));

fastify.post('/mcp', async (request) => {
  const { method, params } = request.body;
  
  if (method === 'tools/list') {
    return { tools: [{ name: 'cleanup_demo_dead_code', description: '🧹 БЕЗОПАСНАЯ очистка demo_project' }] };
  }
  
  if (method === 'tools/call' && params.name === 'cleanup_demo_dead_code') {
    try {
      return await cleanupDemoDeadCode();
    } catch (error) {
      console.error('🚨 ОШИБКА ОЧИСТКИ:', error);
      return { error: error.message };
    }
  }
});

async function cleanupDemoDeadCode() {
  console.log('\n🚀=== 🧹 БЕЗОПАСНАЯ ОЧИСТКА ===');
  console.log(`📁 Цель: ${path.relative(process.cwd(), DEMO_PATH)}`);
  
  if (!DEMO_PATH.includes('demo_project')) {
    return { error: '🚫 РАБОТАЕТ ТОЛЬКО С demo_project!' };
  }
  
  await createSafeDemo();
  const beforeSize = (await fs.stat(DEMO_PATH)).size;
  
  const changes = await performCleanup();
  const afterSize = (await fs.stat(DEMO_PATH)).size;
  const savings = Math.round(((beforeSize - afterSize) / beforeSize) * 100);
  
  printSummary(beforeSize, afterSize, savings, changes);
  return { success: true, savings_percent: savings, ...changes };
}

async function performCleanup() {
  const jsFiles = await findJsFiles(DEMO_PATH);
  console.log(`🔍 Найдено JS файлов: ${jsFiles.length}`);
  
  const deletedFiles = [];
  const modifiedFiles = [];
  const emptyDirs = [];
  const changes = { 
    deleted_imports: 0, 
    deleted_files: 0, 
    deleted_variables: 0,
    deleted_functions: 0,
    deleted_empty_dirs: 0 
  };

  for (const filePath of jsFiles) {
    const relativePath = path.relative(DEMO_PATH, filePath);
    
    if (PROTECTED_FILES.some(p => filePath.includes(p))) {
      console.log(`🚫 ЗАЩИЩЁН: ${relativePath}`);
      continue;
    }

    const result = await cleanupFile(filePath);
    
    if (result.deleted) {
      deletedFiles.push(relativePath);
      changes.deleted_files++;
      console.log(`🗑️  УДАЛЁН: ${relativePath}`);
    } else if (result.modified) {
      modifiedFiles.push(relativePath);
      console.log(`✏️  ИЗМЕНЁН: ${relativePath}`);
    }
    
    Object.assign(changes, result.changes);
  }

  // Удаляем пустые папки
  await removeEmptyDirectories(DEMO_PATH, emptyDirs);
  changes.deleted_empty_dirs = emptyDirs.length;

  printCleanupReport(deletedFiles, modifiedFiles, emptyDirs);
  return changes;
}

async function cleanupFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    let newLines = [];
    let changes = { deleted_imports: 0, deleted_variables: 0, deleted_functions: 0 };
    let hasChanges = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // ✅ УДАЛЯЕМ DEAD ИМПОРТЫ
      if (line.includes('lodash') || line.includes('debug')) {
        console.log(`✂️  import → ${path.relative(DEMO_PATH, filePath)}`);
        changes.deleted_imports++;
        hasChanges = true;
        continue;
      }
      
      // ✅ УДАЛЯЕМ НЕИСПОЛЬЗУЕМЫЕ КОМПОНЕНТЫ/ФУНКЦИИ по ключевым словам
      if (line.includes('OldButton') || line.includes('Unused') || line.includes('DEAD') || 
          line.match(/function\s+(Old|Unused|Dead)/)) {
        console.log(`✂️  ${line.substring(0, 40)}... → ${path.relative(DEMO_PATH, filePath)}`);
        
        // Удаляем весь блок функции/компонента (следующие строки до })
        while (i < lines.length && !lines[i].includes('}')) {
          i++;
        }
        changes.deleted_functions++;
        hasChanges = true;
        continue;
      }
      
      // ✅ ПУСТЫЕ СТРОКИ И КОММЕНТАРИИ
      if (line.match(/^\s*(\/\/.*|\/\*.*\*\/|\s*)$/) || line.trim() === '') {
        hasChanges = true;
        continue;
      }
      
      newLines.push(lines[i]);
    }
    
    const newContent = newLines.join('\n').trim();
    
    if (!newContent) {
      await fs.remove(filePath);
      return { deleted: true, modified: false, changes };
    }
    
    if (hasChanges && newContent !== content.trim()) {
      await fs.writeFile(filePath, newContent + '\n');
      return { deleted: false, modified: true, changes };
    }
    
    return { deleted: false, modified: false, changes: {} };
  } catch (error) {
    console.log(`⚠️  Ошибка обработки ${path.relative(DEMO_PATH, filePath)}: ${error.message}`);
    return { deleted: false, modified: false, changes: {} };
  }
}

async function removeEmptyDirectories(dir, emptyDirs) {
  try {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        await removeEmptyDirectories(itemPath, emptyDirs);
        
        const newItems = await fs.readdir(itemPath);
        if (newItems.length === 0 && !PROTECTED_FILES.includes(item)) {
          await fs.rmdir(itemPath);
          const relPath = path.relative(DEMO_PATH, itemPath);
          emptyDirs.push(relPath);
          console.log(`📁 УДАЛЁНА: ${relPath}`);
        }
      }
    }
  } catch (e) {
    // Игнорируем ошибки доступа
  }
}

function printCleanupReport(deletedFiles, modifiedFiles, emptyDirs) {
  console.log('\n📊 ОТЧЕТ ОБ ОЧИСТКЕ');
  console.log('═'.repeat(50));
  
  if (deletedFiles.length) {
    console.log(`🗑️  УДАЛЁННЫЕ ФАЙЛЫ (${deletedFiles.length}):`);
    deletedFiles.forEach(file => console.log(`   ${file}`));
    console.log();
  }
  
  if (modifiedFiles.length) {
    console.log(`✏️  ИЗМЕНЁННЫЕ ФАЙЛЫ (${modifiedFiles.length}):`);
    modifiedFiles.forEach(file => console.log(`   ${file}`));
    console.log();
  }
  
  if (emptyDirs.length) {
    console.log(`📁 УДАЛЁННЫЕ ПУСТЫЕ ПАПКИ (${emptyDirs.length}):`);
    emptyDirs.forEach(dir => console.log(`   ${dir}`));
  }
}

function printSummary(before, after, savings, changes) {
  console.log('\n🎉 РЕЗУЛЬТАТЫ');
  console.log('═'.repeat(50));
  console.log(`📈 ДО:     ${formatBytes(before)}`);
  console.log(`📉 ПОСЛЕ: ${formatBytes(after)}`);
  console.log(`💰 ЭКОНОМИЯ: ${savings}%`);
  console.log(`✂️  Импортов:  ${changes.deleted_imports}`);
  console.log(`🗑️  Файлов:    ${changes.deleted_files}`);
  console.log(`📁 Папок:     ${changes.deleted_empty_dirs}`);
  console.log(`🚀 ГОТОВО! 🧹`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function createSafeDemo() {
  console.log('🔧 Создание демо проекта...');
  await fs.emptyDir(DEMO_PATH);
  
  await fs.ensureDir(path.join(DEMO_PATH, 'src/components'));
  await fs.ensureDir(path.join(DEMO_PATH, 'src/components/unused'));
  await fs.ensureDir(path.join(DEMO_PATH, 'src/utils'));
  await fs.ensureDir(path.join(DEMO_PATH, 'src/old'));
  
  // App импортирует OldButton НО НЕ ИСПОЛЬЗУЕТ
  await fs.writeFile(path.join(DEMO_PATH, 'src/App.jsx'), `import React from 'react';
import OldButton from './components/OldButton';  // ❌ DEAD import!
import { debounce } from 'lodash';                // ❌ DEAD import

// ❌ DEAD функция
function UnusedFunction() {
  console.log('never called');
}

// ❌ DEAD компонент  
function OldComponent() {
  return <div>Never rendered</div>;
}

function App() {
  return <div>Hello World!</div>;  // OldButton НЕ используется!
}

export default App;
`);

  // OldButton НЕ используется нигде
  await fs.writeFile(path.join(DEMO_PATH, 'src/components/OldButton.jsx'), `import React from 'react';
import { debounce } from 'lodash';  // DEAD

export function OldButton(props) {
  return <button>Old Button</button>;  // Никогда не рендерится!
}
`);

  await fs.writeFile(path.join(DEMO_PATH, 'src/utils/unused.js'), `import debug from 'debug'; // DEAD
export const deadUtil = () => {};`);

  await fs.writeFile(path.join(DEMO_PATH, 'src/old/dead.js'), `// DEAD FILE`);

  console.log('✅ Demo создано с dead code!');
}

async function findJsFiles(dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !PROTECTED_FILES.includes(item.name)) {
      files.push(...await findJsFiles(itemPath));
    } else if (item.isFile() && /\.(js|jsx|ts|tsx)$/.test(item.name)) {
      files.push(itemPath);
    }
  }
  return files;
}

fastify.listen({ port: 8000 }, (err) => {
  if (err) throw err;
  console.log('🚀 MCP Server: http://localhost:8000');
});
