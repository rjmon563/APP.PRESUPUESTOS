// ==========================================
// 1. INICIO Y MEMORIA (BLINDADO)
// ==========================================
let db = { clientes: [] };

// Función para cargar datos con seguridad
const cargarDatos = () => {
    try {
        const guardado = localStorage.getItem('presupro_v3');
        if (guardado) {
            db = JSON.parse(guardado);
            if (!db.clientes) db = { clientes: [] };
        }
    } catch (e) {
        console.error("Error cargando base de datos");
        db = { clientes: [] };
    }
};

const asegurarGuardado = () => {
    localStorage.setItem('presupro_v3', JSON.stringify(db));
};

// Cargar al inicio
cargarDatos();

// ==========================================
// 2. NAVEGACIÓN ENTRE PANTALLAS
// ==========================================
window.irAPantalla = (id) => {
    const pantallas = ['pantalla-clientes', 'pantalla-expediente', 'pantalla-trabajo', 'pantalla-nombre-obra'];
    pantallas.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.add('hidden');
    });
    
    const destino = document.getElementById(`pantalla-${id}`);
    if (destino) destino.classList.remove('hidden');
    
    if (id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES (CORREGIDO)
// ==========================================
window.nuevoCliente = () => {
    const n = prompt("Nombre del Nuevo Cliente:");
    if (!n || n.trim() === "") return;
    
    const nuevo = { 
        id: Date.now(), 
        nombre: n.toUpperCase().trim(), 
        cif: "S/N", 
        presupuestos: [] 
    };
    
    db.clientes.push(nuevo);
    asegurarGuardado();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;

    if (db.clientes.length === 0) {
        cont.innerHTML = `
            <div class="text-center p-10 border-2 border-dashed border-slate-300 rounded-3xl mt-10">
                <p class="text-slate-400 font-bold uppercase italic text-xs">No hay clientes todavía</p>
                <p class="text-[10px] text-slate-300 mt-2">Pulsa el botón azul (+) para empezar</p>
            </div>`;
        return;
    }

    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center mb-3 active:scale-95 transition-all">
            <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
            <span class="text-blue-600 font-bold">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(cli => cli.id === id);
    if (!clienteActual) return;

    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic">
            <h2 class="text-2xl font-black uppercase leading-none">${clienteActual.nombre}</h2>
            <p class="text-[10px] opacity-70 mt-2">ID: ${clienteActual.id}</p>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. LÓGICA DE OBRA Y CALCULADORA
// ==========================================
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Ancho' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Alto' },
    'cajones': { n: 'Cajón', i: '📦', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Desarrollo' },
    'tabicas': { n: 'Tabica', i: '📐', uni: 'm²', pasos: 2, m1: 'Largo', m2: 'Alto' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml', pasos: 1, m1: 'Metros Totales' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs', pasos: 1, m1: 'Total Horas' }
};

window.confirmarNombreObra = () => {
    const input = document.getElementById('input-nombre-obra');
    if (!input.value) return alert("Escribe un nombre para la obra");
    obraEnCurso = { nombre: input.value.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    irAPantalla('trabajo');
};

window.prepararMedida = (t) => {
    const zona = prompt("¿Zona?", (t === 'horas' ? "ADMIN" : "GENERAL"));
    if(!zona) return;
    calcEstado = { tipo: t, paso: 1, valor1: 0, memoria: '', concepto: zona.toUpperCase() };
    
    if (t === 'horas') {
        document.getElementById('contenedor-fecha-horas').classList.remove('hidden');
        document.getElementById('fecha-trabajo').valueAsDate = new Date();
    } else {
        document.getElementById('contenedor-fecha-horas').classList.add('hidden');
    }
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    const titulo = document.getElementById('calc-titulo');
    
    if (conf.pasos === 2) {
        titulo.innerText = (calcEstado.paso === 1 ? conf.m1 : conf.m2).toUpperCase() + " - " + calcEstado.concepto;
    } else {
        titulo.innerText = conf.m1.toUpperCase() + " - " + calcEstado.concepto;
    }

    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        if (!calcEstado.memoria) return;
        let cifra = 0;
        try {
            cifra = eval(calcEstado.memoria.replace(/,/g, '.')) || 0;
        } catch(e) { alert("Error"); return; }

        if (CONFIG_MEDIDAS[calcEstado.tipo].pasos === 1) {
            finalizarLinea(cifra);
        } else {
            if (calcEstado.paso === 1) {
                calcEstado.valor1 = cifra; calcEstado.paso = 2; calcEstado.memoria = ''; abrirCalculadora();
            } else {
                finalizarLinea(calcEstado.valor1 * cifra);
            }
        }
    } 
    else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else if (n === '+') { calcEstado.memoria += '+'; disp.innerText = calcEstado.memoria; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function finalizarLinea(cant) {
    const pStr = prompt("Precio (€):", "0");
    const p = parseFloat(pStr.replace(',','.')) || 0;
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cant, precio: p, subtotal: cant * p, unidad: CONFIG_MEDIDAS[calcEstado.tipo].uni
    });
    cerrarCalc();
    renderMedidas();
}

function renderMedidas() {
    document.getElementById('lista-medidas-obra').innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 text-[11px] font-bold italic">
            <span>${l.nombre}</span>
            <span class="text-blue-700">${l.subtotal.toFixed(2)}€</span>
        </div>`).reverse().join('');
}

window.cerrarCalc = () => {
    calcEstado.memoria = '';
    document.getElementById('modal-calc').classList.add('hidden');
};

window.guardarObraCompleta = () => {
    if(!clienteActual.presupuestos) clienteActual.presupuestos = [];
    clienteActual.presupuestos.push({...obraEnCurso, fecha: new Date().toLocaleDateString()});
    asegurarGuardado();
    alert("Guardado");
    irAPantalla('expediente');
};

// Arrancar la app
window.onload = () => {
    renderListaClientes();
};
