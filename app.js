// 1. BASE DE DATOS Y ESTADO
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], 
    ajustes: { nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '', nPresu: 1 } 
};

let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [], iva: 21, fotos: [] }; 
let calcEstado = { tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', acumulado: 0, zona: '', tarea: '', modo: 'medida', editandoId: null }; 

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', pasos: 2, m1: 'Suma de tramos', m2: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', pasos: 2, m1: 'Suma de tramos', m2: 'Altura/Fondo' },
    'tabicas': { n: 'Tabica', i: '📐', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', pasos: 1, m1: 'Metros Totales' },
    'horas': { n: 'Horas Admin', i: '🕒', pasos: 1, m1: 'Número de Horas' }
};

const fNum = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// --- NAVEGACIÓN ---
window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    const p = document.getElementById(`pantalla-${id}`);
    if(p) p.classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
};

// --- CALCULADORA (ARREGLO DE LA COMA INCLUIDO) ---
window.teclear = (n) => {
    if (n === '+') {
        let valorPantalla = parseFloat(calcEstado.memoria.replace(',', '.')) || 0;
        calcEstado.acumulado += valorPantalla;
        calcEstado.memoria = ''; 
        actualizarDisplay();
    } 
    else if (n === 'OK') {
        let valorFinal = parseFloat(calcEstado.memoria.replace(',', '.')) || 0;
        let resultadoTotal = calcEstado.acumulado + valorFinal;

        if (calcEstado.modo === 'medida') {
            const conf = CONFIG_MEDIDAS[calcEstado.tipo];
            if (calcEstado.paso < conf.pasos) { 
                calcEstado.v1 = resultadoTotal; calcEstado.paso++; calcEstado.memoria = ''; calcEstado.acumulado = 0;
                abrirCalculadora(); 
            } else { 
                calcEstado.totalMetros = (conf.pasos === 1) ? resultadoTotal : calcEstado.v1 * resultadoTotal; 
                calcEstado.modo = 'precio'; calcEstado.memoria = ''; calcEstado.acumulado = 0; 
                abrirCalculadora(); 
            }
        } else {
            const nuevaLinea = { 
                id: calcEstado.editandoId || Date.now(), 
                tipo: calcEstado.tipo, tarea: calcEstado.tarea, zona: calcEstado.zona, 
                nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${calcEstado.tarea} - ${calcEstado.zona}`, 
                cantidad: calcEstado.totalMetros, precio: resultadoTotal, subtotal: calcEstado.totalMetros * resultadoTotal 
            };
            if (calcEstado.editandoId) {
                const idx = obraEnCurso.lineas.findIndex(l => l.id === calcEstado.editandoId);
                obraEnCurso.lineas[idx] = nuevaLinea;
            } else {
                obraEnCurso.lineas.push(nuevaLinea);
            }
            cerrarCalc(); renderMedidas();
        }
    } else if (n === 'DEL') { 
        calcEstado.memoria = ''; calcEstado.acumulado = 0; actualizarDisplay(); 
    } else if (n === '.') {
        if (!calcEstado.memoria.includes(',')) calcEstado.memoria += (calcEstado.memoria === '' ? '0,' : ',');
        actualizarDisplay();
    } else { 
        calcEstado.memoria += n; actualizarDisplay(); 
    }
};

function actualizarDisplay() {
    let visual = calcEstado.memoria || '0';
    const display = document.getElementById('calc-display');
    display.innerHTML = calcEstado.acumulado > 0 ? `<span class="text-sm opacity-50 font-normal">Suma: ${fNum(calcEstado.acumulado)} +</span><br>${visual}` : visual;
}

// --- GESTIÓN DE PRESUPUESTOS Y CLIENTES ---

// ESTA FUNCIÓN ES LA QUE ARREGLA EL GUARDADO POR CLIENTE
window.guardarObraCompleta = async () => {
    if (!clienteActual) return alert("Error: No hay cliente seleccionado");
    
    // 1. Si el cliente no tiene lista de presupuestos, la creamos
    if (!clienteActual.presupuestos) clienteActual.presupuestos = [];
    
    // 2. Guardamos el presupuesto actual en su ficha
    const nuevoPresu = {
        id: Date.now(),
        numero: db.ajustes.nPresu,
        fecha: new Date().toLocaleDateString(),
        nombreObra: obraEnCurso.nombre,
        lineas: [...obraEnCurso.lineas],
        total: obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0) * (1 + (obraEnCurso.iva/100))
    };
    
    clienteActual.presupuestos.push(nuevoPresu);
    db.ajustes.nPresu++; // Subimos el contador para el siguiente
    
    asegurarGuardado();
    alert("¡Presupuesto guardado en la ficha de " + clienteActual.nombre + "!");
    abrirExpediente(clienteActual.id); // Volvemos a su ficha
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    const listaPresus = clienteActual.presupuestos || [];
    
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-7 rounded-[40px] italic shadow-lg mb-6">
            <h2 class="text-xl font-black uppercase mb-1">${clienteActual.nombre}</h2>
            <p class="text-[10px] opacity-80 uppercase font-bold">${clienteActual.dir}</p>
        </div>
        <div class="space-y-3">
            <p class="font-black text-xs opacity-50 ml-2">HISTORIAL DE PRESUPUESTOS</p>
            ${listaPresus.map(p => `
                <div class="bg-white p-4 rounded-3xl border flex justify-between items-center shadow-sm">
                    <div>
                        <p class="text-xs font-black">#${p.numero} - ${p.nombreObra}</p>
                        <p class="text-[10px] opacity-50">${p.fecha}</p>
                    </div>
                    <p class="font-black text-blue-600">${fNum(p.total)}€</p>
                </div>
            `).reverse().join('') || '<p class="text-center italic opacity-30 py-5">No hay presupuestos guardados</p>'}
        </div>
    `;
    irAPantalla('expediente');
};

// --- FUNCIÓN PDF (CORREGIDA) ---
window.generarPDF = () => {
    const element = document.getElementById('pantalla-trabajo'); // O la zona que quieras imprimir
    const opciones = {
        margin: 10,
        filename: `Presupuesto_${obraEnCurso.nombre}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Usamos la librería html2pdf
    html2pdf().set(opciones).from(element).save()
    .then(() => {
        alert("PDF generado con éxito");
    }).catch(err => {
        console.error("Error PDF:", err);
        alert("Error al crear el PDF. Asegúrate de tener conexión.");
    });
};

// --- INICIALIZACIÓN Y RESTO DE FUNCIONES ---
window.renderMedidas = () => {
    const cont = document.getElementById('lista-medidas-obra');
    const subtotal = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);
    const cuotaIva = subtotal * (obraEnCurso.iva / 100);
    const total = subtotal + cuotaIva;
    
    cont.innerHTML = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 font-bold text-[10px] uppercase italic shadow-sm">
            <div><p class="text-blue-800">${l.nombre}</p><p class="opacity-40">${fNum(l.cantidad)} x ${fNum(l.precio)}€</p></div>
            <div class="flex items-center gap-1">
                <span class="font-black text-xs mr-2">${fNum(l.subtotal)}€</span>
                <button onclick="editarLinea(${l.id})" class="text-blue-500 p-2 rounded-xl bg-blue-50">✏️</button>
                <button onclick="borrarLinea(${l.id})" class="text-red-400 p-2 rounded-xl bg-red-50">✕</button>
            </div>
        </div>`).reverse().join('') + 
        (subtotal > 0 ? `<div class="bg-slate-900 text-white p-6 rounded-[35px] mt-5 italic shadow-xl">
            <div class="flex justify-between text-[10px] opacity-60 font-black"><span>Base: ${fNum(subtotal)}€</span><span>IVA (${obraEnCurso.iva}%): ${fNum(cuotaIva)}€</span></div>
            <div class="flex justify-between text-xl font-black text-green-400 border-t border-white/10 pt-2"><span>TOTAL:</span><span>${fNum(total)}€</span></div>
        </div>` : '');
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 italic">SIN CLIENTES</p>' :
    db.clientes.map(c => `<div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center mb-3 active-scale">
        <p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p>
        <span class="text-[10px] bg-slate-100 px-3 py-1 rounded-full">${(c.presupuestos || []).length} Presus</span>
    </div>`).reverse().join('');
};

// ... Resto de funciones (borrarLinea, prepararMedida, etc.) se mantienen igual ...
window.onload = () => renderListaClientes();
