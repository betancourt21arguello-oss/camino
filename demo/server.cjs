const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = 'D:\\documentos\\camino\\demo';
const server = http.createServer((req, res) => {
  const file = path.join(dir, req.url === '/' ? 'index.html' : req.url);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file);
    const ct = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[ext.slice(1)] || 'text/plain';
    res.writeHead(200, {'Content-Type': ct});
    res.end(fs.readFileSync(file));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(8080, () => console.log('Server running on http://localhost:8080'));
