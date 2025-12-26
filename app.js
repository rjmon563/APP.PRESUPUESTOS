// ==========================================
// 1. MEMORIA Y SEGURIDAD (LocalStorage)
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;

// Esta función es el "candado": asegura que nada se pierda
const asegurarGuardado = () => {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    console.log("Datos guardados con éxito.");
};

// ==========================================
// 2. NAVEGACIÓN ENTRE PANTALLAS
// ==========================================
window.irAPantalla = (id) => {
    document.getElementById('pantalla-clientes').classList.add('hidden');
    document.getElementById('pantalla-expediente').classList.add('hidden');
    document.getElementById('pantalla-trabajo').classList.add('hidden');
    
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    
    // Al volver a la lista principal, siempre refrescamos para ver cambios
    if(id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES (PROFESIONAL)
// ==========================================

// CREAR
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente / Empresa:");
    if (!n) return;
    
    const nuevoCli = {
        id: Date.now(),
        nombre: n.toUpperCase(),
        cif: prompt("CIF o DNI:") || "S/N",
        telefono: prompt("Teléfono:") || "",
        direccion: prompt("Dirección (Calle y Nº):") || "S/D",
        cp: prompt("Código Postal:") || "",
        ciudad: prompt("Ciudad:") || "",
        presupuestos: []
    };
    
    db.clientes.push(nuevoCli);
    asegurarGuardado();
    renderListaClientes();
};

// EDITAR (Sin riesgo de borrar datos)
window.editarCliente = (id) => {
    const c = db.clientes.find(cli => cli.id === id);
    if (!c) return;

    const nuevoNombre = prompt("Editar Nombre:", c.nombre);
    if (!nuevoNombre) return; // Si cancela, no hace nada

    c.nombre = nuevoNombre.toUpperCase();
    c.cif = prompt("Editar CIF/DNI:", c.cif);
    c.telefono = prompt("Editar Teléfono:", c.telefono);
    c.direccion = prompt("Editar Dirección:", c.direccion);
    c.cp = prompt("Editar CP:", c.cp);
    c.ciudad = prompt("Editar Ciudad:", c.ciudad);

    asegurarGuardado();
    abrirExpediente(c.id); // Refresca la vista azul inmediatamente
};

// BORRAR (Con doble confirmación)
window.borrarCliente = (id) => {
    const confirmacion1 = confirm("¿Estás SEGURO de que quieres borrar este cliente?");
    if (confirmacion1) {
        const confirmacion2 = confirm("¡CUIDADO! Se borrarán también todos sus presupuestos. ¿Proceder?");
        if (confirmacion2) {
            db.clientes = db.clientes.filter(cli => cli.id !== id);
            asegurarGuardado();
            irAPantalla('clientes');
        }
    }
};

// DIBUJAR LISTA
window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    
    if (db.clientes.length === 0) {
        cont.innerHTML = `
            <div class="py-20 text-center opacity-20">
                <p class="font-black italic uppercase">Agenda Vacía</p>
                <p class="text-[10px] font-bold">Pulsa el botón (+) para empezar</p>
            </div>`;
        return;
    }

    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-[25px] border border-slate-200 shadow-sm flex justify-between items-center text-left active:scale-[0.98] transition-all">
            <div class="flex-1">
                <p class="font-black text-slate-800 uppercase italic leading-none text-lg">${c.nombre}</p>
                <div class="flex items-center gap-2 mt-2">
                    <span class="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-400">📍 ${c.ciudad}</span>
                    <span class="text-[8px] bg-blue-50 px-1.5 py-0.5 rounded font-black text-blue-400 italic">VER EXPEDIENTE</span>
                </div>
            </div>
            <span class="text-blue-600 font-bold text-xl ml-4">➔</span>
        </div>`).reverse().join('');
};

// VISTA AZUL (EXPEDIENTE)
window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    if (!clienteActual) return;
    
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-7 rounded-[40px] shadow-xl italic text-left relative overflow-hidden">
            <div class="relative z-10">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-3xl font-black uppercase leading-tight pr-10">${clienteActual.nombre}</h2>
                    <div class="flex gap-2">
                        <button onclick="editarCliente(${clienteActual.id})" class="bg-white/20 p-2.5 rounded-2xl text-lg shadow-inner">✏️</button>
                        <button onclick="borrarCliente(${clienteActual.id})" class="bg-red-500/30 p-2.5 rounded-2xl text-lg shadow-inner">🗑️</button>
                    </div>
                </div>
                
                <div class="space-y-2 border-t border-white/10 pt-4">
                    <p class="text-[10px] font-black tracking-[3px] opacity-60 uppercase">Datos Fiscales</p>
                    <p class="text-sm font-bold tracking-widest">CIF: ${clienteActual.cif}</p>
                    <p class="text-sm font-bold">📍 ${clienteActual.direccion}</p>
                    <p class="text-sm font-black uppercase tracking-tighter">${clienteActual.cp} - ${clienteActual.ciudad}</p>
                    <p class="text-sm font-bold mt-4 inline-block bg-white/10 px-3 py-1 rounded-lg italic">📞 ${clienteActual.telefono}</p>
                </div>
            </div>
            <div class="absolute -right-6 -bottom-6 text-white/5 text-9xl font-black">🏢</div>
        </div>`;
        
    irAPantalla('expediente');
};

// ==========================================
// 4. INICIO DE TRABAJO
// ==========================================
window.iniciarNuevaObra = () => {
    const n = prompt("Nombre del Proyecto (ej: Reforma Salón):");
    if(!n) return;
    document.getElementById('titulo-obra-actual').innerText = n.toUpperCase();
    irAPantalla('trabajo');
};

// Arrancar al cargar
window.onload = () => renderListaClientes();
