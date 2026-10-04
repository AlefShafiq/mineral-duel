/* =====================================================================
   矿物对决 · 联机服务器（零 npm 依赖）
   ---------------------------------------------------------------------
   本地运行：   node server.js        然后访问 http://localhost:8080
   公网部署：   把整个目录上传到支持 Node 的平台（Render / Railway / Fly.io / VPS），
                启动命令 node server.js，平台会注入环境变量 PORT。
   说明：       仅用 Node 内置模块（http / fs / path / crypto），无数据库、无构建步骤。
                同时提供静态页面与房间中继：
                  GET  /                                  静态页面（index.html 等）
                  GET  /newroom                           创建房间，返回 {code}
                  GET  /events?room=CODE&role=host|guest  SSE 实时通道（服务端 → 客户端）
                  POST /msg?room=CODE&role=host|guest     消息中继（客户端 → 对端）
   ===================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

// 静态文件白名单：路径 → 文件名
const STATIC = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/game.js': 'game.js',
  '/net.js': 'net.js',
};
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

// 房间表：code → { host: SSE连接, guest: SSE连接, created }
const rooms = new Map();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// 生成 5 位大写房间码（去掉易混淆字符）
function genCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    const bytes = crypto.randomBytes(5);
    code = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  } while (rooms.has(code));
  return code;
}

// 向某个 SSE 连接推送数据（对象自动序列化；字符串按原样发送）
function sendTo(conn, data) {
  if (!conn) return;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  try { conn.write('data: ' + str + '\n\n'); } catch (e) { /* 连接已断，忽略 */ }
}

/* ---------------- 创建房间 ---------------- */
function handleNewRoom(req, res) {
  const code = genCode();
  rooms.set(code, { host: null, guest: null, created: Date.now() });
  setCors(res);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ code }));
}

/* ---------------- SSE 实时通道 ---------------- */
function handleEvents(req, res, url) {
  const room = url.searchParams.get('room');
  const role = url.searchParams.get('role');
  if (!room || (role !== 'host' && role !== 'guest')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('bad request');
    return;
  }

  setCors(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');   // 断线后 2 秒自动重连

  let roomObj = rooms.get(room);
  if (!roomObj) { roomObj = { host: null, guest: null, created: Date.now() }; rooms.set(room, roomObj); }

  const isNew = !roomObj[role];        // 首次加入（非重连）
  const old = roomObj[role];
  if (old && old !== res) { try { old.end(); } catch (e) { /* ignore */ } }
  roomObj[role] = res;

  // 仅在“真正加入”且双方都在场时，通知主机开局（无论谁先谁后加入）
  const otherRole = role === 'host' ? 'guest' : 'host';
  if (isNew && roomObj.host && roomObj.guest) sendTo(roomObj.host, { sys: 'peer-joined' });

  // 每 15s 心跳，保持连接不被中间层断开
  const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { /* ignore */ } }, 15000);

  req.on('close', () => {
    clearInterval(hb);
    const r = rooms.get(room);
    if (!r) return;
    if (r[role] === res) {
      r[role] = null;
      sendTo(r[otherRole], { sys: 'peer-left' });
      if (!r.host && !r.guest) rooms.delete(room);
    }
  });
}

/* ---------------- 消息中继 ---------------- */
function handleMsg(req, res, url) {
  const room = url.searchParams.get('room');
  const role = url.searchParams.get('role');
  const roomObj = room ? rooms.get(room) : null;
  const otherRole = role === 'host' ? 'guest' : 'host';

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) req.destroy();   // 防御性上限：1MB
  });
  req.on('end', () => {
    if (roomObj && body) sendTo(roomObj[otherRole], body);   // 原样转发给对端
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
  });
}

/* ---------------- 静态文件 ---------------- */
function serveStatic(req, res, pathname) {
  const file = STATIC[pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(ROOT, file), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ---------------- 主服务 ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const p = url.pathname;

  if (req.method === 'OPTIONS') { setCors(res); res.writeHead(204); res.end(); return; }
  if (p === '/newroom') return handleNewRoom(req, res);
  if (p === '/events') return handleEvents(req, res, url);
  if (p === '/msg' && req.method === 'POST') return handleMsg(req, res, url);
  if (req.method === 'GET') return serveStatic(req, res, p);

  res.writeHead(405); res.end('Method not allowed');
});

// 回收「创建后无人连接」的空房间（超过 10 分钟）
setInterval(() => {
  const now = Date.now();
  rooms.forEach((r, code) => {
    if (!r.host && !r.guest && now - r.created > 10 * 60 * 1000) rooms.delete(code);
  });
}, 60 * 1000);

server.listen(PORT, () => {
  console.log(`矿物对决服务器已启动： http://localhost:${PORT}`);
});