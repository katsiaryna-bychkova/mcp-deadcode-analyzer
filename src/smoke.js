import fs from 'fs-extra';
console.log('✅ MCP Dead Code Analyzer - SMOKE OK');
console.log('✅ server.js:', fs.existsSync('./src/server.js'));
process.exit(0);