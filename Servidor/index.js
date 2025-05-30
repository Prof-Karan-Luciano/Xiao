/**
 * Servidor principal do jogo de tiro 2D multijogador.
 * @author 
 */

const http = require('http');
const WebSocket = require('ws');
const { gerarCorUnica, gerarId } = require('./utils');

const PORT = 3000;
const TICK_RATE = 1000 / 60; // 60 FPS

const jogadores = {};
const balas = [];

// Cria servidor HTTP para servir arquivos estáticos (opcional)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Servidor WebSocket do jogo está rodando.');
});

const wss = new WebSocket.Server({ server });

/**
 * Broadcast para todos os clientes conectados.
 * @param {object} data
 */
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  let jogadorId = null;

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      return;
    }
    if (!data || !data.type) return;

    switch (data.type) {
      case 'join': {
        const nome = String(data.nome || '').slice(0, 16);
        if (!nome) return;
        jogadorId = gerarId();
        jogadores[jogadorId] = {
          id: jogadorId,
          nome,
          x: Math.random() * 600 + 100,
          y: Math.random() * 400 + 100,
          cor: gerarCorUnica(),
          pontos: 0,
          tiroDx: 1, // padrão direita
          tiroDy: 0,
          recuo: 0
        };
        ws.send(JSON.stringify({ type: 'init', id: jogadorId }));
        console.log(`[JOIN] ${nome} (${jogadorId}) conectado.`);
        break;
      }
      case 'move': {
        if (!jogadorId || !jogadores[jogadorId]) return;
        const { x, y } = data;
        if (typeof x === 'number' && typeof y === 'number') {
          jogadores[jogadorId].x = x;
          jogadores[jogadorId].y = y;
        }
        break;
      }
      case 'shoot': {
        if (!jogadorId || !jogadores[jogadorId]) return;
        const { dx, dy } = data;
        if (typeof dx === 'number' && typeof dy === 'number') {
          balas.push({
            id: gerarId(),
            dono: jogadorId,
            x: jogadores[jogadorId].x,
            y: jogadores[jogadorId].y,
            dx,
            dy,
            tempo: Date.now()
          });
          // Salva direção e ativa recuo
          jogadores[jogadorId].tiroDx = dx;
          jogadores[jogadorId].tiroDy = dy;
          jogadores[jogadorId].recuo = 1;
          console.log(`[SHOOT] ${jogadores[jogadorId].nome} atirou.`);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (jogadorId && jogadores[jogadorId]) {
      console.log(`[DISCONNECT] ${jogadores[jogadorId].nome} saiu.`);
      delete jogadores[jogadorId];
      broadcast({ type: 'leave', id: jogadorId });
    }
  });
});

// Lógica do jogo: movimentação das balas e colisão
setInterval(() => {
  // Atualiza balas
  for (let i = balas.length - 1; i >= 0; i--) {
    const b = balas[i];
    b.x += b.dx * 8;
    b.y += b.dy * 8;
    // Remove se sair da tela
    if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 600 || Date.now() - b.tempo > 2000) {
      balas.splice(i, 1);
      continue;
    }
    // Colisão com jogadores
    for (const jid in jogadores) {
      if (jid === b.dono) continue;
      const j = jogadores[jid];
      const dist = Math.hypot(j.x - b.x, j.y - b.y);
      if (dist < 18) {
        broadcast({ type: 'hit', alvo: jid, por: b.dono });
        jogadores[b.dono].pontos++;
        delete jogadores[jid];
        balas.splice(i, 1);
        break;
      }
    }
  }
  // Atualiza recuo dos jogadores
  for (const jid in jogadores) {
    if (jogadores[jid].recuo > 0) {
      jogadores[jid].recuo *= 0.85;
      if (jogadores[jid].recuo < 0.01) jogadores[jid].recuo = 0;
    }
  }
  // Broadcast do estado do jogo
  broadcast({
    type: 'state',
    jogadores: Object.values(jogadores).map(j => ({
      ...j,
      tiroDx: j.tiroDx,
      tiroDy: j.tiroDy,
      recuo: j.recuo
    })),
    balas
  });
}, TICK_RATE);

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
