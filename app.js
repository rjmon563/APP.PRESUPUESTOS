// ==========================================
// 1. MEMORIA Y CONFIGURACIÓN
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', concepto: '' };

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²', pasos: 3, m1: 'Largo', m2: 'Ancho', m3: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', uni: 'm²', pasos: 3, m1: 'Largo', m2: 'Ancho', m3: 'Altura' },
    'tabicas': { n: 'Tabica', i: '📐', uni: 'm²', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml', pasos: 1, m1: 'Metros Lineales' },
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
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir'].forEach(i => {
        const el = document.getElementById(i);
        if(el) el.value = "";
    });
    irAPantalla('nuevo-cliente');
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("Nombre obligatorio");
    db.clientes.push({ 
        id: Date.now(), 
        nombre: nom.toUpperCase(), 
        cif: document.getElementById('cli-cif').value.toUpperCase() || "S/N",
        tel: document.getElementById('cli-tel').value || "S/T",
        dir: document.getElementById('cli-dir').value || "S/D",
        presupuestos: [] 
    });
    asegurarGuardado();
    irAPantalla('clientes');
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10">Sin clientes</p>' :
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-3xl border shadow-sm flex justify-between items-center mb-2 active-scale">
            <p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p>
            <button onclick="event.stopPropagation(); if(confirm('¿Borrar?')){db.clientes=db.clientes.filter(x=>x.id!==${c.id}); asegurarGuardado(); renderListaClientes();}" class="text-red-500 p-2">🗑️</button>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic relative">
             <button onclick="editandoId=${clienteActual.id}; irAPantalla('nuevo-cliente')" class="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-lg text-[10px]">✏️</button>
            <h2 class="text-xl font-black uppercase mb-2">${clienteActual.nombre}</h2>
            <p class="text-[9px] opacity-80 font-bold uppercase">${clienteActual.dir}</p>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. LÓGICA DE TRABAJO (CORREGIDA)
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
    // CAMBIO AQUÍ: Ahora pregunta por "Lugar de trabajo"
    const z = prompt("Lugar de trabajo (Ej: Salon, Cocina, Pasillo...):", "GENERAL");
    if (!z) return;
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', concepto: z.toUpperCase() };
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let textoPaso = "";
    if(conf.pasos === 1) textoPaso = conf.m1;
    if(conf.pasos === 2) textoPaso = (calcEstado.paso === 1) ? conf.m1 : conf.m2;
    if(conf.pasos === 3) {
        if(calcEstado.paso === 1) textoPaso = conf.m1;
        if(calcEstado.paso === 2) textoPaso = conf.m2;
        if(calcEstado.paso === 3) textoPaso = conf.m3;
    }
    document.getElementById('calc-titulo').innerText = `${textoPaso.toUpperCase()} - ${calcEstado.concepto}`;
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
    // Impedir que salte el teclado del móvil
    document.activeElement.blur();
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];

    if (n === 'OK') {
        let cifra = eval(calcEstado.memoria.replace(/,/g, '.')) || 0;
        if (conf.pasos === 1) { finalizarLinea(cifra); }
        else if (conf.pasos === 2) {
            if (calcEstado.paso === 1) { calcEstado.v1 = cifra; calcEstado.paso = 2; calcEstado.memoria = ''; abrirCalculadora(); }
            else { finalizarLinea(calcEstado.v1 * cifra); }
        } else if (conf.pasos === 3) {
            if (calcEstado.paso === 1) { calcEstado.v1 = cifra; calcEstado.paso = 2; calcEstado.memoria = ''; abrirCalculadora(); }
            else if (calcEstado.paso === 2) { calcEstado.v2 = cifra; calcEstado.paso = 3; calcEstado.memoria = ''; abrirCalculadora(); }
            else { finalizarLinea(calcEstado.v1 * calcEstado.v2 * cifra); }
        }
    } else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function finalizarLinea(cant) {
    const p = parseFloat(prompt("Precio para este trabajo (€):", "20")) || 0;
    obraEnCurso.lineas.push({
        id: Date.now(),
        tipo: calcEstado.tipo,
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cant, precio: p, subtotal: cant * p
    });
    cerrarCalc();
    renderMedidas();
}

window.editarLinea = (id) => {
    const l = obraEnCurso.lineas.find(x => x.id === id);
    const nC = parseFloat(prompt("Rectificar Cantidad (Metros):", l.cantidad)) || 0;
    const nP = parseFloat(prompt("Rectificar Precio (€):", l.precio)) || 0;
    l.cantidad = nC; l.precio = nP; l.subtotal = nC * nP;
    renderMedidas();
};

window.borrarLinea = (id) => {
    if(confirm("¿Eliminar esta medida de la lista?")) {
        obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id);
        renderMedidas();
    }
};

function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    const totalObra = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);

    const htmlLineas = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-3 rounded-2xl border flex justify-between items-center mb-2 shadow-sm italic font-bold">
            <div class="text-[9px] uppercase">
                <p class="text-blue-800">${l.nombre}</p>
                <p class="opacity-40">${l.cantidad.toFixed(2)} x ${l.precio.toFixed(2)}€</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs">${l.subtotal.toFixed(2)}€</span>
                <button onclick="editarLinea(${l.id})" class="bg-slate-100 p-2 rounded-lg text-[10px]">✏️</button>
                <button onclick="borrarLinea(${l.id})" class="bg-red-50 text-red-500 p-2 rounded-lg text-[10px]">✕</button>
            </div>
        </div>`).reverse().join('');

    cont.innerHTML = `
        <div class="mb-4">${htmlLineas}</div>
        ${obraEnCurso.lineas.length > 0 ? `
        <div class="bg-slate-900 text-white p-5 rounded-[30px] shadow-xl italic font-bold text-[10px] uppercase">
            <p class="text-blue-400 mb-2 border-b border-white/10 pb-1">Resumen de Totales</p>
            <div class="flex justify-between text-lg text-green-400 mt-2">
                <span>TOTAL OBRA:</span>
                <span>${totalObra.toFixed(2)}€</span>
            </div>
        </div>` : ''}`;
}

window.cerrarCalc = () => { document.getElementById('modal-calc').classList.add('hidden'); document.body.classList.remove('no-scroll'); };

window.guardarObraCompleta = () => {
    if (obraEnCurso.lineas.length === 0) return alert("Añade alguna medida antes de finalizar");
    if (!clienteActual.presupuestos) clienteActual.presupuestos = [];
    clienteActual.presupuestos.push({...obraEnCurso, total: obraEnCurso.lineas.reduce((a,b)=>a+b.subtotal,0), fecha: new Date().toLocaleDateString()});
    asegurarGuardado();
    alert("✅ Presupuesto guardado en la ficha del cliente");
    irAPantalla('expediente');
};

window.onload = () => renderListaClientes();
