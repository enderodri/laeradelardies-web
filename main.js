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

  // Aviso de reserva directa: tarjeta pequeña a los 6 s. No aparece si ya se está viendo la
  // sección de reservas y, una vez cerrada o usada, no vuelve en la misma visita
  const aviso = document.querySelector(".aviso-directo");
  const reservas = document.getElementById("reservar");
  if (aviso && reservas) {
    let visto = false;
    try { visto = sessionStorage.getItem("aviso-directo") === "1"; } catch {}
    const cierra = () => {
      aviso.hidden = true;
      try { sessionStorage.setItem("aviso-directo", "1"); } catch {}
    };
    let enReservas = false;
    new IntersectionObserver(([e]) => {
      enReservas = e.isIntersecting;
      if (enReservas) aviso.hidden = true;
    }).observe(reservas);
    aviso.querySelector(".aviso-cerrar").addEventListener("click", cierra);
    aviso.querySelector("a").addEventListener("click", cierra);
    if (!visto) setTimeout(() => { if (!enReservas) aviso.hidden = false; }, 6000);
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

  // Calendario de disponibilidad: noches ocupadas en Airbnb y Booking, que una tarea de GitHub
  // publica cada hora. Si no se puede leer, el calendario sigue oculto y el formulario funciona igual.
  const ocupadas = new Set();
  const suma = (f, n) => new Date(Date.parse(`${f}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  const libre = (desde, hasta) => { for (let f = desde; f < hasta; f = suma(f, 1)) if (ocupadas.has(f)) return false; return true; };
  const cal = document.querySelector(".calendario");
  if (cal) {
    const meses = cal.querySelector(".calendario-meses");
    const mesHoy = hoy.slice(0, 7);
    let inicio = mesHoy;
    const cuantos = () => (matchMedia("(min-width: 600px)").matches ? 2 : 1);
    const mesMas = (ym, n) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
    const pinta = () => {
      const lleg = llegada.value, sal = salida.value;
      let html = "";
      for (let k = 0; k < cuantos(); k++) {
        const ym = mesMas(inicio, k);
        const [y, m] = ym.split("-").map(Number);
        const primero = new Date(Date.UTC(y, m - 1, 1));
        const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
        html += `<div class="mes"><p class="mes-nombre">${primero.toLocaleDateString(lang, { month: "long", year: "numeric", timeZone: "UTC" })}</p><div class="mes-rejilla">`;
        // Cabecera de la semana empezando en lunes (el 1-ene-2024 fue lunes)
        for (let i = 0; i < 7; i++) html += `<span class="semana">${new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(lang, { weekday: "narrow", timeZone: "UTC" })}</span>`;
        html += "<span></span>".repeat((primero.getUTCDay() + 6) % 7);
        for (let d = 1; d <= dias; d++) {
          const f = `${ym}-${String(d).padStart(2, "0")}`;
          const estado = f < hoy ? "pasado" : ocupadas.has(f) ? "ocupado" : "libre";
          const elegido = lleg && (f === lleg || f === sal || (sal && f > lleg && f < sal));
          const clase = `dia ${estado}${elegido ? " elegido" : ""}`;
          if (estado === "pasado") { html += `<span class="${clase}">${d}</span>`; continue; }
          const nombre = new Date(`${f}T12:00:00`).toLocaleDateString(lang, { day: "numeric", month: "long" });
          html += `<button type="button" class="${clase}" data-fecha="${f}" aria-pressed="${elegido ? "true" : "false"}" aria-label="${nombre}, ${cal.dataset[estado]}">${d}</button>`;
        }
        html += "</div></div>";
      }
      meses.innerHTML = html;
      cal.querySelector(".calendario-anterior").disabled = inicio <= mesHoy;
      cal.querySelector(".calendario-siguiente").disabled = inicio >= mesMas(mesHoy, 16);
    };
    meses.addEventListener("click", (e) => {
      const boton = e.target.closest("button[data-fecha]");
      if (!boton) return;
      const f = boton.dataset.fecha;
      avisa("");
      if (llegada.value && !salida.value && f > llegada.value) {
        // Segundo clic: salida. Puede caer en un día ocupado (se sale por la mañana), pero
        // ninguna noche intermedia puede estarlo
        if (!libre(llegada.value, f)) { avisa(form.dataset.errorOcupado); return; }
        salida.value = f;
      } else {
        if (ocupadas.has(f)) { avisa(form.dataset.errorOcupado); return; }
        llegada.value = f;
        salida.value = "";
        salida.min = f;
      }
      pinta();
    });
    cal.querySelector(".calendario-anterior").addEventListener("click", () => { inicio = mesMas(inicio, -cuantos()); if (inicio < mesHoy) inicio = mesHoy; pinta(); });
    cal.querySelector(".calendario-siguiente").addEventListener("click", () => { inicio = mesMas(inicio, cuantos()); pinta(); });
    [llegada, salida].forEach((c) => c.addEventListener("change", pinta));
    matchMedia("(min-width: 600px)").addEventListener("change", pinta);
    fetch(cal.dataset.url, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((datos) => {
        for (const [desde, hasta] of datos.ocupado) for (let f = desde; f < hasta; f = suma(f, 1)) ocupadas.add(f);
        const cuando = new Date(datos.actualizado).toLocaleString(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        cal.querySelector(".calendario-fecha").textContent = `${cal.dataset.actualizado}: ${cuando}.`;
        cal.hidden = false;
        pinta();
      })
      .catch(() => {});
  }

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
    if (!libre(datos.llegada, datos.salida)) { avisa(form.dataset.errorOcupado); llegada.focus(); return; }

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
