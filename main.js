// Menú móvil, visor de fotos y formulario de reserva (prepara un mensaje de WhatsApp o email;
// no envía ni guarda datos).
(() => {
  // Menú móvil
  const boton = document.querySelector(".menu-boton");
  const menu = document.getElementById("menu");
  if (boton && menu) {
    const cierra = () => { menu.classList.remove("abierto"); boton.setAttribute("aria-expanded", "false"); };
    boton.addEventListener("click", () => {
      const abierto = menu.classList.toggle("abierto");
      boton.setAttribute("aria-expanded", String(abierto));
    });
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) cierra(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") cierra(); });
  }

  // Carrusel de portada: avanza solo cada 3,5 s; se para al pasar el ratón o el foco, con el
  // botón de pausa (WCAG 2.2.2), con la pestaña oculta y si el sistema pide reducir movimiento
  const carrusel = document.querySelector(".carrusel");
  if (carrusel) {
    const diapos = [...carrusel.querySelectorAll(".diapo")];
    const puntos = [...carrusel.querySelectorAll(".carrusel-puntos button:not(.carrusel-pausa)")];
    const pausa = carrusel.querySelector(".carrusel-pausa");
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let actual = 0, temporizador = null, pausadoPorUsuario = quieto;
    const ve = (i) => {
      actual = (i + diapos.length) % diapos.length;
      diapos.forEach((d, j) => {
        d.classList.toggle("activa", j === actual);
        d.toggleAttribute("aria-hidden", j !== actual);
      });
      puntos.forEach((p, j) => p.toggleAttribute("aria-current", j === actual));
    };
    const para = () => { clearInterval(temporizador); temporizador = null; };
    const arranca = () => { if (!pausadoPorUsuario && !temporizador) temporizador = setInterval(() => ve(actual + 1), 3500); };
    const muestraPausa = () => {
      pausa.textContent = pausadoPorUsuario ? "▶" : "❚❚";
      pausa.setAttribute("aria-label", pausadoPorUsuario ? pausa.dataset.seguir : pausa.dataset.pausa);
    };
    carrusel.querySelector(".anterior").addEventListener("click", () => { ve(actual - 1); para(); arranca(); });
    carrusel.querySelector(".siguiente").addEventListener("click", () => { ve(actual + 1); para(); arranca(); });
    puntos.forEach((p, i) => p.addEventListener("click", () => { ve(i); para(); arranca(); }));
    pausa.addEventListener("click", () => { pausadoPorUsuario = !pausadoPorUsuario; muestraPausa(); pausadoPorUsuario ? para() : arranca(); });
    carrusel.addEventListener("mouseenter", para);
    carrusel.addEventListener("mouseleave", arranca);
    carrusel.addEventListener("focusin", para);
    carrusel.addEventListener("focusout", arranca);
    document.addEventListener("visibilitychange", () => (document.hidden ? para() : arranca()));
    let inicioX = null;
    carrusel.addEventListener("touchstart", (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
    carrusel.addEventListener("touchend", (e) => {
      if (inicioX === null) return;
      const dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 50) { ve(actual + (dx < 0 ? 1 : -1)); para(); arranca(); }
      inicioX = null;
    });
    muestraPausa();
    arranca();
  }

  // Visor de fotos
  const visor = document.querySelector(".visor");
  const items = [...document.querySelectorAll(".galeria-item")];
  if (visor && items.length && typeof visor.showModal === "function") {
    const foto = visor.querySelector("img");
    const pie = visor.querySelector(".visor-pie");
    let actual = 0;
    const muestra = (i) => {
      actual = (i + items.length) % items.length;
      const origen = items[actual];
      foto.src = origen.dataset.grande;
      foto.alt = origen.querySelector("img").alt;
      pie.textContent = `${foto.alt} · ${actual + 1}/${items.length}`;
    };
    items.forEach((item, i) => item.addEventListener("click", () => { muestra(i); visor.showModal(); }));
    visor.querySelector(".visor-cerrar").addEventListener("click", () => visor.close());
    visor.querySelector(".visor-anterior").addEventListener("click", () => muestra(actual - 1));
    visor.querySelector(".visor-siguiente").addEventListener("click", () => muestra(actual + 1));
    visor.addEventListener("click", (e) => { if (e.target === visor) visor.close(); });
    visor.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") muestra(actual - 1);
      if (e.key === "ArrowRight") muestra(actual + 1);
    });
    let inicioX = null;
    visor.addEventListener("touchstart", (e) => { inicioX = e.touches[0].clientX; }, { passive: true });
    visor.addEventListener("touchend", (e) => {
      if (inicioX === null) return;
      const dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 50) muestra(actual + (dx < 0 ? 1 : -1));
      inicioX = null;
    });
  }

  // Formulario de reserva
  const form = document.querySelector(".formulario");
  if (!form) return;
  const llegada = form.elements.llegada;
  const salida = form.elements.salida;
  const error = form.querySelector(".error");
  const hoy = new Date().toISOString().slice(0, 10);
  llegada.min = hoy;
  salida.min = hoy;
  llegada.addEventListener("change", () => {
    salida.min = llegada.value || hoy;
    if (salida.value && salida.value <= llegada.value) salida.value = "";
  });

  const lang = document.documentElement.lang;
  const fecha = (v) => new Date(`${v}T12:00:00`).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });
  const avisa = (texto) => { error.textContent = texto; error.hidden = !texto; };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    avisa("");
    const datos = Object.fromEntries(new FormData(form));
    const primeroInvalido = [llegada, salida, form.elements.nombre].find((c) => !c.value.trim());
    if (primeroInvalido) {
      primeroInvalido.reportValidity();
      primeroInvalido.focus();
      return;
    }
    if (datos.salida <= datos.llegada) { avisa(form.dataset.errorFechas); salida.focus(); return; }

    const mensaje = datos.mensaje.trim();
    let texto = form.dataset.plantilla
      .replace("{nombre}", datos.nombre.trim())
      .replace("{llegada}", fecha(datos.llegada))
      .replace("{salida}", fecha(datos.salida))
      .replace("{personas}", datos.personas);
    texto = mensaje ? texto.replace("{mensaje}", mensaje) : texto.replace("\n\n{mensaje}", "");

    const canal = e.submitter?.value === "email" ? "email" : "whatsapp";
    const destino = canal === "email" ? form.dataset.email : form.dataset.whatsapp;
    if (!destino) { avisa(`${canal === "email" ? "Email" : "WhatsApp"}: ${form.dataset.pendiente}`); return; }
    const url = canal === "email"
      ? `mailto:${destino}?subject=${encodeURIComponent(form.dataset.asunto)}&body=${encodeURIComponent(texto)}`
      : `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
    window.open(url, canal === "email" ? "_self" : "_blank", "noopener");
  });
})();
