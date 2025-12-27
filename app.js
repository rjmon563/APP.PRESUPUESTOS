// --- ESTADO ---
let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { 
    nombre: '', cif: '', tarifas: { "TABIQUE": 0, "TECHO": 0, "CAJÓN": 0, "TABICA": 0, "CANTONERA": 0, "HORAS": 0 }
};
let clienteActual, obraActual, medidasTemporales = [], valorCalculado = "0", tipoTrabajoActual = '';

// --- FIRMA DIGITAL ---
let canvas, ctx, dibujando = false;

function inicializarFirma() {
    canvas = document.getElementById('canvas-firma');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;

    const getPos = (e) => {
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - canvas.getBoundingClientRect().left, y: t.clientY - canvas.getBoundingClientRect().top };
    };

    const start = (e) => { dibujando = true; ctx.beginPath(); const {x,y} = getPos(e); ctx.moveTo(x,y); };
    const move = (e) => { if(!dibujando) return; e.preventDefault(); const {x,y} = getPos(e); ctx.lineTo(x,y); ctx.stroke(); };
    const stop = () => { dibujando = false; };

    canvas.addEventListener('mousedown', start); canvas.addEventListener('touchstart', start);
    canvas.addEventListener('mousemove', move); canvas.addEventListener('touchmove', move);
    window.addEventListener('mouseup', stop); window.addEventListener('touchend', stop);
}

function limpiarFirma() { if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }

// --- NAVEGACIÓN ---
function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'trabajo') setTimeout(inicializarFirma, 200);
    window.scrollTo(0, 0);
}

// --- CLIENTES ---
function renderListaClientes() {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = clientes.map(c => `
        <div onclick="verExpediente(${c.id})" class="bg-white p-5 rounded-[30px] shadow-sm flex justify-between items-center border border-slate-100 mb-3 active-scale">
            <div><p class="text-[10px] font-black opacity-30 italic">EXPEDIENTE</p><p class="font-black uppercase">${c.nombre}</p></div>
            <div class="text-blue-600 font-bold">→</div>
        </div>
    `).join('');
}

function nuevoCliente() { irAPantalla('nuevo-cliente'); }

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return;
    clientes.push({ id: Date.now(), nombre: nom, cif: document.getElementById('cli-cif').value, tel: document.getElementById('cli-tel').value, dir: document.getElementById('cli-dir').value, obras: [] });
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    renderListaClientes(); irAPantalla('clientes');
}

function verExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    irAPantalla('expediente');
    document.getElementById('ficha-cliente-detalle').innerHTML = `<div class="bg-blue-700 p-8 rounded-[40px] text-white shadow-xl"><h2 class="text-3xl font-black italic uppercase">${clienteActual.nombre}</h2><p class="opacity-70 text-sm font-bold">${clienteActual.dir || ''}</p></div>`;
}

// --- MEDICIÓN ---
function confirmarNombreObra() {
    const nom = document.getElementById('input-nombre-obra').value;
    if(!nom) return;
    obraActual = { id: Date.now(), nombre: nom.toUpperCase(), fecha: new Date().toLocaleDateString(), medidas: [] };
    medidasTemporales = [];
    document.getElementById('titulo-obra-actual').innerText = obraActual.nombre;
    irAPantalla('trabajo'); renderMedidas();
}

function prepararMedida(tipo) {
    tipoTrabajoActual = tipo; valorCalculado = "0";
    document.getElementById('calc-titulo').innerText = tipo;
    document.getElementById('calc-display').innerText = "0";
    document.getElementById('modal-calc').classList.remove('hidden');
}

function teclear(n) {
    const d = document.getElementById('calc-display');
    if(n==='DEL') valorCalculado = "0";
    else if(n==='OK') {
        let num = parseFloat(valorCalculado);
        if(!isNaN(num)){
            let u = 'm²';
            if((tipoTrabajoActual==='CAJÓN'||tipoTrabajoActual==='TABICA') && num <= 0.60) u = 'ml';
            else if(tipoTrabajoActual==='CANTONERA') u = 'ml';
            else if(tipoTrabajoActual==='HORAS') u = 'h';
            
            medidasTemporales.push({
                nombre: tipoTrabajoActual,
                cantidad: num,
                unidad: u,
                fecha: document.getElementById('fecha-trabajo-actual').value.split('-').reverse().join('/'),
                precio: ajustes.tarifas[tipoTrabajoActual] || 0
            });
        }
        cerrarCalc(); renderMedidas();
    } else {
        if(valorCalculado === "0" && n !== '.') valorCalculado = n;
        else valorCalculado += n;
    }
    d.innerText = valorCalculado.replace('.', ',');
}

function cerrarCalc() { document.getElementById('modal-calc').classList.add('hidden'); }

function renderMedidas() {
    document.getElementById('lista-medidas-obra').innerHTML = medidasTemporales.map(m => `
        <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
            <div><p class="text-[9px] font-black text-blue-500 uppercase">${m.fecha}</p><p class="font-black text-sm uppercase">${m.nombre}</p></div>
            <div class="text-right"><p class="text-xl font-black">${m.cantidad.toString().replace('.', ',')}</p><p class="text-[9px] font-bold opacity-30">${m.unidad} x ${m.precio}€</p></div>
        </div>
    `).join('');
}

// --- TARIFAS Y AJUSTES ---
function renderTarifas() {
    document.getElementById('lista-tarifas-config').innerHTML = Object.keys(ajustes.tarifas).map(t => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
            <span class="text-[10px] font-black opacity-50 uppercase">${t}</span>
            <input type="number" step="0.01" value="${ajustes.tarifas[t]}" onchange="ajustes.tarifas['${t}']=parseFloat(this.value)" class="w-20 p-2 bg-slate-100 rounded-lg text-right font-black text-blue-600 outline-none">
        </div>
    `).join('');
}

function guardarAjustes() {
    ajustes.nombre = document.getElementById('config-nombre').value.toUpperCase();
    ajustes.cif = document.getElementById('config-cif').value.toUpperCase();
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    alert("AJUSTES GUARDADOS"); irAPantalla('clientes');
}

function guardarObraCompleta() {
    obraActual.medidas = [...medidasTemporales];
    clienteActual.obras.push(obraActual);
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    alert("TRABAJO GUARDADO"); irAPantalla('clientes');
}

window.onload = () => {
    renderListaClientes(); renderTarifas();
    document.getElementById('config-nombre').value = ajustes.nombre;
    document.getElementById('config-cif').value = ajustes.cif;
    document.getElementById('fecha-trabajo-actual').valueAsDate = new Date();
};
