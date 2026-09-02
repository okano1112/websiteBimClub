const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

server = server.replace(
    /secret:\s*process\.env\.SESSION_SECRET\s*\|\|\s*'bimclub-secret-key-12345',/,
    `secret: process.env.SESSION_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production!'); return 'bimclub-secret-key-12345'; })(),`
);

fs.writeFileSync('server.js', server, 'utf8');
