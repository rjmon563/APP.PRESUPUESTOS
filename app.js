// ==========================================
// 1. MEMORIA Y CONFIGURACIÓN
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };
let editandoId = null;

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Ancho' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Alto' },
    'cajones': { n: 'Cajón', i: '📦', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Desarrollo' },
    'tabicas': { n: 'Tabica', i: '📐', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Alto' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml', pasos: 1, m1: 'Metros Totales' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', pasos: 1, m1: 'Total Horas' }
};

const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// ==========================================
// 2. NAVEGACIÓN
// ==========================================
window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    const d = document.getElementById(`pantalla-${id}`);
    if (d) d.classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES
// ==========================================
window.nuevoCliente = () => {
    editandoId = null;
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir'].forEach(i => document.getElementById(i).value = "");
    irAPantalla('nuevo-cliente');
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("Nombre obligatorio");
    const d = { 
        nombre: nom.toUpperCase(), 
        cif: document.getElementById('cli-cif').value.toUpperCase() || "S/N",
        tel: document.getElementById('cli-tel').value || "S/T",
        dir: document.getElementById('cli-dir').value || "S/D"
    };
    if (editandoId) {
        const c = db.clientes.find(x => x.id === editandoId);
        if (c) Object.assign(c, d);
    } else {
        db.clientes.push({ id: Date.now(), ...d, presupuestos: [] });
    }
    asegurarGuardado();
    irAPantalla('clientes');
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10">Sin clientes</p>' :
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-3xl border shadow-sm flex justify-between items-center mb-2 active-scale">
            <p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p>
            <button onclick="borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 p-2 rounded-xl">🗑️</button>
        </div>`).reverse().join('');
};

window.borrarCliente = (id, e) => {
    e.stopPropagation();
    if(confirm("¿Borrar cliente?")) { db.clientes = db.clientes.filter(x => x.id !== id); asegurarGuardado(); renderListaClientes(); }
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic relative">
            <button onclick="editandoId=${clienteActual.id}; irAPantalla('nuevo-cliente')" class="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-lg text-[10px]">✏️</button>
            <h2 class="text-xl font-black uppercase mb-2">${clienteActual.nombre}</h2>
            <p class="text-[9px] opacity-80 uppercase font-bold tracking-widest">${clienteActual.cif} | ${clienteActual.tel}</p>
            <p class="text-[9px] opacity-80 uppercase font-bold">${clienteActual.dir}</p>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. TRABAJO Y EDICIÓN DE MEDIDAS
// ==========================================
window.confirmarNombreObra = () => {
    const v = document.getElementById('input-nombre-obra').value;
    if (!v) return alert("Nombre de obra");
    obraEnCurso = { nombre: v.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    irAPantalla('trabajo');
    renderBotones();
    renderMedidas();
};

function renderBotones() {
    document.getElementById('botones-trabajo').innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `
        <button onclick="prepararMedida('${k}')" class="bg-white p-4 rounded-3xl shadow-sm border flex flex-col items-center active-scale">
            <span class="text-2xl">${CONFIG_MEDIDAS[k].i}</span>
            <span class="text-[8px] font-black uppercase opacity-40">${CONFIG_MEDIDAS[k].n}</span>
        </button>`).join('');
}

window.prepararMedida = (t) => {
    const z = prompt("Zona?", "GENERAL");
    if (!z) return;
    calcEstado = { tipo: t, paso: 1, valor1: 0, memoria: '', concepto: z.toUpperCase() };
    abrirCalculadora();
};

function abrirCalculadora() {
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        let cifra = eval(calcEstado.memoria.replace(/,/g, '.')) || 0;
        if (CONFIG_MEDIDAS[calcEstado.tipo].pasos === 1) { finalizarLinea(cifra); }
        else {
            if (calcEstado.paso === 1) { calcEstado.valor1 = cifra; calcEstado.paso = 2; calcEstado.memoria = ''; abrirCalculadora(); }
            else { finalizarLinea(calcEstado.valor1 * cifra); }
        }
    } else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function finalizarLinea(cant) {
    const p = parseFloat(prompt("Precio (€):", "20")) || 0;
    obraEnCurso.lineas.push({
        id: Date.now(),
        tipo: calcEstado.tipo,
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cant, precio: p, subtotal: cant * p
    });
    cerrarCalc();
    renderMedidas();
}

// EDITAR MEDIDA YA EXISTENTE
window.editarLinea = (id) => {
    const linea = obraEnCurso.lineas.find(l => l.id === id);
    const nCant = parseFloat(prompt("Nueva cantidad:", linea.cantidad)) || 0;
    const nPrec = parseFloat(prompt("Nuevo precio (€):", linea.precio)) || 0;
    linea.cantidad = nCant;
    linea.precio = nPrec;
    linea.subtotal = nCant * nPrec;
    renderMedidas();
};

window.borrarLinea = (id) => {
    if(confirm("¿Quitar esta medida?")) {
        obraEnCurso.lineas = obraEnCurso.lineas.filter(l => l.id !== id);
        renderMedidas();
    }
};

function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    
    // 1. Lista de líneas
    const htmlLineas = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-3 rounded-2xl border flex justify-between items-center mb-2 shadow-sm animate-in">
            <div class="text-[10px] font-bold uppercase italic">
                <p class="text-blue-800">${l.nombre}</p>
                <p class="opacity-40">${l.cantidad.toFixed(2)} x ${l.precio.toFixed(2)}€</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-black text-xs">${l.subtotal.toFixed(2)}€</span>
                <button onclick="editarLinea(${l.id})" class="bg-slate-100 p-2 rounded-lg text-[10px]">✏️</button>
                <button onclick="borrarLinea(${l.id})" class="bg-red-50 text-red-400 p-2 rounded-lg text-[10px]">✕</button>
            </div>
        </div>`).reverse().join('');

    // 2. Cálculo de Resumen por Capítulos
    const resumen = {};
    obraEnCurso.lineas.forEach(l => {
        const nombreTipo = CONFIG_MEDIDAS[l.tipo].n;
        if (!resumen[nombreTipo]) resumen[nombreTipo] = { cant: 0, total: 0, uni: CONFIG_MEDIDAS[l.tipo].uni };
        resumen[nombreTipo].cant += l.cantidad;
        resumen[nombreTipo].total += l.subtotal;
    });

    const htmlResumen = Object.keys(resumen).map(k => `
        <div class="flex justify-between border-b border-dashed py-1 opacity-70">
            <span>${k}:</span>
            <span>${resumen[k].cant.toFixed(2)}${resumen[k].uni} | <b>${resumen[k].total.toFixed(2)}€</b></span>
        </div>`).join('');

    const totalObra = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);

    cont.innerHTML = `
        <div class="mb-4">${htmlLineas}</div>
        ${obraEnCurso.lineas.length > 0 ? `
        <div class="bg-slate-800 text-white p-5 rounded-[30px] shadow-xl italic font-bold text-[10px] uppercase">
            <p class="text-blue-400 mb-2 border-b border-white/10 pb-1">Resumen de Totales</p>
            ${htmlResumen}
            <div class="flex justify-between text-lg mt-3 text-green-400">
                <span>TOTAL:</span>
                <span>${totalObra.toFixed(2)}€</span>
            </div>
        </div>` : ''}`;
}

window.cerrarCalc = () => { document.getElementById('modal-calc').classList.add('hidden'); document.body.classList.remove('no-scroll'); };

window.guardarObraCompleta = () => {
    if (obraEnCurso.lineas.length === 0) return alert("Sin datos");
    if (!clienteActual.presupuestos) clienteActual.presupuestos = [];
    clienteActual.presupuestos.push({...obraEnCurso, total: obraEnCurso.lineas.reduce((a,b)=>a+b.subtotal,0), fecha: new Date().toLocaleDateString()});
    asegurarGuardado();
    alert("Guardado");
    irAPantalla('expediente');
};

window.onload = () => renderListaClientes();
