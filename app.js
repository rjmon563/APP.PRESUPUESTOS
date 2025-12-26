let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], ajustes: { nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '', nPresu: 1 } 
};

let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [], iva: 21, fotos: [] }; 
let calcEstado = { tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', zona: '', tarea: '', modo: 'medida', editandoId: null }; 

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', pasos: 2, m1: 'Suma de tramos', m2: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', pasos: 2, m1: 'Suma de tramos', m2: 'Altura/Fondo' },
    'tabicas': { n: 'Tabica', i: '📐', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', pasos: 1, m1: 'Metros Totales' },
    'horas': { n: 'Horas Admin', i: '🕒', pasos: 1, m1: 'Número de Horas' }
};

const fNum = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
    if (id === 'ajustes') {
        ['nombre','cif','tel','dir','cp','ciudad','nPresu'].forEach(k => {
            document.getElementById(`config-${k}`).value = db.ajustes[k] || (k === 'nPresu' ? 1 : '');
        });
    }
};

window.subirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        obraEnCurso.fotos.push(event.target.result);
        renderGaleria();
    };
    reader.readAsDataURL(file);
};

function renderGaleria() {
    const cont = document.getElementById('galeria-fotos');
    cont.innerHTML = obraEnCurso.fotos.map((f, i) => `
        <div class="relative min-w-[80px] h-20">
            <img src="${f}" class="w-20 h-20 object-cover rounded-xl border">
            <button onclick="obraEnCurso.fotos.splice(${i},1); renderGaleria();" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px]">✕</button>
        </div>`).join('');
}

window.cambiarIVA = (valor) => {
    obraEnCurso.iva = valor;
    document.querySelectorAll('.iva-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-900');
    });
    document.getElementById(`btn-iva-${valor}`).classList.replace('bg-slate-100', 'bg-blue-600');
    document.getElementById(`btn-iva-${valor}`).classList.replace('text-slate-900', 'text-white');
    renderMedidas();
};

window.guardarAjustes = () => {
    db.ajustes = { nombre: document.getElementById('config-nombre').value.toUpperCase(), cif: document.getElementById('config-cif').value.toUpperCase(), tel: document.getElementById('config-tel').value, dir: document.getElementById('config-dir').value.toUpperCase(), cp: document.getElementById('config-cp').value, ciudad: document.getElementById('config-ciudad').value.toUpperCase(), nPresu: parseInt(document.getElementById('config-nPresu').value) || 1 };
    asegurarGuardado(); alert("✅ Datos guardados"); irAPantalla('clientes');
};

window.nuevoCliente = () => {
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir'].forEach(i => document.getElementById(i).value = "");
    irAPantalla('nuevo-cliente');
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("El nombre es obligatorio");
    db.clientes.push({ id: Date.now(), nombre: nom.toUpperCase(), cif: document.getElementById('cli-cif').value.toUpperCase() || "S/N", tel: document.getElementById('cli-tel').value || "S/T", dir: document.getElementById('cli-dir').value.toUpperCase() || "S/D" });
    asegurarGuardado(); irAPantalla('clientes');
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 italic">NO HAY CLIENTES</p>' :
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center mb-3 active-scale">
            <p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p>
            <button onclick="event.stopPropagation(); if(confirm('¿Borrar cliente?')){db.clientes=db.clientes.filter(x=>x.id!==${c.id}); asegurarGuardado(); renderListaClientes();}" class="text-red-500 p-3 rounded-2xl bg-red-50">🗑️</button>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `<div class="bg-blue-600 text-white p-7 rounded-[40px] shadow-lg italic"><h2 class="text-xl font-black uppercase mb-1">${clienteActual.nombre}</h2><p class="text-[10px] opacity-80 font-bold uppercase tracking-wider">${clienteActual.dir}</p></div>`;
    irAPantalla('expediente');
};

window.confirmarNombreObra = () => {
    const v = document.getElementById('input-nombre-obra').value;
    if (!v) return alert("Indica el nombre del presupuesto");
    obraEnCurso = { nombre: v.toUpperCase(), lineas: [], iva: 21, fotos: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('galeria-fotos').innerHTML = '';
    irAPantalla('trabajo'); renderBotones(); renderMedidas();
};

function renderBotones() {
    document.getElementById('botones-trabajo').innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `
        <button onclick="prepararMedida('${k}')" class="bg-white p-6 rounded-[30px] shadow-sm border flex flex-col items-center active-scale">
            <span class="text-3xl mb-1">${CONFIG_MEDIDAS[k].i}</span>
            <span class="text-[9px] font-black uppercase opacity-60">${CONFIG_MEDIDAS[k].n}</span>
        </button>`).join('');
}

window.prepararMedida = (t) => {
    const zona = prompt("¿HABITACIÓN / ZONA?", "GENERAL"); if (!zona) return;
    const tarea = (t === 'horas') ? prompt("CONCEPTO DE LAS HORAS?", "ADMINISTRACIÓN") : prompt("¿QUÉ TRABAJO?", "MONTAJE"); 
    if (!tarea) return;
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', zona: zona.toUpperCase(), tarea: tarea.toUpperCase(), modo: 'medida', editandoId: null };
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let txt = calcEstado.modo === 'precio' ? `PRECIO PARA ${calcEstado.tarea}` : (calcEstado.paso === 1 ? conf.m1 : conf.m2);
    document.getElementById('calc-titulo').innerText = txt;
    document.getElementById('calc-display').innerText = calcEstado.memoria.replace(/\./g, ',') || '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    if (n === 'OK') {
        let cifra = 0; try { cifra = eval(calcEstado.memoria) || 0; } catch(e) { alert("Error"); return; }
        if (calcEstado.modo === 'medida') {
            const conf = CONFIG_MEDIDAS[calcEstado.tipo];
            if (calcEstado.paso < conf.pasos) { calcEstado.v1 = cifra; calcEstado.paso++; calcEstado.memoria = ''; abrirCalculadora(); }
            else { calcEstado.totalMetros = (conf.pasos === 1) ? cifra : calcEstado.v1 * cifra; calcEstado.modo = 'precio'; calcEstado.memoria = ''; abrirCalculadora(); }
        } else {
            const nuevaLinea = { id: calcEstado.editandoId || Date.now(), tipo: calcEstado.tipo, tarea: calcEstado.tarea, zona: calcEstado.zona, nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i
