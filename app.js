// 1. BASE DE DATOS Y ESTADO
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], ajustes: { nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '', nPresu: 1 } 
};

let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [], iva: 21, fotos: [] }; 
let calcEstado = { tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', zona: '', tarea: '', modo: 'medida', editandoId: null }; 

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', pasos: 2, m1: 'Suma de tramos', m2: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', pasos: 2, m1: 'Suma de tramos', m2: 'Altura/Fondo' },
    'tabicas': { n: 'Tabica', i: '📐', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', pasos: 1, m1: 'Metros Totales' },
    'horas': { n: 'Horas Admin', i: '🕒', pasos: 1, m1: 'Número de Horas' }
};

// 2. UTILIDADES
const fNum = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// 3. NAVEGACIÓN (BOTONES PRINCIPALES)
window.irAPantalla = function(id) {
    console.log("Cambiando a pantalla:", id); // Para probar en consola
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    const destino = document.getElementById(`pantalla-${id}`);
    if(destino) destino.classList.remove('hidden');
    
    if (id === 'clientes') renderListaClientes();
    if (id === 'ajustes') cargarDatosEnAjustes();
};

window.nuevoCliente = function() {
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir'].forEach(i => {
        const el = document.getElementById(i);
        if(el) el.value = "";
    });
    window.irAPantalla('nuevo-cliente');
};

function cargarDatosEnAjustes() {
    const campos = ['nombre','cif','tel','dir','cp','ciudad','nPresu'];
    campos.forEach(k => {
        const el = document.getElementById(`config-${k}`);
        if(el) el.value = db.ajustes[k] || (k === 'nPresu' ? 1 : '');
    });
}

// 4. GESTIÓN DE CLIENTES
window.guardarAjustes = function() {
    db.ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        tel: document.getElementById('config-tel').value,
        dir: document.getElementById('config-dir').value.toUpperCase(),
        cp: document.getElementById('config-cp').value,
        ciudad: document.getElementById('config-ciudad').value.toUpperCase(),
        nPresu: parseInt(document.getElementById('config-nPresu').value) || 1
    };
    asegurarGuardado(); 
    alert("✅ Datos guardados"); 
    window.irAPantalla('clientes');
};

window.guardarDatosCliente = function() {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("El nombre es obligatorio");
    db.clientes.push({ 
        id: Date.now(), 
        nombre: nom.toUpperCase(), 
        cif: document.getElementById('cli-cif').value.toUpperCase() || "S/N", 
        tel: document.getElementById('cli-tel').value || "S/T", 
        dir: document.getElementById('cli-dir').value.toUpperCase() || "S/D" 
    });
    asegurarGuardado(); 
    window.irAPantalla('clientes');
};

window.renderListaClientes = function() {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 italic">NO HAY CLIENTES</p>' :
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center mb-3 active-scale">
            <p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p>
            <button onclick="event.stopPropagation(); if(confirm('¿Borrar cliente?')){db.clientes=db.clientes.filter(x=>x.id!==${c.id}); asegurarGuardado(); renderListaClientes();}" class="text-red-500 p-3 rounded-2xl bg-red-50">🗑️</button>
        </div>`).reverse().join('');
};

window.abrirExpediente = function(id) {
    clienteActual = db.clientes.find(x => x.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-7 rounded-[40px] shadow-lg italic">
            <h2 class="text-xl font-black uppercase mb-1">${clienteActual.nombre}</h2>
            <p class="text-[10px] opacity-80 font-bold uppercase tracking-wider">${clienteActual.dir}</p>
        </div>`;
    window.irAPantalla('expediente');
};

// 5. TRABAJO Y CÁLCULOS
window.confirmarNombreObra = function() {
    const v = document.getElementById('input-nombre-obra').value;
    if (!v) return alert("Indica el nombre del presupuesto");
    obraEnCurso = { nombre: v.toUpperCase(), lineas: [], iva: 21, fotos: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('galeria-fotos').innerHTML = '';
    window.irAPantalla('trabajo'); 
    renderBotones(); 
    renderMedidas();
};

function renderBotones() {
    const cont = document.getElementById('botones-trabajo');
    if(!cont) return;
    cont.innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `
        <button onclick="prepararMedida('${k}')" class="bg-white p-6 rounded-[30px] shadow-sm border flex flex-col items-center active-scale">
            <span class="text-3xl mb-1">${CONFIG_MEDIDAS[k].i}</span>
            <span class="text-[9px] font-black uppercase opacity-60">${CONFIG_MEDIDAS[k].n}</span>
        </button>`).join('');
}

