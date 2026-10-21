// ==========================================
// PARTES DE TRABAJO (ALBARANES): sin precios, con fotos y firma del cliente
// Módulo independiente: usa db, clienteActual, esc, fechaES, hoyISO, irAPantalla... de app.js
// ==========================================
const UNIDADES_PARTE = ['m²', 'ml', 'ud', 'h'];

// Fotos y firmas se guardan en IndexedDB (localStorage se queda corto con fotos)
const medios = {
    _db: null,
    abrir() {
        if (!this._db) this._db = new Promise((res, rej) => {
            const r = indexedDB.open('presupro_medios', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('kv');
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
        return this._db;
    },
    async set(k, v) {
        const d = await this.abrir();
        return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
    },
    async get(k) {
        try {
            const d = await this.abrir();
            return await new Promise(res => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
        } catch (e) { return null; }
    },
    async del(k) {
        try { const d = await this.abrir(); await new Promise(res => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(); t.onerror = () => res(); }); } catch (e) { }
    },
    async todo() {
        const d = await this.abrir();
        return new Promise(res => {
            const out = {}; const q = d.transaction('kv').objectStore('kv').openCursor();
            q.onsuccess = e => { const c = e.target.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
            q.onerror = () => res(out);
        });
    },
    async vaciar() {
        try { const d = await this.abrir(); await new Promise(res => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').clear(); t.oncomplete = () => res(); t.onerror = () => res(); }); } catch (e) { }
    }
};

let parteActual = null;   // registro del parte que se está editando (vive dentro de clienteActual.partes)
let parteFotos = [];      // fotos en memoria: { id, url, cap, w, h }
let parteCarga = Promise.resolve(); // carga de fotos y firma del parte abierto (el PDF espera a que termine)
let fotosEnProceso = 0;   // fotos que se están reduciendo y guardando: el PDF espera a que terminen
let firmaCtx = null, firmaDibujando = false, firmaFirmado = false;

const parteTieneContenido = p =>
    (p.lineas || []).some(l => (l.d || '').trim() || String(l.q || '').trim()) ||
    (p.obs || '').trim() || (p.obra || '').trim() || (p.fotos || []).length > 0 || !!p.firma;

function numeroParteSiguiente() {
    const y = new Date().getFullYear();
    const c = db.ajustes.contParte || {};
    const n = (c.y === y ? c.n : 0) + 1;
    const pref = (db.ajustes.prefParte || '').trim();
    return (pref ? pref + '-' : '') + y + '-' + String(n).padStart(3, '0');
}

// Mantiene el contador al día cuando se guarda un parte (también si se edita el número a mano)
function registrarContador(numero) {
    const m = /(\d{4})-(\d+)$/.exec(String(numero || '').trim());
    if (!m) return;
    const y = +m[1], n = +m[2], c = db.ajustes.contParte || {};
    if (c.y !== y || n > (c.n || 0)) db.ajustes.contParte = { y, n };
}

function guardarParte() {
    if (!parteActual) return;
    if (parteTieneContenido(parteActual)) registrarContador(parteActual.numero);
    asegurarGuardado();
}

// ---------- Lista dentro de la ficha del cliente ----------
window.htmlPartesCliente = (cli) => {
    const partes = cli.partes || [];
    return `<p class="sub">Partes de trabajo</p>
        <button class="btn btn-light" onclick="nuevoParte()">Nuevo parte de trabajo</button>
        <div style="margin-top:10px">${partes.slice().reverse().map(pt => `
            <div class="presu">
                <button onclick="abrirParte(${pt.id})" class="presu-main">
                    <div><b>Nº ${esc(pt.numero)}${pt.obra ? ' · ' + esc(pt.obra) : ''}</b>
                    <small>${esc(fechaES(pt.fecha))} · ${(pt.fotos || []).length} ${(pt.fotos || []).length === 1 ? 'foto' : 'fotos'}${pt.firma ? ' · <span class="tag-ok">Firmado</span>' : ''}</small></div>
                </button>
                <button onclick="borrarParte(${pt.id})" aria-label="Eliminar parte" class="sq del">${ICON.trash}</button>
            </div>`).join('') || '<div class="empty" style="padding:14px 0 4px">Aún no hay partes de este cliente.</div>'}</div>`;
};

window.limpiarMediosCliente = (cli) => {
    (cli.partes || []).forEach(p => { (p.fotos || []).forEach(f => medios.del('foto:' + f.id)); medios.del('firma:' + p.id); });
};

window.borrarParte = (id) => {
    if (!confirm('¿Eliminar este parte con sus fotos y su firma?')) return;
    const p = (clienteActual.partes || []).find(x => x.id === id);
    if (p) limpiarMediosCliente({ partes: [p] });
    clienteActual.partes = (clienteActual.partes || []).filter(x => x.id !== id);
    asegurarGuardado(); abrirExpediente(clienteActual.id);
};

// ---------- Abrir / crear / cerrar ----------
window.nuevoParte = async () => {
    const p = { id: Date.now(), numero: numeroParteSiguiente(), fecha: hoyISO(), obra: '', lineas: [{ d: '', q: '', u: 'm²' }], obs: '', firmante: '', fotos: [], firma: false };
    if (!clienteActual.partes) clienteActual.partes = [];
    clienteActual.partes.push(p);
    uso('parte_nuevo');
    await abrirParte(p.id);
};

window.abrirParte = async (id) => {
    parteActual = (clienteActual.partes || []).find(x => x.id === id);
    if (!parteActual) return;
    parteFotos = [];
    irAPantalla('parte');
    document.getElementById('parte-cliente').innerText = clienteActual.nombre;
    document.getElementById('parte-num').value = parteActual.numero;
    document.getElementById('parte-fecha').value = parteActual.fecha || hoyISO();
    document.getElementById('parte-obra').value = parteActual.obra || '';
    document.getElementById('parte-obs').value = parteActual.obs || '';
    document.getElementById('parte-firmante').value = parteActual.firmante || '';
    estadoParte('');
    renderLineasParte();
    renderFotosParte();
    // Selector para traer los trabajos de un presupuesto del mismo cliente
    const ps = clienteActual.presupuestos || [];
    const box = document.getElementById('parte-presu-box');
    box.classList.toggle('hidden', ps.length === 0);
    document.getElementById('parte-presu').innerHTML = '<option value="">Elegir presupuesto…</option>' +
        ps.slice().reverse().map(p => `<option value="${p.id}">Nº ${esc(p.numero)} · ${esc(p.nombreObra)}</option>`).join('');
    medirFirma();
    const actual = parteActual;
    parteCarga = (async () => {
        for (const f of actual.fotos || []) {
            const url = await medios.get('foto:' + f.id);
            if (url && parteActual === actual) parteFotos.push({ id: f.id, url, cap: f.cap || '', w: f.w, h: f.h });
        }
        if (parteActual === actual) renderFotosParte();
        if (actual.firma) {
            const u = await medios.get('firma:' + actual.id);
            if (u && parteActual === actual) {
                const im = new Image();
                im.onload = () => { const r = document.getElementById('firma-canvas').getBoundingClientRect(); firmaCtx.drawImage(im, 0, 0, r.width, r.height); firmaFirmado = true; };
                im.src = u;
            }
        }
    })().catch(() => { });
    await parteCarga;
};

window.cerrarParte = () => {
    if (parteActual && !parteTieneContenido(parteActual)) {
        clienteActual.partes = clienteActual.partes.filter(x => x.id !== parteActual.id); // parte vacío: no se guarda
    }
    asegurarGuardado();
    parteActual = null;
    abrirExpediente(clienteActual.id);
};

window.editarCampoParte = (campo, valor) => {
    if (!parteActual) return;
    parteActual[campo] = campo === 'numero' ? valor.trim() : valor;
    guardarParte();
};

function estadoParte(txt, err) {
    const s = document.getElementById('parte-estado');
    s.textContent = txt; s.style.color = err ? 'var(--danger)' : 'var(--muted)';
}

// ---------- Trabajos realizados ----------
function renderLineasParte() {
    const box = document.getElementById('parte-lineas'); box.textContent = '';
    parteActual.lineas.forEach((l, i) => {
        const r = document.createElement('div'); r.className = 'plinea';
        const d = document.createElement('input'); d.className = 'input p-desc'; d.placeholder = 'Descripción del trabajo'; d.value = l.d; d.setAttribute('aria-label', 'Descripción');
        const q = document.createElement('input'); q.className = 'input'; q.inputMode = 'decimal'; q.placeholder = 'Cantidad'; q.value = l.q; q.setAttribute('aria-label', 'Cantidad');
        const u = document.createElement('select'); u.className = 'input'; u.setAttribute('aria-label', 'Unidad');
        UNIDADES_PARTE.forEach(x => { const o = document.createElement('option'); o.textContent = x; u.appendChild(o); }); u.value = l.u;
        const x = document.createElement('button'); x.type = 'button'; x.className = 'mini del'; x.innerHTML = ICON.close; x.setAttribute('aria-label', 'Quitar trabajo');
        d.oninput = () => { l.d = d.value; guardarParte(); };
        q.oninput = () => { l.q = q.value; guardarParte(); };
        u.onchange = () => { l.u = u.value; guardarParte(); };
        x.onclick = () => { parteActual.lineas.splice(i, 1); if (!parteActual.lineas.length) parteActual.lineas.push({ d: '', q: '', u: 'm²' }); renderLineasParte(); guardarParte(); };
        r.append(d, q, u, x); box.appendChild(r);
    });
}

window.anadirLineaParte = () => {
    parteActual.lineas.push({ d: '', q: '', u: 'm²' });
    renderLineasParte();
    const inputs = document.querySelectorAll('#parte-lineas .p-desc');
    if (inputs.length) inputs[inputs.length - 1].focus();
};

// Trae las partidas de un presupuesto (sin precios). Las cantidades son las presupuestadas: hay que ajustarlas a lo realmente hecho
window.cargarDesdePresupuesto = (idPresu) => {
    const sel = document.getElementById('parte-presu');
    const p = (clienteActual.presupuestos || []).find(x => String(x.id) === String(idPresu));
    if (!p) return;
    const nuevas = (p.lineas || []).map(l => ({ d: [l.tarea, l.zona].filter(Boolean).join(' · '), q: String(l.cantidad).replace('.', ','), u: UNIDADES_PARTE.includes(l.unidad) ? l.unidad : 'ud' }));
    const vacio = parteActual.lineas.length === 1 && !parteActual.lineas[0].d.trim() && !String(parteActual.lineas[0].q).trim();
    parteActual.lineas = vacio ? nuevas : parteActual.lineas.concat(nuevas);
    if (!parteActual.obra.trim()) { parteActual.obra = p.nombreObra; document.getElementById('parte-obra').value = p.nombreObra; }
    renderLineasParte(); guardarParte(); sel.value = '';
    estadoParte('Cantidades del presupuesto. Ajústalas a lo realmente hecho.');
};

// ---------- Fotos ----------
function renderFotosParte() {
    const box = document.getElementById('parte-fotos'); box.textContent = '';
    parteFotos.forEach((p, i) => {
        const c = document.createElement('div'); c.className = 'foto';
        const im = document.createElement('img'); im.src = p.url; im.alt = 'Foto ' + (i + 1);
        const x = document.createElement('button'); x.type = 'button'; x.className = 'mini del'; x.innerHTML = ICON.close; x.setAttribute('aria-label', 'Quitar foto');
        x.onclick = () => {
            parteFotos.splice(i, 1);
            parteActual.fotos = parteActual.fotos.filter(f => f.id !== p.id);
            medios.del('foto:' + p.id); guardarParte(); renderFotosParte();
        };
        const t = document.createElement('input'); t.placeholder = 'Pie de foto'; t.value = p.cap; t.setAttribute('aria-label', 'Pie de foto');
        t.oninput = () => { p.cap = t.value; const f = parteActual.fotos.find(f => f.id === p.id); if (f) f.cap = t.value; guardarParte(); };
        c.append(im, x, t); box.appendChild(c);
    });
}

window.anadirFotosParte = (files) => {
    [...files].forEach(f => {
        if (!f.type.startsWith('image/')) return;
        const url = URL.createObjectURL(f), img = new Image();
        fotosEnProceso++;
        img.onload = async () => {
            try {
                const max = 1280, k = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
                const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                if (!parteActual) return;
                const id = Date.now() + '_' + Math.floor(Math.random() * 1000);
                const dataUrl = c.toDataURL('image/jpeg', .8);
                try { await medios.set('foto:' + id, dataUrl); }
                catch (e) { return estadoParte('No se ha podido guardar la foto en el móvil.', true); }
                parteFotos.push({ id, url: dataUrl, cap: '', w: c.width, h: c.height });
                parteActual.fotos.push({ id, cap: '', w: c.width, h: c.height });
                guardarParte(); renderFotosParte();
            } finally { fotosEnProceso--; }
        };
        img.onerror = () => { fotosEnProceso--; URL.revokeObjectURL(url); estadoParte('No se ha podido leer esa foto. Prueba con JPG o PNG.', true); };
        img.src = url;
    });
};

// ---------- Firma ----------
function iniciarFirma() {
    const c = document.getElementById('firma-canvas'); if (!c) return;
    firmaCtx = c.getContext('2d');
    const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('pointerdown', e => {
        firmaDibujando = true; try { c.setPointerCapture(e.pointerId); } catch (_) { }
        const [x, y] = pos(e); firmaCtx.beginPath(); firmaCtx.moveTo(x, y); firmaCtx.lineTo(x + .1, y + .1); firmaCtx.stroke(); firmaFirmado = true; e.preventDefault();
    });
    c.addEventListener('pointermove', e => { if (!firmaDibujando) return; const [x, y] = pos(e); firmaCtx.lineTo(x, y); firmaCtx.stroke(); e.preventDefault(); });
    ['pointerup', 'pointercancel'].forEach(t => c.addEventListener(t, () => { if (firmaDibujando && firmaFirmado) guardarFirma(); firmaDibujando = false; }));
}

function medirFirma() {
    const c = document.getElementById('firma-canvas'); if (!c || !firmaCtx) return;
    const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    firmaCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    firmaCtx.lineWidth = 2.4; firmaCtx.lineCap = 'round'; firmaCtx.lineJoin = 'round'; firmaCtx.strokeStyle = '#0e2238';
    firmaFirmado = false;
}

function guardarFirma() {
    if (!parteActual) return;
    const c = document.getElementById('firma-canvas');
    parteActual.firma = true; parteActual.firmaRatio = c.width / c.height;
    medios.set('firma:' + parteActual.id, c.toDataURL('image/png')).catch(() => estadoParte('No se ha podido guardar la firma.', true));
    guardarParte();
}

window.limpiarFirma = () => {
    medirFirma();
    if (parteActual) { parteActual.firma = false; medios.del('firma:' + parteActual.id); guardarParte(); }
};

// ---------- PDF (jsPDF, texto vectorial: pesa poco aunque lleve muchas fotos) ----------
function buildParteBlob(p, cli, fotos, firmaUrl) {
    const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const a = db.ajustes, W = 210, M = 16, CW = W - 2 * M;
    let y = M;
    const need = h => { if (y + h > 297 - M) { doc.addPage(); y = M; } };
    const v = t => String(t == null ? '' : t).trim();

    doc.setFillColor(255, 194, 14); doc.rect(0, 0, W, 5, 'F');
    y = M + 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(11, 58, 110);
    doc.text(v(a.nombre) || 'Albarán', M, y + 5);
    doc.setFontSize(13); doc.setTextColor(20);
    doc.text('ALBARÁN Nº ' + v(p.numero), W - M, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    const emp = [v(a.cif) && 'NIF ' + v(a.cif), v(a.dir), [v(a.cp), v(a.ciudad)].filter(Boolean).join(' '), [v(a.tel), v(a.email)].filter(Boolean).join(' · ')].filter(Boolean);
    let ey = y + 11; emp.forEach(t => { doc.text(t, M, ey); ey += 4.2; });
    doc.text('Fecha: ' + fechaES(p.fecha), W - M, y + 11, { align: 'right' });
    y = Math.max(ey, y + 15) + 2; doc.setDrawColor(30); doc.setLineWidth(.6); doc.line(M, y, W - M, y); y += 7;

    doc.setTextColor(20); doc.setFontSize(10);
    [['Cliente', v(cli.nombre)], ['NIF', v(cli.cif)], ['Obra', v(p.obra)], ['Teléfono', v(cli.tel)]].forEach(([k, t]) => {
        if (!t) return; doc.setFont('helvetica', 'bold'); doc.text(k + ':', M, y); doc.setFont('helvetica', 'normal');
        const w = doc.splitTextToSize(t, CW - 24); doc.text(w, M + 24, y); y += w.length * 4.8 + 1;
    });
    y += 4;

    const xq = W - M - 22, xu = W - M;
    doc.setFillColor(11, 58, 110); doc.rect(M, y - 4.5, CW, 7, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('TRABAJOS REALIZADOS', M + 2, y); doc.text('CANT.', xq, y, { align: 'right' }); doc.text('UD.', xu - 2, y, { align: 'right' }); y += 7;
    doc.setTextColor(20); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setLineWidth(.15); doc.setDrawColor(190);
    (p.lineas || []).filter(l => v(l.d) || v(l.q)).forEach(l => {
        const w = doc.splitTextToSize(v(l.d) || '-', CW - 50), h = w.length * 4.8 + 3; need(h);
        doc.text(w, M + 2, y);
        if (v(l.q)) { doc.text(v(l.q), xq, y, { align: 'right' }); doc.text(v(l.u), xu - 2, y, { align: 'right' }); }
        y += h - 2.5; doc.line(M, y, W - M, y); y += 5;
    });
    if (v(p.obs)) {
        y += 2; const w = doc.splitTextToSize(v(p.obs), CW); need(w.length * 4.8 + 8);
        doc.setFont('helvetica', 'bold'); doc.text('Observaciones', M, y); y += 5; doc.setFont('helvetica', 'normal'); doc.text(w, M, y); y += w.length * 4.8 + 2;
    }
    y += 6; need(44);
    doc.setFont('helvetica', 'bold'); doc.text('Conforme del cliente', M, y); y += 3;
    doc.setDrawColor(150); doc.rect(M, y, 80, 30);
    if (firmaUrl) {
        const r = p.firmaRatio || 3; let sw = 78, sh = sw / r; if (sh > 28) { sh = 28; sw = sh * r; }
        doc.addImage(firmaUrl, 'PNG', M + 1 + (78 - sw) / 2, y + 1 + (28 - sh) / 2, sw, sh);
    }
    y += 35; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); if (v(p.firmante)) doc.text(v(p.firmante), M, y);

    if (fotos.length) {
        doc.addPage(); y = M; doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(11, 58, 110);
        doc.text('Fotos de los trabajos · Albarán ' + v(p.numero), M, y + 3); y += 10;
        doc.setTextColor(20);
        const gap = 6, cw = (CW - gap) / 2, maxH = 105; let col = 0, rowH = 0;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        fotos.forEach(f => {
            let w = cw, h = w * f.h / f.w; if (h > maxH) { h = maxH; w = h * f.w / f.h; }
            const cap = v(f.cap) ? doc.splitTextToSize(v(f.cap), cw) : [], ch = h + cap.length * 4 + 4;
            if (col === 0 && y + ch > 297 - M) { doc.addPage(); y = M; }
            if (col === 1 && y + ch > 297 - M) { doc.addPage(); y = M; col = 0; rowH = 0; }
            const x = M + col * (cw + gap);
            doc.addImage(f.url, 'JPEG', x + (cw - w) / 2, y, w, h, undefined, 'FAST');
            if (cap.length) doc.text(cap, x, y + h + 4);
            rowH = Math.max(rowH, ch);
            if (col === 1) { y += rowH + 4; col = 0; rowH = 0; } else col = 1;
        });
    }
    return doc.output('blob');
}

window.generarPartePDF = async () => {
    if (!parteActual) return;
    if (!parteTieneContenido(parteActual)) return estadoParte('Añade al menos un trabajo, una foto o la firma.', true);
    const boton = document.getElementById('parte-pdf'); boton.disabled = true; estadoParte('Preparando el PDF…');
    try {
        // El PDF no sale hasta que las fotos del parte estén cargadas y las recién hechas, guardadas (máx. 20 s)
        const limite = Date.now() + 20000;
        if (fotosEnProceso > 0 || parteFotos.length < (parteActual.fotos || []).length) estadoParte('Esperando a las fotos…');
        await parteCarga;
        while (fotosEnProceso > 0 && Date.now() < limite) await new Promise(r => setTimeout(r, 100));
        if (fotosEnProceso > 0) return estadoParte('Las fotos tardan en guardarse. Espera un momento y vuelve a pulsar PDF.', true);
        // Si alguna foto ya no está en el móvil, el PDF sale igualmente (con las que hay) y se avisa
        const perdidas = Math.max(0, (parteActual.fotos || []).length - parteFotos.length);
        try { await cargarScript('libs/jspdf.umd.min.js'); }
        catch (e) { return estadoParte('No se ha podido cargar el generador de PDF. Abre la app una vez con cobertura y vuelve a intentarlo.', true); }
        guardarParte();
        const firmaUrl = parteActual.firma ? await medios.get('firma:' + parteActual.id) : null;
        const blob = buildParteBlob(parteActual, clienteActual, parteFotos, firmaUrl);
        const nombre = 'Albaran_' + String(parteActual.numero).replace(/[^\w-]+/g, '_') + '_' + String(clienteActual.nombre || '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 30) + '.pdf';
        const emp = (db.ajustes.nombre || '').trim();
        const texto = 'Hola, te envío el albarán nº ' + parteActual.numero + ' de los trabajos realizados' + (parteActual.obra.trim() ? ' en ' + parteActual.obra.trim() : '') + '.' + (emp ? ' ' + emp : '');
        const r = await compartirPDF(blob, nombre, 'Albarán ' + parteActual.numero, texto);
        if (r !== 'cancelado') uso('parte_pdf');
        const aviso = perdidas ? ` Ojo: ${perdidas === 1 ? '1 foto no se ha podido recuperar' : perdidas + ' fotos no se han podido recuperar'} del móvil y no sale en el PDF.` : '';
        estadoParte((r === 'compartido' ? 'PDF compartido.' : r === 'cancelado' ? 'Envío cancelado. El parte sigue aquí.' : 'PDF descargado. Adjúntalo en WhatsApp o en el correo.') + aviso, !!perdidas);
    } catch (e) { estadoParte('No se ha podido crear el PDF' + (e && e.message ? ': ' + e.message : '.'), true); }
    finally { boton.disabled = false; }
};
