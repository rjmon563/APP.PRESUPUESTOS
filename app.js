// --- 1. DATOS Y VARIABLES GLOBALES ---
let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '' };
let clienteActual = null;
let medidasObra = [];

// --- 2. MOTOR DE CÁLCULO (SUMAS Y COMAS) ---
function evaluarSuma(texto) {
    try {
        if (!texto) return 0;
        // Cambiamos comas por puntos para que JavaScript pueda calcular
        let preparado = texto.toString().replace(/,/g, '.');
        return Function(`'use strict'; return (${preparado})`)() || 0;
    } catch (e) { return 0; }
}

// Mostrar números con coma (ej: 10.5 -> 10,50)
function aComa(num) {
    return parseFloat(num).toFixed(2).replace('.', ',');
}

// --- 3. NAVEGACIÓN ---
function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    
    if(id === 'clientes') renderClientes();
    if(id === 'ajustes') cargarDatosAjustes();
}

// --- 4. GESTIÓN DE MI EMPRESA (⚙️) ---
function cargarDatosAjustes() {
    document.getElementById('config-nombre').value = ajustes.nombre || '';
    document.getElementById('config-cif').value = ajustes.cif || '';
    document.getElementById('config-dir').value = ajustes.dir || '';
}

function guardarAjustes() {
    ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        dir: document.getElementById('config-dir').value.toUpperCase()
    };
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    alert("✅ DATOS DE EMPRESA GUARDADOS");
    irAPantalla('clientes');
}

// --- 5. GESTIÓN DE CLIENTES (+) ---
function renderClientes() {
    const lista = document.getElementById('lista-clientes');
    if (clientes.length === 0) {
        lista.innerHTML = `<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-xs">No hay clientes. Pulsa + para añadir.</p>`;
        return;
    }
    lista.innerHTML = clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center active-scale">
            <div>
                <p class="text-[8px] font-black opacity-30 uppercase italic text-blue-600">CLIENTE</p>
                <p class="font-black uppercase text-slate-700">${c.nombre}</p>
            </div>
            <span class="text-blue-600 font-black">→</span>
        </div>
    `).join('');
}

function nuevoCliente() {
    const tipos = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];
    const cont = document.getElementById('tarifas-nuevo-cliente');
    
    // Generamos los botones de tarifas que abren la calculadora
    cont.innerHTML = tipos.map(t => `
        <div class="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200 active:border-blue-500 flex flex-col items-center justify-center shadow-sm" 
             onclick="abrirCalculadoraTarifa('tarifa-${t}')">
            <p class="text-[9px] font-black opacity-50 uppercase mb-1">${t}</p>
            <div class="flex items-center">
                <input type="text" id="tarifa-${t}" class="w-full bg-transparent font-black text-blue-700 text-center pointer-events-none" placeholder="0,00">
                <span class="text-blue-700 font-bold text-xs ml-1">€</span>
            </div>
        </div>
    `).join('');
    
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("EL NOMBRE ES OBLIGATORIO");
    
    let tfs = {};
    ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"].forEach(t => {
        tfs[t] = evaluarSuma(document.getElementById(`tarifa-${t}`).value);
    });

    clientes.push({
        id: Date.now(),
        nombre: nom,
        cif: document.getElementById('cli-cif').value.toUpperCase(),
        tel: document.getElementById('cli-tel').value,
        tarifas: tfs
    });
    
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    irAPantalla('clientes');
}

// --- 6. CALCULADORAS (TARIFAS Y MEDIDAS) ---

// Para poner los precios en el cliente
function abrirCalculadoraTarifa(idInput) {
    const inputOriginal = document.getElementById(idInput);
    const nombreTrabajo = idInput.replace('tarifa-', '').toUpperCase();
    
    document.getElementById('calc-titulo').innerText = "PRECIO " + nombreTrabajo;
    document.getElementById('calc-input-1').value = inputOriginal.value;
    document.getElementById('div-m2').classList.add('hidden'); // Solo una medida para el precio
    document.getElementById('modal-calculadora').classList.remove('hidden');

    document.getElementById('btn-aceptar-calc').onclick = () => {
        const resultado = evaluarSuma(document.getElementById('calc-input-1').value);
        inputOriginal.value = aComa(resultado);
        cerrarCalculadora();
    };
}

// Para meter metros en la obra (con regla del 0,60)
function abrirCalculadoraMedida(tipo) {
    document.getElementById('calc-titulo').innerText = tipo;
    document.getElementById('calc-input-1').value = "";
    document.getElementById('calc-input-2').value = "";
    
    // Ocultar medida 2 para cantoneras u horas
    document.getElementById('div-m2').classList.toggle('hidden', tipo === 'CANTONERA' || tipo === 'HORAS');
    document.getElementById('modal-calculadora').classList.remove('hidden');

    document.getElementById('btn-aceptar-calc').onclick = () => {
        const v1 = evaluarSuma(document.getElementById('calc-input-1').value);
        const v2 = evaluarSuma(document.getElementById('calc-input-2').value);
        let cant = 0; let uni = "m²";

        if (tipo === 'CANTONERA') { cant = v1; uni = "ml"; }
        else if (
