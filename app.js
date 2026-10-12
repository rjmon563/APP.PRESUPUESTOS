// ==========================================
// 1. ESTADO INICIAL Y BASE DE DATOS
// ==========================================
const VERSION = '5';

// Si el móvil conserva un index.html antiguo, se borra la copia guardada y se recarga limpio (máximo 2 intentos)
(function comprobarVersion() {
    const m = document.querySelector('meta[name="presupro-version"]');
    if (m && m.content === VERSION) return;
    let intentos = 0;
    try { intentos = Number(sessionStorage.getItem('presupro_heal') || 0); } catch (e) { }
    if (intentos >= 2) return;
    try { sessionStorage.setItem('presupro_heal', String(intentos + 1)); } catch (e) { }
    const tareas = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) tareas.push(navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))));
    if (window.caches) tareas.push(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))));
    Promise.all(tareas).catch(() => { }).then(() => location.replace(location.pathname + '?v=' + Date.now()));
})();

// Si algo falla, se ve en pantalla en vez de quedarse la app muda
function mostrarError(msg) {
    let b = document.getElementById('banner-error');
    if (!b) {
        b = document.createElement('div'); b.id = 'banner-error';
        b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99;background:#bf3b2e;color:#fff;padding:12px 14px;border-radius:12px;font:600 14px/1.3 sans-serif;';
        b.onclick = () => b.remove(); document.body.appendChild(b);
    }
    b.textContent = 'Fallo en la app (versión ' + VERSION + '): ' + msg + ' — toca para cerrar y haz captura';
}
window.addEventListener('error', e => mostrarError(e.message));
window.addEventListener('unhandledrejection', e => mostrarError(String(e.reason && e.reason.message || e.reason)));

const AJUSTES_DEFECTO = {
    nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '', email: '', nPresu: 1,
    condiciones: 'Presupuesto válido durante 30 días desde su fecha.\nLos trabajos no incluidos expresamente se presupuestarán aparte.',
    ultimaCopia: null
};

let db;
try { db = JSON.parse(localStorage.getItem('presupro_v3')); } catch (e) { db = null; }
if (!db) db = { clientes: [], ajustes: {}, agenda: {} };
db.ajustes = Object.assign({}, AJUSTES_DEFECTO, db.ajustes || {});
if (!db.agenda) db.agenda = {};
if (!db.clientes) db.clientes = [];

let clienteActual = null;
let obraEnCurso = nuevaObra('');
let calcEstado = {};

function nuevaObra(nombre) {
    return { nombre, lineas: [], iva: 21, fotos: [], presuId: null, fecha: hoyISO(), totalManual: null };
}

const CONFIG_MEDIDAS = {
    'techos':     { n: 'Techo',       i: '🏠', pasos: 2, m1: 'Ancho',          m2: 'Largo',       u: 'm²' },
    'tabiques':   { n: 'Tabique',     i: '🧱', pasos: 2, m1: 'Suma de tramos', m2: 'Altura',      u: 'm²' },
    'cajones':    { n: 'Cajón',       i: '📦', pasos: 2, m1: 'Suma de tramos', m2: 'Altura/Fondo', u: 'm²' },
    'tabicas':    { n: 'Tabica',      i: '📐', pasos: 2, m1: 'Ancho',          m2: 'Largo',       u: 'm²' },
    'cantoneras': { n: 'Cantonera',   i: '📏', pasos: 1, m1: 'Metros Totales',                    u: 'ml' },
    'horas':      { n: 'Horas Admin', i: '🕒', pasos: 1, m1: 'Número de Horas',                   u: 'h' }
};

const fNum = (n) => Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;
const unidadDe = (tipo) => (CONFIG_MEDIDAS[tipo] || {}).u || '';
function hoyISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function fechaES(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }

const ICON = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

