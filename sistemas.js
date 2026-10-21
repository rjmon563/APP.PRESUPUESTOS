// PresuPro · Materiales y sistemas
// Un sistema (p. ej. tabique doble placa) = lista de materiales por m² + mano de obra + extras + margen.
// El precio del sistema sale solo y se ofrece al medir. Cambiar el precio de un material actualiza todos los sistemas.
'use strict';

let _seqId = 0;
const idN = () => Date.now() * 100 + (_seqId++ % 100);
const uTxt = (u) => u === 'm2' ? 'm²' : u;
const fNum3 = (n) => Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const UNIDADES_MAT = ['m2', 'ml', 'ud', 'kg', 'l'];
const tipoSistemaValido = (t) => !!CONFIG_MEDIDAS[t] && ['m²', 'ml'].includes(CONFIG_MEDIDAS[t].u);
const TIPOS_SISTEMA = () => Object.keys(CONFIG_MEDIDAS).filter(tipoSistemaValido);

// Con un punto solo se entiende como decimal ("0.011"); con coma, como en España ("1.234,56")
function numDec(t) {
    const s = String(t == null ? '' : t).replace(/[€%\s]/g, '');
    if (!s) return 0;
    if (!s.includes(',') && (s.match(/\./g) || []).length === 1) { const n = parseFloat(s); return isNaN(n) ? 0 : n; }
    return parseNum(s);
}
const aTexto = (n) => (n === null || n === undefined || n === '') ? '' : String(n).replace('.', ',');

function asegurarSistemas() {
    if (!Array.isArray(db.materiales)) db.materiales = [];
    if (!Array.isArray(db.sistemas)) db.sistemas = [];
}
asegurarSistemas();

const materialPorId = (id) => db.materiales.find(m => m.id === id);
const dtoDe = (m) => (m.dto === null || m.dto === undefined || m.dto === '') ? (Number(db.ajustes.dtoMateriales) || 0) : (Number(m.dto) || 0);
const netoMaterial = (m) => (Number(m.pvp) || 0) * (1 - dtoDe(m) / 100);

// Sin redondear por el camino (como una hoja de cálculo); solo el precio final se redondea
function calcSistema(s) {
    let mat = 0;
    (s.lineas || []).forEach(l => { const m = materialPorId(l.matId); if (m) mat += (Number(l.cantidad) || 0) * netoMaterial(m); });
    const extras = (s.extras || []).reduce((a, e) => a + (Number(e.importe) || 0), 0);
    const mo = Number(s.manoObra) || 0;
    const coste = mat + mo + extras;
    const margen = Number(s.margen) || 0;
    const beneficio = coste * margen / 100;
    return { mat, mo, extras, coste, margen, beneficio, precio: redondear(coste + beneficio) };
}
window.calcSistema = calcSistema;
window.sistemasDeTipo = (t) => (db.sistemas || []).filter(s => s.tipo === t);

// ---------- Pantalla: lista de sistemas ----------
window.renderSistemas = () => {
    asegurarSistemas();
    const cont = document.getElementById('sistemas-lista');
    if (!cont) return;
    if (!db.sistemas.length) {
        cont.innerHTML = `<div class="empty"><b>Aún no tienes sistemas</b>Crea el primero, o carga dos de ejemplo para ver cómo funciona.</div>
            <button class="btn btn-light" onclick="cargarEjemploSistemas()">Cargar ejemplo (techo y tabique)</button>`;
        return;
    }
    cont.innerHTML = db.sistemas.map(s => {
        const c = calcSistema(s), u = (CONFIG_MEDIDAS[s.tipo] || {}).u || 'm²';
        const sinMat = (s.lineas || []).some(l => !materialPorId(l.matId));
        return `<button onclick="abrirSistema(${s.id})" class="row-client">
            <div><div class="name">${esc(s.nombre)}</div><div class="meta">${esc((CONFIG_MEDIDAS[s.tipo] || {}).n || '')} · coste ${fNum(c.coste)} €/${u}${sinMat ? ' · ⚠ falta un material' : ''}</div></div>
            <div class="amount">${fNum(c.precio)} €/${u}</div></button>`;
    }).join('');
};

// ---------- Pantalla: materiales ----------
window.renderMateriales = () => {
    asegurarSistemas();
    const inp = document.getElementById('mat-dto');
    if (inp && document.activeElement !== inp) inp.value = aTexto(db.ajustes.dtoMateriales || 0);
    listaMateriales();
};

