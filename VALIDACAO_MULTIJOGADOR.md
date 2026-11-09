# Multijogador local — alterações e validação

Arquivos alterados: `index.html`, `lib/tux-unified-3d.js`, `css/master.css`.

- `index.html`: carrega Three.js antes do controlador 3D (o controlador acessa `window.THREE` ao iniciar).
- `lib/tux-unified-3d.js`: HUD por jogador com nomes digitados, resultados com precisão, maior combo e vencedor, reinício limpando o estado, e captura das teclas de ambos os jogadores para impedir ações de menus enquanto jogam.
- `css/master.css`: placas de nome e placares alinhados sobre as duas pistas; logo central preservada.

## Limitações importantes

O controlador 3D unificado já existia no projeto recebido. Ele usa uma geometria de pista própria inspirada no `game_view.js`, **não** reutiliza integralmente o modelo original. A seleção de dificuldade filtra o mesmo chart por índice; não há charts autorais independentes para cada dificuldade. O áudio da música padrão é remoto e exige conexão. Não foram realizados testes interativos com duas pessoas nem validada a sincronização musical em um navegador real. Portanto, não classificar esta versão como multijogador integralmente validado.

## Teste manual reproduzível

1. Extraia o ZIP e execute `python -m http.server 8000` na pasta `tuxhero_work`.
2. Acesse `http://localhost:8000`, pule a introdução e selecione MULTIJOGADOR.
3. Digite MELLO e SALLY, selecione dificuldades diferentes e inicie.
4. Confira duas pistas e as placas dos nomes; use A/S/D/F/G e J/K/L/Ç/ENTER; confirme que as pontuações mudam separadamente.
5. Pressione teclas dos dois jogadores juntas e observe os dois contadores. Teste ESC para pausar e CONTINUAR para retomar.
6. Termine a música e confira precisão, maior sequência e vencedor. Teste REVANCHE.
7. Repita em 1920×1080, 1366×768 e 1280×720. Abra o console do navegador (F12) e registre erros.
