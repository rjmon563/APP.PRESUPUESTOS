let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '', cp: '' };
let clienteActual = null;
let medidasObra = [];
let obraFoco = 1;

// MOTOR DE CÁLCULO
function evaluarSuma(texto) {
    try {
        if (!texto) return 0;
        let preparado = texto.toString().replace(/,/g, '.').replace(/\++$/g, '');
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
    } else {
        if ((valor === '+' || valor === ',') && input.value.slice(-1) === valor) return;
        input.value += valor;
    }
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
    document.getElementById('obra-desc-horas').value = "";
    
    const esHoras = (tipo === 'HORAS');
    const esCantonera = (tipo === 'CANTONERA');
    const necesitaDos = (!esHoras && !esCantonera);

    document.getElementById('campo-2').classList.toggle('hidden', !necesitaDos);
    document.getElementById('zona-desc-horas').classList.toggle('hidden', !esHoras);
    document.getElementById('btn-obra-next').innerText = necesitaDos ? 'ALTO' : 'OK';
    
    actualizarFocoObra();
    document.getElementById('modal-calc-obra').classList.remove('hidden');

    document.getElementById('btn-obra-aceptar').onclick = () => {
        const sum1 = evaluarSuma(document.getElementById('obra-input-1').value);
        const sum2 = evaluarSuma(document.getElementById('obra-input-2').value);
        let cant = 0; let uni = "m²"; let nota = "";

        if (esHoras) {
            cant = sum1; uni = "h";
            nota = document.getElementById('obra-desc-horas').value.toUpperCase();
        } else if (esCantonera) {
            cant = sum1; uni = "ml";
        } else if (tipo === 'CAJÓN' || tipo === 'TABICA') {
            if (sum1 <= 0.60 || sum2 <= 0.60) { cant = Math.max(sum1, sum2); uni = "ml"; }
            else { cant = sum1 * sum2; uni = "m²"; }
        } else {
            cant = sum1 * sum2; 
        }

        const precio = clienteActual.tarifas[tipo] || 0;
        medidasObra.push({ tipo, cant, uni, precio, sub: cant * precio, nota });
        cerrarCalcObra();
        renderMedidas();
    };
}

// CLIENTES Y PANTALLAS
function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderClientes();
}

function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    lista.innerHTML = clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center active-scale uppercase font-black">
            ${c.nombre} <span class="text-blue-600">→</span>
        </div>`).join('');
}

function nuevoCliente() {
    const tipos = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];
    const cont = document.getElementById('tarifas-nuevo-cliente');
    cont.innerHTML = tipos.map(t => `<div class="bg-slate-100 p-4 rounded-2xl border flex flex-col items-center"><p class="text-[9px] font-black uppercase">${t}</p><input type="text" id="tarifa-${t}" class="w-full bg-transparent font-black text-center" value="0,00"></div>`).join('');
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("¡EL NOMBRE ES OBLIGATORIO!");
    
    let tfs = {};
    ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"].forEach(t => { 
        tfs[t] = evaluarSuma(document.getElementById(`tarifa-${t}`).value); 
    });

    const nuevoCli = { 
        id: Date.now(), 
        nombre: nom, 
        dir: document.getElementById('cli-dir').value.toUpperCase(),
        cp: document.getElementById('cli-cp').value,
        tel: document.getElementById('cli-tel').value, 
        email: document.getElementById('cli-email').value, 
        tarifas: tfs, 
        historial: [] 
    };

    clientes.push(nuevoCli);
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    alert("CLIENTE GUARDADO CORRECTAMENTE");
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

function renderMedidas() {
    const lista = document.getElementById('lista-medidas');
    lista.innerHTML = medidasObra.map((m, i) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm border-l-8 border-blue-600 mb-2 flex justify-between items-center">
            <div>
                <p class="font-black text-[10px] text-slate-500 uppercase">${m.tipo} ${m.nota ? '('+m.nota+')' : ''}</p>
                <p class="font-black text-blue-700">${aComa(m.cant)} ${m.uni}</p>
            </div>
            <button onclick="medidasObra.splice(${i},1); renderMedidas();" class="text-red-500 font-black p-2">✕</button>
        </div>`).join('');
    actualizarTotalFinal();
}

function actualizarTotalFinal() {
    const base = medidasObra.reduce((acc, m) => acc + m.sub, 0);
    const iva = parseFloat(document.getElementById('iva-select').value);
    const total = base * (1 + (iva / 100));
    document.getElementById('total-final-corregible').value = aComa(total);
    document.getElementById('desglose-info').innerText = `BASE: ${aComa(base)}€ | IVA: ${iva}%`;
}

function guardarPresupuesto() {
    const nuevo = { 
        id: Date.now(), 
        fecha: document.getElementById('fecha-obra').value || "HOY", 
        lugar: document.getElementById('lugar-trabajo').value.toUpperCase() || "OBRA", 
        total: document.getElementById('total-final-corregible').value 
    };
    const index = clientes.findIndex(c => c.id === clienteActual.id);
    if (!clientes[index].historial) clientes[index].historial = [];
    clientes[index].historial.push(nuevo);
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    alert("PRESUPUESTO GUARDADO");
    renderHistorial();
}

function renderHistorial() {
    const cont = document.getElementById('historial-presupuestos');
    if (!clienteActual.historial) return cont.innerHTML = "";
    cont.innerHTML = `<h3 class="text-slate-400 font-black text-xs uppercase italic mb-2">Historial</h3>` + 
    clienteActual.historial.map(p => `
        <div class="bg-slate-200 p-3 rounded-xl flex justify-between font-bold text-xs mb-1">
            <span>${p.fecha} - ${p.lugar}</span>
            <span class="text-blue-700">${p.total}€</span>
        </div>`).reverse().join('');
}

function enviar(modo) {
    const tot = document.getElementById('total-final-corregible').value;
    const msg = `PRESUPUESTO ${ajustes.nombre}. TOTAL: ${tot}€`;
    if (modo === 'ws') window.open(`https://wa.me/${clienteActual.tel}?text=${encodeURIComponent(msg)}`);
    else if (modo === 'email') window.location.href = `mailto:${clienteActual.email}?subject=PRESUPUESTO&body=${encodeURIComponent(msg)}`;
    else alert("PDF: " + tot + "€");
}

function guardarAjustes() {
    ajustes = { nombre: document.getElementById('config-nombre').value, cif: document.getElementById('config-cif').value, dir: document.getElementById('config-dir').value, cp: document.getElementById('config-cp').value };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    irAPantalla('clientes');
}

function toggleMenu() {
    document.getElementById('menu-lateral').classList.toggle('-translate-x-full');
    document.getElementById('capa-oscura').classList.toggle('hidden');
}

function cerrarCalcObra() { document.getElementById('modal-calc-obra').classList.add('hidden'); }

window.onload = () => renderClientes();
