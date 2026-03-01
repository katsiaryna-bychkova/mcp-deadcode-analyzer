# MCP Dead Code Analyzer 

**MCP-сервер для автоматической очистки мертвого кода в JS/TS/React проектах**

## 🎯 Удаляет
- Неиспользуемые импорты/экспорты
- Мертвые переменные/функции/компоненты/файлы
- Пустые папки

## Быстрый старт

git clone <repo>
cd mcp-deadcode-analyzer

npm install          # Установить
npm run analyze:force   # Полная очистка (Первый раз, дает права)
npm run analyze         # Все последующие разы

## Остальные команды

npm run full         # Build + запуск сервера (8080)
npm run health       # Health check
npm run start        # Запуск сервера
npm run tools        # Список инструментов 
npm run dry-run      # Показывает что удалится
npm run cleanup      # Полная очистка
npm run reset        # Убить контейнеры
npm run status       # Статус Docker

## Docker команды
docker build -t mcp-deadcode-analyzer .
docker run mcp-deadcode-analyzer smoke
curl http://localhost:8000/health (в другом bash)
docker run -p 8080:8000 -v $(pwd)/demo_project:/app/demo_project mcp-deadcode-analyzer