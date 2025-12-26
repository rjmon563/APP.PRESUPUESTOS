// ==========================================
// 1. MEMORIA Y CONFIGURACIÓN
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };
let editandoId = null;

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
    const pantallas = ['pantalla-clientes', 'pantalla-nuevo-cliente', 'pantalla-expediente', 'pantalla-nombre-obra', 'pantalla-trabajo'];
    pantallas.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.classList.add('hidden');
    });
    const destino = document.getElementById(`pantalla-${id}`);
    if (destino) destino.classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
};

// ==========================================
// 3. GESTIÓN DE CLIENTES (PAPELERA Y LÁPIZ)
// ==========================================
window.nuevoCliente = () => {
    editandoId = null;
    document.getElementById('cli-nombre').value = "";
    document.getElementById('cli-cif').value = "";
    document.getElementById('cli-tel').value = "";
    document.getElementById('cli-dir').value = "";
    irAPantalla('nuevo-cliente');
};

window.editarCliente = () => {
    editandoId = clienteActual.id;
    document.getElementById('cli-nombre').value = clienteActual.nombre;
    document.getElementById('cli-cif').value = clienteActual.cif;
    document.getElementById('cli-tel').value = clienteActual.tel;
    document.getElementById('cli-dir').value = clienteActual.dir;
    irAPantalla('nuevo-cliente');
};

window.borrarCliente = (id, e) => {
    e.stopPropagation();
    if(confirm("¿Seguro que quieres borrar este cliente y todos sus datos?")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        asegurarGuardado();
        renderListaClientes();
    }
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value;
    if (!nom || nom.trim() === "") return alert("El nombre es obligatorio");

    if (editandoId) {
        const cli = db.clientes.find(c => c.id === editandoId);
        cli.nombre = nom.toUpperCase().trim();
        cli.cif = document.getElementById('cli-cif').value.toUpperCase().trim() || "S/N";
        cli.tel = document.getElementById('cli-tel').value || "S/T";
        cli.dir = document.getElementById('cli-dir').value || "S/D";
    } else {
        db.clientes.push({
            id: Date.now(),
            nombre: nom.toUpperCase().trim(),
            cif: document.getElementById('cli-cif').value.toUpperCase().trim() || "S/N",
            tel: document.getElementById('cli-tel').value || "S/T",
            dir: document.getElementById('cli-dir').value || "S/D",
            presupuestos: []
        });
    }
    asegurarGuardado();
    irAPantalla('clientes');
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    if (!cont) return;
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 font-bold uppercase text-[10px]">Sin clientes</p>' : 
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-4 rounded-3xl border shadow-sm flex justify-between items-center mb-2 active-scale">
            <p class="font-black text-slate-800 uppercase italic leading-none text-sm">${c.nombre}</p>
            <button onclick="borrarCliente(${c.id}, event)" class="bg-red-50 text-red-500 p-3 rounded-xl ml-2">🗑️</button>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(cli => cli.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic relative">
            <button onclick="editarCliente()" class="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-lg text-[10px] font-bold">✏️ EDITAR</button>
            <h2 class="text-2xl font-black uppercase leading-none mb-3 pr-16">${clienteActual.nombre}</h2>
            <div class="text-[10px] space-y-1 opacity-80 font-bold uppercase">
                <p>📄 CIF: ${clienteActual.cif}</p>
                <p>📞 TEL: ${clienteActual.tel}</p>
                <p>📍 DIR: ${clienteActual.dir}</p>
            </div>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. LÓGICA DE TRABAJO Y CALCULADORA
// ==========================================
window.confirmarNombreObra = () => {
    const val = document.getElementById('input-nombre-obra').value;
    if (!val) return alert("Escribe un nombre");
    obraEnCurso = { nombre: val.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    irAPantalla('trabajo');
    renderBotones();
};

function renderBotones() {
    document.getElementById('botones-trabajo').innerHTML = Object.keys(CONFIG_MEDIDAS).map(key => {
        const c = CONFIG_MEDIDAS[key];
        return `<button onclick="prepararMedida('${key}')" class="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center gap-2 border active-scale text-slate-500">
            <span class="text-3xl">${c.i}</span><span class="font-black text-[10px] uppercase italic">${c.n}</span>
        </button>`;
    }).join('');
}

window.prepararMedida = (t) => {
    const zona = prompt("¿Zona?", (t === 'horas' ? "ADMIN" : "GENERAL"));
    if (!zona) return;
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
    const p = parseFloat(prompt("Precio (€):", "20").replace(',','.')) || 0;
    obraEnCurso.lineas.push({
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${CONFIG_MEDIDAS[calcEstado.tipo].n} (${calcEstado.concepto})`,
        cantidad: cant, precio: p, subtotal: cant * p
    });
    cerrarCalc();
    renderMedidas();
}

function renderMedidas() {
    document.getElementById('lista-medidas-obra').innerHTML = obraEnCurso.lineas.map((l, i) => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 text-[10px] font-bold italic shadow-sm">
            <span>${l.nombre}</span><span class="text-blue-700">${l.subtotal.toFixed(2)}€</span>
        </div>`).reverse().join('');
}

window.cerrarCalc = () => {
    document.getElementById('modal-calc').classList.add('hidden');
    document.body.classList.remove('no-scroll');
};

window.guardarObraCompleta = () => {
    if (obraEnCurso.lineas.length === 0) return alert("Sin datos");
    if (!clienteActual.presupuestos) clienteActual.presupuestos = [];
    clienteActual.presupuestos.push({...obraEnCurso, total: obraEnCurso.lineas.reduce((a,b)=>a+b.subtotal,0), fecha: new Date().toLocaleDateString()});
    asegurarGuardado();
    alert("¡Obra guardada!");
    irAPantalla('expediente');
};

window.onload = () => renderListaClientes();
