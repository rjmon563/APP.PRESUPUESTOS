// ==========================================
// 0. CONFIGURACIÓN VISUAL (LOGO)
// ==========================================
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."; // Tu código Base64 aquí

function renderHeader() {
    const headerElement = document.getElementById('header-app');
    if (headerElement) {
        headerElement.innerHTML = `
            <header class="bg-white border-b-2 p-4 flex justify-between items-center mb-4">
                <div class="flex items-center gap-3">
                    <img src="${LOGO_BASE64}" class="w-10 h-10 rounded-lg shadow-sm">
                    <h1 class="font-black italic text-slate-800 uppercase text-lg">PresuPro</h1>
                </div>
                <div class="flex gap-2">
                    <button onclick="irAPantalla('clientes')" class="text-[10px] font-black border p-2 rounded-lg bg-slate-50 active-scale">INICIO</button>
                    <button onclick="irAPantalla('ajustes')" class="text-[10px] font-black border p-2 rounded-lg bg-slate-50 active-scale">⚙️</button>
                </div>
            </header>
        `;
    }
}

// ==========================================
// 1. ESTADO INICIAL Y BASE DE DATOS
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], 
    ajustes: { nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '', nPresu: 1 },
    agenda: {}
};

let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [], iva: 21, fotos: [] }; 
let calcEstado = { 
    tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', acumulado: 0, 
    zona: '', tarea: '', modo: 'medida', editandoId: null,
    historialSuma: [] 
}; 

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', pasos: 2, m1: 'Suma de tramos', m2: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', pasos: 2, m1: 'Suma de tramos', m2: 'Altura/Fondo' },
    'tabicas': { n: 'Tabica', i: '📐', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', pasos: 1, m1: 'Metros Totales' },
    'horas': { n: 'Horas Admin', i: '🕒', pasos: 1, m1: 'Número de Horas' }
};

const fNum = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// ==========================================
// 2. NAVEGACIÓN
// ==========================================
window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    const p = document.getElementById(`pantalla-${id}`);
    if(p) p.classList.remove('hidden');
    
    if (id === 'clientes') renderListaClientes();
    if (id === 'calendario') renderCalendario();
    if (id === 'ajustes') calcularResumenIVA();
};

