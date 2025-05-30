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

// Estado para animação de recuo da arma
let recuoArma = 0;
let recuoTick = 0;
// Partículas
let particulas = [];

// Estrutura para interpolação de jogadores
let interpJogadores = {}; // id: {x0, y0, x1, y1, t0, t1}
const INTERP_DELAY = 80; // ms de atraso para suavizar

// =====================
// Funções de Rede
// =====================

/**
 * Conecta ao servidor WebSocket e inicializa eventos.
 */
function conectar() {
  // Recupera nome do localStorage, se existir
  let nomeSalvo = localStorage.getItem('nomeJogador');
  let nomeValido = false;
  while (!nomeValido) {
    nome = window.prompt('Digite seu nome:', nomeSalvo || '') || (nomeSalvo || 'Jogador');
    nome = nome.trim().slice(0, 16);
    nomeValido = true;
    // Verifica nomes já usados
    for (const id in jogadores) {
      if (jogadores[id].nome && jogadores[id].nome.toLowerCase() === nome.toLowerCase()) {
        alert('Nome já está em uso! Escolha outro.');
        nomeValido = false;
        break;
      }
    }
  }
  // Salva nome para respawn
  localStorage.setItem('nomeJogador', nome);
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
        // Interpolação: armazena posições antigas e novas
        for (const j of data.jogadores) {
          if (!interpJogadores[j.id]) {
            interpJogadores[j.id] = {
              x0: j.x, y0: j.y, x1: j.x, y1: j.y, t0: performance.now(), t1: performance.now()
            };
          } else {
            let interp = interpJogadores[j.id];
            interp.x0 = interp.x1;
            interp.y0 = interp.y1;
            interp.x1 = j.x;
            interp.y1 = j.y;
            interp.t0 = interp.t1;
            interp.t1 = performance.now() + INTERP_DELAY;
          }
        }
        jogadores = {};
        for (const j of data.jogadores) {
          jogadores[j.id] = j;
        }
        balas = data.balas;
        break;
      case 'hit':
        if (data.alvo === meuId) {
          morto = true;
          criarExplosao(pos.x, pos.y, '#fff', 32);
          setTimeout(() => window.location.reload(), 1500);
        } else if (jogadores[data.alvo]) {
          criarExplosao(jogadores[data.alvo].x, jogadores[data.alvo].y, jogadores[data.alvo].cor, 24);
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

// Remover tabIndex e focus do canvas
// window.addEventListener para todos os inputs
window.addEventListener('keydown', (e) => {
  if (teclas.hasOwnProperty(e.key)) teclas[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  if (teclas.hasOwnProperty(e.key)) teclas[e.key] = false;
});
window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
window.addEventListener('mousedown', (e) => {
  if (morto) return;
  e.preventDefault();
  const dx = mouse.x - pos.x;
  const dy = mouse.y - pos.y;
  const len = Math.hypot(dx, dy) || 1;
  enviarTiro(dx / len, dy / len);
  recuoArma = 1; // ativa recuo
  recuoTick = 0;
  // Partículas de tiro
  for (let i = 0; i < 6; i++) {
    const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.2;
    const vel = Math.random() * 2 + 2;
    particulas.push({
      x: pos.x + Math.cos(ang) * 18,
      y: pos.y + Math.sin(ang) * 18,
      dx: Math.cos(ang) * vel,
      dy: Math.sin(ang) * vel,
      cor: '#ff0',
      vida: 12 + Math.random() * 6,
      t: 0
    });
  }
});
// Previne seleção de texto acidental
canvas.addEventListener('selectstart', e => e.preventDefault());

// =====================
// Funções de Partículas e Efeitos
// =====================

/**
 * Cria partículas de explosão.
 * @param {number} x
 * @param {number} y
 * @param {string} cor
 * @param {number} qtd
 */
function criarExplosao(x, y, cor, qtd = 18) {
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * 2 * Math.PI;
    const vel = Math.random() * 3 + 1;
    particulas.push({
      x, y,
      dx: Math.cos(ang) * vel,
      dy: Math.sin(ang) * vel,
      cor,
      vida: 24 + Math.random() * 12,
      t: 0
    });
  }
}

/**
 * Atualiza partículas.
 */
function atualizarParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.08; // gravidade leve
    p.dx *= 0.97;
    p.dy *= 0.97;
    p.t++;
    if (p.t > p.vida) particulas.splice(i, 1);
  }
}

/**
 * Desenha partículas.
 */
