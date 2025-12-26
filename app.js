// Datos
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;

// Guardar en memoria
const guardarDB = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

window.irAPantalla = (id) => {
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

// --- MÓDULO CLIENTES ACTUALIZADO ---
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente / Empresa:");
    if (!n) return;
    
    const cif = prompt("CIF o DNI:");
    const tel = prompt("Teléfono:");
    const dir = prompt("Dirección (Calle y Nº):");
    const cp = prompt("Código Postal:");
    const ciudad = prompt("Ciudad:");

    db.clientes.push({
        id: Date.now(),
        nombre: n.toUpperCase(),
        cif: cif || "S/N",
        telefono: tel || "",
        direccion: dir || "S/D",
        cp: cp || "",
        ciudad: ciudad || "",
        presupuestos: []
    });
    
    guardarDB();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    
    if (db.clientes.length === 0) {
        cont.innerHTML = '<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-xs">No hay clientes. Pulsa (+) para empezar.</p>';
        return;
    }

    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center text-left active:bg-slate-50">
            <div>
                <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
                <p class="text-[9px] text-slate-400 font-bold mt-1 tracking-tight italic">
                    📍 ${c.direccion}, ${c.ciudad}
                </p>
            </div>
            <span class="text-blue-600 font-bold text-xl">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    
    // Mostramos todos los datos en la ficha azul
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic text-left relative overflow-hidden">
            <div class="relative z-10">
                <h2 class="text-2xl font-black uppercase mb-2 leading-none">${clienteActual.nombre}</h2>
                <p class="text-[11px] font-bold opacity-90 mb-3 tracking-widest">CIF: ${clienteActual.cif}</p>
                
                <div class="space-y-1 border-t border-white/20 pt-3">
                    <p class="text-xs font-bold">📍 ${clienteActual.direccion}</p>
                    <p class="text-xs font-bold uppercase italic">${clienteActual.cp} ${clienteActual.ciudad}</p>
                    <p class="text-xs font-bold mt-2">📞 ${clienteActual.telefono}</p>
                </div>
            </div>
            <div class="absolute -right-4 -bottom-4 text-white/10 text-8xl font-black">🏢</div>
        </div>`;
        
    irAPantalla('expediente');
};

window.iniciarNuevaObra = () => {
    const n = prompt("Nombre de la obra (ej: Reforma Salón):");
    if(!n) return;
    document.getElementById('titulo-obra-actual').innerText = n.toUpperCase();
    irAPantalla('trabajo');
};

window.onload = () => renderListaClientes();
