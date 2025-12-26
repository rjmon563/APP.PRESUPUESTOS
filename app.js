// DATOS Y MEMORIA
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;

const guardarDB = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// NAVEGACIÓN
window.irAPantalla = (id) => {
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

// --- MÓDULO CLIENTES (CREAR, EDITAR Y BORRAR) ---

window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente / Empresa:");
    if (!n) return;
    
    const nuevo = {
        id: Date.now(),
        nombre: n.toUpperCase(),
        cif: prompt("CIF o DNI:") || "S/N",
        telefono: prompt("Teléfono:") || "",
        direccion: prompt("Dirección (Calle y Nº):") || "S/D",
        cp: prompt("Código Postal:") || "",
        ciudad: prompt("Ciudad:") || "",
        presupuestos: []
    };
    
    db.clientes.push(nuevo);
    guardarDB();
    renderListaClientes();
};

// NUEVA FUNCIÓN: EDITAR CLIENTE
window.editarCliente = (id) => {
    const c = db.clientes.find(cli => cli.id === id);
    if (!c) return;

    const n = prompt("Editar Nombre:", c.nombre);
    if (!n) return;

    c.nombre = n.toUpperCase();
    c.cif = prompt("Editar CIF/DNI:", c.cif);
    c.telefono = prompt("Editar Teléfono:", c.telefono);
    c.direccion = prompt("Editar Dirección:", c.direccion);
    c.cp = prompt("Editar CP:", c.cp);
    c.ciudad = prompt("Editar Ciudad:", c.ciudad);

    guardarDB();
    abrirExpediente(c.id); // Refresca la ficha azul con los nuevos datos
};

// NUEVA FUNCIÓN: BORRAR CLIENTE
window.borrarCliente = (id) => {
    if (confirm("¿Seguro que quieres borrar este cliente? Se perderán todos sus datos y presupuestos.")) {
        db.clientes = db.clientes.filter(cli => cli.id !== id);
        guardarDB();
        irAPantalla('clientes');
    }
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont || db.clientes.length === 0) {
        cont.innerHTML = '<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-xs tracking-widest">Lista vacía. Pulsa (+)</p>';
        return;
    }

    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center text-left active:bg-slate-50">
            <div>
                <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
                <p class="text-[9px] text-slate-400 font-bold mt-1 italic">📍 ${c.direccion}, ${c.ciudad}</p>
            </div>
            <span class="text-blue-600 font-bold text-xl">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic text-left relative overflow-hidden">
            <div class="relative z-10">
                <div class="flex justify-between items-start mb-2">
                    <h2 class="text-2xl font-black uppercase leading-none">${clienteActual.nombre}</h2>
                    <div class="flex gap-2">
                        <button onclick="editarCliente(${clienteActual.id})" class="bg-white/20 p-2 rounded-xl text-xs font-black uppercase">✏️</button>
                        <button onclick="borrarCliente(${clienteActual.id})" class="bg-red-500/40 p-2 rounded-xl text-xs font-black uppercase text-white">🗑️</button>
                    </div>
                </div>
                <p class="text-[11px] font-bold opacity-90 mb-3 tracking-widest leading-none">CIF: ${clienteActual.cif}</p>
                
                <div class="space-y-1 border-t border-white/20 pt-3">
                    <p class="text-xs font-bold">📍 ${clienteActual.direccion}</p>
                    <p class="text-xs font-bold uppercase italic">${clienteActual.cp} ${clienteActual.ciudad}</p>
                    <p class="text-xs font-bold mt-2 leading-none">📞 ${clienteActual.telefono}</p>
                </div>
            </div>
        </div>`;
        
    irAPantalla('expediente');
};

window.iniciarNuevaObra = () => {
    const n = prompt("Nombre de la obra:");
    if(!n) return;
    document.getElementById('titulo-obra-actual').innerText = n.toUpperCase();
    irAPantalla('trabajo');
};

window.onload = () => renderListaClientes();
