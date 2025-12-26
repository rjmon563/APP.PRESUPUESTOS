// ==========================================
// 1. DATOS Y MEMORIA
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };

const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs' }
};

// ==========================================
// 2. NAVEGACIÓN ENTRE PANTALLAS
// ==========================================
window.irAPantalla = (id) => {
    const pantallas = ['pantalla-clientes', 'pantalla-expediente', 'pantalla-trabajo', 'pantalla-nombre-obra'];
    pantallas.forEach(p => {
        const el = document.getElementById(p);
        if(el) el.classList.add('hidden');
    });
    
    const destino = document.getElementById(`pantalla-${id}`);
    if(destino) destino.classList.remove('hidden');

    if(id === 'clientes') renderListaClientes();
    if(id === 'expediente' && clienteActual) renderHistorial();
};

// ==========================================
// 3. GESTIÓN PROFESIONAL DE CLIENTES
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
    const n = prompt("Editar Nombre:", c.nombre);
    if (!n) return;
    c.nombre = n.toUpperCase();
    c.cif = prompt("Editar CIF:", c.cif);
    c.telefono = prompt("Editar Teléfono:", c.telefono);
    c.direccion = prompt("Editar Dirección:", c.direccion);
    c.cp = prompt("Editar CP:", c.cp);
    c.ciudad = prompt("Editar Ciudad:", c.ciudad);
    asegurarGuardado();
    abrirExpediente(c.id);
};

window.borrarCliente = (id) => {
    if (confirm("¿Seguro que quieres borrar este cliente? No podrás recuperarlo.")) {
        db.clientes = db.clientes.filter(cli => cli.id !== id);
        asegurarGuardado();
        irAPantalla('clientes');
    }
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-[10px]">Sin clientes</p>' : 
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center text-left mb-3">
            <div>
                <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
                <p class="text-[9px] text-slate-400 font-bold mt-1 tracking-tight">📍 ${c.direccion}, ${c.ciudad}</p>
            </div>
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
            <p class="text-[11px] font-bold opacity-90 mb-3 tracking-widest leading-none">CIF: ${clienteActual.cif}</p>
            <div class="border-t border-white/20 pt-3 text-xs font-bold leading-tight">
                <p>📍 ${clienteActual.direccion}</p>
                <p>${clienteActual.cp} ${clienteActual.ciudad}</p>
                <p class="mt-2 font-black tracking-widest">📞 ${clienteActual.telefono}</p>
            </div>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. MÓDULO DE MEDICIÓN (EL SALTO SEGURO)
// ==========================================
window.confirmarNombreObra = () => {
    const input = document.getElementById('input-nombre-obra');
    if (!input.value) { alert("Pon un nombre a la obra para seguir"); return; }
    
    obraEnCurso = { 
        nombre: input.value.toUpperCase(), 
        lineas: [],
        fecha: new Date().toLocaleDateString()
    };
    
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('lista-medidas-obra').innerHTML = "";
    input.value = ""; 
    
    irAPantalla('trabajo');
};

// ... (Aquí van las funciones de calculadora que ya tenías)
window.prepararMedida = (t) => {
    const zona = prompt("¿Zona de la obra?", "General");
    if(!zona) return;
    calcEstado = { tipo: t, paso: 1, valor1: 0, memoria: '', concepto: zona.toUpperCase() };
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
};

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        let res = 0;
        try { res = eval(calcEstado.memoria.replace(/,/g, '.')) || 0; } catch(e) { return; }
        
        if (calcEstado.tipo === 'horas' || calcEstado.tipo === 'cantoneras') {
            finalizarLinea(res);
        } else {
            if (calcEstado.paso === 1) {
                calcEstado.valor1 = res; calcEstado.paso = 2; calcEstado.memoria = ''; disp.innerText = '0';
            } else {
                finalizarLinea(calcEstado.valor1 * res);
            }
        }
    } else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else if (n === '+') { calcEstado.memoria += '+'; disp.innerText = calcEstado.memoria; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function finalizarLinea(cant) {
    const p = parseFloat((prompt("Precio (€):", "0")).replace(',','.')) || 0;
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cant, precio: p, subtotal: cant * p, unidad: CONFIG_MEDIDAS[calcEstado.tipo].uni
    });
    document.getElementById('modal-calc').classList.add('hidden');
    renderMedidas();
}

function renderMedidas() {
    document.getElementById('lista-medidas-obra').innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-3 rounded-xl border flex justify-between items-center mb-2 italic shadow-sm text-[11px]">
            <div><p class="font-black uppercase">${l.nombre}</p>
            <p class="font-bold text-slate-400">${l.cantidad.toFixed(2)}${l.unidad} x ${l.precio}€</p></div>
            <div class="font-black text-blue-600">${l.subtotal.toFixed(2)}€</div>
        </div>`).reverse().join('');
}

window.renderHistorial = () => {
    // Aquí puedes añadir la lógica para ver presupuestos antiguos si quieres
};

window.onload = () => renderListaClientes();
