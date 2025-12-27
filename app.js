// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { 
    nombre: '', 
    cif: '', 
    tel: '', 
    dir: '', 
    cp: '', 
    ciudad: '', 
    nPresu: 1 
};
let clienteActual = null;
let obraActual = null;
let medidasTemporales = [];
let ivaActual = 21;
let tipoTrabajoActual = '';
let valorCalculado = "0";

// --- NAVEGACIÓN ENTRE PANTALLAS ---
function irAPantalla(id) {
    const pantallas = ['clientes', 'nuevo-cliente', 'expediente', 'trabajo', 'ajustes', 'precios'];
    pantallas.forEach(p => {
        const el = document.getElementById(`pantalla-${p}`);
        if (el) el.classList.add('hidden');
    });
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    window.scrollTo(0, 0);
}

// --- GESTIÓN DE CLIENTES ---
function nuevoCliente() {
    document.getElementById('cli-nombre').value = '';
    document.getElementById('cli-cif').value = '';
    document.getElementById('cli-tel').value = '';
    document.getElementById('cli-dir').value = '';
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nombre = document.getElementById('cli-nombre').value.toUpperCase();
    if (!nombre) {
        alert("El nombre es obligatorio");
        return;
    }
    const nuevo = {
        id: Date.now(),
        nombre: nombre,
        cif: document.getElementById('cli-cif').value.toUpperCase(),
        tel: document.getElementById('cli-tel').value,
        dir: document.getElementById('cli-dir').value.toUpperCase(),
        obras: []
    };
    clientes.push(nuevo);
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    renderListaClientes();
    irAPantalla('clientes');
}

function renderListaClientes() {
    const contenedor = document.getElementById('lista-clientes');
    if (clientes.length === 0) {
        contenedor.innerHTML = '<p class="text-center opacity-40 mt-10 font-bold">NO HAY CLIENTES TODAVÍA</p>';
        return;
    }
    contenedor.innerHTML = clientes.map(c => `
        <div onclick="verExpediente(${c.id})" class="bg-white p-5 rounded-[30px] shadow-sm flex justify-between items-center active-scale border border-slate-100 mb-3">
            <div>
                <p class="text-[10px] font-black opacity-30 italic leading-none">CLIENTE</p>
                <p class="font-black text-slate-800 uppercase">${c.nombre}</p>
            </div>
            <div class="bg-blue-50 p-2 rounded-xl">
                <span class="text-blue-600 font-bold">→</span>
            </div>
        </div>
    `).join('');
}

// --- EXPEDIENTE DEL CLIENTE ---
function verExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    if (!clienteActual) return;
    irAPantalla('expediente');
    const ficha = document.getElementById('ficha-cliente-detalle');
    ficha.innerHTML = `
        <div class="bg-blue-700 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
            <div class="relative z-10">
                <h2 class="text-3xl font-black italic uppercase leading-tight mb-1">${clienteActual.nombre}</h2>
                <p class="opacity-70 text-sm font-bold uppercase">${clienteActual.dir || 'Sin dirección'}</p>
                <div class="flex gap-4 mt-6">
                    <div class="bg-white/10 p-3 rounded-2xl text-center flex-1">
                        <p class="text-[9px] font-black opacity-50 uppercase">Presupuestos</p>
                        <p class="text-xl font-black">${clienteActual.obras.length}</p>
                    </div>
                    <div class="bg-white/10 p-3 rounded-2xl text-center flex-1 text-green-300">
                        <p class="text-[9px] font-black opacity-50 uppercase text-white">Estado</p>
                        <p class="text-xs font-black">AL DÍA</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-8">
            <p class="text-[10px] font-black opacity-30 mb-4 uppercase italic">Historial de Trabajos</p>
            <div class="space-y-2">
                ${clienteActual.obras.length === 0 ? '<p class="text-xs font-bold opacity-30">No hay obras registradas</p>' : 
                clienteActual.obras.map(o => `
                    <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                        <div>
                            <p class="font-bold text-slate-700 text-sm uppercase">${o.nombre}</p>
                            <p class="text-[9px] font-black opacity-40">Nº ${o.id.toString().slice(-4)}</p>
                        </div>
                        <p class="text-[10px] font-black opacity-40">${o.fecha}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// --- LÓGICA DE TRABAJO Y MEDICIONES ---
function confirmarNombreObra() {
    const input = document.getElementById('input-nombre-obra');
    if (!input.value) return;
    
    obraActual = {
        id: Date.now(),
        nombre: input.value.toUpperCase(),
        fecha: new Date().toLocaleDateString('es-ES'),
        medidas: [],
        iva: ivaActual
    };
    medidasTemporales = [];
    document.getElementById('titulo-obra-actual').innerText = obraActual.nombre;
    input.value = '';
    irAPantalla('trabajo');
    renderMedidas();
}

function prepararMedida(tipo) {
    tipoTrabajoActual = tipo;
    valorCalculado = "0";
    document.getElementById('calc-titulo').innerText = "MEDIDA: " + tipo;
    document.getElementById('calc-display').innerText = "0";
    document.getElementById('modal-calc').classList.remove('hidden');
}