// Escapa texto del usuario antes de meterlo en HTML
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Acepta "1.234,56", "1234,56" y "1234.56"
function parseNum(txt) {
    let s = String(txt || '').replace(/[€\s]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

const asegurarGuardado = () => {
    try { localStorage.setItem('presupro_v3', JSON.stringify(db)); }
    catch (e) { alert('No se han podido guardar los datos en el móvil. Haz una copia de seguridad (⚙️ > Exportar).'); }
};

// Totales de una obra o presupuesto: base de líneas, ajuste por total corregido, IVA y total
function calcularTotales(lineas, iva, totalManual) {
    const subtotal = redondear(lineas.reduce((a, b) => a + (b.subtotal || 0), 0));
    let base = subtotal;
    if (totalManual !== null && totalManual !== undefined && Math.abs(totalManual - subtotal * (1 + iva / 100)) > 0.005) {
        base = redondear(totalManual / (1 + iva / 100));
    }
    const ajuste = redondear(base - subtotal);
    const cuotaIva = redondear(base * iva / 100);
    const total = redondear(base + cuotaIva);
    return { subtotal, ajuste, base, cuotaIva, total };
}

// Presupuestos antiguos (guardados antes de esta versión) no tienen base/ajuste
function totalesDePresupuesto(p) {
    if (p.base !== undefined) return { subtotal: p.subtotal != null ? p.subtotal : p.base, ajuste: p.ajuste || 0, base: p.base, cuotaIva: p.cuotaIva, total: p.total };
    const iva = p.iva != null ? p.iva : 21;
    return calcularTotales(p.lineas || [], iva, p.total);
}

// ==========================================
// 2. NAVEGACIÓN
// ==========================================
window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    const p = document.getElementById(`pantalla-${id}`);
    if (p) p.classList.remove('hidden');
    window.scrollTo(0, 0);

    if (id === 'clientes') renderListaClientes();
    if (id === 'calendario') renderCalendario();
    if (id === 'ajustes') { cargarAjustesEnFormulario(); calcularResumenIVA(); }
};

// ==========================================
// 3. LÓGICA DE CALCULADORA
// ==========================================
window.teclear = (n) => {
    const fresco = calcEstado.fresco;
    calcEstado.fresco = false;

    if (n === '+') {
        let valorActual = parseFloat(calcEstado.memoria.replace(',', '.')) || 0;
        if (valorActual !== 0) {
            calcEstado.historialSuma.push(valorActual);
            calcEstado.acumulado += valorActual;
            calcEstado.memoria = '';
        }
        actualizarDisplay();
    } else if (n === 'OK') {
        let vF = parseFloat(calcEstado.memoria.replace(',', '.')) || 0;
        let res = redondear(calcEstado.acumulado + vF);
        calcEstado.historialSuma = [];
        calcEstado.acumulado = 0;
        if (calcEstado.modo === 'medida') {
            const conf = CONFIG_MEDIDAS[calcEstado.tipo];
            if (calcEstado.paso < conf.pasos) {
                calcEstado.v1 = res; calcEstado.paso++;
                calcEstado.memoria = valorPrevio(calcEstado.previo.m2);
                calcEstado.fresco = calcEstado.memoria !== '';
                abrirCalculadora();
            } else {
                if (conf.pasos === 1) { calcEstado.v1 = res; calcEstado.v2 = null; calcEstado.totalMetros = res; }
                else { calcEstado.v2 = res; calcEstado.totalMetros = redondear(calcEstado.v1 * res); }
                calcEstado.modo = 'precio';
                calcEstado.memoria = valorPrevio(calcEstado.previo.precio);
                calcEstado.fresco = calcEstado.memoria !== '';
                abrirCalculadora();
            }
        } else {
            const conf = CONFIG_MEDIDAS[calcEstado.tipo];
            const l = {
                id: calcEstado.editandoId || Date.now(), tipo: calcEstado.tipo, tarea: calcEstado.tarea, zona: calcEstado.zona,
                nombre: `${conf.i} ${calcEstado.tarea} - ${calcEstado.zona}`,
                m1: calcEstado.v1, m2: calcEstado.v2, unidad: conf.u,
                cantidad: calcEstado.totalMetros, precio: res, subtotal: redondear(calcEstado.totalMetros * res)
            };
            if (calcEstado.editandoId) {
                const idx = obraEnCurso.lineas.findIndex(x => x.id === calcEstado.editandoId);
                if (idx >= 0) obraEnCurso.lineas[idx] = l; else obraEnCurso.lineas.push(l);
            } else { obraEnCurso.lineas.push(l); }
            obraEnCurso.totalManual = null; // las líneas cambiaron: el total vuelve a ser el calculado
            document.getElementById('modal-calc').classList.add('hidden');
            renderMedidas();
        }
    } else if (n === 'DEL') {
        if (calcEstado.memoria !== '') { calcEstado.memoria = ''; }
        else if (calcEstado.historialSuma.length > 0) {
            let ultimoDato = calcEstado.historialSuma.pop();
            calcEstado.acumulado = redondear(calcEstado.acumulado - ultimoDato);
            calcEstado.memoria = ultimoDato.toString().replace('.', ',');
        } else { calcEstado.acumulado = 0; }
        actualizarDisplay();
    } else if (n === '.') {
        if (fresco) calcEstado.memoria = '';
        if (!calcEstado.memoria.includes(',')) calcEstado.memoria += (calcEstado.memoria === '' ? '0,' : ',');
        actualizarDisplay();
    } else {
        if (fresco) calcEstado.memoria = ''; // al editar, la primera tecla sustituye el valor anterior
        calcEstado.memoria += n; actualizarDisplay();
    }
};

const valorPrevio = (v) => (v === null || v === undefined) ? '' : String(v).replace('.', ',');

function actualizarDisplay() {
    let visual = esc(calcEstado.memoria || '0');
    let textoHistorial = calcEstado.acumulado > 0 ? `<span class="calc-acc">Acumulado ${fNum(calcEstado.acumulado)} +</span>` : '';
    let pista = calcEstado.fresco ? `<span class="calc-hint">Valor anterior. Pulsa OK para mantenerlo.</span>` : '';
    document.getElementById('calc-display').innerHTML = textoHistorial + visual + pista;
}

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let titulo;
    if (calcEstado.modo === 'precio') titulo = `PRECIO €/${conf.u} · ${fNum(calcEstado.totalMetros)} ${conf.u}`;
    else titulo = calcEstado.paso === 1 ? conf.m1 : `${conf.m2} (${conf.m1}: ${fNum(calcEstado.v1)})`;
    const ctx = document.getElementById('calc-ctx'); if (ctx) ctx.innerText = `${calcEstado.tarea} · ${calcEstado.zona}`;
    document.getElementById('calc-titulo').innerText = titulo;
    actualizarDisplay();
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.prepararMedida = (t) => {
    const zona = prompt("¿ZONA?", "GENERAL"); if (!zona) return;
    const tarea = (t === 'horas') ? prompt("¿CONCEPTO?", "ADMINISTRACIÓN") : prompt("¿TRABAJO?", "MONTAJE"); if (!tarea) return;
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: null, memoria: '', acumulado: 0, zona: zona.toUpperCase(), tarea: tarea.toUpperCase(), modo: 'medida', editandoId: null, historialSuma: [], previo: {}, fresco: false };
    abrirCalculadora();
};

