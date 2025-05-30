/**
 * Funções utilitárias para o servidor do jogo.
 * @module utils
 */

/**
 * Gera uma cor HSL aleatória única para cada jogador.
 * @returns {string} Cor em formato HSL.
 */
function gerarCorUnica() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 70%, 55%)`;
}

/**
 * Gera um ID único simples.
 * @returns {string} ID único.
 */
function gerarId() {
  return Math.random().toString(36).substr(2, 9);
}

module.exports = {
  gerarCorUnica,
  gerarId
};
