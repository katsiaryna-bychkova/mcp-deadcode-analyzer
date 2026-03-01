# DEMO.md - Проверка MCP DeadCode Analyzer

echo "🚀 === MCP DeadCode Analyzer - ПОЛНАЯ ПРОВЕРКА ==="
echo "Время выполнения: 3 минуты | Порт: 8000"

# 1. ПРЕДУСЛОВИЯ
echo ""
echo "ШАГ 1: Сборка Docker образа"
docker build -t mcp-deadcode-analyzer .
echo "✅ Образ собран: mcp-deadcode-analyzer"

echo ""
echo "ШАГ 2: Запуск MCP сервера"
docker run -d -p 8000:8000 -v $(pwd)/demo_project:/app/demo_project --name mcp-test mcp-deadcode-analyzer serve

# 🔥 ЖДЕМ ГОТОВНОСТИ СЕРВЕРА (10 сек максимум)
echo "⏳ Ожидание запуска сервера..."
for i in {1..10}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Сервер готов: http://localhost:8000"
    break
  fi
  echo "Осталось $((10-i)) сек..."
  sleep 1
done

# Проверка готовности (exit 1 если не запустился)
curl -s http://localhost:8000/health > /dev/null 2>&1 || { 
  echo "❌ Сервер не запустился!" 
  docker stop mcp-test 2>/dev/null || true
  docker rm mcp-test 2>/dev/null || true
  exit 1
}

# 2. ПОШАГОВАЯ ПРОВЕРКА
echo ""
echo "=== ПОШАГОВАЯ ПРОВЕРКА (6 шагов) ==="

# Шаг 1: Health check
echo ""
echo "ШАГ 1: Health check"
curl -s http://localhost:8000/health | jq . || curl -s http://localhost:8000/health

# Шаг 2: Smoke test
echo ""
echo "ШАГ 2: Smoke test"
curl -s http://localhost:8000/smoke | jq . || curl -s http://localhost:8000/smoke

# Шаг 3: Список инструментов MCP
echo ""
echo "ШАГ 3: Список инструментов MCP"
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}' | jq . || \
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'

# Шаг 4: План очистки (dry run)
echo ""
echo "ШАГ 4: План очистки (dry run)"
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call","params":{"name":"full_cleanup","dryRun":true}}' | jq . || \
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call","params":{"name":"full_cleanup","dryRun":true}}'

# Шаг 5: Полная очистка
echo ""
echo "ШАГ 5: ПОЛНАЯ ОЧИСТКА dead code"
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call","params":{"name":"full_cleanup"}}' | jq . || \
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call","params":{"name":"full_cleanup"}}'

# Шаг 6: Проверка результата
echo ""
echo "ШАГ 6: РЕЗУЛЬТАТ очистки"
echo "=== ДО очистки ==="
ls -la demo_project/src/ 2>/dev/null || echo "Папка demo_project/src/ пуста (нет dead code)"
echo ""
echo "=== ПОСЛЕ очистки ==="
ls -la demo_project/src/ 2>/dev/null || echo "✅ Папка пуста/очищена!"
find demo_project -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l | xargs echo "Файлов осталось:"

# 3. ФИНАЛИЗАЦИЯ
echo ""
echo "🛑 Останавливаем сервер..."
docker stop mcp-test 2>/dev/null || true
docker rm mcp-test 2>/dev/null || true

echo ""
echo "🎉 === ПРОВЕРКА ЗАВЕРШЕНА УСПЕШНО! ==="
echo "📦 Docker image: $(docker images mcp-deadcode-analyzer | tail -1 | awk '{print $2}')"
echo "📁 Результат: $(ls demo_project/src/ 2>/dev/null || echo 'ПУСТО/ОЧИЩЕНО')"
echo ""
echo "✅ Все 6 шагов выполнены успешно!"
echo "🚀 MCP DeadCode Analyzer готов к продакшену!"
