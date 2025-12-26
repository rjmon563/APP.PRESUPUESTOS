// ==========================================
// 1. MEMORIA Y CONFIGURACIÓN
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²' },
    'cajones': { n: 'Cajón', i: '📦', uni: 'm²' },
    'tabicas': { n: 'Tabica', i: '📐', uni: 'm²' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs' }
};

const asegurarGuardado = () => {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
};

// ==========================================
// 2. NAVEGACIÓN
// ==========================================
window.irAPantalla = (id) => {
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES
// ==========================================
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente / Empresa:");
    if (!n) return;
    db.clientes.push({
        id: Date.now(),
        nombre: n.toUpperCase(),
        cif: prompt("CIF o DNI:") || "S/N",
        telefono: prompt("Teléfono:") || "",
        direccion: prompt("Dirección:") || "S/D",
        cp: prompt("Código Postal:") || "",
        ciudad: prompt("Ciudad:") || "",
        presupuestos: []
    });
    asegurarGuardado();
    renderListaClientes();
};

window.editarCliente = (id) => {
    const c = db.clientes.find(cli => cli.id === id);
    if (!c) return;
    c.nombre = (prompt("Editar Nombre:", c.nombre) || c.nombre).toUpperCase();
    c.cif = prompt("Editar CIF/DNI:", c.cif);
    c.telefono = prompt("Editar Teléfono:", c.telefono);
    c.direccion = prompt("Editar Dirección:", c.direccion);
    c.cp = prompt("Editar CP:", c.cp);
    c.ciudad = prompt("Editar Ciudad:", c.ciudad);
    asegurarGuardado();
    abrirExpediente(c.id);
};

window.borrarCliente = (id) => {
    if (confirm("¿Seguro que quieres borrar este cliente y sus presupuestos?")) {
        db.clientes = db.clientes.filter(cli => cli.id !== id);
        asegurarGuardado();
        irAPantalla('clientes');
    }
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    if (db.clientes.length === 0) {
        cont.innerHTML = '<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-xs">No hay clientes. Pulsa (+)</p>';
        return;
    }
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center text-left mb-3">
            <div>
                <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
                <p class="text-[9px] text-slate-400 font-bold mt-1 tracking-tight">📍 ${c.direccion}, ${c.ciudad}</p>
            </div>
            <span class="text-blue-600 font-bold text-xl">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic text-left">
            <div class="flex justify-between items-start mb-2">
                <h2 class="text-2xl font-black uppercase leading-none">${clienteActual.nombre}</h2>
                <div class="flex gap-2">
                    <button onclick="editarCliente(${clienteActual.id})" class="bg-white/20 p-2 rounded-xl text-xs">✏️</button>
                    <button onclick="borrarCliente(${clienteActual.id})" class="bg-red-500/40 p-2 rounded-xl text-xs">🗑️</button>
                </div>
            </div>
            <p class="text-[11px] font-bold opacity-90 mb-3">CIF: ${clienteActual.cif}</p>
            <div class="border-t border-white/20 pt-3">
                <p class="text-xs font-bold">📍 ${clienteActual.direccion}</p>
                <p class="text-xs font-bold uppercase italic">${clienteActual.cp} ${clienteActual.ciudad}</p>
                <p class="text-xs font-bold mt-2">📞 ${clienteActual.telefono}</p>
            </div>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. MÓDULO DE MEDICIÓN Y CALCULADORA
// ==========================================
window.iniciarNuevaObra = () => {
    const n = prompt("Nombre de la obra (ej: Techos y Tabiques):");
    if(!n) return;
    obraEnCurso = { nombre: n.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('lista-medidas-obra').innerHTML = "";
    irAPantalla('trabajo');
};

window.prepararMedida = (tipo) => {
    const zona = prompt("¿Zona de la obra? (ej: Comedor, Pasillo...):", "General");
    if(!zona) return;
    calcEstado = { tipo: tipo, paso: 1, valor1: 0, memoria: '', concepto: zona.toUpperCase() };
    abrirCalculadora();
};

function abrirCalculadora() {
    const titulo = document.getElementById('calc-titulo');
    const display = document.getElementById('calc-display');
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    
    if (calcEstado.tipo === 'horas' || calcEstado.tipo === 'cantoneras') {
        titulo.innerText = `TOTAL ${conf.n} - ${calcEstado.concepto}`;
    } else {
        titulo.innerText = (calcEstado.paso === 1) ? `MEDIDA 1 - ${calcEstado.concepto}` : `MEDIDA 2 - ${calcEstado.concepto}`;
    }
    display.innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    const display = document.getElementById('calc-display');
    if (n === 'DEL') calcEstado.memoria = calcEstado.memoria.slice(0, -1);
    else if (n === '+') { if(calcEstado.memoria !== '') calcEstado.memoria += '+'; }
    else if (n === 'OK') { procesarDatoCalculadora(); return; }
    else calcEstado.memoria += n;
    display.innerText = calcEstado.memoria || '0';
};

function procesarDatoCalculadora() {
    let resultado = 0;
    try { resultado = eval(calcEstado.memoria.replace(/,/g, '.')) || 0; } 
    catch(e) { alert("Cálculo incorrecto"); return; }

    if (calcEstado.tipo === 'horas' || calcEstado.tipo === 'cantoneras') {
        finalizarLinea(resultado);
    } else {
        if (calcEstado.paso === 1) {
            calcEstado.valor1 = resultado;
            calcEstado.paso = 2;
            calcEstado.memoria = '';
            abrirCalculadora();
        } else {
            finalizarLinea(calcEstado.valor1 * resultado);
        }
    }
}

function finalizarLinea(cantidadFinal) {
    const pStr = prompt(`Precio para ${CONFIG_MEDIDAS[calcEstado.tipo].n} (€):`, "0");
    const p = parseFloat(pStr.replace(',','.')) || 0;
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cantidadFinal,
        precio: p,
        subtotal: cantidadFinal * p,
        unidad: CONFIG_MEDIDAS[calcEstado.tipo].uni
    });
    document.getElementById('modal-calc').classList.add('hidden');
    renderListaMedidas();
}

window.renderListaMedidas = () => {
    const cont = document.getElementById('lista-medidas-obra');
    cont.innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-3 rounded-xl border flex justify-between items-center mb-2 italic shadow-sm text-left">
            <div>
                <p class="font-black text-slate-800 text-[11px] uppercase">${l.nombre}</p>
                <p class="text-[9px] font-bold text-slate-400">${l.cantidad.toFixed(2)}${l.unidad} x ${l.precio}€</p>
            </div>
            <div class="flex items-center gap-3 font-black text-blue-600">
                ${l.subtotal.toFixed(2)}€
                <button onclick="obraEnCurso.lineas.splice(${i}, 1); renderListaMedidas();" class="text-red-400 ml-2">✕</button>
            </div>
        </div>`).reverse().join('');
};

window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');

window.onload = () => renderListaClientes();
