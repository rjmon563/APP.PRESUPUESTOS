// --- ESTADO INICIAL ---
let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '', cp: '', ciudad: '' };
let clienteActual = null;
let obraActual = null;
let medidasTemporales = [];
const TIPOS = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];

// --- FIRMA DIGITAL ---
let canvas, ctx, dibujando = false;
function inicializarFirma() {
    canvas = document.getElementById('canvas-firma');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
    const getPos = (e) => {
        const t = e.touches ? e.touches[0] : e;
        const r = canvas.getBoundingClientRect();
        return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    canvas.onmousedown = canvas.ontouchstart = (e) => { dibujando = true; ctx.beginPath(); const p=getPos(e); ctx.moveTo(p.x,p.y); };
    canvas.onmousemove = canvas.ontouchmove = (e) => { if(!dibujando) return; e.preventDefault(); const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
    window.onmouseup = window.ontouchend = () => { dibujando = false; };
}
function limpiarFirma() { if(ctx) ctx.clearRect(0,0,canvas.width,canvas.height); }

// --- NAVEGACIÓN ---
function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'trabajo') setTimeout(inicializarFirma, 300);
    if(id === 'clientes') renderListaClientes();
    window.scrollTo(0,0);
}

// --- GESTIÓN DE CLIENTES ---
function renderListaClientes() {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = clientes.map(c => `
        <div onclick="verExpediente(${c.id})" class="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 mb-3 active-scale flex justify-between items-center">
            <div><p class="text-[10px] font-black opacity-30 italic">EXPEDIENTE</p><p class="font-black uppercase">${c.nombre}</p></div>
            <div class="text-blue-600 font-bold">→</div>
        </div>
    `).join('');
}

function nuevoCliente() {
    const cont = document.getElementById('tarifas-nuevo-cliente');
    cont.innerHTML = TIPOS.map(t => `
        <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[8px] font-black opacity-40 mb-1">${t}</p>
            <input type="number" id="tarifa-${t}" step="0.01" class="w-full bg-transparent font-black text-blue-600 outline-none" placeholder="0.00">
        </div>
    `).join('');
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("El nombre es obligatorio");
    let tfs = {};
    TIPOS.forEach(t => tfs[t] = parseFloat(document.getElementById(`tarifa-${t}`).value) || 0);
    clientes.push({
        id: Date.now(), nombre: nom, cif: document.getElementById('cli-cif').value.toUpperCase(),
        tel: document.getElementById('cli-tel').value, dir: document.getElementById('cli-dir').value.toUpperCase(),
        cp: document.getElementById('cli-cp').value, ciudad: document.getElementById('cli-ciudad').value.toUpperCase(),
        tarifas: tfs, obras: []
    });
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    irAPantalla('clientes');
}

function verExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    irAPantalla('expediente');
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-700 p-8 rounded-[40px] text-white shadow-xl">
            <h2 class="text-2xl font-black italic uppercase leading-none">${clienteActual.nombre}</h2>
            <p class="opacity-70 text-[10px] font-bold mt-2 uppercase tracking-wider">${clienteActual.dir} | ${clienteActual.cif} | CP: ${clienteActual.cp}</p>
        </div>`;
    renderHistorialObras();
}

function renderHistorialObras() {
    const cont = document.getElementById('historial-obras');
    if(clienteActual.obras.length === 0) {
        cont.innerHTML = '<p class="text-center py-4 opacity-30 font-bold text-xs">SIN PRESUPUESTOS PREVIOS</p>';
        return;
    }
    cont.innerHTML = clienteActual.obras.map(o => `
        <div onclick="recuperarObra(${o.id})" class="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100 active-scale">
            <div><p class="font-black text-sm uppercase">${o.nombre}</p><p class="text-[9px] opacity-40 font-black uppercase">${o.fecha}</p></div>
            <p class="font-black text-blue-600 text-lg">${parseFloat(o.totalFinal).toFixed(2)}€</p>
        </div>
    `).join('');
}

// --- CALCULADORA LARGO X ALTO ---
let tipoEnEdicion = '';
function abrirCalculadoraCali(tipo) {
    if(!tipo) return;
    tipoEnEdicion = tipo;
    document.getElementById('calc-pro-titulo').innerText = tipo;
    document.getElementById('calc-val-1').value = '';
    document.getElementById('calc-val-2').value = '';
    // Esconder Alto si es Cantonera o Horas
    const soloUno = (tipo === 'CANTONERA' || tipo === 'HORAS');
    document.getElementById('contenedor-paso-2').classList.toggle('hidden', soloUno);
    document.getElementById('label-paso-1').innerText = (tipo === 'HORAS') ? 'HORAS TRABAJADAS' : 'LARGO (m)';
    document.getElementById('modal-calculadora-pro').classList.remove('hidden');
}

function cerrarCalcPro() { document.getElementById('modal-calculadora-pro').classList.add('hidden'); }

function confirmarCalculoPro() {
    const v1 = parseFloat(document.getElementById('calc-val-1').value) || 0;
    const v2 = parseFloat(document.getElementById('calc-val-2').value) || 0;
    if(v1 <= 0) return;

    let cantidad = (tipoEnEdicion === 'CANTONERA' || tipoEnEdicion === 'HORAS') ? v1 : v1 * v2;
    let unidad = 'm²';
    
    // REGLA 0,60 EXCLUSIVA PARA CAJONES Y TABICAS
    if((tipoEnEdicion === 'CAJÓN' || tipoEnEdicion === 'TABICA')) {
        if(v1 <= 0.60 || v2 <= 0.60) {
            unidad = 'ml';
            cantidad = (v1 <= 0.60) ? v2 : v1; // El lado mayor se cobra como lineal
        }
    } else if(tipoEnEdicion === 'CANTONERA') unidad = 'ml';
    else if(tipoEnEdicion === 'HORAS') unidad = 'h';

    medidasTemporales.push({
        nombre: tipoEnEdicion, cant: cantidad, uni: unidad, 
        fecha: document.getElementById('fecha-trabajo-actual').value.split('-').reverse().join('/'),
        precio: clienteActual.tarifas[tipoEnEdicion] || 0,
        sub: cantidad * (clienteActual.tarifas[tipoEnEdicion] || 0)
    });
    
    cerrarCalcPro(); renderMedidas();
}

function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    cont.innerHTML = medidasTemporales.map((m, i) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center mb-2">
            <div><p class="text-[9px] font-black text-blue-500">${m.fecha}</p><p class="font-black text-sm uppercase">${m.nombre}</p></div>
            <div class="flex items-center gap-4">
                <div class="text-right"><p class="text-lg font-black">${m.cant.toFixed(2)} ${m.uni}</p><p class="text-[9px] font-bold opacity-30">${m.sub.toFixed(2)}€</p></div>
                <button onclick="eliminarMedida(${i})" class="text-red-400 p-2 font-black">✕</button>
            </div>
        </div>`).join('');
    actualizarTotalFinal();
}

