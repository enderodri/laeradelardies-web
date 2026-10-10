// Lee los calendarios iCal de Airbnb y Booking y escribe en la salida estándar un JSON con
// las noches ocupadas, sin datos de huéspedes: {"actualizado": "...", "ocupado": [["2026-10-12","2026-10-15"], ...]}.
// Cada rango es [primera noche, día de salida): la noche del día de salida queda libre.
//
// Uso: ICAL_AIRBNB=<url> ICAL_BOOKING=<url> node disponibilidad.mjs > disponibilidad.json
// Para probar sin enlaces reales, las variables pueden ser rutas a ficheros .ics locales.
// Si un calendario falla, el script termina con error y no escribe nada: así la tarea
// programada no borra la disponibilidad publicada por un fallo puntual.
import { readFileSync } from "node:fs";

const fuentes = ["ICAL_AIRBNB", "ICAL_BOOKING"].map((k) => process.env[k]).filter(Boolean);
if (!fuentes.length) {
  console.error("Faltan ICAL_AIRBNB o ICAL_BOOKING");
  process.exit(1);
}

async function descarga(origen) {
  if (!/^https?:/.test(origen)) return readFileSync(origen, "utf8");
  const r = await fetch(origen, { headers: { "User-Agent": "laeradelardies.com disponibilidad" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} al leer un calendario`);
  const texto = await r.text();
  if (!texto.includes("BEGIN:VCALENDAR")) throw new Error("La respuesta no es un calendario iCal");
  return texto;
}

// "20261012" o "20261012T140000Z" -> "2026-10-12"
const fecha = (v) => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
const masUnDia = (f) => new Date(Date.parse(`${f}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);

function eventos(ics) {
  // Las líneas largas de iCal continúan en la siguiente si esta empieza por espacio
  const lineas = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const rangos = [];
  let actual = null;
  for (const l of lineas) {
    if (l === "BEGIN:VEVENT") actual = {};
    else if (l === "END:VEVENT") {
      if (actual?.inicio) rangos.push([actual.inicio, actual.fin && actual.fin > actual.inicio ? actual.fin : masUnDia(actual.inicio)]);
      actual = null;
    } else if (actual) {
      const m = l.match(/^(DTSTART|DTEND)[^:]*:(\d{8})/);
      if (m) actual[m[1] === "DTSTART" ? "inicio" : "fin"] = fecha(m[2]);
    }
  }
  return rangos;
}

const hoy = new Date().toISOString().slice(0, 10);
const todos = (await Promise.all(fuentes.map(descarga))).flatMap(eventos)
  .filter(([, fin]) => fin > hoy)
  .sort((a, b) => a[0].localeCompare(b[0]));

// Une rangos solapados o seguidos (una salida el mismo día que otra llegada)
const ocupado = [];
for (const [ini, fin] of todos) {
  const ultimo = ocupado.at(-1);
  if (ultimo && ini <= ultimo[1]) ultimo[1] = fin > ultimo[1] ? fin : ultimo[1];
  else ocupado.push([ini, fin]);
}

process.stdout.write(JSON.stringify({ actualizado: new Date().toISOString(), ocupado }) + "\n");
