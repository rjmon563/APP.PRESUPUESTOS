let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], ajustes: { nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '', nPresu: 1 } 
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

// NAVEGACIÓN
window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    const p = document.getElementById(`pantalla-${id}`);
    if(p) p.classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
    if (id === 'ajustes') cargarAjustesEnInputs();
};

function cargarAjustesEnInputs() {
    ['nombre','cif','tel','dir','cp','ciudad','nPresu'].forEach(k => {
        const el = document.getElementById(`config-${k}`);
        if(el) el.value = db.ajustes[k] || (k === 'nPresu' ? 1 : '');
    });
}

// CALCULADORA CON COMA Y SUMA INFINITA
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
                calcEstado.v1 = resultadoTotal; 
                calcEstado.paso++; 
                calcEstado.memoria = ''; 
                calcEstado.acumulado = 0;
                abrirCalculadora(); 
            } else { 
                calcEstado.totalMetros = (conf.pasos === 1) ? resultadoTotal : calcEstado.v1 * resultadoTotal; 
                calcEstado.modo = 'precio'; 
                calcEstado.memoria = ''; 
                calcEstado.acumulado = 0; 
                abrirCalculadora(); 
            }
        } else {
            const nuevaLinea = { 
                id: calcEstado.editandoId || Date.now(), 
                tipo: calcEstado.tipo, 
                tarea: calcEstado.tarea, 
                zona: calcEstado.zona, 
                nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${calcEstado.tarea} - ${calcEstado.zona}`, 
                cantidad: calcEstado.totalMetros, 
                precio: resultadoTotal, 
                subtotal: calcEstado.totalMetros * resultadoTotal 
            };

            if (calcEstado.editandoId) {
                const idx = obraEnCurso.lineas.findIndex(l => l.id === calcEstado.editandoId);
                obraEnCurso.lineas[idx] = nuevaLinea;
            } else {
                obraEnCurso.lineas.push(nuevaLinea);
            }
            
            document.getElementById('modal-calc').classList.add('hidden'); 
            renderMedidas();
        }
    } else if (n === 'DEL') { 
        calcEstado.memoria = ''; 
        calcEstado.acumulado = 0;
        actualizarDisplay(); 
    } else if (n === '.') {
        if (!calcEstado.memoria.includes(',')) {
            calcEstado.memoria += (calcEstado.memoria === '' ? '0,' : ',');
        }
        actualizarDisplay();
    } else { 
        calcEstado.memoria += n; 
        actualizarDisplay(); 
    }
};

function actualizarDisplay() {
    let visual = calcEstado.memoria || '0';
    const display = document.getElementById('calc-display');
    if (calcEstado.acumulado > 0) {
        display.innerHTML = `<span class="text-sm opacity-50 font-normal">Suma: ${calcEstado.acumulado.toLocaleString('es-ES')} +</span><br>${visual}`;
    } else {
        display.innerText = visual;
    }
}

// FUNCIONES DE EDICIÓN Y LISTADO
window.editarLinea = (id) => {
    const l = obraEnCurso.lineas.find(x => x.id === id);
    calcEstado = { 
        tipo: l.tipo, 
        paso: 1, 
        v1: l.cantidad, 
        v2: 0, 
        memoria: l.precio.toString().replace('.', ','), 
        acumulado: 0, 
        zona: l.zona, 
        tarea: l.tarea, 
        modo: 'precio', 
        totalMetros: l.cantidad, 
        editandoId: id 
    };
    abrirCalculadora();
};

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
        (subtotal > 0 ? `<div class="bg-slate-900 text-white p-6 rounded-[35px] mt-5 italic shadow-xl"><div class="flex justify-between text-[10px] opacity-60 font-black"><span>Base: ${fNum(subtotal)}€</span><span>IVA (${obraEnCurso.iva}%): ${fNum(cuotaIva)}€</span></div><div class="flex justify-between text-xl font-black text-green-400 border-t border-white/10 pt-2"><span>TOTAL:</span><span>${fNum(total)}€</span></div></div>` : '');
};

// ... (Resto de funciones de botones, clientes e IVA se mantienen iguales)
window.prepararMedida = (t) => {
    const zona = prompt("¿ZONA?", "GENERAL"); if (!zona) return;
    const tarea = (t === 'horas') ? prompt("¿CONCEPTO?", "ADMINISTRACIÓN") : prompt("¿TRABAJO?", "MONTAJE"); 
    if (!tarea) return;
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', acumulado: 0, zona: zona.toUpperCase(), tarea: tarea.toUpperCase(), modo: 'medida', editandoId: null };
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let txt = calcEstado.modo === 'precio' ? `PRECIO PARA ${calcEstado.tarea}` : (calcEstado.paso === 1 ? conf.m1 : conf.m2);
    document.getElementById('calc-titulo').innerText = txt;
    actualizarDisplay();
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.renderBotones = () => {
    const cont = document.getElementById('botones-trabajo');
    if(!cont) return;
    cont.innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `<button onclick="prepararMedida('${k}')" class="bg-white p-6 rounded-[30px] border flex flex-col items-center active-scale shadow-sm"><span class="text-3xl mb-1">${CONFIG_MEDIDAS[k].i}</span><span class="text-[9px] font-black uppercase opacity-60">${CONFIG_MEDIDAS[k].n}</span></button>`).join('');
};

window.borrarLinea = (id) => { if(confirm("¿Eliminar?")) { obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id); renderMedidas(); } };
window.guardarAjustes = () => {
    db.ajustes = { nombre: document.getElementById('config-nombre').value.toUpperCase(), cif: document.getElementById('config-cif').value.toUpperCase(), tel: document.getElementById('config-tel').value, dir: document.getElementById('config-dir').value.toUpperCase(), cp: document.getElementById('config-cp').value, ciudad: document.getElementById('config-ciudad').value.toUpperCase(), nPresu: parseInt(document.getElementById('config-nPresu').value) || 1 };
    asegurarGuardado(); alert("Guardado"); irAPantalla('clientes');
};
window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("Nombre obligatorio");
    db.clientes.push({ id: Date.now(), nombre: nom.toUpperCase(), cif: document.getElementById('cli-cif').value.toUpperCase(), tel: document.getElementById('cli-tel').value, dir: document.getElementById('cli-dir').value.toUpperCase() });
    asegurarGuardado(); irAPantalla('clientes');
};
window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if(!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 italic">SIN CLIENTES</p>' :
    db.clientes.map(c => `<div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center mb-3 active-scale"><p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p></div>`).reverse().join('');
};
window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `<div class="bg-blue-600 text-white p-7 rounded-[40px] italic shadow-lg"><h2 class="text-xl font-black uppercase mb-1">${clienteActual.nombre}</h2><p class="text-[10px] opacity-80 uppercase font-bold">${clienteActual.dir}</p></div>`;
    irAPantalla('expediente');
};
window.confirmarNombreObra = () => {
    const v = document.getElementById('input-nombre-obra').value;
    if (!v) return alert("Nombre de obra?");
    obraEnCurso = { nombre: v.toUpperCase(), lineas: [], iva: 21, fotos: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    irAPantalla('trabajo'); renderBotones(); renderMedidas();
};
window.cambiarIVA = (valor) => {
    obraEnCurso.iva = valor;
    document.querySelectorAll('.iva-btn').forEach(btn => { btn.classList.remove('bg-blue-600', 'text-white'); btn.classList.add('bg-slate-100'); });
    const b = document.getElementById(`btn-iva-${valor}`);
    if(b) { b.classList.replace('bg-slate-100', 'bg-blue-600'); b.classList.add('text-white'); }
    renderMedidas();
};
window.subirFoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { obraEnCurso.fotos.push(event.target.result); renderGaleria(); };
    reader.readAsDataURL(file);
};
function renderGaleria() {
    const cont = document.getElementById('galeria-fotos');
    cont.innerHTML = obraEnCurso.fotos.map((f, i) => `<div class="relative min-w-[80px] h-20"><img src="${f}" class="w-20 h-20 object-cover rounded-xl border"></div>`).join('');
}
window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');
window.guardarObraCompleta = async () => { db.ajustes.nPresu++; asegurarGuardado(); irAPantalla('expediente'); };
window.nuevoCliente = () => irAPantalla('nuevo-cliente');
window.onload = () => renderListaClientes();
