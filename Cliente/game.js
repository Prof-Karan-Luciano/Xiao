/**
 * game.js - Cliente do jogo de tiro 2D multijogador
 * Responsável por conectar ao servidor, enviar comandos e renderizar o jogo.
 */

// =====================
// Configuração e Estado
// =====================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let socket = null;
let meuId = null;
let jogadores = {};
let balas = [];
let nome = '';
let pontos = 0;
let morto = false;

// Estado de movimento
const teclas = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
let mouse = { x: 0, y: 0 };

// =====================
// Funções de Rede
// =====================

/**
 * Conecta ao servidor WebSocket e inicializa eventos.
 */
function conectar() {
  nome = window.prompt('Digite seu nome:') || 'Jogador';
  const host = window.location.hostname || 'localhost';
  socket = new WebSocket(`ws://${host}:3000`);

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'join', nome }));
  };

  socket.onmessage = (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (!data.type) return;
    switch (data.type) {
      case 'init':
        meuId = data.id;
        morto = false;
        break;
      case 'state':
        jogadores = {};
        for (const j of data.jogadores) {
          jogadores[j.id] = j;
        }
        balas = data.balas;
        break;
      case 'hit':
        if (data.alvo === meuId) {
          morto = true;
          setTimeout(() => window.location.reload(), 1500);
        }
        break;
      case 'leave':
        delete jogadores[data.id];
        break;
    }
  };

  socket.onclose = () => {
    setTimeout(conectar, 2000);
  };
}

/**
 * Envia movimento para o servidor.
 * @param {number} x
 * @param {number} y
 */
function enviarMovimento(x, y) {
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify({ type: 'move', x, y }));
  }
}

/**
 * Envia tiro para o servidor.
 * @param {number} dx
 * @param {number} dy
 */
function enviarTiro(dx, dy) {
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify({ type: 'shoot', dx, dy }));
  }
}

// =====================
// Controle de Jogador
// =====================

let pos = { x: 400, y: 300 };

window.addEventListener('keydown', (e) => {
  if (teclas.hasOwnProperty(e.key)) teclas[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  if (teclas.hasOwnProperty(e.key)) teclas[e.key] = false;
});
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', (e) => {
  if (morto) return;
  const dx = mouse.x - pos.x;
  const dy = mouse.y - pos.y;
  const len = Math.hypot(dx, dy) || 1;
  enviarTiro(dx / len, dy / len);
});

// =====================
// Renderização
// =====================

/**
 * Desenha um palitinho (stick figure).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} cor
 * @param {string} nome
 */
function desenharPalitinho(ctx, x, y, cor, nome) {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3;
  // Cabeça
  ctx.beginPath();
  ctx.arc(x, y - 18, 10, 0, 2 * Math.PI);
  ctx.stroke();
  // Corpo
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 18);
  ctx.stroke();
  // Braços
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 14, y + 8);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 14, y + 8);
  ctx.stroke();
  // Pernas
  ctx.beginPath();
  ctx.moveTo(x, y + 18);
  ctx.lineTo(x - 10, y + 34);
  ctx.moveTo(x, y + 18);
  ctx.lineTo(x + 10, y + 34);
  ctx.stroke();
  // Nome
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(nome, x, y - 28);
  ctx.restore();
}

/**
 * Desenha todas as balas.
 * @param {Array} balas
 */
function desenharBalas(balas) {
  for (const b of balas) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#fffa';
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Desenha o placar.
 */
function desenharPlacar() {
  const lista = Object.values(jogadores).sort((a, b) => b.pontos - a.pontos);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#222';
  ctx.fillRect(10, 10, 180, 28 + 22 * lista.length);
  ctx.globalAlpha = 1;
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('Placar', 100, 30);
  let y = 54;
  for (const j of lista) {
    ctx.fillStyle = j.cor;
    ctx.fillText(`${j.nome}: ${j.pontos}`, 100, y);
    y += 22;
  }
  ctx.restore();
}

// =====================
// Loop do Jogo
// =====================

function atualizar() {
  if (meuId && jogadores[meuId]) {
    pos.x = jogadores[meuId].x;
    pos.y = jogadores[meuId].y;
    pontos = jogadores[meuId].pontos;
  }
  if (!morto) {
    let dx = 0, dy = 0;
    if (teclas.w || teclas.ArrowUp) dy -= 1;
    if (teclas.s || teclas.ArrowDown) dy += 1;
    if (teclas.a || teclas.ArrowLeft) dx -= 1;
    if (teclas.d || teclas.ArrowRight) dx += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      pos.x += (dx / len) * 4;
      pos.y += (dy / len) * 4;
      pos.x = Math.max(20, Math.min(780, pos.x));
      pos.y = Math.max(40, Math.min(560, pos.y));
      enviarMovimento(pos.x, pos.y);
    }
  }
}

function desenhar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Balas
  desenharBalas(balas);
  // Jogadores
  for (const id in jogadores) {
    const j = jogadores[id];
    desenharPalitinho(ctx, j.x, j.y, j.cor, j.nome);
  }
  // Placar
  desenharPlacar();
  // Tela de morte
  if (morto) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Você morreu!', canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }
}

function loop() {
  atualizar();
  desenhar();
  requestAnimationFrame(loop);
}

// =====================
// Inicialização
// =====================

conectar();
loop();
