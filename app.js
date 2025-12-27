let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '', cp: '' };
let clienteActual = null;
let medidasObra = [];
let obraFoco = 1;

// MOTOR DE CÁLCULO (Sumas y Comas)
function evaluarSuma(texto) {
    try {
        if (!texto) return 0;
        let preparado = texto.toString().replace(/,/g, '.');
        return Function(`'use strict'; return (${preparado})`)() || 0;
    } catch (e) { return 0; }
}

function aComa(num) { return parseFloat(num).toFixed(2).replace('.', ','); }

// CALCULADORA DE OBRA
function tecladoObra(valor) {
    let input = document.getElementById(`obra-input-${obraFoco}`);
    if (valor === 'C') input.value = "";
    else if (valor === 'DEL') input.value = input.value.slice(0, -1);
    else if (valor === 'NEXT') {
        if (obraFoco === 1 && !document.getElementById('campo-2').classList.contains('hidden')) {
            obraFoco = 2;
            actualizarFocoObra();
        }
    } else { input.value += valor; }
}

function actualizarFocoObra() {
    document.getElementById('obra-input-1').style.borderColor = (obraFoco === 1) ? '#3b82f6' : '#334155';
    document.getElementById('obra-input-2').style.borderColor = (obraFoco === 2) ? '#3b82f6' : '#334155';
}

function abrirCalculadoraObra(tipo) {
    obraFoco = 1;
    document.getElementById('obra-calc-titulo').innerText = tipo;
    document.getElementById('obra-input-1').value = "";
    document.getElementById('obra-input-2').value = "";
    const necesitaDos = !(tipo === 'CANTONERA' || tipo === 'HORAS');
    document.getElementById('campo-2').classList.toggle('hidden', !necesitaDos);
    document.getElementById('btn-obra-next').innerText = necesitaDos ? 'ALTO' : 'OK';
    actualizarFocoObra();
    document.getElementById('modal-calc-obra').classList.remove('hidden');

    document.getElementById('btn-obra-aceptar').onclick = () => {
        const sum1 = evaluarSuma(document.getElementById('obra-input-1').value);
        const sum2 = evaluarSuma(document.getElementById('obra-input-2').value);
        let cant = 0; let uni = "m²";

        if (tipo === 'CANTONERA' || tipo === 'HORAS') {
            cant = sum1; uni = (tipo === 'CANTONERA') ? 'ml' : 'h';
        } else if (tipo === 'CAJÓN' || tipo === 'TABICA') {
            if (sum1 <= 0.60 || sum2 <= 0.60) { cant = Math.max(sum1, sum2); uni = "ml"; }
            else { cant = sum1 * sum2; uni = "m²"; }
        } else { cant = sum1 * sum2; }

        const precio = clienteActual.tarifas[tipo] || 0;
        medidasObra.push({ tipo, cant, uni, precio, sub: cant * precio });
        cerrarCalcObra();
        renderMedidas();
    };
}

function cerrarCalcObra() { document.getElementById('modal-calc-obra').classList.add('hidden'); }

// CLIENTES Y PANTALLAS
function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderClientes();
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
    cont.innerHTML = tipos.map(t => `<div class="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200 flex flex-col items-center"><p class="text-[9px] font-black opacity-50 uppercase">${t}</p><input type="text" id="tarifa-${t}" class="w-full bg-transparent font-black text-blue-700 text-center" placeholder="0,00"></div>`).join('');
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("NOMBRE OBLIGATORIO");
    let tfs = {};
    ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"].forEach(t => { tfs[t] = evaluarSuma(document.getElementById(`tarifa-${t}`).value); });
    clientes.push({ id: Date.now(), nombre: nom, cif: document.getElementById('cli-cif').value, dir: document.getElementById('cli-dir').value.toUpperCase(), cp: document.getElementById('cli-cp').value, tel: document.getElementById('cli-tel').value, email: document.getElementById('cli-email').value, tarifas: tfs, historial: [] });
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    irAPantalla('clientes');
}

function abrirExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    document.getElementById('titulo-obra').innerText = clienteActual.nombre;
    medidasObra = [];
    document.getElementById('lugar-trabajo').value = "";
    renderMedidas();
    renderHistorial();
    irAPantalla('trabajo');
}

// RENDER MEDIDAS Y TOTAL
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

// GUARDAR PRESUPUESTO EN HISTORIAL
function guardarPresupuesto() {
    if (!clienteActual) return;
    const nuevoPresu = {
        id: Date.now(),
        fecha: document.getElementById('fecha-obra').value || new Date().toLocaleDateString(),
        lugar: document.getElementById('lugar-trabajo').value.toUpperCase() || "SIN NOMBRE",
        total: document.getElementById('total-final-corregible').value
    };
    const index = clientes.findIndex(c => c.id === clienteActual.id);
    if (!clientes[index].historial) clientes[index].historial = [];
    clientes[index].historial.push(nuevoPresu);
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    alert("PRESUPUESTO GUARDADO");
    renderHistorial();
}

function renderHistorial() {
    const contenedor = document.getElementById('historial-presupuestos');
    if (!clienteActual.historial || clienteActual.historial.length === 0) {
        contenedor.innerHTML = `<p class="text-slate-300 text-[10px] italic">No hay presupuestos previos.</p>`;
        return;
    }
    contenedor.innerHTML = clienteActual.historial.map(p => `
        <div class="bg-slate-100 p-3 rounded-xl flex justify-between items-center border-l-4 border-yellow-500 mb-2">
            <div><p class="text-[10px] font-black text-slate-400">${p.fecha}</p><p class="font-bold text-slate-700 text-xs">${p.lugar}</p></div>
            <p class="font-black text-blue-700">${p.total}€</p>
        </div>`).reverse().join('');
}

// ENVÍOS
function enviar(modo) {
    const lug = document.getElementById('lugar-trabajo').value.toUpperCase() || "OBRA";
    const tot = document.getElementById('total-final-corregible').value;
    let detalle = medidasObra.map(m => `- ${m.tipo}: ${aComa(m.cant)} ${m.uni} = ${aComa(m.sub)}€`).join('\n');
    const msg = `Presupuesto de ${ajustes.nombre} para ${clienteActual.nombre}.\nObra: ${lug}\n\nDetalle:\n${detalle}\n\nTOTAL: ${tot}€`;
    
    if (modo === 'ws') window.open(`https://wa.me/${clienteActual.tel}?text=${encodeURIComponent(msg)}`);
    else if (modo === 'email') window.location.href = `mailto:${clienteActual.email}?subject=PRESUPUESTO&body=${encodeURIComponent(msg)}`;
    else alert("PDF GENERADO POR: " + tot + "€");
}

function guardarAjustes() {
    ajustes = { nombre: document.getElementById('config-nombre').value.toUpperCase(), cif: document.getElementById('config-cif').value.toUpperCase(), dir: document.getElementById('config-dir').value.toUpperCase(), cp: document.getElementById('config-cp').value };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    irAPantalla('clientes');
}

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('-translate-x-full');
    document.getElementById('capa-oscura').classList.toggle('hidden');
}

window.onload = () => renderClientes();
