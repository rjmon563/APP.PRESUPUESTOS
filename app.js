// --- 1. DATOS Y VARIABLES GLOBALES ---
let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '', cp: '', ciudad: '' };
let clienteActual = null;
let medidasObra = [];
let tipoSeleccionado = "";

// --- 2. MOTOR DE CÁLCULO (SUMAS Y COMAS) ---
function evaluarSuma(texto) {
    try {
        if (!texto) return 0;
        // Cambiamos comas por puntos para que el sistema pueda sumar
        let preparado = texto.toString().replace(/,/g, '.');
        // Sumamos todos los números (ej: 5.5+2+3)
        return Function(`'use strict'; return (${preparado})`)() || 0;
    } catch (e) {
        return 0;
    }
}

// Para mostrar en pantalla con coma (ej: 10.50 -> 10,50)
function aComa(num) {
    return parseFloat(num).toFixed(2).replace('.', ',');
}

// --- 3. NAVEGACIÓN ---
function irAPantalla(id) {
    // Ocultamos todas las pantallas
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    // Mostramos la elegida
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    
    // Acciones especiales al abrir pantallas
    if(id === 'clientes') renderClientes();
    if(id === 'ajustes') cargarDatosAjustes();
}

// --- 4. GESTIÓN DE MI EMPRESA (RUEDA DENTADA) ---
function cargarDatosAjustes() {
    document.getElementById('config-nombre').value = ajustes.nombre || '';
    document.getElementById('config-cif').value = ajustes.cif || '';
    document.getElementById('config-dir').value = ajustes.dir || '';
    document.getElementById('config-cp').value = ajustes.cp || '';
    document.getElementById('config-ciudad').value = ajustes.ciudad || '';
}

function guardarAjustes() {
    ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        dir: document.getElementById('config-dir').value.toUpperCase(),
        cp: document.getElementById('config-cp').value,
        ciudad: document.getElementById('config-ciudad').value.toUpperCase()
    };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    alert("✅ DATOS GUARDADOS CORRECTAMENTE");
    irAPantalla('clientes');
}

// --- 5. GESTIÓN DE CLIENTES (BOTÓN +) ---
function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    if (clientes.length === 0) {
        lista.innerHTML = `<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-xs">No hay clientes. Pulsa + para añadir.</p>`;
        return;
    }
    lista.innerHTML = clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center active-scale border-slate-100">
            <div>
                <p class="text-[8px] font-black opacity-30 uppercase italic">Cliente</p>
                <p class="font-black uppercase text-slate-700">${c.nombre}</p>
            </div>
            <span class="text-blue-600 font-black text-xl">→</span>
        </div>
    `).join('');
}

function nuevoCliente() {
    const tipos = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];
    const cont = document.getElementById('tarifas-nuevo-cliente');
    cont.innerHTML = tipos.map(t => `
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p class="text-[9px] font-black opacity-50 mb-1 uppercase">${t}</p>
            <input type="text" id="tarifa-${t}" class="w-full bg-transparent font-black text-blue-600 outline-none" placeholder="0,00">
        </div>
    `).join('');
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("❌ EL NOMBRE ES OBLIGATORIO");
    
    let tfs = {};
    ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"].forEach(t => {
        tfs[t] = evaluarSuma(document.getElementById(`tarifa-${t}`).value);
    });

    clientes.push({
        id: Date.now(),
        nombre: nom,
        tel: document.getElementById('cli-tel').value,
        email: document.getElementById('cli-email').value,
        dir: document.getElementById('cli-dir').value,
        tarifas: tfs,
        obras: []
    });
    
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    irAPantalla('clientes');
}

// --- 6. MEDICIONES Y TRABAJO ---
function abrirExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    document.getElementById('titulo-obra').innerText = clienteActual.nombre;
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
    
    // Ocultar medida 2 para cantoneras u horas
    document.getElementById('div-m2').classList.toggle('hidden', tipo === 'CANTONERA' || tipo === 'HORAS');
    
    document.getElementById('modal-calculadora').classList.remove('hidden');
}

function procesarCalculo() {
    const v1 = evaluarSuma(document.getElementById('calc-input-1').value);
    const v2 = evaluarSuma(document.getElementById('calc-input-2').value);
    
    let cant = 0; 
    let uni = "m²";

    if (tipoSeleccionado === 'CANTONERA') { 
        cant = v1; 
        uni = "ml"; 
    } else if (tipoSeleccionado === 'HORAS') { 
        cant = v1; 
        uni = "h"; 
    } else if (tipoSeleccionado === 'CAJÓN' || tipoSeleccionado === 'TABICA') {
        // Regla del 0,60 de Antonio
        if (v1 <= 0.60 || v2 <= 0.60) {
            cant = (v1 > v2) ? v1 : v2; 
            uni = "ml";
        } else {
            cant = v1 * v2;
            uni = "m²";
        }
    } else {
        cant = v1 * v2;
    }

    const precioUnitario = clienteActual.tarifas[tipoSeleccionado] || 0;
    
    medidasObra.push({
        tipo: tipoSeleccionado,
        cant: cant,
        uni: uni,
        precio: precioUnitario,
        sub: cant * precioUnitario
    });
    
    cerrarCalculadora();
    renderMedidas();
}

function renderMedidas() {
    const lista = document.getElementById('lista-medidas');
    lista.innerHTML = medidasObra.map((m, i) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border-l-8 border-blue-600 mb-2">
            <div>
                <p class="font-black text-[10px] uppercase text-blue-800">${m.tipo}</p>
            </div>
            <div class="text-right">
                <p class="font-black text-lg">${aComa(m.cant)} ${m.uni}</p>
                <p class="text-[9px] font-bold opacity-30">${aComa(m.sub)}€</p>
            </div>
            <button onclick="medidasObra.splice(${i},1); renderMedidas();" class="ml-4 text-red-500 font-black p-2">✕</button>
        </div>
    `).join('');
    
    actualizarTotalFinal();
}

function actualizarTotalFinal() {
    const base = medidasObra.reduce((acc, m) => acc + m.sub, 0);
    const ivaPorc = parseFloat(document.getElementById('iva-select').value);
    const total = base * (1 + (ivaPorc / 100));
    
    // Ponemos el total en el editor (el usuario puede cambiarlo luego)
    document.getElementById('total-final-corregible').value = aComa(total);
    document.getElementById('desglose-info').innerText = `Base: ${aComa(base)}€ | IVA: ${ivaPorc}%`;
}

function cerrarCalculadora() { 
    document.getElementById('modal-calculadora').classList.add('hidden'); 
}

// --- 7. ENVÍO ---
function enviar(modo) {
    // Cogemos el valor del EDITOR (por si Antonio ha hecho un ajuste manual)
    const totalFinal = document.getElementById('total-final-corregible').value;
    const msg = `Presupuesto de ${ajustes.nombre} para ${clienteActual.nombre}. Total: ${totalFinal}€. Saludos.`;
    
    if(modo === 'ws') {
        window.open(`https://wa.me/${clienteActual.tel}?text=${encodeURIComponent(msg)}`);
    } else if(modo === 'email') {
        window.location.href = `mailto:${clienteActual.email}?subject=Presupuesto&body=${encodeURIComponent(msg)}`;
    } else {
        alert("Generando PDF...");
    }
}

// --- AL CARGAR LA APP ---
window.onload = () => {
    renderClientes();
};