window.editarLinea = (id) => {
    const l = obraEnCurso.lineas.find(x => x.id === id);
    if (!l) return;
    const conf = CONFIG_MEDIDAS[l.tipo];
    // Líneas antiguas no guardaban las medidas parciales: se usa el total y altura 1
    let m1 = l.m1, m2 = l.m2;
    if (m1 === undefined || m1 === null) { m1 = l.cantidad; m2 = conf.pasos === 2 ? 1 : null; }
    const nuevaZona = prompt("¿ZONA?", l.zona); if (nuevaZona === null) return;
    const nuevaTarea = prompt(l.tipo === 'horas' ? "¿CONCEPTO?" : "¿TRABAJO?", l.tarea); if (nuevaTarea === null) return;
    calcEstado = {
        tipo: l.tipo, paso: 1, v1: 0, v2: null, memoria: valorPrevio(m1), acumulado: 0,
        zona: (nuevaZona || l.zona).toUpperCase(), tarea: (nuevaTarea || l.tarea).toUpperCase(),
        modo: 'medida', editandoId: id, historialSuma: [], previo: { m2, precio: l.precio }, fresco: true
    };
    abrirCalculadora();
};

window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');

// ==========================================
// 4. CLIENTES, EXPEDIENTE Y NOTAS
// ==========================================
window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    cont.innerHTML = db.clientes.length === 0
        ? '<div class="empty"><b>Aún no hay clientes</b>Pulsa + para añadir el primero.</div>'
        : db.clientes.slice().reverse().map(c => {
            const ps = c.presupuestos || [];
            const suma = ps.reduce((a, p) => a + (Number(p.total) || 0), 0);
            return `<button onclick="abrirExpediente(${c.id})" class="row-client">
                <div><div class="name">${esc(c.nombre)}</div><div class="meta">${ps.length === 1 ? '1 presupuesto' : ps.length + ' presupuestos'}</div></div>
                ${ps.length ? `<div class="amount">${fNum(suma)} €</div>` : ''}
            </button>`;
        }).join('');
    renderAvisoCopia();
};

