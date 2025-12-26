// Comprobación de carga
console.log("App.js cargado correctamente");

// Datos
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;

// Funciones
window.irAPantalla = (id) => {
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if (!n) return;
    
    db.clientes.push({
        id: Date.now(),
        nombre: n.toUpperCase(),
        direccion: prompt("Dirección:") || "S/D",
        telefono: prompt("Teléfono:") || "",
        presupuestos: []
    });
    
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    
    if (db.clientes.length === 0) {
        cont.innerHTML = '<p class="text-center opacity-30 mt-10 font-bold uppercase">Pulsa (+) para añadir</p>';
        return;
    }

    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center text-left">
            <div>
                <p class="font-black text-slate-800 uppercase italic">${c.nombre}</p>
                <p class="text-[10px] text-slate-400 font-bold tracking-tight">📍 ${c.direccion}</p>
            </div>
            <span class="text-blue-600 font-bold text-xl">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-3xl shadow-lg italic text-left">
            <h2 class="text-2xl font-black uppercase mb-1">${clienteActual.nombre}</h2>
            <p class="text-xs opacity-80 font-bold tracking-tight">📍 ${clienteActual.direccion}</p>
        </div>`;
    irAPantalla('expediente');
};

window.iniciarNuevaObra = () => {
    const n = prompt("Nombre de la obra:");
    if(!n) return;
    document.getElementById('titulo-obra-actual').innerText = n.toUpperCase();
    irAPantalla('trabajo');
};

// Carga inicial
window.onload = () => {
    renderListaClientes();
};