// ==========================================
// 3. LÓGICA DE CALCULADORA
// ==========================================
window.teclear = (n) => {
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
        let res = calcEstado.acumulado + vF;
        calcEstado.historialSuma = [];
        if (calcEstado.modo === 'medida') {
            const conf = CONFIG_MEDIDAS[calcEstado.tipo];
            if (calcEstado.paso < conf.pasos) { 
                calcEstado.v1 = res; calcEstado.paso++; calcEstado.memoria = ''; calcEstado.acumulado = 0; abrirCalculadora(); 
            } else { 
                calcEstado.totalMetros = (conf.pasos === 1) ? res : calcEstado.v1 * res; 
                calcEstado.modo = 'precio'; calcEstado.memoria = ''; calcEstado.acumulado = 0; abrirCalculadora(); 
            }
        } else {
            const l = { id: calcEstado.editandoId || Date.now(), tipo: calcEstado.tipo, tarea: calcEstado.tarea, zona: calcEstado.zona, nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${calcEstado.tarea} - ${calcEstado.zona}`, cantidad: calcEstado.totalMetros, precio: res, subtotal: calcEstado.totalMetros * res };
            if (calcEstado.editandoId) {
                const idx = obraEnCurso.lineas.findIndex(x => x.id === calcEstado.editandoId);
                obraEnCurso.lineas[idx] = l;
            } else { obraEnCurso.lineas.push(l); }
            document.getElementById('modal-calc').classList.add('hidden'); renderMedidas();
        }
    } else if (n === 'DEL') { 
        if (calcEstado.memoria !== '') { calcEstado.memoria = ''; } 
        else if (calcEstado.historialSuma.length > 0) {
            let ultimoDato = calcEstado.historialSuma.pop();
            calcEstado.acumulado -= ultimoDato;
            calcEstado.memoria = ultimoDato.toString().replace('.', ',');
        } else { calcEstado.acumulado = 0; }
        actualizarDisplay(); 
    } else if (n === '.') {
        if (!calcEstado.memoria.includes(',')) calcEstado.memoria += (calcEstado.memoria === '' ? '0,' : ',');
        actualizarDisplay();
    } else { calcEstado.memoria += n; actualizarDisplay(); }
};

function actualizarDisplay() {
    let visual = calcEstado.memoria || '0';
    let textoHistorial = calcEstado.acumulado > 0 ? `<span class="text-xs opacity-50 italic">Acumulado: ${fNum(calcEstado.acumulado)} +</span><br>` : '';
    document.getElementById('calc-display').innerHTML = textoHistorial + visual;
}

// ==========================================
// 4. CLIENTES Y EXPEDIENTE
// ==========================================
window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 italic">SIN CLIENTES</p>' :
    db.clientes.map(c => `<div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center mb-3 active-scale border-l-4 border-l-blue-600"><p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p></div>`).reverse().join('');
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("Nombre?");
    db.clientes.push({ id: Date.now(), nombre: nom.toUpperCase(), cif: document.getElementById('cli-cif').value.toUpperCase(), tel: document.getElementById('cli-tel').value, dir: document.getElementById('cli-dir').value.toUpperCase(), cp: document.getElementById('cli-cp').value.toUpperCase(), presupuestos: [], notas: "" });
    asegurarGuardado(); irAPantalla('clientes');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    if (!clienteActual) return;
    const historial = clienteActual.presupuestos || [];
    if (clienteActual.notas === undefined) clienteActual.notas = "";

    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-7 rounded-[40px] italic shadow-lg mb-4">
            <h2 class="text-xl font-black uppercase mb-1">${clienteActual.nombre}</h2>
            <p class="text-[10px] opacity-80 uppercase">${clienteActual.dir} ${clienteActual.cp || ''}</p>
        </div>
        <div class="bg-yellow-100 p-5 rounded-[30px] mb-4 border border-yellow-200">
            <p class="text-[9px] font-black opacity-30 mb-2 uppercase italic text-yellow-800">📌 Notas de la obra</p>
            <textarea oninput="guardarNotas(${clienteActual.id}, this.value)" class="w-full bg-transparent border-none outline-none font-bold text-sm h-20 resize-none" placeholder="Anotaciones importantes...">${clienteActual.notas}</textarea>
        </div>
        <div class="space-y-2 mb-4">
            ${historial.map(p => `
                <div class="flex items-center gap-2 mb-2">
                    <div onclick="verPresupuestoGuardado(${p.id})" class="flex-1 bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center active:scale-95 transition-all cursor-pointer border-l-4 border-l-blue-400">
                        <div><p class="text-[10px] font-bold">#${p.numero} - ${p.nombreObra}</p><p class="text-[8px] opacity-40 uppercase font-black">${p.fecha}</p></div>
                        <p class="text-xs font-black text-blue-600">${fNum(p.total)}€</p>
                    </div>
                    <button onclick="borrarPresupuestoIndividual(${p.id})" class="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100 active:scale-90">🗑️</button>
                </div>
            `).reverse().join('') || '<p class="text-center opacity-30 text-[10px] py-4">Sin presupuestos</p>'}
        </div>
        <button onclick="borrarCliente(${clienteActual.id})" class="w-full mt-6 p-4 text-red-400 font-bold text-[9px] uppercase opacity-40 italic">🗑️ Eliminar expediente completo</button>`;
    irAPantalla('expediente');
};

window.guardarNotas = (id, t) => { const c = db.clientes.find(x => x.id === id); if(c){ c.notas = t; asegurarGuardado(); } };

// ==========================================
// 5. INICIAR MEDICIÓN
// ==========================================
window.confirmarNombreObra = () => {
    const v = document.getElementById('input-nombre-obra').value;
    if (!v) return alert("Pon un nombre a la obra");
    obraEnCurso = { nombre: v.toUpperCase(), lineas: [], iva: 21, fotos: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('input-nombre-obra').value = "";
    irAPantalla('trabajo');
    renderBotones();
    renderMedidas();
};

// ==========================================
// 6. RENDER TRABAJO Y PDF
// ==========================================
window.renderMedidas = () => {
    const cont = document.getElementById('lista-medidas-obra');
    const subtotal = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);
    const cuotaIva = subtotal * (obraEnCurso.iva / 100);
    const total = subtotal + cuotaIva;
    cont.innerHTML = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 font-bold text-[10px] uppercase italic shadow-sm">
            <div><p class="text-blue-800">${l.nombre}</p><p class="opacity-40">${fNum(l.cantidad)} x ${fNum(l.precio)}€</p></div>
            <div class="flex items-center gap-1">
                <span class="font-black text-xs mr-2">${fNum(l.subtotal)}€</span>
                <button onclick="editarLinea(${l.id})" class="text-blue-500 p-2 rounded-xl bg-blue-50">✏️</button>
                <button onclick="borrarLinea(${l.id})" class="text-red-400 p-2 rounded-xl bg-red-50">✕</button>
            </div>
        </div>`).reverse().join('') + 
        (subtotal > 0 ? `<div class="bg-slate-900 text-white p-6 rounded-[35px] mt-5 italic shadow-xl border-l-4 border-l-blue-500">
            <div class="flex justify-between text-[10px] opacity-60 font-black mb-1"><span>Base:</span><span>${fNum(subtotal)}€</span></div>
            <div class="flex justify-between text-[10px] opacity-60 font-black mb-2"><span>IVA (${obraEnCurso.iva}%):</span><span>${fNum(cuotaIva)}€</span></div>
            <p class="text-[8px] text-blue-400 font-black uppercase mb-1">Total Presupuesto (€):</p>
            <input type="text" id="total-editable" class="w-full bg-transparent text-green-400 text-2xl font-black border-b border-green-400/30 outline-none" value="${fNum(total)}">
        </div>` : '');
};

window.guardarObraCompleta = async () => {
    if (obraEnCurso.lineas.length === 0) return alert("Añade medidas");
    const inputEditor = document.getElementById('total-editable');
    const totalFinal = inputEditor ? parseFloat(inputEditor.value.replace(/\./g, '').replace(',', '.')) : 0;
    const nuevoPresu = { id: Date.now(), numero: db.ajustes.nPresu, fecha: new Date().toLocaleDateString(), nombreObra: obraEnCurso.nombre, lineas: [...obraEnCurso.lineas], iva: obraEnCurso.iva, total: totalFinal };
    if (!clienteActual.presupuestos) clienteActual.presupuestos = [];
    clienteActual.presupuestos.push(nuevoPresu);
    db.ajustes.nPresu++; asegurarGuardado();
    const element = document.getElementById('pantalla-trabajo');
    const opt = { margin: 10, filename: `Presu_${nuevoPresu.numero}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save();
    abrirExpediente(clienteActual.id);
};

// ==========================================
// 7. CALENDARIO
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
    grid.innerHTML = ['L','M','X','J','V','S','D'].map(d => `<div class="text-[8px] font-black opacity-20 py-3 text-center">${d}</div>`).join('');
    for(let i=0; i<ajuste; i++) grid.innerHTML += `<div></div>`;
    if(!db.agenda) db.agenda = {};
    for(let d=1; d<=diasMes; d++) {
        let id = `${fechaCal.getFullYear()}-${fechaCal.getMonth()+1}-${d}`;
        let marca = db.agenda[id] ? 'bg-blue-100 text-blue-600 border border-blue-200' : '';
        grid.innerHTML += `<div onclick="selDia('${id}')" class="aspect-square flex items-center justify-center text-xs font-bold rounded-xl active-scale transition-all ${marca}">${d}</div>`;
    }
};

window.selDia = (id) => {
    diaSel = id;
    document.getElementById('detalle-dia').classList.remove('hidden');
    document.getElementById('fecha-seleccionada').innerText = "TAJOS DEL " + id.split('-').reverse().join('/');
    document.getElementById('nota-dia').value = db.agenda[id] || "";
};

window.guardarEventoDia = () => {
    db.agenda[diaSel] = document.getElementById('nota-dia').value;
    asegurarGuardado(); renderCalendario();
};

window.cambiarMes = (n) => { fechaCal.setMonth(fechaCal.getMonth()+n); renderCalendario(); };

// ==========================================
// 8. AUXILIARES
// ==========================================
window.renderBotones = () => { document.getElementById('botones-trabajo').innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `<button onclick="prepararMedida('${k}')" class="bg-white p-6 rounded-[30px] border flex flex-col items-center active-scale shadow-sm"><span class="text-3xl mb-1">${CONFIG_MEDIDAS[k].i}</span><span class="text-[9px] font-black uppercase opacity-60">${CONFIG_MEDIDAS[k].n}</span></button>`).join(''); };
window.prepararMedida = (t) => { const zona = prompt("¿ZONA?", "GENERAL"); if (!zona) return; calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', acumulado: 0, zona: zona.toUpperCase(), tarea: 'MONTAJE', modo: 'medida', editandoId: null, historialSuma: [] }; abrirCalculadora(); };
function abrirCalculadora() { const conf = CONFIG_MEDIDAS[calcEstado.tipo]; document.getElementById('calc-titulo').innerText = calcEstado.modo === 'precio' ? `PRECIO` : (calcEstado.paso === 1 ? conf.m1 : conf.m2); actualizarDisplay(); document.getElementById('modal-calc').classList.remove('hidden'); }
window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');
window.nuevoCliente = () => irAPantalla('nuevo-cliente');
window.borrarCliente = (id) => { if (confirm("¿BORRAR?")) { db.clientes = db.clientes.filter(c => c.id !== id); asegurarGuardado(); irAPantalla('clientes'); } };
window.cambiarIVA = (valor) => { obraEnCurso.iva = valor; renderMedidas(); };
window.guardarAjustes = () => { db.ajustes = { nombre: document.getElementById('config-nombre').value.toUpperCase(), cif: document.getElementById('config-cif').value.toUpperCase(), tel: document.getElementById('config-tel').value, dir: document.getElementById('config-dir').value.toUpperCase(), cp: document.getElementById('config-cp').value, ciudad: document.getElementById('config-ciudad').value.toUpperCase(), nPresu: parseInt(document.getElementById('config-nPresu').value) || 1 }; asegurarGuardado(); irAPantalla('clientes'); };

window.editarLinea = (id) => {
    const l = obraEnCurso.lineas.find(x => x.id === id);
    if (!l) return;
    calcEstado = { tipo: l.tipo, paso: 1, v1: 0, v2: 0, memoria: l.cantidad.toString().replace('.', ','), acumulado: 0, zona: l.zona, tarea: l.tarea, modo: 'medida', totalMetros: l.cantidad, editandoId: id, historialSuma: [] };
    abrirCalculadora();
};

window.borrarLinea = (id) => { if(confirm("¿Eliminar?")) { obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id); renderMedidas(); } };

window.verPresupuestoGuardado = (idPresu) => {
    const p = clienteActual.presupuestos.find(x => x.id === idPresu);
    if (!p) return;
    obraEnCurso = { nombre: p.nombreObra, lineas: JSON.parse(JSON.stringify(p.lineas)), iva: p.iva || 21, fotos: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    irAPantalla('trabajo'); renderBotones(); renderMedidas();
};

window.calcularResumenIVA = () => {
    const cont = document.getElementById('resumen-iva-lista');
    if (!cont) return;
    let totales = { iva21: 0, iva10: 0, base: 0 };
    db.clientes.forEach(c => {
        if (c.presupuestos) {
            c.presupuestos.forEach(p => {
                const subtotal = p.lineas.reduce((a, b) => a + b.subtotal, 0);
                totales.base += subtotal;
                if (p.iva === 21) totales.iva21 += (subtotal * 0.21);
                if (p.iva === 10) totales.iva10 += (subtotal * 0.10);
            });
        }
    });
    cont.innerHTML = `
        <div class="flex justify-between items-center text-[11px] font-bold"><span class="opacity-50">Base Total:</span><span>${fNum(totales.base)}€</span></div>
        <div class="flex justify-between items-center text-blue-700 text-[11px] font-bold"><span>IVA 21%:</span><span>${fNum(totales.iva21)}€</span></div>
        <div class="flex justify-between items-center text-green-700 text-[11px] font-bold"><span>IVA 10%:</span><span>${fNum(totales.iva10)}€</span></div>
    `;
};

// ==========================================
// ONLOAD: CARGA DE APP
// ==========================================
window.onload = () => {
    renderHeader();
    renderListaClientes();
};
