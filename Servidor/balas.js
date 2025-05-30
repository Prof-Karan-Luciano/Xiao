// Lógica de balas do jogo
const { gerarId } = require('./utils');

const balas = [];

function criarBala(dono, x, y, dx, dy) {
  balas.push({
    id: gerarId(),
    dono,
    x,
    y,
    dx,
    dy,
    tempo: Date.now()
  });
}

function atualizarBalas(jogadores, onHit) {
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
        onHit(jid, b.dono);
        balas.splice(i, 1);
        break;
      }
    }
  }
}

function getBalasArray() {
  return balas;
}

module.exports = {
  balas,
  criarBala,
  atualizarBalas,
  getBalasArray
};
