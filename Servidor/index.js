/**
 * Servidor principal do jogo de tiro 2D multijogador.
 * @author 
 */

const http = require('http');
const WebSocket = require('ws');
const { gerarCorUnica, gerarId } = require('./utils');
const { criarJogador, removerJogador, atualizarMovimento, processarTiro, decairRecuo, getJogadoresArray, jogadores } = require('./jogadores');
const { criarBala, atualizarBalas, getBalasArray } = require('./balas');

const PORT = 3000;
const TICK_RATE = 1000 / 60; // 60 FPS

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
        const jogador = criarJogador(nome);
        jogadorId = jogador.id;
        ws.send(JSON.stringify({ type: 'init', id: jogadorId }));
        console.log(`[JOIN] ${nome} (${jogadorId}) conectado.`);
        break;
      }
      case 'move': {
        if (!jogadorId || !jogadores[jogadorId]) return;
        const { x, y } = data;
        if (typeof x === 'number' && typeof y === 'number') {
          atualizarMovimento(jogadorId, x, y);
        }
        break;
      }
      case 'shoot': {
        if (!jogadorId || !jogadores[jogadorId]) return;
        const { dx, dy } = data;
        if (typeof dx === 'number' && typeof dy === 'number') {
          criarBala(jogadorId, jogadores[jogadorId].x, jogadores[jogadorId].y, dx, dy);
          processarTiro(jogadorId, dx, dy);
          console.log(`[SHOOT] ${jogadores[jogadorId].nome} atirou.`);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (jogadorId && jogadores[jogadorId]) {
      console.log(`[DISCONNECT] ${jogadores[jogadorId].nome} saiu.`);
      removerJogador(jogadorId);
      broadcast({ type: 'leave', id: jogadorId });
    }
  });
});

// Lógica do jogo: movimentação das balas e colisão
setInterval(() => {
  atualizarBalas(jogadores, (alvoId, porId) => {
    broadcast({ type: 'hit', alvo: alvoId, por: porId });
    if (jogadores[porId]) jogadores[porId].pontos++;
    removerJogador(alvoId);
  });
  decairRecuo();
  broadcast({
    type: 'state',
    jogadores: getJogadoresArray().map(j => ({
      ...j,
      tiroDx: j.tiroDx,
      tiroDy: j.tiroDy,
      recuo: j.recuo
    })),
    balas: getBalasArray()
  });
}, TICK_RATE);

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
