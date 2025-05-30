# Xiao

# Jogo de Tiro 2D Multijogador Online

## Como rodar o servidor

1. Abra o terminal e navegue até a pasta `Servidor`:
   ```fish
   cd /home/karan/Documentos/GitHub/Xiao/Servidor
   ```
2. Instale as dependências:
   ```fish
   npm install
   ```
3. Inicie o servidor:
   ```fish
   node index.js
   ```

O servidor WebSocket estará rodando em `ws://localhost:3000`.

## Como jogar

1. Abra o arquivo `Cliente/index.html` no seu navegador (pode abrir múltiplas abas para testar multijogador).
2. Digite seu nome quando solicitado.
3. Use **WASD** ou **Setas** para mover.
4. Clique com o mouse para atirar na direção desejada.
5. O placar aparece no canto superior esquerdo.
6. Se morrer, a tela escurece e recarrega após 1,5s.

## Observações
- O servidor não serve arquivos estáticos. Abra o HTML diretamente ou use um servidor local para servir a pasta `Cliente`.
- Logs de conexão, movimentação e tiros aparecem no terminal do servidor.
- O jogo é todo desenhado via Canvas, sem imagens externas.

---

**Divirta-se!**

