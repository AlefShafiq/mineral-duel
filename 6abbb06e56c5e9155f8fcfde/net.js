/* =====================================================================
   矿物对决 · 联机网络层（客户端）
   ---------------------------------------------------------------------
   必须在 game.js 之前加载。本文件只定义全局对象 MP，不含任何游戏逻辑；
   所有对游戏状态的访问都通过 register() 注册进来的回调完成
   （避免 game.js 中 `let state` 的词法 TDZ 问题）。

   通信：SSE（EventSource，服务端 → 客户端） + POST fetch（客户端 → 服务端）。
   - 主机（host）：跑真实逻辑，把全量状态广播给客人，接收客人意图并应用。
   - 客人（guest）：只渲染主机下发的镜像状态，把自己的操作作为「意图」发回主机。
   ===================================================================== */

(function () {
  'use strict';

  const MP = {
    active: false,   // 是否处于联机对局（true 时 game.js 不调度本地 AI）
    role: null,      // 'host' | 'guest'
    roomCode: null,
    handlers: {},    // { newGame, applyState, applyIntent, snapshot }
    es: null,
  };

  const $ = id => document.getElementById(id);
  let lastSeq = 0;

  function setStatus(text) { const el = $('lobby-status'); if (el) el.textContent = text || ''; }
  function netStatus(text) {
    const el = $('net-status');
    if (!el) return;
    if (text) { el.textContent = text; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
  }
  function showLobby() { const el = $('lobby'); if (el) el.classList.remove('hidden'); }
  function hideLobby() { const el = $('lobby'); if (el) el.classList.add('hidden'); }
  function showRoomPanel(code) {
    const box = $('lobby-room'), show = $('lobby-code-show');
    if (box) box.classList.remove('hidden');
    if (show) show.textContent = code;
  }

  MP.register = function (handlers) { MP.handlers = handlers || {}; };

  // 发送一条消息给对端
  MP.send = function (payload) {
    if (!MP.roomCode || !MP.role) return;
    const url = `/msg?room=${encodeURIComponent(MP.roomCode)}&role=${MP.role}`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => netStatus('发送失败，请检查网络连接'));
  };

  // 主机把当前权威状态同步给客人（由 game.js 在提交动作后调用）
  MP.broadcastState = function () {
    if (MP.role !== 'host' || !MP.handlers.snapshot) return;
    MP.send(MP.handlers.snapshot());
  };

  function connect(role) {
    if (MP.es) { try { MP.es.close(); } catch (e) { /* ignore */ } }
    const url = `/events?room=${encodeURIComponent(MP.roomCode)}&role=${role}`;
    const es = new EventSource(url);
    MP.es = es;
    es.onopen = () => netStatus(role === 'host' ? '等待对手加入…' : '已连接，等待主机开始…');
    es.onerror = () => netStatus('连接中断，正在重连…');
    es.onmessage = ev => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      onMessage(msg);
    };
  }

  function onMessage(msg) {
    if (!msg) return;

    // 系统事件：有人加入
    if (msg.sys === 'peer-joined') {
      setStatus('对手已加入，对局开始');
      if (MP.role === 'host') {
        hideLobby();
        netStatus('对手已加入，对局开始');
        if (MP.handlers.newGame) MP.handlers.newGame();   // 主机开新局
        MP.broadcastState();                              // 并把初始状态广播给客人
      }
      return;
    }
    // 系统事件：有人离开
    if (msg.sys === 'peer-left') {
      netStatus('对手已离开对局');
      return;
    }

    // 主机收到客人意图 → 应用 → 广播新状态
    if (msg.type === 'intent' && MP.role === 'host') {
      if (MP.handlers.applyIntent) MP.handlers.applyIntent(msg.intent, 'ai');
      MP.broadcastState();
      return;
    }

    // 客人收到主机镜像状态 → 套用渲染
    if (msg.type === 'state' && MP.role === 'guest') {
      if (msg.seq != null && msg.seq <= lastSeq) return;   // 忽略过期包
      lastSeq = msg.seq;
      hideLobby();
      netStatus('对局进行中');
      if (MP.handlers.applyState) MP.handlers.applyState(msg);
      return;
    }
  }

  // 创建房间
  function createRoom() {
    setStatus('正在创建房间…');
    fetch('/newroom').then(r => r.json()).then(d => {
      if (!d || !d.code) { setStatus('创建失败，请重试'); return; }
      MP.role = 'host';
      MP.roomCode = d.code;
      MP.active = true;
      showRoomPanel(d.code);
      setStatus('等待对手加入…');
      connect('host');
    }).catch(() => setStatus('无法连接服务器，请确认已运行 node server.js'));
  }

  // 加入房间
  function joinRoom() {
    const input = $('lobby-code');
    const code = ((input && input.value) || '').trim().toUpperCase();
    if (!code) { setStatus('请输入房间码'); return; }
    MP.role = 'guest';
    MP.roomCode = code;
    MP.active = true;
    setStatus('正在连接房间 ' + code + '…');
    connect('guest');
  }

  // 单人对战
  function solo() {
    MP.active = false;
    MP.role = null;
    MP.roomCode = null;
    hideLobby();
    netStatus('');
    if (MP.handlers.newGame) MP.handlers.newGame();
  }

  MP.boot = function () {
    showLobby();
    setStatus('');
    const soloBtn = $('lobby-solo');
    const createBtn = $('lobby-create');
    const joinBtn = $('lobby-join-btn');
    const codeInput = $('lobby-code');
    if (soloBtn) soloBtn.addEventListener('click', solo);
    if (createBtn) createBtn.addEventListener('click', createRoom);
    if (joinBtn) joinBtn.addEventListener('click', joinRoom);
    if (codeInput) codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
  };

  window.MP = MP;
})();