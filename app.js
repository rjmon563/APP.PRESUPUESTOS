// ==========================================
// 1. MEMORIA Y DATOS INICIALES
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', zona: '', tarea: '' };

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²', pasos: 3, m1: 'Largo', m2: 'Ancho', m3: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', uni: 'm²', pasos: 3, m1: 'Largo', m2: 'Ancho', m3: 'Altura' },
    'tabicas': { n: 'Tabica', i: '📐', uni: 'm²', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml', pasos: 1, m1: 'Metros Lineales' }
};

const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// ==========================================
// 2. NAVEGACIÓN Y PANTALLAS
// ==========================================
window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES
// ==========================================
window.nuevoCliente = () => {
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir'].forEach(i => document.getElementById(i).value = "");
    irAPantalla('nuevo-cliente');
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("Nombre obligatorio");
    db.clientes.push({ 
        id: Date.now(), nombre: nom.toUpperCase(), 
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
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10">SIN CLIENTES</p>' :
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-3xl border shadow-sm flex justify-between items-center mb-2 active:scale-95">
            <p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p>
            <button onclick="event.stopPropagation(); if(confirm('¿Borrar?')){db.clientes=db.clientes.filter(x=>x.id!==${c.id}); asegurarGuardado(); renderListaClientes();}" class="text-red-500 p-2">🗑️</button>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic">
            <h2 class="text-xl font-black uppercase mb-1">${clienteActual.nombre}</h2>
            <p class="text-[9px] opacity-80 font-bold uppercase">${clienteActual.dir}</p>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. LÓGICA DE OBRA (ZONA Y TAREA)
// ==========================================
window.confirmarNombreObra = () => {
    const v = document.getElementById('input-nombre-obra').value;
    if (!v) return alert("Indica la zona");
    obraEnCurso = { nombre: v.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = "ZONA: " + obraEnCurso.nombre;
    irAPantalla('trabajo');
    renderBotones();
    renderMedidas();
};

function renderBotones() {
    document.getElementById('botones-trabajo').innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `
        <button onclick="prepararMedida('${k}')" class="bg-white p-4 rounded-3xl shadow-sm border flex flex-col items-center active:scale-95">
            <span class="text-2xl">${CONFIG_MEDIDAS[k].i}</span>
            <span class="text-[8px] font-black uppercase opacity-40">${CONFIG_MEDIDAS[k].n}</span>
        </button>`).join('');
}

window.prepararMedida = (t) => {
    const zona = prompt("¿ZONA DE TRABAJO? (Habitación, Cocina...):", "GENERAL");
    if (!zona) return;
    const tarea = prompt("¿QUÉ HACEMOS? (Montaje, Cinta, Placa...):", "MONTAJE");
    if (!tarea) return;
    
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', zona: zona.toUpperCase(), tarea: tarea.toUpperCase() };
    abrirCalculadora();
};

// ==========================================
// 5. CALCULADORA PRO (SIN TECLADO MÓVIL)
// ==========================================
function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let txt = (conf.pasos === 1) ? conf.m1 : (calcEstado.paso === 1 ? conf.m1 : (calcEstado.paso === 2 ? conf.m2 : conf.m3));
    document.getElementById('calc-titulo').innerText = txt.toUpperCase() + " - " + calcEstado.zona;
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
    document.activeElement.blur(); // Cierra teclado del móvil
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        let cifra = eval(calcEstado.memoria.replace(/,/g, '.')) || 0;
        const conf = CONFIG_MEDIDAS[calcEstado.tipo];
        if (calcEstado.paso < conf.pasos) {
            if (calcEstado.paso === 1) calcEstado.v1 = cifra;
            if (calcEstado.paso === 2) calcEstado.v2 = cifra;
            calcEstado.paso++; calcEstado.memoria = ''; abrirCalculadora();
        } else {
            let total = (conf.pasos === 1) ? cifra : (conf.pasos === 2 ? calcEstado.v1 * cifra : calcEstado.v1 * calcEstado.v2 * cifra);
            document.getElementById('modal-calc').classList.add('hidden');
            setTimeout(() => pedirPrecioYFinalizar(total), 200);
        }
    } else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function pedirPrecioYFinalizar(cant) {
    const p = prompt(`METROS TOTALES: ${cant.toFixed(2)}\nINDICAR PRECIO (€):`, "20");
    const precio = parseFloat(p ? p.replace(',','.') : 0) || 0;
    obraEnCurso.lineas.push({
        id: Date.now(),
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${calcEstado.tarea} EN ${calcEstado.zona}`,
        cantidad: cant, precio: precio, subtotal: cant * precio
    });
    renderMedidas();
}

// ==========================================
// 6. RESUMEN, PAPELERA Y PDF
// ==========================================
function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    const total = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);
    
    cont.innerHTML = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-3 rounded-2xl border flex justify-between items-center mb-2 shadow-sm font-bold italic">
            <div class="text-[9px] uppercase">
                <p class="text-blue-800">${l.nombre}</p>
                <p class="opacity-40">${l.cantidad.toFixed(2)} x ${l.precio.toFixed(2)}€</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-black">${l.subtotal.toFixed(2)}€</span>
                <button onclick="borrarLinea(${l.id})" class="text-red-500 bg-red-50 p-2 rounded-xl">✕</button>
            </div>
        </div>`).reverse().join('') + 
        (total > 0 ? `<div class="bg-slate-900 text-green-400 p-5 rounded-[30px] text-center font-black mt-4 shadow-xl">TOTAL OBRA: ${total.toFixed(2)}€</div>` : '');
}

window.borrarLinea = (id) => {
    if(confirm("¿Borrar esta medida?")) {
        obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id);
        renderMedidas();
    }
};

window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');

window.guardarObraCompleta = async () => {
    if (obraEnCurso.lineas.length === 0) return alert("No hay datos");
    const total = obraEnCurso.lineas.reduce((a,b) => a+b.subtotal, 0);
    
    // Generar PDF con diseño limpio
    const el = document.createElement('div');
    el.innerHTML = `
        <div style="padding:40px; font-family:sans-serif; color:#333;">
            <h1 style="color:#2563eb; border-bottom:2px solid #2563eb;">PRESUPUESTO</h1>
            <p><b>CLIENTE:</b> ${clienteActual.nombre}</p>
            <p><b>ZONA:</b> ${obraEnCurso.nombre}</p>
            <p><b>FECHA:</b> ${new Date().toLocaleDateString()}</p>
            <div style="margin-top:20px;">
                ${obraEnCurso.lineas.map(l => `<p style="border-bottom:1px solid #eee; padding:5px 0;">${l.nombre}: <b>${l.subtotal.toFixed(2)}€</b></p>`).join('')}
            </div>
            <h2 style="text-align:right; color:#16a34a; margin-top:30px;">TOTAL: ${total.toFixed(2)}€</h2>
        </div>`;
    
    html2pdf().from(el).set({
        filename: `Presupuesto_${clienteActual.nombre}.pdf`,
        margin: 1,
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).save();

    // Opción WhatsApp
    setTimeout(() => {
        if(confirm("PDF descargado. ¿Quieres enviar el resumen por WhatsApp?")){
            const txt = `*PRESUPUESTO*%0ACliente: ${clienteActual.nombre}%0AObra: ${obraEnCurso.nombre}%0ATOTAL: ${total.toFixed(2)}€`;
            window.open(`https://wa.me/?text=${txt}`, '_blank');
        }
        clienteActual.presupuestos.push({...obraEnCurso, total});
        asegurarGuardado();
        irAPantalla('expediente');
    }, 1200);
};

window.onload = () => renderListaClientes();