function desenharParticulas() {
  for (const p of particulas) {
    ctx.save();
    ctx.globalAlpha = 1 - p.t / p.vida;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = p.cor;
    ctx.shadowColor = p.cor;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}

// =====================
// Renderização
// =====================

/**
 * Desenha um palitinho (stick figure) animado com arma e pernas com joelho.
 * Pernas: coxa e canela, movimento alternado, simulando passo humano com joelho.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} cor
 * @param {string} nome
 * @param {boolean} isMeu
 * @param {number} tick
 */
function desenharPalitinho(ctx, x, y, cor, nome, isMeu, tick, j) {
  ctx.save();
  // Sombra/contorno
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 10;
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

  // Detecta direção do movimento
  let dx = 0, dy = 0;
  if (isMeu) {
    if (teclas.w || teclas.ArrowUp) dy -= 1;
    if (teclas.s || teclas.ArrowDown) dy += 1;
    if (teclas.a || teclas.ArrowLeft) dx -= 1;
    if (teclas.d || teclas.ArrowRight) dx += 1;
  } else {
    dy = 1;
  }
  let andando = (dx !== 0 || dy !== 0);

  // Movimento de pernas com joelho
  let t = tick / 8;
  let passo = andando ? Math.sin(t) : 0;
  // Parâmetros do boneco
  const quadrilY = y + 18;
  const coxaLen = 13;
  const canelaLen = 13;
  // Ângulos alternados para cada perna
  let angCoxaE = Math.PI / 2 + passo * 0.5; // Esquerda
  let angCoxaD = Math.PI / 2 - passo * 0.5; // Direita
  let angCanelaE = Math.PI / 2 + Math.max(0, -passo) * 0.7; // flexiona ao recuar
  let angCanelaD = Math.PI / 2 + Math.max(0, passo) * 0.7;
  // Posição do joelho e pé (esquerda)
  let joelhoEx = x - 7 + Math.cos(angCoxaE) * coxaLen;
  let joelhoEy = quadrilY + Math.sin(angCoxaE) * coxaLen;
  let peEx = joelhoEx + Math.cos(angCanelaE) * canelaLen;
  let peEy = joelhoEy + Math.sin(angCanelaE) * canelaLen;
  // Posição do joelho e pé (direita)
  let joelhoDx = x + 7 + Math.cos(angCoxaD) * coxaLen;
  let joelhoDy = quadrilY + Math.sin(angCoxaD) * coxaLen;
  let peDx = joelhoDx + Math.cos(angCanelaD) * canelaLen;
  let peDy = joelhoDy + Math.sin(angCanelaD) * canelaLen;
  // Pernas (esquerda)
  ctx.beginPath();
  ctx.moveTo(x - 7, quadrilY);
  ctx.lineTo(joelhoEx, joelhoEy);
  ctx.lineTo(peEx, peEy);
  ctx.stroke();
  // Pernas (direita)
  ctx.beginPath();
  ctx.moveTo(x + 7, quadrilY);
  ctx.lineTo(joelhoDx, joelhoDy);
  ctx.lineTo(peDx, peDy);
  ctx.stroke();

  // Braço esquerdo (anima levemente)
  let faseBraco = andando ? Math.sin(t / 1.5 + Math.PI / 2) : 0;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 14, y + 8 + faseBraco * 4);
  ctx.stroke();

  // Braço direito (arma)
  let anguloArma = 0.5;
  let recuo = 0;
  if (isMeu) {
    anguloArma = Math.atan2(mouse.y - y, mouse.x - x);
    if (recuoArma > 0) {
      recuo = Math.sin(recuoTick / 3) * 7 * recuoArma;
    }
  } else if (j) {
    if (typeof j.tiroDx === 'number' && typeof j.tiroDy === 'number') {
      anguloArma = Math.atan2(j.tiroDy, j.tiroDx);
    }
    if (typeof j.recuo === 'number') {
      recuo = Math.sin(performance.now() / 48) * 7 * j.recuo;
    }
  }
  const bracoCompr = 18;
  const armaCompr = 18;
  const maoX = x + Math.cos(anguloArma) * (bracoCompr + recuo);
  const maoY = y + Math.sin(anguloArma) * (bracoCompr + recuo);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(maoX, maoY);
  ctx.stroke();
  // Pistola
  ctx.save();
  ctx.translate(maoX, maoY);
  ctx.rotate(anguloArma);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(armaCompr, 0);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(armaCompr * 0.7, 0);
  ctx.lineTo(armaCompr * 0.7, 5);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(armaCompr, -2);
  ctx.lineTo(armaCompr + 6, 0);
  ctx.stroke();
  ctx.restore();

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
  // Atualiza recuo da arma
  if (recuoArma > 0) {
    recuoTick++;
    recuoArma *= 0.85;
    if (recuoArma < 0.01) recuoArma = 0;
  }
  atualizarParticulas();
}

function getInterpPos(id) {
  if (!interpJogadores[id]) return {x: jogadores[id]?.x || 0, y: jogadores[id]?.y || 0};
  const interp = interpJogadores[id];
  const now = performance.now();
  let t = (now - interp.t0) / (interp.t1 - interp.t0);
  t = Math.max(0, Math.min(1, t));
  return {
    x: interp.x0 + (interp.x1 - interp.x0) * t,
    y: interp.y0 + (interp.y1 - interp.y0) * t
  };
}

function desenhar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  desenharParticulas();
  // Balas
  desenharBalas(balas);
  // Jogadores
  let tick = performance.now() / 16;
  for (const id in jogadores) {
    const j = jogadores[id];
    let posInterp = (id === meuId) ? {x: j.x, y: j.y} : getInterpPos(id);
    desenharPalitinho(
      ctx,
      posInterp.x,
      posInterp.y,
      j.cor,
      j.nome,
      id === meuId,
      tick,
      j
    );
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

// =====================
// Colisão avançada: hitbox cabeça/corpo
// =====================

function checarColisaoBalaJogador(bala, jogador) {
  // Corpo: círculo maior
  const corpo = {x: jogador.x, y: jogador.y + 6, r: 13};
  // Cabeça: círculo menor
  const cabeca = {x: jogador.x, y: jogador.y - 18, r: 10};
  // Checa cabeça primeiro
  const distCabeca = Math.hypot(bala.x - cabeca.x, bala.y - cabeca.y);
  if (distCabeca < cabeca.r + 5) return 'head';
  // Checa corpo
  const distCorpo = Math.hypot(bala.x - corpo.x, bala.y - corpo.y);
  if (distCorpo < corpo.r + 5) return 'body';
  return null;
}
