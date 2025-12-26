// 1. CARGA INICIAL DE DATOS (Recuperar lo guardado)
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', campo: 'valor1', valor: '', datos: {} };

// Función para guardar siempre que hagamos un cambio
const guardarDB = () => {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
};

// 2. NAVEGACIÓN ENTRE PANTALLAS
window.irAPantalla = (id) => {
    // Ocultamos todas primero
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    
    // Mostramos la que toca
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    
    // Si volvemos a clientes, refrescamos la lista
    if (id === 'clientes') renderListaClientes();
};

// 3. MÓDULO CLIENTES
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:"); 
    if (!n) return;
    
    const t = prompt("Teléfono:");
    const d = prompt("Dirección de la obra:");
    
    const nuevo = { 
        id: Date.now(), 
        nombre: n.toUpperCase(), 
        telefono: t || "", 
        direccion: d || "S/D", 
        presupuestos: [] 
    };
    
    db.clientes.push(nuevo);
    guardarDB(); // Guardamos en el móvil
    renderListaClientes(); // Dibujamos en pantalla
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;

    if (db.clientes.length === 0) {
        cont.innerHTML = `<div class="py-10 text-center opacity-30 font-black italic uppercase">No hay clientes todavía</div>`;
        return;
    }

    cont.innerHTML = db.clientes.map((c, i) => `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center text-left active:bg-slate-50" onclick="abrirExpediente(${c.id})">
            <div>
                <h3 class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</h3>
                <p class="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">📍 ${c.direccion}</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-blue-600 font-bold text-xl">➔</span>
            </div>
        </div>`).reverse().join(''); // El último cliente sale arriba
};

// 4. MÓDULO EXPEDIENTE
window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    if (!clienteActual) return;
    
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg text-left italic">
            <h2 class="text-2xl font-black uppercase leading-none mb-1">${clienteActual.nombre}</h2>
            <p class="text-xs opacity-80 font-bold">📍 ${clienteActual.direccion}</p>
            <p class="text-[10px] opacity-70 mt-2 font-bold tracking-widest">📞 ${clienteActual.telefono}</p>
        </div>`;
    
    renderHistorial();
    irAPantalla('expediente');
};

window.renderHistorial = () => {
    const cont = document.getElementById('archivo-presupuestos');
    if (!cont) return;
    
    if (clienteActual.presupuestos.length === 0) {
        cont.innerHTML = `<p class="text-left py-4 text-[10px] font-bold text-slate-300 uppercase italic tracking-widest leading-loose">Todavía no has creado presupuestos para este cliente.</p>`;
        return;
    }
    // Aquí irá el mapeo de presupuestos cuando guardemos el primero
};

// 5. INICIAR OBRA
window.iniciarNuevaObra = () => {
    const n = prompt("Nombre de la Obra (ej: Salón y Pasillo):");
    if (!n) return;
    obraEnCurso = { nombre: n.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    irAPantalla('trabajo');
};

// 6. LANZAR AL CARGAR LA PÁGINA
window.onload = () => {
    renderListaClientes();
};