window.prepararMedida = (t) => {
    const zona = prompt("¿HABITACIÓN / ZONA?", "GENERAL"); if (!zona) return;
    const tarea = (t === 'horas') ? prompt("CONCEPTO?", "ADMINISTRACIÓN") : prompt("¿TRABAJO?", "MONTAJE"); 
    if (!tarea) return;
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', zona: zona.toUpperCase(), tarea: tarea.toUpperCase(), modo: 'medida', editandoId: null };
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let txt = calcEstado.modo === 'precio' ? `PRECIO PARA ${calcEstado.tarea}` : (calcEstado.paso === 1 ? conf.m1 : conf.m2);
    document.getElementById('calc-titulo').innerText = txt;
    document.getElementById('calc-display').innerText = calcEstado.memoria.replace(/\./g, ',') || '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    if (n === 'OK') {
        let cifra = 0; try { cifra = eval(calcEstado.memoria) || 0; } catch(e) { alert("Error"); return; }
        if (calcEstado.modo === 'medida') {
            const conf = CONFIG_MEDIDAS[calcEstado.tipo];
            if (calcEstado.paso < conf.pasos) { calcEstado.v1 = cifra; calcEstado.paso++; calcEstado.memoria = ''; abrirCalculadora(); }
            else { calcEstado.totalMetros = (conf.pasos === 1) ? cifra : calcEstado.v1 * cifra; calcEstado.modo = 'precio'; calcEstado.memoria = ''; abrirCalculadora(); }
        } else {
            const nuevaLinea = { id: calcEstado.editandoId || Date.now(), tipo: calcEstado.tipo, tarea: calcEstado.tarea, zona: calcEstado.zona, nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${calcEstado.tarea} - ${calcEstado.zona}`, cantidad: calcEstado.totalMetros, precio: cifra, subtotal: calcEstado.totalMetros * cifra };
            if (calcEstado.editandoId) { const idx = obraEnCurso.lineas.findIndex(l => l.id === calcEstado.editandoId); obraEnCurso.lineas[idx] = nuevaLinea; }
            else { obraEnCurso.lineas.push(nuevaLinea); }
            document.getElementById('modal-calc').classList.add('hidden'); renderMedidas();
        }
    } else if (n === 'DEL') { calcEstado.memoria = ''; abrirCalculadora(); }
    else { calcEstado.memoria += n; abrirCalculadora(); }
};

function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    const subtotal = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);
    const cuotaIva = subtotal * (obraEnCurso.iva / 100);
    const total = subtotal + cuotaIva;
    cont.innerHTML = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm font-bold text-[10px] uppercase italic">
            <div><p class="text-blue-800">${l.nombre}</p><p class="opacity-40">${fNum(l.cantidad)} x ${fNum(l.precio)}€</p></div>
            <div class="flex items-center gap-1"><span class="font-black text-xs mr-2">${fNum(l.subtotal)}€</span><button onclick="editarLinea(${l.id})" class="text-blue-500 p-2 rounded-xl bg-blue-50">✏️</button><button onclick="borrarLinea(${l.id})" class="text-red-400 p-2 rounded-xl bg-red-50">✕</button></div>
        </div>`).reverse().join('') + 
        (subtotal > 0 ? `<div class="bg-slate-900 text-white p-6 rounded-[35px] mt-5 shadow-xl italic"><div class="flex justify-between text-[10px] opacity-60 uppercase font-black"><span>Base: ${fNum(subtotal)}€</span><span>IVA (${obraEnCurso.iva}%): ${fNum(cuotaIva)}€</span></div><div class="flex justify-between text-xl font-black text-green-400 border-t border-white/10 pt-2"><span>TOTAL:</span><span>${fNum(total)}€</span></div></div>` : '');
}

// 6. FOTOS E IVA
window.subirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { obraEnCurso.fotos.push(event.target.result); renderGaleria(); };
    reader.readAsDataURL(file);
};

function renderGaleria() {
    const cont = document.getElementById('galeria-fotos');
    cont.innerHTML = obraEnCurso.fotos.map((f, i) => `
        <div class="relative min-w-[80px] h-20"><img src="${f}" class="w-20 h-20 object-cover rounded-xl border"><button onclick="obraEnCurso.fotos.splice(${i},1); renderGaleria();" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px]">✕</button></div>`).join('');
}

window.cambiarIVA = (valor) => {
    obraEnCurso.iva = valor;
    document.querySelectorAll('.iva-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-900');
    });
    const b = document.getElementById(`btn-iva-${valor}`);
    b.classList.remove('bg-slate-100', 'text-slate-900');
    b.classList.add('bg-blue-600', 'text-white');
    renderMedidas();
};

