// ==========================================
// 1. MEMORIA Y VARIABLES
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
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

const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// ==========================================
// 2. NAVEGACIÓN
// ==========================================
window.irAPantalla = (id) => {
    const pantallas = ['pantalla-clientes', 'pantalla-expediente', 'pantalla-trabajo', 'pantalla-nombre-obra'];
    pantallas.forEach(p => document.getElementById(p).classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES
// ==========================================
window.nuevoCliente = () => {
    const n = prompt("Nombre del Nuevo Cliente:");
    if (!n) return;
    
    const nuevo = { id: Date.now(), nombre: n.toUpperCase(), cif: "S/N", presupuestos: [] };
    db.clientes.push(nuevo);
    asegurarGuardado();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;

    if (db.clientes.length === 0) {
        cont.innerHTML = '<p class="text-center opacity-30 mt-10 font-bold uppercase italic text-[10px]">Pulsa + para añadir un cliente</p>';
        return;
    }

    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center mb-3 active-scale">
            <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
            <span class="text-blue-600 font-bold">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(cli => cli.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic">
            <h2 class="text-2xl font-black uppercase leading-none">${clienteActual.nombre}</h2>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. LÓGICA DE OBRA Y CALCULADORA
// ==========================================
window.confirmarNombreObra = () => {
    const input = document.getElementById('input-nombre-obra');
    if (!input.value) return alert("Pon un nombre");
    obraEnCurso = { nombre: input.value.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    document.getElementById('lista-medidas-obra').innerHTML = "";
    irAPantalla('trabajo');
};

window.prepararMedida = (t) => {
    const zona = prompt("¿Zona?", (t === 'horas' ? "ADMINISTRACIÓN" : "GENERAL"));
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

    document.getElementById('calc-display').innerText = calcEstado.memoria || '0';
    document.getElementById('modal-calc').classList.remove('hidden');
    document.body.classList.add('no-scroll');
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    
    if (n === 'OK') {
        if (!calcEstado.memoria) return;
        let cifra = 0;
        try {
            cifra = eval(calcEstado.memoria.replace(/,/g, '.')) || 0;
        } catch(e) { alert("Error en el cálculo"); return; }

        if (CONFIG_MEDIDAS[calcEstado.tipo].pasos === 1) {
            finalizarLinea(cifra);
        } else {
            if (calcEstado.paso === 1) {
                calcEstado.valor1 = cifra;
                calcEstado.paso = 2;
                calcEstado.memoria = '';
                abrirCalculadora();
            } else {
                finalizarLinea(calcEstado.valor1 * cifra);
            }
        }
    } 
    else if (n === 'DEL') { 
        calcEstado.memoria = ''; 
        disp.innerText = '0'; 
    }
    else if (n === '+') {
        if(calcEstado.memoria !== '') {
            calcEstado.memoria += '+';
            disp.innerText = calcEstado.memoria;
        }
    }
    else { 
        calcEstado.memoria += n; 
        disp.innerText = calcEstado.memoria; 
    }
};

function finalizarLinea(cant) {
    const pStr = prompt("Precio por unidad (€):", "0");
    const p = parseFloat(pStr.replace(',','.')) || 0;
    
    let fecha = "";
    if (calcEstado.tipo === 'horas') {
        const inputF = document.getElementById('fecha-trabajo').value;
        const f = new Date(inputF);
        fecha = ` [${f.toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'})}]`;
    }
    
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n}${fecha} (${calcEstado.concepto})`,
        cantidad: cant,
        precio: p,
        subtotal: cant * p,
        unidad: CONFIG_MEDIDAS[calcEstado.tipo].uni
    });
    
    cerrarCalc();
    renderMedidas();
}

function renderMedidas() {
    const lista = document.getElementById('lista-medidas-obra');
    lista.innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 text-[11px] font-bold italic shadow-sm">
            <span>${l.nombre}</span>
            <div class="flex items-center gap-3">
                <span class="text-blue-700">${l.subtotal.toFixed(2)}€</span>
                <button onclick="borrarLinea(${i})" class="text-red-400 ml-2">✕</button>
            </div>
        </div>`).reverse().join('');
}

window.borrarLinea = (i) => {
    obraEnCurso.lineas.splice(i, 1);
    renderMedidas();
};

window.guardarObraCompleta = () => {
    if(obraEnCurso.lineas.length === 0) return alert("No hay medidas");
    const total = obraEnCurso.lineas.reduce((acc, l) => acc + l.subtotal, 0);
    clienteActual.presupuestos.push({ ...obraEnCurso, total, fecha: new Date().toLocaleDateString() });
    asegurarGuardado();
    alert("✔ Obra guardada en el historial");
    irAPantalla('expediente');
};

window.cerrarCalc = () => {
    calcEstado.memoria = ''; 
    document.getElementById('modal-calc').classList.add('hidden');
    document.body.classList.remove('no-scroll');
};

window.onload = () => renderListaClientes();
