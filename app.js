// --- ESTADO ---
let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { 
    nombre: '', cif: '', dir: '', cp: '', ciudad: '' 
};
let clienteActual, obraActual, medidasTemporales = [], valorCalculado = "0", tipoTrabajoActual = '';
const TIPOS_TRABAJO = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];

// --- FIRMA ---
let canvas, ctx, dibujando = false;
function inicializarFirma() {
    canvas = document.getElementById('canvas-firma');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    const getPos = (e) => {
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - canvas.getBoundingClientRect().left, y: t.clientY - canvas.getBoundingClientRect().top };
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
    if(id === 'trabajo') setTimeout(inicializarFirma, 200);
    if(id === 'nuevo-cliente') renderTarifasNuevoCliente();
    window.scrollTo(0,0);
}

// --- GESTIÓN CLIENTES ---
function renderListaClientes() {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = clientes.map(c => `
        <div onclick="verExpediente(${c.id})" class="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 mb-3 active-scale flex justify-between items-center">
            <div><p class="text-[10px] font-black opacity-30 italic">CLIENTE</p><p class="font-black uppercase">${c.nombre}</p></div>
            <div class="text-blue-600 font-bold">→</div>
        </div>
    `).join('');
}

function nuevoCliente() { irAPantalla('nuevo-cliente'); }

function renderTarifasNuevoCliente() {
    const cont = document.getElementById('tarifas-nuevo-cliente');
    cont.innerHTML = TIPOS_TRABAJO.map(t => `
        <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[8px] font-black opacity-40 mb-1">${t}</p>
            <input type="number" id="tarifa-${t}" placeholder="0.00" class="w-full bg-transparent font-black text-blue-600 outline-none">
        </div>
    `).join('');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("Nombre obligatorio");
    
    let tarifas = {};
    TIPOS_TRABAJO.forEach(t => {
        tarifas[t] = parseFloat(document.getElementById(`tarifa-${t}`).value) || 0;
    });

    clientes.push({ 
        id: Date.now(), 
        nombre: nom, 
        dir: document.getElementById('cli-dir').value.toUpperCase(), 
        tarifas: tarifas,
        obras: [] 
    });
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    renderListaClientes(); irAPantalla('clientes');
}

function verExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    irAPantalla('expediente');
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-700 p-8 rounded-[40px] text-white shadow-xl">
            <h2 class="text-3xl font-black italic uppercase">${clienteActual.nombre}</h2>
            <p class="opacity-70 text-sm font-bold">${clienteActual.dir || 'SIN DIRECCIÓN'}</p>
        </div>`;
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
    if(!tipo) return;
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
        if(!isNaN(num) && num > 0){
            let u = 'm²';
            if((tipoTrabajoActual==='CAJÓN'||tipoTrabajoActual==='TABICA') && num <= 0.60) u = 'ml';
            else if(tipoTrabajoActual==='CANTONERA') u = 'ml';
            else if(tipoTrabajoActual==='HORAS') u = 'h';
            
            medidasTemporales.push({
                nombre: tipoTrabajoActual,
                cantidad: num,
                unidad: u,
                fecha: document.getElementById('fecha-trabajo-actual').value.split('-').reverse().join('/'),
                precio: clienteActual.tarifas[tipoTrabajoActual] || 0
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
        <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center mb-2">
            <div><p class="text-[9px] font-black text-blue-500 uppercase">${m.fecha}</p><p class="font-black text-sm uppercase">${m.nombre}</p></div>
            <div class="text-right"><p class="text-xl font-black">${m.cantidad.toString().replace('.', ',')}</p><p class="text-[9px] font-bold opacity-30">${m.unidad} x ${m.precio}€</p></div>
        </div>`).join('');
}

// --- AJUSTES ---
function guardarAjustes() {
    ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        dir: document.getElementById('config-dir').value.toUpperCase(),
        cp: document.getElementById('config-cp').value,
        ciudad: document.getElementById('config-ciudad').value.toUpperCase()
    };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    alert("DATOS EMPRESA GUARDADOS"); irAPantalla('clientes');
}

function guardarObraCompleta() {
    obraActual.medidas = [...medidasTemporales];
    clienteActual.obras.push(obraActual);
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    alert("TRABAJO GUARDADO. (Aquí se dispararía el PDF)");
    irAPantalla('clientes');
}

window.onload = () => {
    renderListaClientes();
    document.getElementById('config-nombre').value = ajustes.nombre;
    document.getElementById('config-cif').value = ajustes.cif;
    document.getElementById('config-dir').value = ajustes.dir;
    document.getElementById('config-cp').value = ajustes.cp;
    document.getElementById('config-ciudad').value = ajustes.ciudad;
    document.getElementById('fecha-trabajo-actual').valueAsDate = new Date();
};
