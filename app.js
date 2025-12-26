// CONFIGURACIÓN DE TIPOS
const CONFIG_TRABAJOS = {
    'tabiques': { n: 'Tabique', i: '🧱', calculo: 'vertical' },
    'techos': { n: 'Techo', i: '🏠', calculo: 'techo' }, // Largo x Ancho
    'cajones': { n: 'Cajón', i: '📦', calculo: 'vertical' },
    'tabicas': { n: 'Tabica', i: '📐', calculo: 'vertical' },
    'cantoneras': { n: 'Cantonera', i: '📏', calculo: 'lineal' },
    'horas': { n: 'Horas', i: '⏱️', calculo: 'directo' }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };

const guardarDB = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// NAVEGACIÓN
window.irAPantalla = (id) => {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
};

// --- MÓDULO CLIENTES ---
window.nuevoCliente = () => {
    const n = prompt("Nombre:"); if (!n) return;
    const t = prompt("Teléfono:");
    const d = prompt("Dirección:");
    db.clientes.push({ id: Date.now(), nombre: n.toUpperCase(), telefono: t || "", direccion: d || "S/D", presupuestos: [] });
    guardarDB(); renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.map((c, i) => `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center" onclick="abrirExpediente(${c.id})">
            <div class="text-left">
                <h3 class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</h3>
                <p class="text-[10px] text-slate-400 font-bold mt-1">📍 ${c.direccion}</p>
            </div>
            <span class="text-blue-600 font-bold">➔</span>
        </div>`).join('');
};

// --- MÓDULO EXPEDIENTE ---
window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    irAPantalla('expediente');
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[40px] shadow-lg text-left relative overflow-hidden italic">
            <h2 class="text-2xl font-black uppercase leading-none mb-1">${clienteActual.nombre}</h2>
            <p class="text-xs opacity-80 font-bold leading-none">📍 ${clienteActual.direccion}</p>
            <p class="text-xs opacity-80 font-bold mt-2">📞 ${clienteActual.telefono}</p>
        </div>`;
    renderHistorial();
};

window.renderHistorial = () => {
    const cont = document.getElementById('archivo-presupuestos');
    if (clienteActual.presupuestos.length === 0) {
        cont.innerHTML = `<p class="text-center py-4 text-xs font-bold text-slate-300 uppercase italic">No hay trabajos guardados</p>`;
        return;
    }
    cont.innerHTML = clienteActual.presupuestos.map((p, i) => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center italic">
            <span class="text-xs font-black uppercase text-slate-600">${p.nombre}</span>
            <span class="text-[10px] bg-slate-100 px-2 py-1 rounded-lg font-bold">${p.total.toFixed(2)}€</span>
        </div>`).join('');
};

// --- MÓDULO MEDICIÓN ---
window.iniciarNuevaObra = () => {
    const n = prompt("Nombre de esta obra (ej: Reforma Cocina):");
    if (!n) return;
    obraEnCurso = { nombre: n.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('lista-medidas-obra').innerHTML = "";
    irAPantalla('trabajo');
};

window.prepararMedida = (tipo) => {
    const conf = CONFIG_TRABAJOS[tipo];
    // Por ahora usamos prompts, en el SIGUIENTE PASO meteremos la CALCULADORA REAL
    const concepto = prompt(`¿En qué zona estás? (ej: Comedor, Pasillo):`, "General");
    const precio = prompt(`Precio por ${conf.n}:`, "0");
    
    alert(`Listo para medir ${conf.n} en ${concepto}. \nEn el siguiente paso activaremos la calculadora sumatoria.`);
    
    // Aquí es donde llamaremos a la calculadora en el siguiente paso
};

window.onload = () => renderListaClientes();
