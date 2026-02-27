# MCP Dead Code Analyzer

** Находит и удаляет dead code в JS/TS проектах**

## 🛠️ Tools
- `cleanup_demo_dead_code` — полная очистка demo проекта

## 🚀 Быстрый старт
```bash
git clone <repo>
cd mcp-deadcode-analyzer
docker build -t mcp-deadcode .
docker run -p 8000:8000 mcp-deadcode serve
curl http://localhost:8000/health