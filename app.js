// ==========================================
// 1. MEMORIA Y SEGURIDAD
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };

const asegurarGuardado = () => {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
};

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²' },
    'cajones': { n: 'Cajón', i: '📦', uni: 'm²' },
    'tabicas': { n: 'Tabica', i: '📐', uni: 'm²' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs' }
};

// ==========================================
// 2. NAVEGACIÓN BLINDADA (Fuerza el cambio)
// ==========================================
window.irAPantalla = (id) => {
    // 1. Buscamos todas las pantallas posibles
    const todas = document.querySelectorAll('[id^="pantalla-"]');
    
    // 2. Las ocultamos todas a la fuerza
    todas.forEach(p => {
        p.classList.add('hidden');
        p.style.display = 'none'; 
    });
    
    // 3. Mostramos la elegida
    const destino = document.getElementById(`pantalla-${id}`);
    if (destino) {
        destino.classList.remove('hidden');
        destino.style.display = (id === 'trabajo') ? 'flex' : 'block'; 
        window.scrollTo(0,0); // Sube arriba para que no parezca vacía
    }

    if (id === 'clientes') renderListaClientes();
    if (id === 'expediente' && clienteActual) renderHistorial();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES
// ==========================================
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if (!n) return;
    const nuevo = {
        id: Date.now(),
        nombre: n.toUpperCase(),
        cif: prompt("CIF/DNI:") || "S/N",
        telefono: prompt("Teléfono:") || "",
        direccion: prompt("Dirección:") || "S/D",
        cp: prompt("CP:") || "",
        ciudad: prompt("Ciudad:") || "",
        presupuestos: []
    };
    db.clientes.push(nuevo);
    asegurarGuardado();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-xs">Agenda vacía. Pulsa (+)</p>' : 
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center text-left mb-3 active:bg-slate-50">
            <div><p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
            <p class="text-[9px] text-slate-400 font-bold mt-1">📍 ${c.direccion}</p></div>
            <span class="text-blue-600 font-bold">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(cli => cli.id === id);
    if(!clienteActual) return;
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic text-left">
            <div class="flex justify-between items-start mb-2">
                <h2 class="text-2xl font-black uppercase leading-none">${clienteActual.nombre}</h2>
                <div class="flex gap-2">
                    <button onclick="editarCliente(${clienteActual.id})" class="bg-white/20 p-2 rounded-xl text-xs">✏️</button>
                    <button onclick="borrarCliente(${clienteActual.id})" class="bg-red-500/40 p-2 rounded-xl text-xs">🗑️</button>
                </div>
            </div>
            <p class="text-[11px] font-bold opacity-90 mb-3 leading-none">CIF: ${clienteActual.cif}</p>
            <div class="border-t border-white/20 pt-3 text-xs font-bold">
                <p>📍 ${clienteActual.direccion}</p>
                <p class="uppercase">${clienteActual.cp} ${clienteActual.ciudad}</p>
                <p class="mt-2">📞 ${clienteActual.telefono}</p>
            </div>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. EL SALTO A LA OBRA (CORREGIDO)
// ==========================================
window.iniciarNuevaObra = () => {
    const n = prompt("Nombre de la obra:");
    if(!n) return;
    
    // Reiniciamos la obra en memoria
    obraEnCurso = { 
        nombre: n.toUpperCase(), 
        lineas: [],
        fecha: new Date().toLocaleDateString()
    };
    
    // Escribimos el título antes de saltar
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('lista-medidas-obra').innerHTML = "";
    
    // Forzamos el salto
    setTimeout(() => {
        irAPantalla('trabajo');
    }, 100); 
};

// --- CALCULADORA Y MEDIDAS ---
window.prepararMedida = (tipo) => {
    const zona = prompt("¿Zona?", "General");
    if(!zona) return;
    calcEstado = { tipo, paso: 1, valor1: 0, memoria: '', concepto: zona.toUpperCase() };
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    document.getElementById('calc-titulo').innerText = (calcEstado.tipo === 'horas' || calcEstado.tipo === 'cantoneras') ? 
        `TOTAL ${conf.n} - ${calcEstado.concepto}` : `DATO ${calcEstado.paso} - ${calcEstado.concepto}`;
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'DEL') calcEstado.memoria = calcEstado.memoria.slice(0, -1);
    else if (n === '+') { if(calcEstado.memoria !== '') calcEstado.memoria += '+'; }
    else if (n === 'OK') { procesarDatoCalculadora(); return; }
    else calcEstado.memoria += n;
    disp.innerText = calcEstado.memoria || '0';
};

function procesarDatoCalculadora() {
    let res = 0;
    try { res = eval(calcEstado.memoria.replace(/,/g, '.')) || 0; } catch(e) { return; }
    if (calcEstado.tipo === 'horas' || calcEstado.tipo === 'cantoneras') {
        finalizarLinea(res);
    } else {
        if (calcEstado.paso === 1) {
            calcEstado.valor1 = res; calcEstado.paso = 2; calcEstado.memoria = ''; abrirCalculadora();
        } else {
            finalizarLinea(calcEstado.valor1 * res);
        }
    }
}

function finalizarLinea(cant) {
    const p = parseFloat((prompt("Precio (€):", "0")).replace(',','.')) || 0;
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cant, precio: p, subtotal: cant * p, unidad: CONFIG_MEDIDAS[calcEstado.tipo].uni
    });
    document.getElementById('modal-calc').classList.add('hidden');
    renderListaMedidas();
}

window.renderListaMedidas = () => {
    document.getElementById('lista-medidas-obra').innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-3 rounded-xl border flex justify-between items-center mb-2 shadow-sm italic text-[11px]">
            <div><p class="font-black uppercase">${l.nombre}</p>
            <p class="font-bold text-slate-400">${l.cantidad.toFixed(2)}${l.unidad} x ${l.precio}€</p></div>
            <div class="font-black text-blue-600">${l.subtotal.toFixed(2)}€</div>
        </div>`).reverse().join('');
};

window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');
window.onload = () => renderListaClientes();