function listaMateriales() {
    const cont = document.getElementById('materiales-lista');
    if (!cont) return;
    const q = (document.getElementById('mat-buscar') || {}).value || '';
    const lista = db.materiales.filter(m => m.nombre.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (!db.materiales.length) { cont.innerHTML = '<div class="empty"><b>Sin materiales</b>Añade tu primer material con su precio de tarifa.</div>'; return; }
    if (!lista.length) { cont.innerHTML = '<div class="empty">Ningún material se llama así.</div>'; return; }
    cont.innerHTML = lista.map(m => `<button onclick="editarMaterial(${m.id})" class="row-client">
        <div><div class="name">${esc(m.nombre)}</div><div class="meta">${uTxt(m.unidad)} · tarifa ${fNum3(m.pvp)} €${m.dto !== null && m.dto !== undefined && m.dto !== '' ? ' · dto. propio ' + aTexto(m.dto) + ' %' : ''}</div></div>
        <div class="amount">${fNum3(netoMaterial(m))} €</div></button>`).join('');
}
window.filtrarMateriales = listaMateriales;

window.cambiarDtoGeneral = (v) => {
    const n = numDec(v);
    db.ajustes.dtoMateriales = n >= 0 && n < 100 ? n : 0;
    asegurarGuardado();
    listaMateriales();
};

// ---------- Hoja: crear / editar un material ----------
let matEd = null;
window.nuevoMaterial = (alGuardar) => abrirHojaMaterial({ id: null, nombre: '', unidad: 'm2', pvp: '', dto: '' }, alGuardar);
window.editarMaterial = (id) => { const m = materialPorId(id); if (m) abrirHojaMaterial(Object.assign({}, m), null); };

function abrirHojaMaterial(m, alGuardar) {
    matEd = { m, alGuardar };
    document.getElementById('hoja-material-titulo').textContent = m.id ? 'Editar material' : 'Nuevo material';
    document.getElementById('mat-nombre').value = m.nombre;
    document.getElementById('mat-unidad').innerHTML = UNIDADES_MAT.map(u => `<option value="${u}" ${u === m.unidad ? 'selected' : ''}>${uTxt(u)}</option>`).join('');
    document.getElementById('mat-pvp').value = aTexto(m.pvp);
    document.getElementById('mat-dto-propio').value = aTexto(m.dto);
    document.getElementById('mat-dto-propio').placeholder = 'General (' + aTexto(db.ajustes.dtoMateriales || 0) + ' %)';
    document.getElementById('mat-borrar').classList.toggle('hidden', !m.id);
    document.getElementById('mat-aviso').textContent = '';
    document.getElementById('hoja-material').classList.remove('hidden');
}

window.cerrarHojaMaterial = () => { document.getElementById('hoja-material').classList.add('hidden'); matEd = null; };

window.guardarMaterial = () => {
    if (!matEd) return;
    const nombre = document.getElementById('mat-nombre').value.trim();
    const pvp = numDec(document.getElementById('mat-pvp').value);
    const dtoTxt = document.getElementById('mat-dto-propio').value.trim();
    const aviso = (t) => { document.getElementById('mat-aviso').textContent = t; };
    if (!nombre) return aviso('Escribe el nombre del material.');
    if (!(pvp > 0)) return aviso('Escribe el precio de tarifa.');
    const dto = dtoTxt === '' ? null : numDec(dtoTxt);
    if (dto !== null && (dto < 0 || dto >= 100)) return aviso('El descuento debe estar entre 0 y 99.');
    const unidad = document.getElementById('mat-unidad').value;
    let id = matEd.m.id;
    if (id) {
        const m = materialPorId(id);
        if (m) { m.nombre = nombre; m.unidad = unidad; m.pvp = pvp; m.dto = dto; }
    } else {
        id = idN();
        db.materiales.push({ id, nombre, unidad, pvp, dto });
    }
    asegurarGuardado();
    const cb = matEd.alGuardar;
    cerrarHojaMaterial();
    renderMateriales();
    if (cb) cb(id);
    if (!document.getElementById('pantalla-sistemas').classList.contains('hidden')) renderSistemas();
};

window.borrarMaterial = () => {
    if (!matEd || !matEd.m.id) return;
    const usados = db.sistemas.filter(s => (s.lineas || []).some(l => l.matId === matEd.m.id));
    if (usados.length) return alert('No se puede borrar: lo usan ' + usados.map(s => s.nombre).join(', ') + '. Quítalo antes de esos sistemas.');
    if (!confirm('¿Borrar este material?')) return;
    db.materiales = db.materiales.filter(m => m.id !== matEd.m.id);
    asegurarGuardado(); cerrarHojaMaterial(); renderMateriales();
};

// ---------- Editor de un sistema ----------
let sisEd = null;
const clonar = (o) => JSON.parse(JSON.stringify(o));
const unidadSis = () => (CONFIG_MEDIDAS[sisEd.tipo] || {}).u || 'm²';

window.nuevoSistema = () => {
    sisEd = { id: null, nombre: '', tipo: 'tabiques', lineas: [], manoObra: 0, extras: [], margen: db.ajustes.margenSistemas != null ? db.ajustes.margenSistemas : 20 };
    irAPantalla('sistema'); renderEditorSistema();
};
window.abrirSistema = (id) => {
    const s = db.sistemas.find(x => x.id === id); if (!s) return;
    sisEd = clonar(s); irAPantalla('sistema'); renderEditorSistema();
};

function renderEditorSistema() {
    const u = unidadSis();
    document.getElementById('sistema-titulo').textContent = sisEd.id ? 'Editar sistema' : 'Nuevo sistema';
    const lineas = sisEd.lineas.map((l, i) => {
        const m = materialPorId(l.matId);
        if (!m) return `<div class="sl"><div class="sl-name"><b>Material borrado</b></div><span></span><span></span><button class="mini del" aria-label="Quitar" onclick="sisQuitarLinea(${i})">${ICON.trash}</button></div>`;
        return `<div class="sl"><div class="sl-name"><b>${esc(m.nombre)}</b><small>${uTxt(m.unidad)} · neto ${fNum3(netoMaterial(m))} €</small></div>
            <input class="input" inputmode="decimal" aria-label="Cantidad de ${esc(m.nombre)} por ${u}" value="${aTexto(l.cantidad)}" oninput="sisLinea(${i}, this.value)">
            <span class="sl-cost" id="slc-${i}">${fNum((Number(l.cantidad) || 0) * netoMaterial(m))} €</span>
            <button class="mini del" aria-label="Quitar" onclick="sisQuitarLinea(${i})">${ICON.trash}</button></div>`;
    }).join('');
    const extras = sisEd.extras.map((e, i) => `<div class="sl ex"><input class="input" type="text" placeholder="Extra (p. ej. retirada de runa)" value="${esc(e.nombre)}" oninput="sisExtra(${i}, 'nombre', this.value)">
        <input class="input" inputmode="decimal" placeholder="€/${u}" aria-label="Importe del extra por ${u}" value="${aTexto(e.importe)}" oninput="sisExtra(${i}, 'importe', this.value)">
        <button class="mini del" aria-label="Quitar extra" onclick="sisQuitarExtra(${i})">${ICON.trash}</button></div>`).join('');
    document.getElementById('sistema-form').innerHTML = `
        <label class="field"><span>Nombre del sistema</span><input id="sis-nombre" type="text" value="${esc(sisEd.nombre)}" placeholder="p. ej. Tabique 74/48 doble placa" oninput="sisEd_set('nombre', this.value)"></label>
        <label class="field"><span>Se ofrece al medir en</span><select id="sis-tipo" class="input" onchange="sisEd_set('tipo', this.value); renderEditorSistema()">
            ${TIPOS_SISTEMA().map(t => `<option value="${t}" ${t === sisEd.tipo ? 'selected' : ''}>${CONFIG_MEDIDAS[t].n} (€/${CONFIG_MEDIDAS[t].u})</option>`).join('')}</select></label>
        <div class="group"><h3>Materiales por ${u}</h3>
            ${lineas || '<p class="small">Añade los materiales y cuánto entra de cada uno por ' + u + '.</p>'}
            <button class="btn btn-light" style="margin-top:10px" onclick="sisElegirMaterial()">+ Añadir material</button></div>
        <div class="group"><h3>Mano de obra y extras</h3>
            <label class="field"><span>Mano de obra (€/${u})</span><input inputmode="decimal" value="${aTexto(sisEd.manoObra || '')}" placeholder="0" oninput="sisEd_set('manoObra', numDec(this.value))"></label>
            ${extras}
            <button class="btn btn-light" onclick="sisAddExtra()">+ Añadir extra (runa, acopio…)</button></div>
        <label class="field"><span>Margen de beneficio sobre el coste (%)</span><input inputmode="decimal" value="${aTexto(sisEd.margen)}" oninput="sisEd_set('margen', numDec(this.value))"></label>
        <div class="total-card" id="sis-resumen"></div>
        <button class="btn btn-primary" style="margin-top:18px" onclick="guardarSistema()">Guardar sistema</button>
        ${sisEd.id ? '<button class="btn btn-light" style="margin-top:10px" onclick="duplicarSistema()">Duplicar</button><button class="btn-link-danger" onclick="borrarSistema()">Borrar este sistema</button>' : ''}`;
    actualizarResumenSis();
}
window.renderEditorSistema = renderEditorSistema;

window.sisEd_set = (campo, v) => { sisEd[campo] = v; actualizarResumenSis(); };

function actualizarResumenSis() {
    const el = document.getElementById('sis-resumen'); if (!el) return;
    const c = calcSistema(sisEd), u = unidadSis();
    sisEd.lineas.forEach((l, i) => { const s = document.getElementById('slc-' + i), m = materialPorId(l.matId); if (s && m) s.textContent = fNum((Number(l.cantidad) || 0) * netoMaterial(m)) + ' €'; });
    el.innerHTML = `<div class="ruler thin" aria-hidden="true"></div>
        <div class="kv"><span>Materiales</span><span>${fNum(c.mat)} €</span></div>
        <div class="kv"><span>Mano de obra</span><span>${fNum(c.mo)} €</span></div>
        <div class="kv"><span>Extras</span><span>${fNum(c.extras)} €</span></div>
        <div class="kv"><span>Tu coste</span><span>${fNum(c.coste)} €</span></div>
        <div class="kv adj"><span>Margen ${aTexto(c.margen)} %</span><span>+ ${fNum(c.beneficio)} €</span></div>
        <p class="total-label">Precio al cliente por ${u}</p>
        <div class="total-row"><span class="total-input" style="border:0">${fNum(c.precio)}</span><span class="eur">€/${u}</span></div>`;
}

window.sisLinea = (i, v) => { sisEd.lineas[i].cantidad = numDec(v); actualizarResumenSis(); };
window.sisQuitarLinea = (i) => { sisEd.lineas.splice(i, 1); renderEditorSistema(); };
window.sisExtra = (i, campo, v) => { sisEd.extras[i][campo] = campo === 'importe' ? numDec(v) : v; actualizarResumenSis(); };
window.sisAddExtra = () => { sisEd.extras.push({ nombre: '', importe: 0 }); renderEditorSistema(); };
window.sisQuitarExtra = (i) => { sisEd.extras.splice(i, 1); renderEditorSistema(); };

// Elegir un material de la lista (o crear uno nuevo sin salir del sistema)
window.sisElegirMaterial = () => {
    document.getElementById('pick-mat-buscar').value = '';
    listaPickMaterial();
    document.getElementById('hoja-pick-material').classList.remove('hidden');
};
window.cerrarPickMaterial = () => document.getElementById('hoja-pick-material').classList.add('hidden');
window.listaPickMaterial = () => {
    const q = document.getElementById('pick-mat-buscar').value.trim().toLowerCase();
    const l = db.materiales.filter(m => m.nombre.toLowerCase().includes(q)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    document.getElementById('pick-mat-lista').innerHTML = l.map(m => `<button class="btn btn-light" style="text-align:left;padding:12px 14px;font-size:16px" onclick="sisAnadirMaterial(${m.id})">${esc(m.nombre)} <small style="color:var(--muted)">· ${uTxt(m.unidad)} · ${fNum3(netoMaterial(m))} €</small></button>`).join('')
        || '<p class="small">No hay ningún material con ese nombre.</p>';
};
window.sisAnadirMaterial = (id) => {
    cerrarPickMaterial();
    if (!sisEd.lineas.some(l => l.matId === id)) sisEd.lineas.push({ matId: id, cantidad: 1 });
    renderEditorSistema();
};
window.sisNuevoMaterial = () => { cerrarPickMaterial(); nuevoMaterial((id) => sisAnadirMaterial(id)); };

window.guardarSistema = () => {
    const nombre = (sisEd.nombre || '').trim();
    if (!nombre) { alert('Ponle un nombre al sistema.'); return; }
    if (!sisEd.lineas.length && !(Number(sisEd.manoObra) > 0)) { alert('Añade al menos un material o la mano de obra.'); return; }
    const s = clonar(sisEd); s.nombre = nombre;
    s.extras = s.extras.filter(e => (e.nombre || '').trim() || Number(e.importe) > 0);
    if (s.id) { const i = db.sistemas.findIndex(x => x.id === s.id); if (i >= 0) db.sistemas[i] = s; else db.sistemas.push(s); }
    else { s.id = idN(); db.sistemas.push(s); uso('sistema'); }
    db.ajustes.margenSistemas = Number(s.margen) || 0;
    asegurarGuardado();
    irAPantalla('sistemas');
};
window.duplicarSistema = () => {
    const s = clonar(sisEd); s.id = idN(); s.nombre = (s.nombre || 'Sistema') + ' (copia)';
    db.sistemas.push(s); asegurarGuardado(); sisEd = clonar(s); renderEditorSistema(); window.scrollTo(0, 0);
};
window.borrarSistema = () => {
    if (!confirm('¿Borrar este sistema? Los presupuestos ya hechos no cambian.')) return;
    db.sistemas = db.sistemas.filter(s => s.id !== sisEd.id); asegurarGuardado(); irAPantalla('sistemas');
};

// ---------- Al medir: elegir sistema ----------
window.elegirSistema = (tipo, cb) => {
    const l = sistemasDeTipo(tipo), u = CONFIG_MEDIDAS[tipo].u;
    document.getElementById('elegir-sis-lista').innerHTML = l.map(s => `<button class="btn btn-dark" data-sid="${s.id}" onclick="elegirSistemaOk(${s.id})">${esc(s.nombre)} · ${fNum(calcSistema(s).precio)} €/${u}</button>`).join('');
    window._elegirSisCb = cb;
    document.getElementById('hoja-elegir-sistema').classList.remove('hidden');
};
window.elegirSistemaOk = (id) => {
    document.getElementById('hoja-elegir-sistema').classList.add('hidden');
    const cb = window._elegirSisCb; window._elegirSisCb = null;
    if (cb) cb(id === null ? null : db.sistemas.find(s => s.id === id) || null);
};
window.elegirSistemaOtro = () => elegirSistemaOk(null);
window.elegirSistemaCancelar = () => { document.getElementById('hoja-elegir-sistema').classList.add('hidden'); window._elegirSisCb = null; };

// ---------- Ejemplo de partida: dos sistemas con precios de tarifa y un 10 % de descuento ----------
window.cargarEjemploSistemas = () => {
    asegurarSistemas();
    if (!db.ajustes.dtoMateriales) db.ajustes.dtoMateriales = 10;
    const busca = (n) => db.materiales.find(m => m.nombre.toLowerCase() === n.toLowerCase());
    const mat = (nombre, unidad, pvp) => { let m = busca(nombre); if (!m) { m = { id: idN(), nombre, unidad, pvp, dto: null }; db.materiales.push(m); } return m.id; };
    const placa = mat('Placa estándar BA 13 mm', 'm2', 4.01), tc47 = mat('Perfil techo TC 47 mm', 'ml', 1.87), angL = mat('Perfil L galvanizado 30x30 mm', 'ml', 1.52),
        pm = mat('Tornillo PM 3,5x25 mm', 'ud', 0.011), cc = mat('Tornillo chapa-chapa', 'ud', 0.0185), pasta = mat('Pasta de juntas CE 78 lenta 24 h', 'kg', 1.60),
        cinta = mat('Cinta de juntas', 'ml', 0.047), lana = mat('Lana mineral Drywall 37 · 50 mm (Isover)', 'm2', 3.21), varios = mat('Varios (accesorios, cuelgues, varilla…)', 'ud', 0.65),
        canal = mat('Canal R 48', 'ml', 1.87), mont = mat('Montante M 48', 'ml', 2.23), banda = mat('Banda estanca 48 mm', 'ml', 0.278);
    const margen = db.ajustes.margenSistemas != null ? db.ajustes.margenSistemas : 20;
    db.sistemas.push({ id: idN(), nombre: 'Techo continuo 1 placa 13 mm + lana', tipo: 'techos', manoObra: 0, extras: [], margen, lineas: [
        { matId: placa, cantidad: 1.05 }, { matId: tc47, cantidad: 2 }, { matId: angL, cantidad: 0.9 }, { matId: pm, cantidad: 10 }, { matId: cc, cantidad: 3 },
        { matId: pasta, cantidad: 0.3 }, { matId: cinta, cantidad: 1 }, { matId: lana, cantidad: 1 }, { matId: varios, cantidad: 1 }] });
    db.sistemas.push({ id: idN(), nombre: 'Tabique 74/48 e=400 placa 13 mm + lana', tipo: 'tabiques', manoObra: 0, extras: [], margen, lineas: [
        { matId: placa, cantidad: 2.1 }, { matId: canal, cantidad: 0.9 }, { matId: mont, cantidad: 3 }, { matId: pm, cantidad: 40 }, { matId: cc, cantidad: 6 },
        { matId: pasta, cantidad: 0.66 }, { matId: cinta, cantidad: 2.8 }, { matId: banda, cantidad: 1 }, { matId: lana, cantidad: 1 }] });
    asegurarGuardado(); renderSistemas();
};
