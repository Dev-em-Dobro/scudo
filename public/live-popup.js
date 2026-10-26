/* =====================================================================
   [Black] Popup — Live exclusiva pra alunos 29/10
   Componente drop-in pras ferramentas (Scudo, Orion, Agents, CodeQuest).

   Uso (antes do </body>):
     <script src="/live-popup.js" defer></script>

   Copie gemeos.webp pra mesma pasta do script: a foto é buscada ao lado dele.

   Atributos opcionais:
     data-link    link do grupo da live (padrão: grupo oficial da live 29/10)
     data-foto    URL da foto do topo (padrão: gemeos.webp ao lado do script)
     data-expira  data ISO a partir da qual o popup some (padrão: 30/10/2026 00:00 BRT)
     data-delay   ms até abrir depois do carregamento (padrão: 1200)
     data-chave   chave do localStorage, troque pra reexibir pra todo mundo

   API pra teste no console:
     DevEmDobroLivePopup.abrir()   força abrir
     DevEmDobroLivePopup.resetar() esquece que o usuário fechou
   ===================================================================== */
(function () {
  "use strict";

  if (window.DevEmDobroLivePopup) return;

  var script = document.currentScript;
  var cfg = {
    link: (script && script.dataset.link) || "https://sndflw.com/i/xZ3DxbDGlgCWhDEW7FUg",
    foto: (script && script.dataset.foto) || (script && script.src ? new URL("gemeos.webp", script.src).href : ""),
    expira: new Date((script && script.dataset.expira) || "2026-10-30T00:00:00-03:00"),
    delay: Number((script && script.dataset.delay) || 1200),
    chave: (script && script.dataset.chave) || "dd-live-2910-fechado",
  };

  // Persistência: localStorage com cookie de fallback (aba anônima, storage bloqueado)
  var store = {
    get: function () {
      try {
        if (localStorage.getItem(cfg.chave)) return true;
      } catch (e) {}
      return document.cookie.split("; ").indexOf(cfg.chave + "=1") !== -1;
    },
    set: function () {
      try {
        localStorage.setItem(cfg.chave, new Date().toISOString());
      } catch (e) {}
      document.cookie = cfg.chave + "=1; max-age=" + 60 * 60 * 24 * 30 + "; path=/; SameSite=Lax";
    },
    clear: function () {
      try {
        localStorage.removeItem(cfg.chave);
      } catch (e) {}
      document.cookie = cfg.chave + "=; max-age=0; path=/";
    },
  };

  var CSS = [
    ":host { all: initial; }",
    "*, *::before, *::after { box-sizing: border-box; }",
    ".overlay { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 16px; overflow-y: auto;",
    "  background: rgba(0, 0, 0, 0.72); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);",
    "  font-family: Ubuntu, Helvetica, system-ui, -apple-system, 'Segoe UI', sans-serif;",
    "  opacity: 0; transition: opacity .2s ease; }",
    ".overlay.on { opacity: 1; }",
    ".card { position: relative; width: 100%; max-width: 440px; overflow: hidden; border-radius: 12px;",
    "  background: radial-gradient(120% 80% at 50% 0%, rgba(101, 40, 211, .28), transparent 60%), #0d0d0d;",
    "  border: 1px solid #333; color: #ededed; box-shadow: 0 24px 64px rgba(0, 0, 0, .6), 0 0 0 1px rgba(101, 40, 211, .25);",
    "  transform: translateY(12px) scale(.98); transition: transform .25s cubic-bezier(.2, .8, .2, 1); }",
    ".overlay.on .card { transform: none; }",
    ".card:focus { outline: none; }",
    ".foto { position: relative; height: 210px; background: #111; }",
    ".foto img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; }",
    ".foto::after { content: ''; position: absolute; inset: 0; pointer-events: none;",
    "  background: linear-gradient(180deg, rgba(13, 13, 13, 0) 45%, #0d0d0d 100%); }",
    ".corpo { padding: 20px 28px 28px; }",
    ".card--sem-foto .corpo { padding-top: 32px; }",
    ".tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 18px; }",
    ".tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;",
    "  font-size: 12px; font-weight: 700; line-height: 1.4; }",
    ".tag--black { background: #ff6b35; color: #0d0d0d; }",
    ".tag--black::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }",
    ".tag--data { background: rgba(101, 40, 211, .18); color: #c4b5fd; border: 1px solid rgba(101, 40, 211, .45); }",
    "h2 { margin: 0 0 12px; font-size: 24px; line-height: 1.2; font-weight: 700; color: #fff; text-wrap: balance; }",
    "h2 span { color: #8b5cf6; }",
    "p { margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: rgba(237, 237, 237, .72); }",
    "p strong { color: #fff; font-weight: 700; }",
    ".cta { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px;",
    "  padding: 12px 20px; border-radius: 8px; background: #6528d3; color: #fff; font: inherit; font-size: 15px;",
    "  font-weight: 700; text-decoration: none; transition: background .15s ease, transform .15s ease; }",
    ".cta:hover { background: #5020b0; }",
    ".cta:active { transform: translateY(1px); }",
    ".fechar { position: absolute; top: 12px; right: 12px; z-index: 1; width: 36px; height: 36px; display: grid; place-items: center;",
    "  border: 0; border-radius: 8px; background: rgba(0, 0, 0, .55); color: #ededed; cursor: pointer;",
    "  transition: background .15s ease, color .15s ease; }",
    ".fechar:hover { background: #1a1a1a; color: #fff; }",
    ".cta:focus-visible, .fechar:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 2px; }",
    ".depois { display: block; margin: 12px auto 0; padding: 6px; border: 0; background: none; font: inherit;",
    "  font-size: 13px; color: rgba(237, 237, 237, .45); cursor: pointer; }",
    ".depois:hover { color: rgba(237, 237, 237, .72); text-decoration: underline; }",
    ".depois:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 2px; border-radius: 4px; }",
    "@media (max-width: 480px) { .foto { height: 180px; } .corpo { padding: 18px 20px 20px; } h2 { font-size: 21px; } }",
    "@media (prefers-reduced-motion: reduce) { .overlay, .card, .cta { transition: none; } }",
  ].join("\n");

  var HTML =
    '<div class="overlay" part="overlay">' +
    '  <div class="card" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="dd-live-titulo" aria-describedby="dd-live-texto">' +
    '    <button class="fechar" type="button" aria-label="Fechar">' +
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    "    </button>" +
    '    <div class="foto"><img alt="Os gêmeos da Dev em Dobro" width="840" height="840" decoding="async"></div>' +
    '    <div class="corpo">' +
    '    <div class="tags"><span class="tag tag--black">Black em Dobro</span><span class="tag tag--data">Qui · 29/10</span></div>' +
    '    <h2 id="dd-live-titulo">Live exclusiva pra alunos — <span>29/10</span></h2>' +
    '    <p id="dd-live-texto">Dia 29/10 tem live só pra quem já é aluno da Dev em Dobro, com uma <strong>novidade especial pra você</strong>. Entra no grupo da live pra receber o link e não perder.</p>' +
    '    <a class="cta" target="_blank" rel="noopener noreferrer">Entrar no grupo da live <span aria-hidden="true">→</span></a>' +
    '    <button class="depois" type="button">Agora não</button>' +
    "    </div>" +
    "  </div>" +
    "</div>";

  var host = null;
  var ultimoFoco = null;

  function fechar() {
    store.set();
    if (!host) return;
    var overlay = host.shadowRoot.querySelector(".overlay");
    overlay.classList.remove("on");
    document.removeEventListener("keydown", onKey, true);
    var h = host;
    host = null;
    setTimeout(function () {
      h.remove();
    }, 200);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function onKey(e) {
    if (!host) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      fechar();
      return;
    }
    // Mantém o foco dentro do popup
    if (e.key === "Tab") {
      var root = host.shadowRoot;
      var focaveis = root.querySelectorAll(".fechar, .cta, .depois");
      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];
      var ativo = root.activeElement;
      var dentro = Array.prototype.indexOf.call(focaveis, ativo) !== -1;
      if (e.shiftKey && (ativo === primeiro || !dentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (ativo === ultimo || !dentro)) {
        e.preventDefault();
        primeiro.focus();
      }
    }
  }

  function abrir() {
    if (host) return;

    host = document.createElement("div");
    host.id = "dd-live-popup";
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<style>" + CSS + "</style>" + HTML;
    document.body.appendChild(host);

    var overlay = root.querySelector(".overlay");
    var cta = root.querySelector(".cta");
    cta.href = cfg.link;

    var card = root.querySelector(".card");
    var foto = root.querySelector(".foto");
    function semFoto() {
      foto.remove();
      card.classList.add("card--sem-foto");
    }
    if (cfg.foto) {
      var img = foto.querySelector("img");
      img.addEventListener("error", semFoto);
      img.src = cfg.foto;
    } else {
      semFoto();
    }

    root.querySelector(".fechar").addEventListener("click", fechar);
    root.querySelector(".depois").addEventListener("click", fechar);
    cta.addEventListener("click", fechar); // quem entrou no grupo não precisa ver de novo
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) fechar();
    });
    document.addEventListener("keydown", onKey, true);

    ultimoFoco = document.activeElement;
    requestAnimationFrame(function () {
      overlay.classList.add("on");
      root.querySelector(".card").focus({ preventScroll: true });
    });
  }

  window.DevEmDobroLivePopup = {
    abrir: abrir,
    fechar: fechar,
    resetar: store.clear,
  };

  if (new Date() >= cfg.expira || store.get()) return;

  function iniciar() {
    setTimeout(abrir, cfg.delay);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
