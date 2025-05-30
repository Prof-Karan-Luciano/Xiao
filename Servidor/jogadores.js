// Funções utilitárias para lógica de jogadores
const { gerarCorUnica, gerarId } = require('./utils');

const jogadores = {};

function criarJogador(nome) {
  const id = gerarId();
  jogadores[id] = {
    id,
    nome,
    x: Math.random() * 600 + 100,
    y: Math.random() * 400 + 100,
    cor: gerarCorUnica(),
    pontos: 0,
    tiroDx: 1,
    tiroDy: 0,
    recuo: 0
  };
  return jogadores[id];
}

function removerJogador(id) {
  delete jogadores[id];
}

function atualizarMovimento(id, x, y) {
  if (jogadores[id]) {
    jogadores[id].x = x;
    jogadores[id].y = y;
  }
}

function processarTiro(id, dx, dy) {
  if (jogadores[id]) {
    jogadores[id].tiroDx = dx;
    jogadores[id].tiroDy = dy;
    jogadores[id].recuo = 1;
  }
}

function decairRecuo() {
  for (const id in jogadores) {
    if (jogadores[id].recuo > 0) {
      jogadores[id].recuo *= 0.85;
      if (jogadores[id].recuo < 0.01) jogadores[id].recuo = 0;
    }
  }
}

function getJogadoresArray() {
  return Object.values(jogadores);
}

module.exports = {
  jogadores,
  criarJogador,
  removerJogador,
  atualizarMovimento,
  processarTiro,
  decairRecuo,
  getJogadoresArray
};
