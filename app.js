(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Hero: el video se reproduce solo (tiempo normal) y los momentos aparecen con él ── */
  const cine = document.querySelector(".cine");
  const video = cine && cine.querySelector(".cine-video");
  if (cine && video) {
    const momentos = [...cine.querySelectorAll(".momento")];
    const dur = () => (video.duration && isFinite(video.duration)) ? video.duration : 8;

    const atualizar = () => {
      const p = Math.min(1, Math.max(0, (video.currentTime || 0) / dur()));
      for (const m of momentos) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", p >= de && p <= ate);
      }
    };

    if (reduzir) {
      // Sin animación: muestra el primer momento sobre el póster
      video.removeAttribute("autoplay");
      try { video.pause(); } catch (e) {}
      momentos[0] && momentos[0].classList.add("ativo");
    } else {
      video.addEventListener("timeupdate", atualizar);
      const tentarTocar = () => { const r = video.play && video.play(); if (r && r.catch) r.catch(() => {}); };
      video.addEventListener("canplay", tentarTocar);
      // Reintenta al primer gesto, por si el navegador bloquea el autoplay
      addEventListener("pointerdown", tentarTocar, { once: true, passive: true });
      tentarTocar();
      atualizar();
    }
  }

  /* ── Topo, botones flotantes, revelar y año ───────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  const chamar = document.querySelector(".chamar");
  let formNaTela = false; // los botones flotantes se recogen para no cubrir el "Send"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    cine && cine.classList.toggle("andou", scrollY > 40);
    const mostrar = scrollY > innerHeight * 0.6 && !formNaTela;
    whats && whats.classList.toggle("visivel", mostrar);
    chamar && chamar.classList.toggle("visivel", mostrar);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  /* ── Menú hamburguesa (móvil) ─────────────────────────────────────────── */
  const hamburguesa = document.querySelector(".hamburguesa");
  const menu = document.querySelector(".menu");
  if (hamburguesa && topo) {
    const alternar = (abrir) => {
      const open = abrir === undefined ? !topo.classList.contains("menu-aberto") : abrir;
      topo.classList.toggle("menu-aberto", open);
      hamburguesa.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.classList.toggle("menu-travado", open);
    };
    hamburguesa.addEventListener("click", () => alternar());
    menu && menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => alternar(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") alternar(false); });
  }

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (whats && S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    whats.href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
  }

  /* ── Formulario → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robot
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Please check the highlighted fields.", "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `New message from ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Sending…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar("Thank you! We received your message and will be in touch soon.", "ok");
      } catch (e) {
        console.warn("Form submit failed:", e);
        avisar("Couldn't send right now. Please call or message us on WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();