function renderAvisoCopia() {
    const aviso = document.getElementById('aviso-copia');
    if (!aviso) return;
    const hayDatos = db.clientes.length > 0;
    const dias = db.ajustes.ultimaCopia ? (Date.now() - db.ajustes.ultimaCopia) / 86400000 : Infinity;
    if (hayDatos && dias > 7) {
        const txt = db.ajustes.ultimaCopia ? `Última copia hace ${Math.floor(dias)} días.` : 'Aún no has hecho ninguna copia.';
        aviso.innerHTML = `<div class="notice"><span>Tus datos solo están en este móvil. ${txt}</span><button onclick="exportarDatos()">Copia</button></div>`;
    } else aviso.innerHTML = '';
}

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("Nombre?");
    db.clientes.push({ id: Date.now(), nombre: nom.toUpperCase(), cif: document.getElementById('cli-cif').value.toUpperCase(), tel: document.getElementById('cli-tel').value, dir: document.getElementById('cli-dir').value.toUpperCase(), cp: document.getElementById('cli-cp').value.toUpperCase(), presupuestos: [], notas: "" });
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir', 'cli-cp'].forEach(i => document.getElementById(i).value = '');
    asegurarGuardado(); irAPantalla('clientes');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    if (!clienteActual) return;
    const historial = clienteActual.presupuestos || [];
    if (clienteActual.notas === undefined) clienteActual.notas = "";

    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="client-head">
            <h2>${esc(clienteActual.nombre)}</h2>
            <p>${esc(clienteActual.dir)} ${esc(clienteActual.cp || '')}</p>
        </div>
        <div class="note">
            <b>Notas de la obra</b>
            <textarea oninput="guardarNotas(${clienteActual.id}, this.value)">${esc(clienteActual.notas)}</textarea>
        </div>
        <p class="sub">Presupuestos</p>
        ${historial.slice().reverse().map(p => `
            <div class="presu">
                <button onclick="verPresupuestoGuardado(${p.id})" class="presu-main">
                    <div><b>Nº ${esc(p.numero)} · ${esc(p.nombreObra)}</b><small>${esc(p.fecha)}${p.aceptado ? ' · <span class="tag-ok">Aceptado</span>' : ''}</small></div>
                    <div class="amount">${fNum(p.total)} €</div>
                </button>
                <button onclick="alternarAceptado(${p.id})" aria-label="${p.aceptado ? 'Quitar aceptado' : 'Marcar como aceptado'}" class="sq ${p.aceptado ? 'on' : ''}">${ICON.check}</button>
                <button onclick="borrarPresupuestoIndividual(${p.id})" aria-label="Eliminar presupuesto" class="sq del">${ICON.trash}</button>
            </div>`).join('') || '<div class="empty" style="padding:18px 0">Todavía no hay presupuestos para este cliente.</div>'}
        <button onclick="borrarCliente(${clienteActual.id})" class="btn-link-danger">Eliminar cliente y todos sus presupuestos</button>`;
    irAPantalla('expediente');
};

window.guardarNotas = (id, t) => { const c = db.clientes.find(x => x.id === id); if (c) { c.notas = t; asegurarGuardado(); } };

window.alternarAceptado = (idPresu) => {
    const p = (clienteActual.presupuestos || []).find(x => x.id === idPresu);
    if (!p) return;
    p.aceptado = !p.aceptado;
    asegurarGuardado(); abrirExpediente(clienteActual.id);
};

// ==========================================
// 5. INICIAR MEDICIÓN
// ==========================================
window.confirmarNombreObra = () => {
    const v = document.getElementById('input-nombre-obra').value.trim();
    if (!v) return alert("Pon un nombre a la obra");
    obraEnCurso = nuevaObra(v.toUpperCase());
    document.getElementById('input-nombre-obra').value = "";
    abrirPantallaTrabajo();
};

function abrirPantallaTrabajo() {
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('fecha-obra').value = obraEnCurso.fecha || hoyISO();
    document.getElementById('aviso-edicion').innerText = obraEnCurso.presuId
        ? `Editando presupuesto nº ${(clienteActual.presupuestos.find(p => p.id === obraEnCurso.presuId) || {}).numero}` : '';
    irAPantalla('trabajo');
    cambiarIVA(obraEnCurso.iva);
    renderBotones();
}

// ==========================================
// 6. RENDER TRABAJO Y GUARDADO
// ==========================================
window.renderMedidas = () => {
    const cont = document.getElementById('lista-medidas-obra');
    const t = calcularTotales(obraEnCurso.lineas, obraEnCurso.iva, obraEnCurso.totalManual);
    cont.innerHTML = obraEnCurso.lineas.slice().reverse().map(l => {
        const conf = CONFIG_MEDIDAS[l.tipo] || {};
        const u = unidadDe(l.tipo);
        return `<div class="line">
            <b>${conf.i || ''} ${esc(l.tarea)}</b>
            <span class="amount">${fNum(l.subtotal)} €</span>
            <small>${esc(l.zona)} · ${fNum(l.cantidad)}&nbsp;${u} × ${fNum(l.precio)}&nbsp;€/${u}</small>
            <div class="line-actions">
                <button onclick="editarLinea(${l.id})" class="mini" aria-label="Editar línea">${ICON.edit}</button>
                <button onclick="borrarLinea(${l.id})" class="mini del" aria-label="Eliminar línea">${ICON.close}</button>
            </div>
        </div>`;
    }).join('') +
        (t.subtotal > 0 ? `<div class="total-card">
            <div class="ruler thin" aria-hidden="true"></div>
            <div class="kv"><span>Suma de partidas</span><span>${fNum(t.subtotal)} €</span></div>
            <div id="fila-ajuste" class="kv adj ${t.ajuste ? '' : 'hidden'}"><span>Ajuste / redondeo</span><span id="valor-ajuste">${fNum(t.ajuste)} €</span></div>
            <div class="kv"><span>Base imponible</span><span id="valor-base">${fNum(t.base)} €</span></div>
            <div class="kv"><span>IVA ${obraEnCurso.iva}%</span><span id="valor-iva">${fNum(t.cuotaIva)} €</span></div>
            <p class="total-label">Total. Puedes corregirlo y se ajusta la base.</p>
            <div class="total-row"><input type="text" inputmode="decimal" id="total-editable" oninput="corregirTotal(this.value)" class="total-input" value="${fNum(t.total)}"><span class="eur">€</span></div>
        </div>` : '');
};

// Al corregir el total se recalculan base, ajuste e IVA para que todo cuadre
window.corregirTotal = (valor) => {
    const n = parseNum(valor);
    obraEnCurso.totalManual = n > 0 ? n : null;
    const t = calcularTotales(obraEnCurso.lineas, obraEnCurso.iva, obraEnCurso.totalManual);
    document.getElementById('fila-ajuste').classList.toggle('hidden', !t.ajuste);
    document.getElementById('valor-ajuste').innerText = `${fNum(t.ajuste)}€`;
    document.getElementById('valor-base').innerText = `${fNum(t.base)}€`;
    document.getElementById('valor-iva').innerText = `${fNum(t.cuotaIva)}€`;
};

window.guardarObraCompleta = async () => {
    if (obraEnCurso.lineas.length === 0) return alert("Añade medidas");
    if (!db.ajustes.nombre && !confirm("Aún no has rellenado tus datos fiscales (⚙️). El PDF saldrá sin tus datos. ¿Continuar?")) return;

    const fechaISO = document.getElementById('fecha-obra').value || hoyISO();
    const t = calcularTotales(obraEnCurso.lineas, obraEnCurso.iva, obraEnCurso.totalManual);
    if (!clienteActual.presupuestos) clienteActual.presupuestos = [];

    let existente = obraEnCurso.presuId ? clienteActual.presupuestos.find(p => p.id === obraEnCurso.presuId) : null;
    if (existente && !confirm(`¿Guardar los cambios en el presupuesto nº ${existente.numero}?\n\nAceptar = sobrescribir el nº ${existente.numero}\nCancelar = guardarlo como presupuesto nuevo`)) existente = null;

    const datos = {
        fechaISO, fecha: fechaES(fechaISO), nombreObra: obraEnCurso.nombre, lineas: JSON.parse(JSON.stringify(obraEnCurso.lineas)),
        iva: obraEnCurso.iva, subtotal: t.subtotal, ajuste: t.ajuste, base: t.base, cuotaIva: t.cuotaIva, total: t.total
    };
    let presu;
    if (existente) { presu = Object.assign(existente, datos); }
    else {
        presu = Object.assign({ id: Date.now(), numero: db.ajustes.nPresu, aceptado: false }, datos);
        clienteActual.presupuestos.push(presu);
        db.ajustes.nPresu++;
    }
    obraEnCurso.presuId = presu.id;
    asegurarGuardado();

    await generarPDF(presu, clienteActual);
    abrirExpediente(clienteActual.id);
};

// ==========================================
// 7. PDF DEL PRESUPUESTO (plantilla propia, no captura de pantalla)
// ==========================================
function htmlPresupuesto(p, cli) {
    const a = db.ajustes;
    const t = totalesDePresupuesto(p);
    const filas = p.lineas.map(l => {
        const u = l.unidad || unidadDe(l.tipo);
        const detalle = (l.m2 !== null && l.m2 !== undefined) ? `${fNum(l.m1)} × ${fNum(l.m2)}` : '';
        return `<tr>
            <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;"><b>${esc(l.tarea)}</b> · ${esc((CONFIG_MEDIDAS[l.tipo] || {}).n || '')}<br><span style="color:#64748b;font-size:9px;">${esc(l.zona)}${detalle ? ' · ' + detalle : ''}</span></td>
            <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">${fNum(l.cantidad)} ${u}</td>
            <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">${fNum(l.precio)} €/${u}</td>
            <td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;"><b>${fNum(l.subtotal)} €</b></td>
        </tr>`;
    }).join('');
    const fila = (txt, val, estilo = '') => `<tr><td style="padding:4px;${estilo}">${txt}</td><td style="padding:4px;text-align:right;white-space:nowrap;${estilo}">${val}</td></tr>`;
    const lineaDatos = (...v) => v.filter(Boolean).map(esc).join(' · ');

    return `<div style="font-family:Helvetica,Arial,sans-serif;color:#0f172a;background:#fff;font-size:10px;padding:4mm;width:182mm;">
        <div style="height:6px;background:#ffc20e;margin-bottom:14px;"></div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;"><tr>
            <td style="vertical-align:top;">
                <div style="font-size:17px;font-weight:900;color:#0b3a6e;">${esc(a.nombre || 'TU EMPRESA')}</div>
                <div style="margin-top:4px;line-height:1.5;color:#334155;">
                    ${a.cif ? 'CIF/NIF: ' + esc(a.cif) + '<br>' : ''}${lineaDatos(a.dir)}<br>${lineaDatos(a.cp, a.ciudad)}<br>${lineaDatos(a.tel ? 'Tel. ' + a.tel : '', a.email)}
                </div>
            </td>
            <td style="vertical-align:top;text-align:right;">
                <div style="font-size:20px;font-weight:900;letter-spacing:1px;">PRESUPUESTO</div>
                <div style="margin-top:4px;line-height:1.5;">Nº <b>${esc(p.numero)}</b><br>Fecha: ${esc(p.fecha)}</div>
            </td>
        </tr></table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><tr>
            <td style="width:55%;vertical-align:top;background:#f1f5f9;padding:10px;border-radius:6px;">
                <div style="font-size:8px;font-weight:900;color:#64748b;margin-bottom:4px;">CLIENTE</div>
                <b>${esc(cli.nombre)}</b><br>${cli.cif ? 'CIF/NIF: ' + esc(cli.cif) + '<br>' : ''}${lineaDatos(cli.dir, cli.cp)}${cli.tel ? '<br>Tel. ' + esc(cli.tel) : ''}
            </td>
            <td style="width:4%;"></td>
            <td style="vertical-align:top;background:#f1f5f9;padding:10px;border-radius:6px;">
                <div style="font-size:8px;font-weight:900;color:#64748b;margin-bottom:4px;">OBRA</div>
                <b>${esc(p.nombreObra)}</b>
            </td>
        </tr></table>

        <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#0b3a6e;color:#fff;font-size:9px;">
                <th style="padding:6px 4px;text-align:left;">CONCEPTO</th><th style="padding:6px 4px;text-align:right;">CANTIDAD</th>
                <th style="padding:6px 4px;text-align:right;">PRECIO</th><th style="padding:6px 4px;text-align:right;">IMPORTE</th>
            </tr></thead>
            <tbody>${filas}</tbody>
        </table>

        <table style="width:45%;margin-left:55%;margin-top:12px;border-collapse:collapse;">
            ${t.ajuste ? fila('Suma de partidas', fNum(t.subtotal) + ' €') + fila('Ajuste / redondeo', fNum(t.ajuste) + ' €') : ''}
            ${fila('Base imponible', fNum(t.base) + ' €')}
            ${fila(p.iva ? `IVA ${p.iva}%` : 'IVA no incluido', fNum(t.cuotaIva) + ' €')}
            ${fila('<b>TOTAL</b>', '<b>' + fNum(t.total) + ' €</b>', 'font-size:13px;border-top:2px solid #0f172a;padding-top:6px;')}
        </table>

        ${a.condiciones ? `<div style="margin-top:22px;padding-top:8px;border-top:1px solid #e2e8f0;color:#475569;font-size:8.5px;line-height:1.5;">
            <div style="font-weight:900;margin-bottom:3px;">CONDICIONES</div>${esc(a.condiciones).replace(/\n/g, '<br>')}</div>` : ''}

        <table style="width:100%;margin-top:36px;"><tr>
            <td style="width:45%;border-top:1px solid #94a3b8;padding-top:4px;font-size:8px;color:#64748b;">Firma empresa</td><td></td>
            <td style="width:45%;border-top:1px solid #94a3b8;padding-top:4px;font-size:8px;color:#64748b;">Conforme cliente</td>
        </tr></table>
    </div>`;
}

async function generarPDF(presu, cli) {
    const nombreArchivo = `Presupuesto_${presu.numero}_${(cli.nombre || '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 30)}.pdf`;
    const opt = { margin: 10, filename: nombreArchivo, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' } };
    // La plantilla se monta en un contenedor real (tapado por la pantalla) para que html2canvas la dibuje bien
    const contenedor = document.createElement('div');
    contenedor.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;background:#fff;';
    contenedor.innerHTML = htmlPresupuesto(presu, cli);
    document.body.appendChild(contenedor);
    const html = contenedor.firstElementChild; // se pasa la hoja, no el contenedor posicionado
    window.scrollTo(0, 0);
    try {
        const pdfBlob = await html2pdf().set(opt).from(html).output('blob');
        const file = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Presupuesto ${presu.numero}`, text: 'Adjunto envío presupuesto.' });
        } else { descargarBlob(pdfBlob, nombreArchivo); }
    } catch (e) {
        if (e && e.name === 'AbortError') return; // el usuario cerró el menú de compartir
        try { await html2pdf().set(opt).from(html).save(); } catch (e2) { alert('No se pudo generar el PDF'); }
    } finally { contenedor.remove(); }
}

function descargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ==========================================
// 8. CALENDARIO
// ==========================================
let fechaCal = new Date();
let diaSel = null;

window.renderCalendario = () => {
    const grid = document.getElementById('calendario-grid');
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('mes-actual').innerText = `${meses[fechaCal.getMonth()]} ${fechaCal.getFullYear()}`;
    const primerDia = new Date(fechaCal.getFullYear(), fechaCal.getMonth(), 1).getDay();
    const diasMes = new Date(fechaCal.getFullYear(), fechaCal.getMonth() + 1, 0).getDate();
    let ajuste = (primerDia === 0 ? 6 : primerDia - 1);
    const hoy = new Date();
    let html = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<div class="cal-h">${d}</div>`).join('');
    for (let i = 0; i < ajuste; i++) html += `<div></div>`;
    for (let d = 1; d <= diasMes; d++) {
        let id = `${fechaCal.getFullYear()}-${fechaCal.getMonth() + 1}-${d}`;
        const esHoy = hoy.getFullYear() === fechaCal.getFullYear() && hoy.getMonth() === fechaCal.getMonth() && hoy.getDate() === d;
        html += `<button onclick="selDia('${id}')" class="cal-d ${db.agenda[id] ? 'has' : ''} ${esHoy ? 'today' : ''}">${d}</button>`;
    }
    grid.innerHTML = html;
};

window.selDia = (id) => {
    diaSel = id;
    document.getElementById('detalle-dia').classList.remove('hidden');
    document.getElementById('fecha-seleccionada').innerText = "Tajos del " + id.split('-').reverse().join('/');
    document.getElementById('nota-dia').value = db.agenda[id] || "";
};

window.guardarEventoDia = () => {
    let t = document.getElementById('nota-dia').value;
    if (t.trim() === "") delete db.agenda[diaSel]; else db.agenda[diaSel] = t;
    asegurarGuardado(); renderCalendario();
};

window.cambiarMes = (n) => { fechaCal.setDate(1); fechaCal.setMonth(fechaCal.getMonth() + n); renderCalendario(); };

// ==========================================
// 9. AUXILIARES Y AJUSTES
// ==========================================
window.renderBotones = () => { document.getElementById('botones-trabajo').innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `<button onclick="prepararMedida('${k}')" class="tile"><span class="ico">${CONFIG_MEDIDAS[k].i}</span>${CONFIG_MEDIDAS[k].n}<small>${CONFIG_MEDIDAS[k].u}</small></button>`).join(''); };
window.borrarLinea = (id) => { if (confirm("¿Eliminar?")) { obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id); obraEnCurso.totalManual = null; renderMedidas(); } };
window.cambiarIVA = (valor) => {
    if (valor !== obraEnCurso.iva) obraEnCurso.totalManual = null;
    obraEnCurso.iva = valor;
    document.querySelectorAll('.iva-btn').forEach(btn => btn.classList.remove('on'));
    const b = document.getElementById(`btn-iva-${valor}`);
    if (b) b.classList.add('on');
    renderMedidas();
};

