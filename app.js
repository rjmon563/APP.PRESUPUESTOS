// Base de datos inicial
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], 
    config: { empresa: "Mi Empresa", cif: "" } 
};

// Función para guardar siempre
const guardarDB = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// --- MÓDULO 1: GESTIÓN DE CLIENTES ---

// Crear nuevo cliente
window.nuevoCliente = () => {
    const nombre = prompt("Nombre del Cliente / Empresa:");
    if (!nombre) return;
    
    const telefono = prompt("Teléfono móvil (ej: 600123456):", "");
    const direccion = prompt("Dirección de la obra:", "");
    const nif = prompt("DNI o CIF (Opcional):", "");

    const cliente = {
        id: Date.now(),
        nombre: nombre.toUpperCase(),
        telefono: telefono.replace(/\s+/g, ''), // Limpia espacios para WhatsApp
        direccion: direccion || "Dirección no facilitada",
        nif: nif || "",
        presupuestos: []
    };

    db.clientes.push(cliente);
    guardarDB();
    renderListaClientes();
};

// Dibujar la lista en pantalla
window.renderListaClientes = () => {
    const contenedor = document.getElementById('lista-clientes');
    const busqueda = document.getElementById('buscar-cliente').value.toLowerCase();
    
    if (!contenedor) return;

    // Filtramos la lista según el buscador
    const filtrados = db.clientes.filter(c => 
        c.nombre.toLowerCase().includes(busqueda) || 
        c.direccion.toLowerCase().includes(busqueda)
    );

    if (filtrados.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-10 opacity-30">
                <p class="font-black italic">NO HAY CLIENTES</p>
                <p class="text-xs">Pulsa (+) para añadir uno</p>
            </div>`;
        return;
    }

    contenedor.innerHTML = filtrados.map((c, i) => `
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden border-l-[10px] border-l-blue-600 active:bg-slate-50 transition-colors" onclick="abrirExpediente(${c.id})">
            <div class="p-5 flex justify-between items-center">
                <div class="flex-1 pr-4">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">Expediente Activo</span>
                    </div>
                    <h3 class="text-lg font-black text-slate-800 uppercase italic leading-none mb-2">${c.nombre}</h3>
                    <div class="flex flex-col gap-1">
                        <span class="text-[11px] text-slate-500 font-bold flex items-center gap-1">📍 ${c.direccion}</span>
                        <span class="text-[11px] text-slate-400 font-bold flex items-center gap-1">📞 ${c.telefono}</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <a href="tel:${c.telefono}" onclick="event.stopPropagation()" class="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 active:scale-90 transition-transform">
                        <span class="text-xl">📞</span>
                    </a>
                    <button onclick="event.stopPropagation(); eliminarCliente(${i})" class="w-12 h-12 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center active:bg-red-500 active:text-white transition-all text-xs font-bold">
                        BORRAR
                    </button>
                </div>
            </div>
        </div>
    `).reverse().join(''); // El último cliente sale primero
};

// Eliminar cliente con aviso
window.eliminarCliente = (indice) => {
    if (confirm("¿Seguro que quieres borrar este cliente y todos sus presupuestos?")) {
        db.clientes.splice(indice, 1);
        guardarDB();
        renderListaClientes();
    }
};

// Función puente para el siguiente módulo
window.abrirExpediente = (id) => {
    const cliente = db.clientes.find(c => c.id === id);
    alert("Entrando al expediente de: " + cliente.nombre + "\n(Módulo de Medición en el siguiente paso)");
};

// Carga inicial
window.onload = () => {
    renderListaClientes();
};
