echo "🚀 MCP DeadCode Analyzer - Полная очистка!"

# 1. Очистка старых контейнеров + портов
echo "🧹 Очищаем старые контейнеры..."
docker stop mcp-analyzer 2>/dev/null || true
docker rm mcp-analyzer 2>/dev/null || true

# 2. Build образа
echo "🔨 Собираем Docker образ..."
docker build -t mcp-deadcode-analyzer . || { echo "❌ Ошибка сборки!"; exit 1; }

# 3. Запуск сервера на СЛУЧАЙНОМ порту
PORT=$((8000 + RANDOM % 100))
echo "▶️  Запускаем сервер на порту $PORT..."
docker run -d --name mcp-analyzer -p $PORT:8000 -v $(pwd)/demo_project:/app/demo_project mcp-deadcode-analyzer &
ANALYZER_PID=$!

# 4. Ждем готовности
echo "⏳ Ждем запуска сервера (порт $PORT)..."
for i in {1..10}; do
  if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "✅ Сервер готов на http://localhost:$PORT"
    break
  fi
  sleep 1
done

# Проверка готовности
curl -s http://localhost:$PORT/health > /dev/null 2>&1 || { echo "❌ Сервер не запустился!"; docker stop $ANALYZER_PID 2>/dev/null; exit 1; }

# 5. Dry run - ПОЛУЧАЕМ ТОЧНЫЙ ПЛАН
echo ""
echo "=== ПЛАН УДАЛЕНИЯ ==="
echo "═══════════════════════════════════════════"

# Сканируем файлы ДО очистки
echo "📄 Файлы ДО очистки:"
find demo_project -name "*.ts" -o -name "*.js" | head -10 || echo "Нет файлов"

echo ""
echo "📊 Статистика удаления:"
curl -s -X POST http://localhost:$PORT/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "full_cleanup", "dryRun": true}}' | \
grep -E "(✂️|🗑️|📄|📁)" || echo "План готов"

# 6. СПРАШИВАЕМ ПОДТВЕРЖДЕНИЕ
echo ""
echo "⚠️  НИЧЕГО ЕЩЕ НЕ УДАЛЕНО!"
read -p "🧹 Запустить РЕАЛЬНУЮ очистку? (y/N): " confirm

if [[ $confirm =~ [yY] ]]; then
  echo ""
  echo "🔥 === НАЧИНАЕМ РЕАЛЬНОЕ УДАЛЕНИЕ ==="
  echo "══════════════════════════════════════"
  
  # РЕАЛЬНАЯ очистка
  curl -s -X POST http://localhost:$PORT/mcp \
    -H "Content-Type: application/json" \
    -d '{"method": "tools/call", "params": {"name": "full_cleanup"}}'
  
  echo ""
  echo "✅ ОЧИСТКА ЗАВЕРШЕНА!"
else
  echo "ℹ️  Очистка ОТМЕНЕНА - файлы НЕ ИЗМЕНЕНЫ!"
fi

# 7. Показываем результат
echo ""
echo "📁 ИТОГОВЫЕ файлы:"
ls -la demo_project/src/ 2>/dev/null || echo "Папка пуста"
find demo_project -name "*.ts" -o -name "*.js" 2>/dev/null | head -5 || echo "Нет файлов"

# 8. Останавливаем сервер
echo "🛑 Останавливаем сервер..."
docker stop mcp-analyzer 2>/dev/null
docker rm mcp-analyzer 2>/dev/null

echo ""
echo "🎉 ГОТОВО!"
echo "Проверьте изменения: ls -la demo_project/src/"
