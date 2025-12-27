// --- VARIABLES GLOBALES ---
let clientes = JSON.parse(localStorage.getItem('presupro_clientes')) || [];
let ajustes = JSON.parse(localStorage.getItem('presupro_ajustes')) || { nombre: '', cif: '', dir: '', cp: '', ciudad: '' };
let clienteActual = null;
let obraActual = null;
let medidasTemporales = [];
const TIPOS = ["TABIQUE", "TECHO", "CAJÓN", "TABICA", "CANTONERA", "HORAS"];

// --- CALCULADORA INTELIGENTE ---
let calc_memoria = "0";
let trabajo_en_curso = "";

function abrirCalculadoraCali(tipo) {
    trabajo_en_curso = tipo;
    calc_memoria = "0";
    document.getElementById('calc-pro-titulo').innerText = tipo;
    document.getElementById('calc-display').innerText = "0";
    document.getElementById('modal-calculadora-pro').classList.remove('hidden');
}

function calc_teclear(n) {
    const disp = document.getElementById('calc-display');
    if (n === 'DEL') {
        if (calc_memoria.length > 1) calc_memoria = calc_memoria.slice(0, -1);
        else calc_memoria = "0";
    } else {
        if (calc_memoria === "0" && n !== '.') calc_memoria = n;
        else calc_memoria += n;
    }
    disp.innerText = calc_memoria.replace(/\*/g, '×').replace(/\./g, ',');
}

function calc_confirmar() {
    try {
        let final = eval(calc_memoria);
        let unidad = (trabajo_en_curso === 'CANTONERA') ? 'ml' : (trabajo_en_curso === 'HORAS' ? 'h' : 'm²');
        medidasTemporales.push({
            nombre: trabajo_en_curso,
            cant: final,
            uni: unidad,
            fecha: document.getElementById('fecha-trabajo-actual').value.split('-').reverse().join('/'),
            precio: clienteActual.tarifas[trabajo_en_curso] || 0,
            sub: final * (clienteActual.tarifas[trabajo_en_curso] || 0)
        });
        cerrarCalcPro();
        renderMedidas();
    } catch(e) { alert("Error en el cálculo"); }
}

function cerrarCalcPro() { document.getElementById('modal-calculadora-pro').classList.add('hidden'); }

// --- NAVEGACIÓN ---
function irAPantalla(id) {
    document.querySelectorAll('div[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
    window.scrollTo(0,0);
}

// --- CLIENTES ---
function renderListaClientes() {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = clientes.map(c => `
        <div onclick="verExpediente(${c.id})" class="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100 mb-3 active-scale flex justify-between items-center">
            <div><p class="text-[10px] font-black opacity-30 italic uppercase">Ficha Cliente</p><p class="font-black uppercase">${c.nombre}</p></div>
            <div class="text-blue-600 font-bold">→</div>
        </div>
    `).join('');
}

function nuevoCliente() {
    const cont = document.getElementById('tarifas-nuevo-cliente');
    cont.innerHTML = TIPOS.map(t => `
        <div class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[8px] font-black opacity-40 mb-1 uppercase">${t}</p>
            <input type="number" id="tarifa-${t}" step="0.01" class="w-full bg-transparent font-black text-blue-600" placeholder="0,00">
        </div>
    `).join('');
    irAPantalla('nuevo-cliente');
}

function guardarDatosCliente() {
    const nom = document.getElementById('cli-nombre').value.toUpperCase();
    if(!nom) return alert("Nombre obligatorio");
    let tfs = {};
    TIPOS.forEach(t => tfs[t] = parseFloat(document.getElementById(`tarifa-${t}`).value) || 0);
    clientes.push({
        id: Date.now(), nombre: nom, cif: document.getElementById('cli-cif').value.toUpperCase(),
        email: document.getElementById('cli-email').value, tel: document.getElementById('cli-tel').value,
        dir: document.getElementById('cli-dir').value.toUpperCase(), cp: document.getElementById('cli-cp').value,
        ciudad: document.getElementById('cli-ciudad').value.toUpperCase(), tarifas: tfs, obras: []
    });
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));
    irAPantalla('clientes');
}

