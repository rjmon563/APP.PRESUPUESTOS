let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '', cp: '' };
let clienteActual = null;
let medidasObra = [];
let focoActual = 1;

// MOTOR DE CÁLCULO INTELIGENTE (Suma cadenas con comas)
function evaluarSuma(texto) {
    try {
        if (!texto) return 0;
        // 1. Reemplazamos comas por puntos
        let preparado = texto.toString().replace(/,/g, '.');
        // 2. Evaluamos la cadena (ej: 1+2.3+8)
        let resultado = Function(`'use strict'; return (${preparado})`)() || 0;
        return resultado;
    } catch (e) { 
        return 0; 
    }
}

function aComa(num) { return parseFloat(num).toFixed(2).replace('.', ','); }

// TECLADO
function teclado(valor) {
    let id = (focoActual === 1) ? 'calc-input-1' : 'calc-input-2';
    let input = document.getElementById(id);
    if (valor === 'C') input.value = "";
    else if (valor === 'DEL') input.value = input.value.slice(0, -1);
    else input.value += valor;
}

function cambiarFoco() {
    focoActual = (focoActual === 1) ? 2 : 1;
    document.getElementById('calc-input-1').style.borderColor = (focoActual === 1) ? '#3b82f6' : '#334155';
    document.getElementById('calc-input-2').style.borderColor = (focoActual === 2) ? '#3b82f6' : '#334155';
}

function abrirCalculadoraTarifa(idInput, nombre) {
    focoActual = 1;
    document.getElementById('calc-titulo').innerText = "PRECIO: " + nombre;
    document.getElementById('calc-input-1').value = "";
    document.getElementById('div-m2').classList.add('hidden');
    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('modal-calculadora').classList.remove('hidden');
    document.getElementById('btn-aceptar-calc').onclick = () => {
        const val = evaluarSuma(document.getElementById('calc-input-1').value);
        document.getElementById(idInput).value = aComa(val);
        cerrarCalculadora();
    };
}

function abrirCalculadoraMedida(tipo) {
    focoActual = 1;
    document.getElementById('calc-titulo').innerText = tipo;
    document.getElementById('calc-input-1').value = "";
    document.getElementById('calc-input-2').value = "";
    const necesitaDos = !(tipo === 'CANTONERA' || tipo === 'HORAS');
    document.getElementById('div-m2').classList.toggle('hidden', !necesitaDos);
    document.getElementById('btn-next').classList.toggle('hidden', !necesitaDos);
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

// RESTO DE FUNCIONES (CLIENTES, AJUSTES, ENVÍO...)
function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderClientes();
}

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('-translate-x-full');
    document.getElementById('capa-oscura').classList.toggle('hidden');
}

function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    lista.innerHTML = clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center active-scale">
            <p class="font-black uppercase text-slate-700">${c.nombre}</p>
            <span class="text-blue-600 font-black">→</span>
        </div>`).join('');
}

function nuevoCliente() {
    const tipos = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];
    const cont = document.getElementById('tarifas-nuevo-cliente');
    cont.innerHTML = tipos.map(t => `<div class="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200 flex flex-col items-center" onclick="abrirCalculadoraTarifa('tarifa-${t}', '${t}')"><p class="text-[9px] font-black opacity-50 uppercase">${t}</p><input type="text" id="tarifa-${t}" class="w-full bg-transparent font-black text-blue-700 text-center pointer-events-none" value="0,00"></div>`).join('');
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("NOMBRE OBLIGATORIO");
    let tfs = {};
    ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"].forEach(t => {
        tfs[t] = evaluarSuma(document.getElementById(`tarifa-${t}`).value);
    });
    clientes.push({ id: Date.now(), nombre: nom, cif: document.getElementById('cli-cif').value, dir: document.getElementById('cli-dir').value.toUpperCase(), cp: document.getElementById('cli-cp').value, tel: document.getElementById('cli-tel').value, tarifas: tfs });
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    irAPantalla('clientes');
}

function abrirExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    document.getElementById('titulo-obra').innerText = clienteActual.nombre;
    medidasObra = [];
    renderMedidas();
    irAPantalla('trabajo');
}

function renderMedidas() {
    const lista = document.getElementById('lista-medidas');
    lista.innerHTML = medidasObra.map((m, i) => `<div class="bg-white p-4 rounded-2xl shadow-sm border-l-8 border-blue-600 mb-2 flex justify-between items-center"><p class="font-black text-[10px] text-slate-500 uppercase">${m.tipo}</p><div class="text-right"><p class="font-black">${aComa(m.cant)} ${m.uni}</p><p class="text-[9px] opacity-30">${aComa(m.sub)}€</p></div><button onclick="medidasObra.splice(${i},1); renderMedidas();" class="text-red-500 font-black p-2">✕</button></div>`).join('');
    actualizarTotalFinal();
}

function actualizarTotalFinal() {
    const base = medidasObra.reduce((acc, m) => acc + m.sub, 0);
    const iva = parseFloat(document.getElementById('iva-select').value);
    const total = base * (1 + (iva / 100));
    document.getElementById('total-final-corregible').value = aComa(total);
    document.getElementById('desglose-info').innerText = `BASE: ${aComa(base)}€ | IVA: ${iva}%`;
}

function cerrarCalculadora() { document.getElementById('modal-calculadora').classList.add('hidden'); }

function guardarAjustes() {
    ajustes = { nombre: document.getElementById('config-nombre').value.toUpperCase(), cif: document.getElementById('config-cif').value.toUpperCase(), dir: document.getElementById('config-dir').value.toUpperCase(), cp: document.getElementById('config-cp').value };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    irAPantalla('clientes');
}

function enviar(modo) {
    const lug = document.getElementById('lugar-trabajo').value.toUpperCase();
    const tot = document.getElementById('total-final-corregible').value;
    const msg = `Presupuesto de ${ajustes.nombre} para ${clienteActual.nombre}. Obra: ${lug}. Total: ${tot}€.`;
    if(modo === 'ws') window.open(`https://wa.me/${clienteActual.tel}?text=${encodeURIComponent(msg)}`);
    else alert("ENVIANDO: " + tot + "€");
}

window.onload = () => renderClientes();