const CAMPOS_AJUSTES = ['nombre', 'cif', 'tel', 'email', 'dir', 'cp', 'ciudad', 'condiciones'];

function cargarAjustesEnFormulario() {
    CAMPOS_AJUSTES.forEach(c => { const el = document.getElementById(`config-${c}`); if (el) el.value = db.ajustes[c] || ''; });
    document.getElementById('config-nPresu').value = db.ajustes.nPresu;
    const ver = document.getElementById('version'); if (ver) ver.innerText = 'Versión ' + VERSION;
    const info = document.getElementById('info-copia');
    if (info) info.innerText = db.ajustes.ultimaCopia ? `Última copia: ${new Date(db.ajustes.ultimaCopia).toLocaleDateString('es-ES')}` : 'Aún no has hecho ninguna copia';
}

window.guardarAjustes = () => {
    CAMPOS_AJUSTES.forEach(c => {
        const el = document.getElementById(`config-${c}`);
        if (!el) return;
        const v = el.value.trim();
        db.ajustes[c] = ['email', 'tel', 'cp', 'condiciones'].includes(c) ? v : v.toUpperCase();
    });
    const n = parseInt(document.getElementById('config-nPresu').value);
    if (n > 0) db.ajustes.nPresu = n;
    asegurarGuardado(); alert("Guardado"); irAPantalla('clientes');
};