function verExpediente(id) {
    clienteActual = clientes.find(c => c.id === id);
    irAPantalla('expediente');
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-700 p-8 rounded-[40px] text-white shadow-xl">
            <h2 class="text-2xl font-black italic uppercase">${clienteActual.nombre}</h2>
            <p class="opacity-70 text-xs font-bold mt-1 uppercase">${clienteActual.dir} | ${clienteActual.cif}</p>
        </div>`;
    renderHistorialObras();
}

function renderHistorialObras() {
    const cont = document.getElementById('historial-obras');
    cont.innerHTML = clienteActual.obras.map(o => `
        <div onclick="recuperarObra(${o.id})" class="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border mb-2 active-scale">
            <div><p class="font-black text-sm uppercase">${o.nombre}</p><p class="text-[9px] opacity-40 font-bold">${o.fecha}</p></div>
            <p class="font-black text-blue-600">${parseFloat(o.totalFinal).toFixed(2).replace('.', ',')}€</p>
        </div>
    `).join('');
}

// --- MEDICIONES ---
function confirmarNombreObra() {
    const nom = document.getElementById('input-nombre-obra').value.toUpperCase();
    if(!nom) return;
    obraActual = { id: Date.now(), nombre: nom, fecha: new Date().toLocaleDateString('es-ES'), medidas: [] };
    medidasTemporales = [];
    document.getElementById('titulo-obra-actual').innerText = nom;
    document.getElementById('fecha-trabajo-actual').valueAsDate = new Date();
    irAPantalla('trabajo'); renderMedidas();
}

function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    cont.innerHTML = medidasTemporales.map((m, i) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center mb-2">
            <div><p class="text-[9px] font-black text-blue-500">${m.fecha}</p><p class="font-black text-sm uppercase">${m.nombre}</p></div>
            <div class="flex items-center gap-4 text-right">
                <div><p class="text-lg font-black">${m.cant.toFixed(2).replace('.', ',')} ${m.uni}</p><p class="text-[9px] font-bold opacity-30">${m.sub.toFixed(2).replace('.', ',')}€</p></div>
                <button onclick="eliminarMedida(${i})" class="text-red-400 font-black p-2">✕</button>
            </div>
        </div>`).join('');
    actualizarTotalFinal();
}

function eliminarMedida(i) { medidasTemporales.splice(i,1); renderMedidas(); }

function actualizarTotalFinal() {
    const base = medidasTemporales.reduce((acc, m) => acc + m.sub, 0);
    const iva = parseFloat(document.getElementById('iva-config').value) || 0;
    const total = base * (1 + (iva/100));
    document.getElementById('total-final-editable').value = total.toFixed(2);
    document.getElementById('info-iva').innerText = `BASE: ${base.toFixed(2)}€ + IVA (${iva}%)`;
}

function recuperarObra(id) {
    const o = clienteActual.obras.find(x => x.id === id);
    obraActual = o;
    medidasTemporales = [...o.medidas];
    document.getElementById('titulo-obra-actual').innerText = o.nombre;
    irAPantalla('trabajo');
    renderMedidas();
    document.getElementById('total-final-editable').value = o.totalFinal;
}

function guardarObraCompleta(modo) {
    const totalEditable = document.getElementById('total-final-editable').value;
    obraActual.medidas = [...medidasTemporales];
    obraActual.totalFinal = totalEditable;
    
    const idx = clienteActual.obras.findIndex(o => o.id === obraActual.id);
    if(idx !== -1) clienteActual.obras[idx] = obraActual;
    else clienteActual.obras.push(obraActual);
    
    localStorage.setItem('presupro_clientes', JSON.stringify(clientes));

    const msg = `Presupuesto de ${ajustes.nombre} para ${obraActual.nombre}. Total: ${totalEditable}€. Un saludo.`;

    if(modo === 'ws') window.open(`https://wa.me/${clienteActual.tel}?text=${encodeURIComponent(msg)}`);
    else if(modo === 'email') window.location.href = `mailto:${clienteActual.email}?subject=Presupuesto ${obraActual.nombre}&body=${encodeURIComponent(msg)}`;
    else alert("Obra guardada en historial.");
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
    alert("Datos guardados.");
    irAPantalla('clientes');
}

window.onload = () => {
    renderListaClientes();
    document.getElementById('config-nombre').value = ajustes.nombre;
    document.getElementById('config-cif').value = ajustes.cif;
    document.getElementById('config-dir').value = ajustes.dir;
    document.getElementById('config-cp').value = ajustes.cp;
    document.getElementById('config-ciudad').value = ajustes.ciudad;
};