function eliminarMedida(i) { medidasTemporales.splice(i, 1); renderMedidas(); }

function actualizarTotalFinal() {
    const t = medidasTemporales.reduce((acc, m) => acc + m.sub, 0);
    document.getElementById('total-presupuesto-editable').value = t.toFixed(2);
}

// --- GUARDAR Y RECUPERAR ---
function confirmarNombreObra() {
    const nom = document.getElementById('input-nombre-obra').value.toUpperCase();
    if(!nom) return;
    obraActual = { id: Date.now(), nombre: nom, fecha: new Date().toLocaleDateString('es-ES'), medidas: [], totalFinal: 0 };
    medidasTemporales = [];
    document.getElementById('titulo-obra-actual').innerText = nom;
    document.getElementById('fecha-trabajo-actual').valueAsDate = new Date();
    irAPantalla('trabajo'); renderMedidas();
}

function recuperarObra(id) {
    const obra = clienteActual.obras.find(o => o.id === id);
    obraActual = obra;
    medidasTemporales = [...obra.medidas];
    document.getElementById('titulo-obra-actual').innerText = obra.nombre;
    irAPantalla('trabajo');
    renderMedidas();
    document.getElementById('total-presupuesto-editable').value = obra.totalFinal;
}

function guardarObraCompleta(modo) {
    const totalEditable = document.getElementById('total-presupuesto-editable').value;
    obraActual.medidas = [...medidasTemporales];
    obraActual.totalFinal = totalEditable;
    
    const idx = clienteActual.obras.findIndex(o => o.id === obraActual.id);
    if(idx !== -1) clienteActual.obras[idx] = obraActual;
    else clienteActual.obras.push(obraActual);
    
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));

    if(modo === 'ws') {
        const msg = `Presupuesto ${obraActual.nombre} de Antonio: ${totalEditable}€. Un saludo.`;
        window.open(`https://wa.me/${clienteActual.tel}?text=${encodeURIComponent(msg)}`);
    } else {
        alert("¡TRABAJO GUARDADO CORRECTAMENTE EN EL EXPEDIENTE!");
        irAPantalla('clientes');
    }
}

// --- CONFIGURACIÓN EMPRESA ---
function guardarAjustes() {
    ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        dir: document.getElementById('config-dir').value.toUpperCase(),
        cp: document.getElementById('config-cp').value,
        ciudad: document.getElementById('config-ciudad').value.toUpperCase()
    };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    alert("DATOS DE TU EMPRESA GUARDADOS");
    irAPantalla('clientes');
}

window.onload = () => {
    renderListaClientes();
    document.getElementById('config-nombre').value = ajustes.nombre;
    document.getElementById('config-cif').value = ajustes.cif;
    document.getElementById('config-dir').value = ajustes.dir;
    document.getElementById('config-cp').value = ajustes.cp;
    document.getElementById('config-ciudad').value = ajustes.ciudad;
};
