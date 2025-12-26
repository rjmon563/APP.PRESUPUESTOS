let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, valor1: 0, memoria: '', concepto: '' };

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs' }
};

window.irAPantalla = (id) => {
    const pantallas = ['pantalla-clientes', 'pantalla-expediente', 'pantalla-trabajo', 'pantalla-nombre-obra'];
    pantallas.forEach(p => document.getElementById(p).classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if (!n) return;
    db.clientes.push({ id: Date.now(), nombre: n.toUpperCase(), cif: "S/N", direccion: "S/D", presupuestos: [] });
    localStorage.setItem('presupro_v3', JSON.stringify(db));
    renderListaClientes();
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-3xl border shadow-sm flex justify-between items-center text-left mb-3">
            <p class="font-black text-slate-800 uppercase italic">${c.nombre}</p>
            <span class="text-blue-600 font-bold">➔</span>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(c => c.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-6 rounded-[35px] shadow-lg italic text-left">
            <h2 class="text-2xl font-black uppercase">${clienteActual.nombre}</h2>
            <p class="text-xs opacity-80 mt-2 font-bold italic tracking-tighter">EXPEDIENTE ABIERTO</p>
        </div>`;
    irAPantalla('expediente');
};

// --- EL SALTO SEGURO ---
window.confirmarNombreObra = () => {
    const input = document.getElementById('input-nombre-obra');
    if (!input.value) { alert("Pon un nombre a la obra"); return; }
    
    obraEnCurso = { nombre: input.value.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = obraEnCurso.nombre;
    input.value = ""; // Limpiamos para la próxima
    
    irAPantalla('trabajo'); // Salto directo
};

window.prepararMedida = (t) => {
    calcEstado = { tipo: t, paso: 1, valor1: 0, memoria: '', concepto: '' };
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
};

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        const res = eval(calcEstado.memoria.replace(/,/g, '.')) || 0;
        if (calcEstado.tipo === 'horas' || calcEstado.tipo === 'cantoneras' || calcEstado.paso === 2) {
            const final = (calcEstado.paso === 2) ? calcEstado.valor1 * res : res;
            obraEnCurso.lineas.push({ nombre: CONFIG_MEDIDAS[calcEstado.tipo].n, subtotal: final * 20, cantidad: final });
            document.getElementById('modal-calc').classList.add('hidden');
            renderMedidas();
        } else {
            calcEstado.valor1 = res; calcEstado.paso = 2; calcEstado.memoria = ''; disp.innerText = '0';
        }
    } else if (n === 'DEL') calcEstado.memoria = '';
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function renderMedidas() {
    document.getElementById('lista-medidas-obra').innerHTML = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between font-bold italic text-xs uppercase">
            <span>${l.nombre}</span><span>${l.cantidad.toFixed(2)}</span>
        </div>`).join('');
}

window.onload = () => renderListaClientes();
