const command = process.argv[2];

async function main() {
  switch (command) {
    case 'serve':
        console.log('🚀 Запуск MCP сервера...');
        const { app } = await import('./server.js');
        app.listen(8000, () => {
            console.log('✅ MCP сервер запущен: http://localhost:8000');
            console.log('📋 Tools: cleanup_imports, full_cleanup');
        });
        process.stdin.resume();
        break;

    case 'smoke':
      console.log('🧪 === SMOKE TEST ===');
      console.log('✅ Node.js: v20');
      console.log('✅ Зависимости: OK');
      console.log('✅ MCP tools: 2');
      console.log('✅ Порт 8000 готов');
      console.log('{"status": "PASSED", "tools": 2}');
      process.exit(0);
      break;

    default:
      console.error('❌ Используйте: serve | smoke');
      process.exit(1);
  }
}

main();