function teclear(num) {
    const display = document.getElementById('calc-display');
    if (num === 'DEL') {
        valorCalculado = "0";
    } else if (num === 'OK') {
        procesarMedidaFinal(valorCalculado);
        return;
    } else {
        if (num === '.') {
            if (!valorCalculado.includes('.')) valorCalculado += '.';
        } else {
            if (valorCalculado === "0") valorCalculado = num;
            else valorCalculado += num;
        }
    }
    display.innerText = valorCalculado.replace('.', ',');
}

function procesarMedidaFinal(valor) {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) {
        cerrarCalc();
        return;
    }

    let unidad = 'm²';
    const fechaSeleccionada = document.getElementById('fecha-trabajo-actual').value;
    const fechaFormateada = fechaSeleccionada.split('-').reverse().join('/');

    // REGLA DEL 0,60: Lógica para Cajón y Tabica
    if (tipoTrabajoActual === 'CAJÓN' || tipoTrabajoActual === 'TABICA') {
        if (num <= 0.60) {
            unidad = 'ml';
        } else {
            unidad = 'm²';
        }
    } else if (tipoTrabajoActual === 'CANTONERA') {
        unidad = 'ml';
    } else if (tipoTrabajoActual === 'HORAS') {
        unidad = 'h';
    }

    const nuevaMedida = {
        id: Date.now(),
        nombre: tipoTrabajoActual,
        cantidad: num,
        unidad: unidad,
        fecha: fechaFormateada
    };

    medidasTemporales.push(nuevaMedida);
    cerrarCalc();
    renderMedidas();
}

function cerrarCalc() {
    document.getElementById('modal-calc').classList.add('hidden');
}

function renderMedidas() {
    const contenedor = document.getElementById('lista-medidas-obra');
    if (medidasTemporales.length === 0) {
        contenedor.innerHTML = '<p class="text-center opacity-30 text-xs py-10 font-bold uppercase italic">Añade trabajos usando los botones de arriba</p>';
        return;
    }
    contenedor.innerHTML = medidasTemporales.map((m, index) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center mb-2">
            <div>
                <p class="text-[9px] font-black text-blue-500 uppercase">${m.fecha}</p>
                <p class="font-black text-slate-800 text-sm uppercase">${m.nombre}</p>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-right">
                    <p class="text-xl font-black leading-none">${m.cantidad.toString().replace('.', ',')}</p>
                    <p class="text-[9px] font-bold opacity-30 uppercase">${m.unidad}</p>
                </div>
                <button onclick="eliminarMedida(${index})" class="bg-red-50 text-red-400 p-2 rounded-lg text-xs">✕</button>
            </div>
        </div>
    `).join('');
}

function eliminarMedida(index) {
    medidasTemporales.splice(index, 1);
    renderMedidas();
}

// --- CONFIGURACIÓN DE IVA ---
function cambiarIVA(valor) {
    ivaActual = valor;
    document.querySelectorAll('.iva-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('bg-slate-100');
    });
    // Resaltar el botón presionado
    const idBoton = `btn-iva-${valor}`;
    document.getElementById(idBoton).classList.add('bg-blue-600', 'text-white');
}

// --- GUARDADO FINAL Y AJUSTES ---
function guardarObraCompleta() {
    if (medidasTemporales.length === 0) {
        alert("No hay medidas que guardar");
        return;
    }
    obraActual.medidas = [...medidasTemporales];
    obraActual.iva = ivaActual;
    
    // Guardar en el cliente actual
    const index = clientes.findIndex(c => c.id === clienteActual.id);
    clientes[index].obras.push(obraActual);
    
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    alert("PRESUPUESTO GUARDADO CORRECTAMENTE");
    irAPantalla('clientes');
}

function guardarAjustes() {
    ajustes.nombre = document.getElementById('config-nombre').value.toUpperCase();
    ajustes.cif = document.getElementById('config-cif').value.toUpperCase();
    ajustes.tel = document.getElementById('config-tel').value;
    ajustes.dir = document.getElementById('config-dir').value.toUpperCase();
    ajustes.cp = document.getElementById('config-cp').value;
    ajustes.ciudad = document.getElementById('config-ciudad').value.toUpperCase();
    ajustes.nPresu = parseInt(document.getElementById('config-nPresu').value) || 1;
    
    localStorage.setItem('presupro_ajustes', JSON.stringify(ajustes));
    alert("AJUSTES ACTUALIZADOS");
    irAPantalla('clientes');
}

// --- AL CARGAR LA APP ---
window.onload = () => {
    renderListaClientes();
    
    // Cargar datos en pantalla de ajustes
    document.getElementById('config-nombre').value = ajustes.nombre;
    document.getElementById('config-cif').value = ajustes.cif;
    document.getElementById('config-tel').value = ajustes.tel;
    document.getElementById('config-dir').value = ajustes.dir;
    document.getElementById('config-cp').value = ajustes.cp;
    document.getElementById('config-ciudad').value = ajustes.ciudad;
    document.getElementById('config-nPresu').value = ajustes.nPresu;
    
    // Poner fecha de hoy en el selector de trabajo
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-trabajo-actual').value = hoy;
};
