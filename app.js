let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '', cp: '' };
let clienteActual = null;
let medidasObra = [];

function evaluarSuma(texto) {
    try {
        if (!texto) return 0;
        let preparado = texto.toString().replace(/,/g, '.');
        return Function(`'use strict'; return (${preparado})`)() || 0;
    } catch (e) { return 0; }
}

function aComa(num) { return parseFloat(num).toFixed(2).replace('.', ','); }

function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderClientes();
    if(id === 'ajustes') cargarDatosAjustes();
}

// AJUSTES EMPRESA
function cargarDatosAjustes() {
    document.getElementById('config-nombre').value = ajustes.nombre || '';
    document.getElementById('config-cif').value = ajustes.cif || '';
    document.getElementById('config-dir').value = ajustes.dir || '';
    document.getElementById('config-cp').value = ajustes.cp || '';
}

function guardarAjustes() {
    ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        dir: document.getElementById('config-dir').value.toUpperCase(),
        cp: document.getElementById('config-cp').value
    };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    irAPantalla('clientes');
}

// CLIENTES
function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    lista.innerHTML = clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center active-scale">
            <p class="font-black uppercase text-slate-700">${c.nombre}</p>
            <span class="text-blue-600 font-black">→</span>
        </div>
    `).join('');
}

function nuevoCliente() {
    const tipos = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];
    const cont = document.getElementById('tarifas-nuevo-cliente');
    cont.innerHTML = tipos.map(t => `
        <div class="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200 flex flex-col items-center shadow-sm" 
             onclick="abrirCalculadoraTarifa('tarifa-${t}')">
            <p class="text-[9px] font-black opacity-50 uppercase">${t}</p>
            <input type="text" id="tarifa-${t}" class="w-full bg-transparent font-black text-blue-700 text-center pointer-events-none" placeholder="0,00">
        </div>
    `).join('');
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("NOMBRE OBLIGATORIO");
    let tfs = {};
    ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"].forEach(t => {
        tfs[t] = evaluarSuma(document.getElementById(`tarifa-${t}`).value);
    });
    clientes.push({
        id: Date.now(), nombre: nom, cif: document.getElementById('cli-cif').value,
        cp: document.getElementById('cli-cp').value, tel: document.getElementById('cli-tel').value,
        tarifas: tfs
    });
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    irAPantalla('clientes');
}

// CALCULADORAS
function abrirCalculadoraTarifa(idInput) {
    const inputOriginal = document.getElementById(idInput);
    document.getElementById('calc-titulo').innerText = "PRECIO PACTADO";
    document.getElementById('calc-input-1').value = inputOriginal.value;
    document.getElementById('div-m2').classList.add('hidden');
    document.getElementById('modal-calculadora').classList.remove('hidden');

    document.getElementById('btn-aceptar-calc').onclick = () => {
        const res = evaluarSuma(document.getElementById('calc-input-1').value);
        inputOriginal.value = aComa(res);
        cerrarCalculadora();
    };
}

function abrirCalculadoraMedida(tipo) {
    document.getElementById('calc-titulo').innerText = tipo;
    document.getElementById('calc-input-1').value = "";
    document.getElementById('calc-input-2').value = "";
    document.getElementById('div-m2').classList.toggle('hidden', tipo === 'CANTONERA' || tipo === 'HORAS');
    document.getElementById('modal-calculadora').classList.remove('hidden');

    document.getElementById('btn-aceptar-calc').onclick = () => {
        const v1 = evaluarSuma(document.getElementById('calc-input-1').value);
        const v2 = evaluarSuma(document.getElementById('calc-input-2').value);
        let cant = (tipo === 'CANTONERA' || tipo === 'HORAS') ? v1 : ( (tipo==='CAJÓN'||tipo==='TABICA') && (v1<=0.6||v2<=0.6) ? Math.max(v1,v2) : v1*v2 );
        let uni = (tipo==='CANTONERA')?'ml':(tipo==='HORAS'?'h':((tipo==='CAJÓN'||tipo==='TABICA') && (v1<=0.6||v2<=0.6) ? 'ml' : 'm²'));

        medidasObra.push({ tipo, cant, uni, precio: clienteActual.tarifas[tipo]||0, sub: cant * (clienteActual.tarifas[tipo]||0) });
        cerrarCalculadora();
        renderMedidas();
    };
}

function renderMedidas() {
    const lista = document.getElementById('lista-medidas');
    lista.innerHTML = medidasObra.map((m, i) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border-l-8 border-blue-600 mb-2">
            <p class="font-black text-xs uppercase">${m.tipo}</p>
            <div class="text-right"><p class="font-black">${aComa(m.cant)} ${m.uni}</p></div>
            <button onclick="medidasObra.splice(${i},1); renderMedidas();" class="text-red-500 font-black p-2">✕</button>
        </div>`).join('');
    actualizarTotalFinal();
}

function actualizarTotalFinal() {
    const base = medidasObra.reduce((acc, m) => acc + m.sub, 0);
    const iva = parseFloat(document.getElementById('iva-select').value) / 100;
    const total = base * (1 + iva);
    document.getElementById('total-final-corregible').value = aComa(total);
    document.getElementById('desglose-info').innerText = `BASE: ${aComa(base)}€ | IVA: ${iva*100}%`;
}

function cerrarCalculadora() { document.getElementById('modal-calculadora').classList.add('hidden'); }
function abrirExpediente(id) { clienteActual = clientes.find(c => c.id === id); irAPantalla('trabajo'); }

window.onload = () => renderClientes();
