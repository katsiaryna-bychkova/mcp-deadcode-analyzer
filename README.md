# MCP Dead Code Analyzer 

**MCP-сервер для автоматической очистки мертвого кода в JS/TS/React проектах**

## Удаляет
- Неиспользуемые импорты/экспорты
- Мертвые переменные/функции/компоненты/файлы
- Пустые папки

## Быстрый старт

git clone <repo>
cd mcp-deadcode-analyzer
npm install

## Docker команды

docker build -t mcp-deadcode-analyzer .                     # Собирает Docker образ
docker run mcp-deadcode-analyzer smoke                      # Smoke тест {"status": "PASSED", "tools": 2}
docker run --rm -p 8080:8000 mcp-deadcode-analyzer serve    # Запуск сервера
docker run --rm -p 3000:8000 -v $(pwd)/demo_project:/app/demo_project mcp-deadcode-analyzer serve

В новом терминале bash:
curl http://localhost:8080/health                                                # Health check
curl -X POST http://localhost:8080/mcp \                                         # Dry run (Покажет план удаления)
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call","params":{"name":"full_cleanup","dryRun":true}}'   
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call","params":{"name":"full_cleanup"}}'                 #Полная очистка (удалит dead code)

## npm команды

npm run analyze:force   # Полная очистка (Первый раз, дает права)
npm run analyze         # Все последующие разы

npm run full            # Build + запуск сервера (8080)
npm run health          # Health check
npm run start           # Запуск сервера
npm run tools           # Список инструментов 
npm run dry-run         # Показывает что удалится
npm run cleanup         # Полная очистка
npm run reset           # Убить контейнеры
npm run status          # Статус Docker