window.nuevoCliente = () => irAPantalla('nuevo-cliente');
window.borrarCliente = (id) => { if (confirm("¿BORRAR?")) { db.clientes = db.clientes.filter(c => c.id !== id); asegurarGuardado(); irAPantalla('clientes'); } };
window.borrarPresupuestoIndividual = (idPresu) => { if (confirm("¿Eliminar?")) { clienteActual.presupuestos = clienteActual.presupuestos.filter(p => p.id !== idPresu); asegurarGuardado(); abrirExpediente(clienteActual.id); } };

window.verPresupuestoGuardado = (idPresu) => {
    const p = clienteActual.presupuestos.find(x => x.id === idPresu);
    if (!p) return;
    const t = totalesDePresupuesto(p);
    let fechaISO = p.fechaISO;
    if (!fechaISO && p.fecha) { const m = p.fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) fechaISO = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
    obraEnCurso = {
        nombre: p.nombreObra, lineas: JSON.parse(JSON.stringify(p.lineas)), iva: p.iva != null ? p.iva : 21, fotos: [],
        presuId: p.id, fecha: fechaISO || hoyISO(), totalManual: t.ajuste ? t.total : null
    };
    abrirPantallaTrabajo();
};

// ==========================================
// 10. RESUMEN DE PRESUPUESTOS (no son facturas)
// ==========================================
window.calcularResumenIVA = () => {
    const cont = document.getElementById('resumen-iva-lista');
    if (!cont) return;
    const vacio = () => ({ n: 0, base: 0, iva21: 0, iva10: 0, total: 0 });
    const r = { todos: vacio(), aceptados: vacio() };
    db.clientes.forEach(c => (c.presupuestos || []).forEach(p => {
        const t = totalesDePresupuesto(p);
        const grupos = p.aceptado ? [r.todos, r.aceptados] : [r.todos];
        grupos.forEach(g => {
            g.n++; g.base += t.base; g.total += t.total;
            if (p.iva === 21) g.iva21 += t.cuotaIva;
            if (p.iva === 10) g.iva10 += t.cuotaIva;
        });
    }));
    const bloque = (titulo, g) => `
        <h4>${titulo} (${g.n})</h4>
        <div class="kv"><span>Base</span><span>${fNum(g.base)} €</span></div>
        <div class="kv"><span>IVA 21%</span><span>${fNum(g.iva21)} €</span></div>
        <div class="kv"><span>IVA 10%</span><span>${fNum(g.iva10)} €</span></div>
        <div class="kv"><span>Total</span><span>${fNum(g.total)} €</span></div>`;
    cont.innerHTML = bloque('Aceptados', r.aceptados) + bloque('Todos los presupuestos', r.todos) +
        `<p class="small">Son importes de presupuestos, no de facturas emitidas. Marca con ✓ en cada cliente los que te acepten.</p>`;
};

