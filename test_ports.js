const http = require('http');

const options = [
  'http://localhost:3000/login',
  'http://127.0.0.1:3000/login',
  'http://192.168.138.103:3000/login'
];

options.forEach(url => {
  const req = http.get(url, (res) => {
    console.log(`URL: ${url} -> Status: ${res.statusCode}`);
  });
  req.on('error', (err) => {
    console.log(`URL: ${url} -> Error: ${err.message}`);
  });
});