window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');
window.borrarLinea = (id) => { if(confirm("¿Borrar?")) { obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id); renderMedidas(); } };
window.editarLinea = (id) => {
    const l = obraEnCurso.lineas.find(x => x.id === id);
    calcEstado = { tipo: l.tipo, paso: 1, v1: l.cantidad, v2: 0, memoria: l.precio.toString(), zona: l.zona, tarea: l.tarea, modo: 'precio', totalMetros: l.cantidad, editandoId: id };
    abrirCalculadora();
};

// 7. PDF Y EXPORTAR
window.guardarObraCompleta = async () => {
    if (obraEnCurso.lineas.length === 0) return alert("Sin datos");
    const subtotal = obraEnCurso.lineas.reduce((a,b) => a+b.subtotal, 0);
    const cuotaIva = subtotal * (obraEnCurso.iva / 100);
    const total = subtotal + cuotaIva;
    const numFactura = `${new Date().getFullYear()}/${String(db.ajustes.nPresu).padStart(3, '0')}`;
    const el = document.createElement('div');
    el.innerHTML = `<div style="padding:40px; font-family:sans-serif; color:#333;"><div style="display:flex; justify-content:space-between; border-bottom:4px solid #2563eb; padding-bottom:15px; margin-bottom:20px;"><div><h1 style="margin:0; color:#2563eb; font-size:24px; font-style:italic;">PRESUPUESTO</h1><p style="margin:5px 0 0 0; font-weight:bold;">${db.ajustes.nombre}</p><p style="margin:0; font-size:11px;">CIF: ${db.ajustes.cif} | TEL: ${db.ajustes.tel}</p><p style="margin:0; font-size:11px;">${db.ajustes.dir} - ${db.ajustes.cp} ${db.ajustes.ciudad}</p></div><div style="text-align:right;"><p style="margin:0; font-weight:bold; color:#2563eb;">Nº: ${numFactura}</p><p style="margin:0; font-size:11px;">Fecha: ${new Date().toLocaleDateString('es-ES')}</p></div></div><div style="background:#f8fafc; padding:15px; border-radius:10px; margin-bottom:20px; font-size:11px;"><p style="margin:0; font-weight:bold;">CLIENTE: ${clienteActual.nombre}</p><p style="margin:0;">DIRECCIÓN: ${clienteActual.dir}</p></div><table style="width:100%; border-collapse:collapse; margin-bottom:20px;"><thead><tr style="background:#2563eb; color:white; font-size:10px;"><th style="padding:10px; text-align:left;">CONCEPTO</th><th style="padding:10px; text-align:right;">TOTAL</th></tr></thead><tbody>${obraEnCurso.lineas.map(l => `<tr><td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:11px;"><b>${l.nombre}</b><br><span style="color:#666;">${fNum(l.cantidad)} x ${fNum(l.precio)}€</span></td><td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold; font-size:11px;">${fNum(l.subtotal)}€</td></tr>`).join('')}</tbody></table><div style="text-align:right; margin-bottom:40px;"><p style="margin:0; font-size:12px;">BASE: ${fNum(subtotal)}€ | IVA (${obraEnCurso.iva}%): ${fNum(cuotaIva)}€</p><h2 style="margin:5px 0 0 0; color:#16a34a; font-size:28px;">TOTAL: ${fNum(total)}€</h2></div>${obraEnCurso.fotos.length > 0 ? `<div style="page-break-before: always;"><h3 style="color:#2563eb; font-size:14px;">Anexo Fotográfico</h3><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">${obraEnCurso.fotos.map(f => `<img src="${f}" style="width:100%; border-radius:10px;">`).join('')}</div></div>` : ''}</div>`;
    html2pdf().from(el).set({ margin: 0.5, filename: `Presu_${numFactura.replace('/','-')}.pdf`, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).save();
    setTimeout(() => { db.ajustes.nPresu++; asegurarGuardado(); window.irAPantalla('expediente'); }, 1500);
};

window.exportarDatos = () => { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); const a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", "copia.json"); a.click(); };
window.importarDatos = () => { const f = document.createElement('input'); f.type = 'file'; f.onchange = e => { const reader = new FileReader(); reader.readAsText(e.target.files[0],'UTF-8'); reader.onload = r => { db = JSON.parse(r.target.result); asegurarGuardado(); location.reload(); } }; f.click(); };

// INICIO
window.onload = () => window.renderListaClientes();
