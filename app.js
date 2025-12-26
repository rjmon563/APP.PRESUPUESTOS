// ==========================================
// 1. MEMORIA Y CONFIGURACIÓN
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };

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
    const pantallas = ['pantalla-clientes', 'pantalla-expediente', 'pantalla-trabajo', 'pantalla-nombre-obra'];
    pantallas.forEach(p => {
        const el = document.getElementById(p);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES
// ==========================================
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if (!n) return;
    db.clientes.push({
        id: Date.now(),
        nombre: n.toUpperCase(),
        cif: prompt("CIF/DNI:") || "S/N",
        telefono: prompt("Teléfono:") || "",
        direccion: prompt("Dirección:") || "S/D",
        cp: prompt("CP:") || "",
        ciudad: prompt("Ciudad:") || "",
        presupuestos: []
    });
    asegurarGuardado();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-[10px]">Sin clientes</p>' : 
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center mb-3 active:scale-95 transition-transform">
            <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
            <span class="text-blue-600 font-bold">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(cli => cli.id === id);
    if(!clienteActual) return;
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic text-left">
            <h2 class="text-2xl font-black uppercase leading-none">${clienteActual.nombre}</h2>
            <p class="text-[11px] font-bold opacity-80 mb-3 tracking-widest">CIF: ${clienteActual.cif}</p>
            <p class="text-xs">📍 ${clienteActual.direccion}, ${clienteActual.ciudad}</p>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. LÓGICA DE MEDICIÓN Y CALCULADORA
// ==========================================
window.confirmarNombreObra = () => {
    const input = document.getElementById('input-nombre-obra');
    if (!input.value) return alert("Pon un nombre a la obra");
    obraEnCurso = { nombre: input.value.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('lista-medidas-obra').innerHTML = "";
    irAPantalla('trabajo');
};

window.prepararMedida = (t) => {
    const zona = prompt("¿Zona? (Ej: Salón, Cocina):", "General");
    if(!zona) return;
    calcEstado = { tipo: t, paso: 1, valor1: 0, memoria: '', concepto: zona.toUpperCase() };
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    const titulo = document.getElementById('calc-titulo');
    if (conf.pasos === 2) {
        titulo.innerText = (calcEstado.paso === 1) ? `${conf.m1.toUpperCase()} - ${calcEstado.concepto}` : `${conf.m2.toUpperCase()} - ${calcEstado.concepto}`;
    } else {
        titulo.innerText = `${conf.m1.toUpperCase()} - ${calcEstado.concepto}`;
    }
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        let cifra = 0;
        try { cifra = eval(calcEstado.memoria.replace(/,/g, '.')) || 0; } catch(e) { return alert("Error en suma"); }
        const conf = CONFIG_MEDIDAS[calcEstado.tipo];
        if (conf.pasos === 1) {
            finalizarLinea(cifra);
        } else {
            if (calcEstado.paso === 1) {
                calcEstado.valor1 = cifra; calcEstado.paso = 2; calcEstado.memoria = ''; abrirCalculadora();
            } else {
                finalizarLinea(calcEstado.valor1 * cifra);
            }
        }
    } 
    else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else if (n === '+') { calcEstado.memoria += '+'; disp.innerText = calcEstado.memoria; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function finalizarLinea(cantidadFinal) {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    const precioS = prompt(`Precio para ${conf.n} por ${conf.uni} (€):`, "0");
    const p = parseFloat(precioS.replace(',','.')) || 0;

    obraEnCurso.lineas.push({
        nombre: `${conf.i} ${conf.n} (${calcEstado.concepto})`,
        cantidad: cantidadFinal,
        precio: p,
        subtotal: cantidadFinal * p,
        unidad: conf.uni
    });

    document.getElementById('modal-calc').classList.add('hidden');
    renderMedidas();
}

function renderMedidas() {
    const lista = document.getElementById('lista-medidas-obra');
    lista.innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm italic text-[11px]">
            <div>
                <p class="font-black text-slate-800 uppercase leading-none mb-1">${l.nombre}</p>
                <p class="font-bold text-slate-400">${l.cantidad.toFixed(2)}${l.unidad} x ${l.precio.toFixed(2)}€</p>
            </div>
            <div class="font-black text-blue-700">${l.subtotal.toFixed(2)}€</div>
        </div>`).reverse().join('');
}

window.guardarObraCompleta = () => {
    if(obraEnCurso.lineas.length === 0) return alert("No hay medidas");
    const total = obraEnCurso.lineas.reduce((acc, l) => acc + l.subtotal, 0);
    clienteActual.presupuestos.push({ ...obraEnCurso, total, fecha: new Date().toLocaleDateString() });
    asegurarGuardado();
    alert("Obra guardada con éxito");
    irAPantalla('expediente');
};

window.onload = () => renderListaClientes();
