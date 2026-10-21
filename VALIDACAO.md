# Validação — 20/10/2026

- `npm run build`: passou. Inclui TypeScript em modo estrito e build Vite.
- vite-plugin-pwa gerou manifest, service worker e precache com todos os SVGs, PNGs, HTML, JS e CSS (aproximadamente 1,8 MB sem compressão).
- Versão de produção aberta no navegador: personagem, plataformas e HUD renderizados; movimento, coleta de uma estrela, salto/retorno de queda, pausa e retorno ao menu verificados.
- Progresso permaneceu após recarregar; álbum mostrou a estrela coletada.
- Aviso inicial de preparação offline exibido. Cache gerado confirmado pelo build; modo avião real ainda precisa ser testado no tablet.
- Menu e jogo inspecionados no formato 1024 × 768; orientação retrato mostra a indicação para girar o aparelho.
- Nenhum erro JavaScript registrado no console da sessão inspecionada.
- Suíte Playwright incluída. Sua execução neste ambiente não chegou a iniciar os testes: o isolamento do macOS bloqueou a abertura do Chromium (MachPortRendezvous / permission denied). Isso é uma limitação da execução do navegador, não um resultado de aprovação dos testes.
- Multitouch físico, instalação em iPad/Android, todos os percursos até o portal e execução offline em aparelho não foram verificados em dispositivo físico.

A suíte pode ser executada fora desse isolamento com os comandos do README. A publicação tem uma validação adicional de build no GitHub Actions.

## Atualização: animações e desafios

- Atlas original de 18 quadros gerado, com oito passos diferentes. Verificação automatizada das bordas passou, sem cortes nos quadros.
- Estados de repouso, caminhada, subida, ápice, queda e aterrissagem ligados à física.
- Plataformas móveis com atrito para carregar a personagem, inimigos que patrulham e cristais progressivos implementados.
- Build TypeScript/Vite passou e a primeira fase carregou no navegador com plataforma móvel, nuvem e novo atlas, sem erros JavaScript registrados.
- A validação completa de colisões com cada obstáculo e de todos os elevadores no tablet físico permanece pendente.

## Atualização: fases ampliadas, corações e chefão

- Plataformas móveis e elevadores removidos do código de jogo. Fases entre 6.210 e 7.150 unidades, com 30 estrelas por mundo, plataformas fixas e mais inimigos.
- `npm run test:game`: passou; verifica limites dos saltos/gaps, checkpoints, 90 estrelas, proteção contra dano repetido, última vida e migração dos saves antigos.
- `npm run test:assets` e `npm run build`: passaram.
- No navegador, uma queda com o último coração mostrou GAME OVER; tentar novamente restaurou cinco corações e preservou a estrela coletada. Outra queda retirou exatamente um coração e retornou ao início.
- Chefão carregado com barra de 12 pontos. Disparos pelo botão touch reduziram a barra de 12 para 6 e depois 0, exibindo vitória. Nessa verificação específica os ataques foram suspensos por uma opção exclusiva do servidor de desenvolvimento, para isolar os acertos. Ataques ativos, perda de corações e game over também foram observados separadamente na arena.
- A nova proteção impede múltiplas perdas de coração no mesmo contato. O chefão só acorda ao entrar na arena, com três segundos de preparação.
- Colisões de projéteis usam grupos, para não acumular novos verificadores a cada tiro.
- Conclusão de todos os percursos e equilíbrio da dificuldade no tablet físico continuam pendentes.

## Atualização: cura e magia limitada

- Testes de primeira partida com corações/magia cheios, continuação sem recarga gratuita, limites de cura, custos dos três feitiços e persistência de recursos incluídos em `test:game`.
- No navegador, magia zerada não disparou e exibiu a orientação de procurar cristal. Um coração elevou a vida de 2 para 3; cristal azul elevou a magia de 0 para 40 e equipou Cometa azul. Dois disparos reduziram a barra de 40 para 28 e dispersaram uma nuvem.
- Ícones de cura/cristal originais em SVG, cores com nomes no HUD e indicação de magia vazia no botão touch.
- Na arena, o cristal violeta elevou magia para 100, um tiro consumiu 12 e retirou dois pontos do chefão. Permanecer no local após o reaparecimento do cristal recarregou de 88 para 100.
- Primeira partida em origem nova, usando o build de produção sem opções de teste: HUD confirmou 5/5 corações e 100/100 de Luz dourada, sem erros JavaScript registrados.
