// MEMORIA
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

// GUARDAR
const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// NAVEGACIÓN
window.irAPantalla = (id) => {
    ['pantalla-clientes', 'pantalla-expediente', 'pantalla-trabajo', 'pantalla-nombre-obra'].forEach(p => {
        document.getElementById(p).classList.add('hidden');
    });
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

// GESTIÓN CLIENTES (EL BOTÓN +)
window.nuevoCliente = () => {
    const nombre = prompt("Nombre del Cliente:");
    if (!nombre) return;
    const nuevo = { id: Date.now(), nombre: nombre.toUpperCase(), presupuestos: [] };
    db.clientes.push(nuevo);
    asegurarGuardado();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 mt-10 uppercase italic text-xs font-bold">Sin clientes. Pulsa +</p>' : 
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center mb-3 active-scale">
            <p class="font-black text-slate-800 uppercase italic leading-none">${c.nombre}</p>
            <span class="text-blue-600 font-bold text-xl">➔</span>
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

// TRABAJO
window.confirmarNombreObra = () => {
    const val = document.getElementById('input-nombre-obra').value;
    if(!val) return alert("Escribe un nombre");
    obraEnCurso = { nombre: val.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    irAPantalla('trabajo');
    renderBotones();
};

function renderBotones() {
    const cont = document.getElementById('botones-trabajo');
    cont.innerHTML = Object.keys(CONFIG_MEDIDAS).map(key => {
        const c = CONFIG_MEDIDAS[key];
        return `<button onclick="prepararMedida('${key}')" class="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center gap-2 border active-scale">
            <span class="text-3xl">${c.i}</span><span class="font-black text-[10px] uppercase italic">${c.n}</span>
        </button>`;
    }).join('');
}

// CALCULADORA
window.prepararMedida = (t) => {
    const zona = prompt("¿Zona?", (t === 'horas' ? "ADMIN" : "GENERAL"));
    if(!zona) return;
    calcEstado = { tipo: t, paso: 1, valor1: 0, memoria: '', concepto: zona.toUpperCase() };
    const divF = document.getElementById('contenedor-fecha-horas');
    if(t === 'horas') {
        divF.classList.remove('hidden');
        document.getElementById('fecha-trabajo').valueAsDate = new Date();
    } else {
        divF.classList.add('hidden');
    }
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    document.getElementById('calc-titulo').innerText = (conf.pasos === 2) ? 
        `${(calcEstado.paso === 1 ? conf.m1 : conf.m2).toUpperCase()} - ${calcEstado.concepto}` : 
        `${conf.m1.toUpperCase()} - ${calcEstado.concepto}`;
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
    document.body.classList.add('no-scroll');
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        if (!calcEstado.memoria) return;
        let cifra = eval(calcEstado.memoria.replace(/,/g, '.'));
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
    const p = parseFloat(prompt("Precio (€):", "0").replace(',','.')) || 0;
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cant, precio: p, subtotal: cant * p
    });
    cerrarCalc();
    renderMedidas();
}

function renderMedidas() {
    document.getElementById('lista-medidas-obra').innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 text-[10px] font-bold italic">
            <span>${l.nombre}</span>
            <span class="text-blue-700">${l.subtotal.toFixed(2)}€</span>
        </div>`).reverse().join('');
}

window.cerrarCalc = () => {
    document.getElementById('modal-calc').classList.add('hidden');
    document.body.classList.remove('no-scroll');
};

window.guardarObraCompleta = () => {
    if(!clienteActual.presupuestos) clienteActual.presupuestos = [];
    clienteActual.presupuestos.push({...obraEnCurso, total: obraEnCurso.lineas.reduce((a,b)=>a+b.subtotal,0)});
    asegurarGuardado();
    alert("Guardado");
    irAPantalla('expediente');
};

window.onload = () => renderListaClientes();
