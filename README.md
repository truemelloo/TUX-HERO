<div align="center">

<img src="assets/tux-hero-logo.png" alt="Logo TUX HERO" width="420">

# 🎸 TUX HERO 🐧

### O ritmo do rock encontra o universo Linux.

**Jogo musical para navegador com pistas de notas em 3D, desafios de precisão e multijogador local.**

Projeto apresentado no workshop **IBM SkillsBuild · #IBMBOB (2026)**.

**[🎮 JOGAR ONLINE — link em breve](#-jogue-online)** · **[Como jogar](#-controles)** · **[Tecnologias](#-tecnologias)**

</div>

---

## ▶️ Jogue online

**Em breve:** adicione aqui o endereço público da Vercel após concluir o deploy.

> O jogo foi desenvolvido para computadores, com controles pelo teclado. A versão online depende da publicação dos arquivos e recursos necessários.

## 🐧 Sobre o jogo

**TUX HERO** é um jogo de ritmo inspirado na experiência dos clássicos jogos de guitarra. O desafio é acompanhar as músicas, pressionando as teclas correspondentes às notas que avançam pelas cinco pistas, no momento certo.

Com uma identidade visual de rock, detalhes em roxo e lilás e o **Tux, mascote do Linux**, o projeto combina música, interação e programação web. A interface inclui uma abertura em vídeo, menus temáticos e um palco animado.

## ✨ O que tem no TUX HERO

- **🎸 Jogo rápido:** partida musical com pista de notas e visualização 3D.
- **🎵 Seleção de músicas:** biblioteca interna com faixas e charts associados, além da música original do projeto-base.
- **📁 Importação de áudio:** opção de utilizar músicas próprias; a geração automática de notas é aproximada e pode exigir ajustes de BPM e sincronização.
- **👥 Multijogador local:** duas pistas para jogar no mesmo computador, com pontuações individuais e tela de resultados. A experiência com duas pessoas ainda requer validação manual completa.
- **🏆 Pontuação e combos:** acompanhamento de acertos, sequências e multiplicadores durante a partida.
- **🎥 Identidade audiovisual:** vídeo de abertura, fundo de show, logotipo e interface em português.
- **⚙️ Menus e controles:** opções de jogo, instruções, pausa, som e navegação pelo teclado.

> A presença de um recurso no projeto não significa que todos os modos e todas as músicas tenham sido testados manualmente em todos os navegadores.

## ⌨️ Controles

| Modo | Teclas | Função |
| --- | --- | --- |
| Jogo rápido / cinco pistas | **A · S · D · F · G** | Acertar as notas nas cinco pistas |
| Multijogador — jogador 1 | **A · S · D · F · G** | Controlar a primeira guitarra |
| Multijogador — jogador 2 | **J · K · L · Ç · Enter** | Controlar a segunda guitarra |
| Menus | **↑ · ↓ · Enter** | Navegar e selecionar |
| Abertura | **Enter / Esc** | Pular introdução |

Alguns comandos, como pausa e retorno ao menu, também aparecem na interface do jogo. O teclado deve usar um layout compatível com a tecla **Ç** no modo multijogador.

## 🖥️ Executar no computador

1. Baixe ou clone o repositório.
2. Abra a pasta que contém `index.html`.
3. Inicie um servidor local, por exemplo, com a extensão **Live Server** do VS Code ou com Python:

   ```bash
   python -m http.server 8000
   ```

4. Abra `http://localhost:8000` no navegador.

O projeto inclui arquivos JavaScript já preparados para execução no navegador. Para experimentar o jogo, não é necessário reconstruir o bundle com Webpack.

## 🛠️ Tecnologias

- **HTML5** — estrutura das telas e elementos de interface.
- **CSS3** — menus, HUD e identidade visual.
- **JavaScript** — lógica do jogo, navegação, controles e integração dos recursos.
- **Three.js / WebGL** — renderização da pista e dos elementos 3D.
- **Web Audio API** — análise de áudio e suporte à importação de músicas.
- **IndexedDB** — armazenamento local de dados de músicas importadas.
- **Webpack** — ferramenta presente na estrutura do projeto-base.

## 📂 Organização do projeto

```text
TUX-HERO/
├── index.html                 # Entrada do jogo
├── css/                       # Estilos e interface
├── lib/                       # Motor, modos, controles e biblioteca
│   └── tux-library/           # Catálogo e charts musicais
├── vendor/                    # Bibliotecas JavaScript locais
├── assets/                    # Logo, vídeos, imagens e áudios
├── docs/                      # Documentação e testes
└── README.md                  # Apresentação do projeto
```

## 🤖 IA no desenvolvimento

O projeto foi desenvolvido com apoio de ferramentas de inteligência artificial, incluindo o **IBM Bob**, no processo de criação e aprimoramento da experiência. O trabalho envolveu planejamento, direcionamento visual, adaptação de componentes, integração de recursos, correções e testes.

O TUX HERO também utiliza e adapta uma base preexistente de jogo de guitarra em JavaScript e Three.js (**JS Hero**). A proposta do projeto foi transformá-la em uma experiência com identidade própria, menus, recursos musicais e modos adicionais.

## 🎨 Capturas de tela

Adicione aqui capturas reais do **menu principal**, da **guitarra 3D** e do **multijogador** depois de salvar as imagens na pasta `assets/prints/`.

<!-- Exemplo: ![Menu principal](assets/prints/menu.png) -->

## 👩‍💻 Autoria e evento

**Projeto:** TUX HERO  
**Desenvolvimento e personalização:** Ana Clara de Souza Mello  
**Evento:** Workshop IBM SkillsBuild · #IBMBOB  
**Ano:** 2026  
**Repositório:** https://github.com/truemelloo/TUX-HERO

## ⚖️ Créditos e direitos autorais

- **Tux** é o mascote do Linux; seu uso neste projeto não implica afiliação oficial.
- O projeto incorpora componentes de uma base preexistente **JS Hero**, em JavaScript e Three.js. Atribuições e licenças do código original devem ser verificadas e preservadas antes da redistribuição.
- **Músicas e gravações comerciais** pertencem aos respectivos titulares. A inclusão de arquivos de áudio no projeto não concede permissão para redistribuí-los publicamente.
- **Vídeos, imagens e demais recursos** devem ser publicados apenas quando houver direitos ou autorização de uso adequados.
- **IBM SkillsBuild e IBM Bob** são mencionados como contexto do workshop e ferramentas utilizadas, sem implicar endosso oficial.

> **Antes de publicar:** confira especialmente os MP3 e vídeos da pasta `assets/`. Se você não tiver autorização para distribuí-los, remova-os da versão pública e utilize conteúdo licenciado ou autorizado. Isso também pode exigir ajustes no catálogo e no deploy.

---

<div align="center">

**TUX HERO — Acerte as notas. Mantenha o combo. Faça o show acontecer. 🎸🐧**

</div>