// ==========================================
// 11. COPIA DE SEGURIDAD
// ==========================================
window.exportarDatos = async () => {
    const nombre = `PRESUPRO_BACKUP_${hoyISO()}.json`;
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    let hecho = false;
    try {
        const file = new File([blob], nombre, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Copia de seguridad PresuPro' });
            hecho = true;
        }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (!hecho) descargarBlob(blob, nombre);
    db.ajustes.ultimaCopia = Date.now();
    asegurarGuardado();
    renderAvisoCopia();
    if (!document.getElementById('pantalla-ajustes').classList.contains('hidden')) cargarAjustesEnFormulario();
};

window.importarDatos = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (!json.clientes) return alert("Archivo no válido");
            if (confirm("¿IMPORTAR COPIA? Se borrarán los datos actuales.")) {
                db = json; db.ajustes = Object.assign({}, AJUSTES_DEFECTO, db.ajustes || {}); if (!db.agenda) db.agenda = {};
                asegurarGuardado(); location.reload();
            }
        } catch (err) { alert("Archivo no válido"); }
    };
    reader.readAsText(file);
    event.target.value = '';
};

// ==========================================
// 12. ARRANQUE
// ==========================================
window.onload = () => {
    renderListaClientes();
    // Pide al navegador que no borre los datos automáticamente
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    if ('serviceWorker' in navigator) {
        // Si se publica una versión nueva, la app se recarga sola una vez para usarla
        let recargando = !navigator.serviceWorker.controller; // primera visita: no hace falta recargar
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargando) { recargando = true; location.reload(); } });
        navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
    }
};
