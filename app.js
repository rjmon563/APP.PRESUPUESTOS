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

window.irAPantalla = (id) => {
    const pantallas = ['pantalla-clientes', 'pantalla-expediente', 'pantalla-trabajo', 'pantalla-nombre-obra'];
    pantallas.forEach(p => document.getElementById(p).classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if (!n) return;
    db.clientes.push({ id: Date.now(), nombre: n.toUpperCase(), cif: "S/N", budgets: [] });
    asegurarGuardado();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center mb-3">
            <p class="font-black text-slate-800 uppercase italic">${c.nombre}</p>
            <span class="text-blue-600 font-bold">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(cli => cli.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic">
            <h2 class="text-2xl font-black uppercase">${clienteActual.nombre}</h2>
        </div>`;
    irAPantalla('expediente');
};

window.confirmarNombreObra = () => {
    const input = document.getElementById('input-nombre-obra');
    if (!input.value) return alert("Pon un nombre");
    obraEnCurso = { nombre: input.value.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
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
    document.getElementById('calc-titulo').innerText = (conf.pasos === 2) ? 
        `${(calcEstado.paso === 1 ? conf.m1 : conf.m2).toUpperCase()} - ${calcEstado.concepto}` : 
        `${conf.m1.toUpperCase()} - ${calcEstado.concepto}`;

    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
    document.body.classList.add('no-scroll'); // Bloqueamos el fondo
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
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function finalizarLinea(cant) {
    const p = parseFloat(prompt("Precio (€):", "0").replace(',','.')) || 0;
    let fecha = "";
    if (calcEstado.tipo === 'horas') {
        const f = new Date(document.getElementById('fecha-trabajo').value);
        fecha = ` [${f.toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'})}]`;
    }
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n}${fecha} (${calcEstado.concepto})`,
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
    document.getElementById('modal-calc').classList.add('hidden');
    document.body.classList.remove('no-scroll');
};

window.onload = () => renderListaClientes();
