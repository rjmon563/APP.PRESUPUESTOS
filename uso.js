// PresuPro · uso anónimo
// Solo cuenta avisos (abrir la app, crear un presupuesto, un parte…) con un código al azar de este móvil.
// Nunca se envían clientes, precios, textos ni fotos. Se puede desactivar en ⚙️.
'use strict';

const USO_URL = 'https://wuejigykmflwhpuapwcw.supabase.co/rest/v1/eventos';
const USO_CLAVE = 'sb_publishable_Xrnx_ET8usxVBnNcRjNDwg_dxQYS8q3'; // clave pública: solo permite añadir avisos
const USO_COLA = 'presupro_uso_cola', USO_ID = 'presupro_uso_id', USO_OFF = 'presupro_uso_off', USO_DIA = 'presupro_uso_dia';
const USO_MAX_COLA = 200;

const usoLeer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const usoEscribir = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
const usoActivo = () => usoLeer(USO_OFF) !== '1';

function usoIdInstalacion() {
    let id = usoLeer(USO_ID);
    if (!id) {
        id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
        usoEscribir(USO_ID, id);
    }
    return id;
}

function usoCola() { try { const c = JSON.parse(usoLeer(USO_COLA)); return Array.isArray(c) ? c : []; } catch (e) { return []; } }

let usoEnviando = false;
async function usoEnviar() {
    if (usoEnviando || typeof fetch !== 'function' || !usoActivo() || navigator.onLine === false) return;
    const lote = usoCola().slice(0, 50);
    if (!lote.length) return;
    usoEnviando = true;
    let seguir = false;
    try {
        const r = await fetch(USO_URL, {
            method: 'POST', keepalive: true,
            headers: { apikey: USO_CLAVE, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify(lote)
        });
        // Aceptado, o rechazado por datos no válidos (no tiene sentido reintentarlos): se quita del móvil
        if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429 && r.status !== 408)) {
            usoEscribir(USO_COLA, JSON.stringify(usoCola().slice(lote.length)));
            seguir = r.ok && usoCola().length > 0;
        }
    } catch (e) { /* sin cobertura: se queda en cola y se reintenta */ }
    usoEnviando = false;
    if (seguir) usoEnviar();
}

window.registrarUso = (evento) => {
    if (!usoActivo()) return;
    const cola = usoCola();
    cola.push({ instalacion: usoIdInstalacion(), evento, version: String(typeof VERSION !== 'undefined' ? VERSION : ''), creado: new Date().toISOString() });
    usoEscribir(USO_COLA, JSON.stringify(cola.slice(-USO_MAX_COLA)));
    usoEnviar();
};

// Una vez al día como mucho
window.registrarAbrir = () => {
    const hoy = hoyISO();
    if (usoLeer(USO_DIA) === hoy) { usoEnviar(); return; }
    usoEscribir(USO_DIA, hoy);
    registrarUso('abrir');
};

window.addEventListener('online', () => usoEnviar());

// Ajustes: ver estado y desactivar
window.renderUso = () => {
    const e = document.getElementById('uso-estado'), b = document.getElementById('uso-boton'), c = document.getElementById('uso-codigo');
    if (!e) return;
    e.textContent = usoActivo() ? 'Activado' : 'Desactivado';
    b.textContent = usoActivo() ? 'Desactivar' : 'Activar';
    c.textContent = 'Código de este móvil: ' + (usoLeer(USO_ID) || '—').slice(0, 8);
};
window.alternarUso = () => {
    if (usoActivo()) usoEscribir(USO_OFF, '1'); else { try { localStorage.removeItem(USO_OFF); } catch (e) { } }
    renderUso();
};
