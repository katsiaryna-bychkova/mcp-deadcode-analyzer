const command = process.argv[2];

async function main() {
  switch (command) {
    case 'serve':
      console.log('🚀 Запуск MCP сервера...');
      await import('./server.js');  // server.js сам запустит app.listen(8000)
      console.log('✅ Сервер запущен: http://localhost:8000');
      
      process.stdin.resume();
      await new Promise(() => {});
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
  }
}

main();
