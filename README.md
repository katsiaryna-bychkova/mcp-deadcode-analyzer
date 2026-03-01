# MCP Dead Code Analyzer 

**MCP-сервер для автоматической очистки мертвого кода в JS/TS/React проектах**

## **Что делает MCP DeadCode Analyzer**

### ** Проблема: **
> **10-30% кода в React/JS/TS проектах = dead code**  
> - Неиспользуемые импорты/экспорты (`import Unused from './Unused'`)
> - Мертвые компоненты/функции/переменные (`export function NeverUsed() {}`)
> - Пустые файлы/папки после рефакторинга  
> **Результат:** bundle +30% → сборка медленнее → деплои дольше

### ** Для кого полезен: **
- **Frontend разработчики** (React, Vue, Angular)
- **Tech Lead'ы** (code review, legacy cleanup)
- **DevOps** (оптимизация CI/CD, bundle size)

### ** 2 MCP инструмента: **
| **`cleanup_imports`** | Удаляет неиспользуемые импорты |
| **`full_cleanup`** | Полный tree-shaking (-10% кода) |

## Удаляет
- Неиспользуемые импорты/экспорты
- Мертвые переменные/функции/компоненты/файлы
- Пустые папки

## Быстрый старт

git clone <repo>
cd mcp-deadcode-analyzer
npm install

## Запустить анализатор можно 3 способами

## Запуск через DEMO.md

chmod +x DEMO.md        # 1. Сделай исполняемым
bash DEMO.md            # 2. Первый запуск (создаст demo_project)
bash DEMO.md            # 3. Второй запуск (пропустит создание)

## Docker команды

docker build -t mcp-deadcode-analyzer .                     # Собирает Docker образ
docker run mcp-deadcode-analyzer smoke                      # Smoke тест {"status": "PASSED", "tools": 2}
docker run --rm -p 8080:8000 mcp-deadcode-analyzer serve    # Запуск сервера
docker run --rm -p 3000:8000 -v $(pwd)/demo_project:/app/demo_project mcp-deadcode-analyzer serve

В новом терминале bash:
curl http://localhost:8080/health                                                # Health check
curl -X POST http://localhost:8080/mcp \                                         
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call","params":{"name":"full_cleanup","dryRun":true}}'   # Dry run (Покажет план удаления)
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
