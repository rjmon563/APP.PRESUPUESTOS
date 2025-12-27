let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let clienteActual = null;
let medidasObra = [];
let tipoSeleccionado = "";

// Función que entiende comas y suma: 5,5 + 2,5 = 8
function evaluarSuma(texto) {
    try {
        if (!texto) return 0;
        // Cambiamos todas las comas por puntos para que JavaScript pueda calcular
        let preparado = texto.replace(/,/g, '.');
        return Function(`'use strict'; return (${preparado})`)() || 0;
    } catch (e) { return 0; }
}

// Función para mostrar números con coma al usuario: 10.50 -> "10,50"
function aComa(num) {
    return num.toFixed(2).replace('.', ',');
}

function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderClientes();
}

function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    lista.innerHTML = clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center">
            <p class="font-black uppercase">${c.nombre}</p>
            <span class="text-blue-600 font-black">→</span>
        </div>
    `).join('');
}

function abrirExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    document.getElementById('titulo-obra').innerText = "NUEVA MEDICIÓN";
    medidasObra = [];
    document.getElementById('fecha-obra').valueAsDate = new Date();
    renderMedidas();
    irAPantalla('trabajo');
}

function abrirCalculadora(tipo) {
    tipoSeleccionado = tipo;
    document.getElementById('calc-titulo').innerText = tipo;
    document.getElementById('calc-input-1').value = "";
    document.getElementById('calc-input-2').value = "";
    document.getElementById('div-m2').classList.toggle('hidden', tipo === 'CANTONERA' || tipo === 'HORAS');
    document.getElementById('modal-calculadora').classList.remove('hidden');
}

function procesarCalculo() {
    const v1 = evaluarSuma(document.getElementById('calc-input-1').value);
    const v2 = evaluarSuma(document.getElementById('calc-input-2').value);
    let cant = 0; let uni = "m²";

    if (tipoSeleccionado === 'CANTONERA') { cant = v1; uni = "ml"; }
    else if (tipoSeleccionado === 'HORAS') { cant = v1; uni = "h"; }
    else if (tipoSeleccionado === 'CAJÓN' || tipoSeleccionado === 'TABICA') {
        if (v1 <= 0.60 || v2 <= 0.60) {
            cant = (v1 > v2) ? v1 : v2; uni = "ml";
        } else { cant = v1 * v2; }
    } else { cant = v1 * v2; }

    const precio = clienteActual.tarifas[tipoSeleccionado] || 0;
    medidasObra.push({ tipo: tipoSeleccionado, cant, uni, precio, sub: cant * precio });
    cerrarCalculadora();
    renderMedidas();
}

function renderMedidas() {
    const lista = document.getElementById('lista-medidas');
    lista.innerHTML = medidasObra.map((m, i) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border-l-8 border-blue-600">
            <p class="font-black text-xs uppercase">${m.tipo}</p>
            <div class="text-right">
                <p class="font-black text-lg">${aComa(m.cant)} ${m.uni}</p>
                <p class="text-[10px] font-bold opacity-30">${aComa(m.sub)}€</p>
            </div>
            <button onclick="medidasObra.splice(${i},1); renderMedidas();" class="ml-4 text-red-500 font-black">✕</button>
        </div>
    `).join('');
    actualizarTotalFinal();
}

function actualizarTotalFinal() {
    const base = medidasObra.reduce((acc, m) => acc + m.sub, 0);
    const ivaPorc = parseFloat(document.getElementById('iva-select').value);
    const total = base * (1 + (ivaPorc / 100));
    
    // Mostramos el total en el EDITOR con coma
    document.getElementById('total-final-corregible').value = aComa(total);
    document.getElementById('desglose-info').innerText = `BASE: ${aComa(base)}€ | IVA: ${ivaPorc}%`;
}

function cerrarCalculadora() { document.getElementById('modal-calculadora').classList.add('hidden'); }

function enviar(modo) {
    // IMPORTANTE: Cogemos el valor del EDITOR tal cual lo hayas dejado (con comas o como sea)
    const totalFinal = document.getElementById('total-final-corregible').value;
    const msg = `Presupuesto para ${clienteActual.nombre}: ${totalFinal}€. Saludos.`;
    
    if(modo === 'ws') window.open(`https://wa.me/${clienteActual.tel}?text=${encodeURIComponent(msg)}`);
    else if(modo === 'email') window.location.href = `mailto:${clienteActual.email}?subject=Presupuesto&body=${encodeURIComponent(msg)}`;
    else alert("Generando PDF con total: " + totalFinal + "€");
}
