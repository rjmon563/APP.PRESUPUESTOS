// ==========================================
// 1. MEMORIA Y DATOS (Soporte Multiusuario)
// ==========================================
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], 
    ajustes: { nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '' } 
};

let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', zona: '', tarea: '' };

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', uni: 'm²', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', uni: 'm²', pasos: 3, m1: 'Largo', m2: 'Ancho', m3: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', uni: 'm²', pasos: 3, m1: 'Largo', m2: 'Ancho', m3: 'Altura' },
    'tabicas': { n: 'Tabica', i: '📐', uni: 'm²', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', uni: 'ml', pasos: 1, m1: 'Metros Lineales' }
};

const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// ==========================================
// 2. NAVEGACIÓN Y AJUSTES FISCALES
// ==========================================
window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
    if (id === 'ajustes') {
        document.getElementById('config-nombre').value = db.ajustes.nombre || '';
        document.getElementById('config-cif').value = db.ajustes.cif || '';
        document.getElementById('config-tel').value = db.ajustes.tel || '';
        document.getElementById('config-dir').value = db.ajustes.dir || '';
        document.getElementById('config-cp').value = db.ajustes.cp || '';
        document.getElementById('config-ciudad').value = db.ajustes.ciudad || '';
    }
};

window.guardarAjustes = () => {
    db.ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        tel: document.getElementById('config-tel').value,
        dir: document.getElementById('config-dir').value.toUpperCase(),
        cp: document.getElementById('config-cp').value,
        ciudad: document.getElementById('config-ciudad').value.toUpperCase()
    };
    asegurarGuardado();
    alert("✅ Datos Fiscales Actualizados");
    irAPantalla('clientes');
};

// ==========================================
// 3. GESTIÓN DE CLIENTES
// ==========================================
window.nuevoCliente = () => {
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir'].forEach(i => document.getElementById(i).value = "");
    irAPantalla('nuevo-cliente');
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("El nombre es obligatorio");
    db.clientes.push({ 
        id: Date.now(), nombre: nom.toUpperCase(), 
        cif: document.getElementById('cli-cif').value.toUpperCase() || "S/N",
        tel: document.getElementById('cli-tel').value || "S/T",
        dir: document.getElementById('cli-dir').value || "S/D",
        presupuestos: [] 
    });
    asegurarGuardado();
    irAPantalla('clientes');
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 italic">SIN CLIENTES</p>' :
    db.clientes.map(c => `
        <div onclick="abrirExpediente(${c.id})" class="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center mb-3 active-scale">
            <p class="font-black text-slate-800 uppercase italic text-sm">${c.nombre}</p>
            <button onclick="event.stopPropagation(); if(confirm('¿Borrar cliente?')){db.clientes=db.clientes.filter(x=>x.id!==${c.id}); asegurarGuardado(); renderListaClientes();}" class="text-red-500 p-3 rounded-2xl bg-red-50">🗑️</button>
        </div>`).reverse().join('');
};

window.abrirExpediente = (id) => {
    clienteActual = db.clientes.find(x => x.id === id);
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-600 text-white p-7 rounded-[40px] shadow-lg italic">
            <h2 class="text-xl font-black uppercase mb-1">${clienteActual.nombre}</h2>
            <p class="text-[10px] opacity-80 font-bold uppercase tracking-wider">${clienteActual.dir}</p>
        </div>`;
    irAPantalla('expediente');
};

// ==========================================
// 4. LÓGICA DE TRABAJO
// ==========================================
window.confirmarNombreObra = () => {
    const v = document.getElementById('input-nombre-obra').value;
    if (!v) return alert("Indica la zona");
    obraEnCurso = { nombre: v.toUpperCase(), lineas: [] };
    document.getElementById('titulo-obra-actual').innerText = "ZONA: " + obraEnCurso.nombre;
    irAPantalla('trabajo'); renderBotones(); renderMedidas();
};

function renderBotones() {
    document.getElementById('botones-trabajo').innerHTML = Object.keys(CONFIG_MEDIDAS).map(k => `
        <button onclick="prepararMedida('${k}')" class="bg-white p-6 rounded-[30px] shadow-sm border flex flex-col items-center active-scale">
            <span class="text-3xl mb-1">${CONFIG_MEDIDAS[k].i}</span>
            <span class="text-[9px] font-black uppercase opacity-60">${CONFIG_MEDIDAS[k].n}</span>
        </button>`).join('');
}

window.prepararMedida = (t) => {
    const zona = prompt("¿HABITACIÓN / LUGAR?", "GENERAL");
    if (!zona) return;
    const tarea = prompt("¿QUÉ TRABAJO?", "MONTAJE");
    if (!tarea) return;
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', zona: zona.toUpperCase(), tarea: tarea.toUpperCase() };
    abrirCalculadora();
};

// ==========================================
// 5. CALCULADORA (Anti-Teclado Nativo)
// ==========================================
function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let txt = (conf.pasos === 1) ? conf.m1 : (calcEstado.paso === 1 ? conf.m1 : (calcEstado.paso === 2 ? conf.m2 : conf.m3));
    document.getElementById('calc-titulo').innerText = txt.toUpperCase() + " (" + calcEstado.zona + ")";
    document.getElementById('calc-display').innerText = '0';
    document.getElementById('modal-calc').classList.remove('hidden');
    document.activeElement.blur(); 
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        let cifra = eval(calcEstado.memoria.replace(/,/g, '.')) || 0;
        const conf = CONFIG_MEDIDAS[calcEstado.tipo];
        if (calcEstado.paso < conf.pasos) {
            if (calcEstado.paso === 1) calcEstado.v1 = cifra;
            if (calcEstado.paso === 2) calcEstado.v2 = cifra;
            calcEstado.paso++; calcEstado.memoria = ''; abrirCalculadora();
        } else {
            let total = (conf.pasos === 1) ? cifra : (conf.pasos === 2 ? calcEstado.v1 * cifra : calcEstado.v1 * calcEstado.v2 * cifra);
            document.getElementById('modal-calc').classList.add('hidden');
            setTimeout(() => pedirPrecio(total), 300);
        }
    } else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria; }
};

function pedirPrecio(cant) {
    const p = prompt(`METROS: ${cant.toFixed(2)}\n¿PRECIO (€)?`, "20");
    const precio = parseFloat(p ? p.replace(',','.') : 0) || 0;
    obraEnCurso.lineas.push({
        id: Date.now(),
        nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${calcEstado.tarea} - ${calcEstado.zona}`,
        cantidad: cant, precio: precio, subtotal: cant * precio
    });
    renderMedidas();
}

function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    const total = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);
    cont.innerHTML = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm italic font-bold">
            <div class="text-[9px] uppercase leading-tight">
                <p class="text-blue-800">${l.nombre}</p>
                <p class="opacity-40">${l.cantidad.toFixed(2)} x ${l.precio.toFixed(2)}€</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-black">${l.subtotal.toFixed(2)}€</span>
                <button onclick="borrarLinea(${l.id})" class="text-red-400 p-2">✕</button>
            </div>
        </div>`).reverse().join('') + 
        (total > 0 ? `<div class="bg-slate-900 text-green-400 p-6 rounded-[35px] text-center font-black mt-5 shadow-xl">TOTAL: ${total.toFixed(2)}€</div>` : '');
}

window.borrarLinea = (id) => {
    obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id);
    renderMedidas();
};

window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');

// ==========================================
// 6. PDF PROFESIONAL CON DATOS COMPLETOS
// ==========================================
window.guardarObraCompleta = async () => {
    if (obraEnCurso.lineas.length === 0) return alert("No hay datos");
    const total = obraEnCurso.lineas.reduce((a,b) => a+b.subtotal, 0);
    
    const el = document.createElement('div');
    el.innerHTML = `
        <div style="padding:40px; font-family:sans-serif; color:#333;">
            <div style="display:flex; justify-content:space-between; border-bottom:4px solid #2563eb; padding-bottom:15px; margin-bottom:20px;">
                <div style="width: 70%;">
                    <h1 style="margin:0; color:#2563eb; font-size:24px; font-style:italic;">PRESUPUESTO</h1>
                    <p style="margin:5px 0 0 0; font-weight:bold; font-size:16px;">${db.ajustes.nombre || 'EMISOR'}</p>
                    <p style="margin:0; font-size:11px; color:#555;">CIF: ${db.ajustes.cif || '-'}</p>
                    <p style="margin:0; font-size:11px; color:#555;">${db.ajustes.dir || ''}</p>
                    <p style="margin:0; font-size:11px; color:#555;">${db.ajustes.cp || ''} ${db.ajustes.ciudad || ''}</p>
                    <p style="margin:0; font-size:11px; color:#555;">TEL: ${db.ajustes.tel || ''}</p>
                </div>
                <div style="text-align:right;">
                    <svg width="60" height="60" viewBox="0 0 100 100">
                        <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="#2563eb"/>
                        <text x="50" y="65" font-family="Arial" font-size="45" font-weight="bold" fill="white" text-anchor="middle">P</text>
                    </svg>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; background:#f1f5f9; padding:15px; border-radius:10px; margin-bottom:20px; font-size:12px;">
                <div>
                    <p style="margin:0; color:#64748b; font-weight:bold; font-size:10px;">CLIENTE</p>
                    <p style="margin:0; font-weight:bold;">${clienteActual.nombre}</p>
                    <p style="margin:0;">CIF: ${clienteActual.cif}</p>
                    <p style="margin:0;">${clienteActual.dir}</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; color:#64748b; font-weight:bold; font-size:10px;">DETALLES</p>
                    <p style="margin:0;"><b>ZONA:</b> ${obraEnCurso.nombre}</p>
                    <p style="margin:0;"><b>FECHA:</b> ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#2563eb; color:white;">
                        <th style="padding:10px; text-align:left; font-size:11px;">DESCRIPCIÓN DE TRABAJOS</th>
                        <th style="padding:10px; text-align:right; font-size:11px;">SUBTOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${obraEnCurso.lineas.map(l => `
                    <tr>
                        <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px;">
                            <b>${l.nombre}</b><br>
                            <span style="color:#666;">${l.cantidad.toFixed(2)} unid. x ${l.precio.toFixed(2)}€</span>
                        </td>
                        <td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold;">${l.subtotal.toFixed(2)}€</td>
                    </tr>`).join('')}
                </tbody>
            </table>

            <div style="margin-top:30px; text-align:right;">
                <p style="margin:0; font-size:12px; color:#64748b;">TOTAL A PAGAR</p>
                <h2 style="margin:0; color:#16a34a; font-size:32px;">${total.toFixed(2)}€</h2>
            </div>
        </div>`;
    
    const opt = {
        margin: 0.5,
        filename: `Presu_${clienteActual.nombre}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(el).set(opt).save();

    setTimeout(() => {
        if(confirm("✅ PDF Guardado.\n\n¿Enviar resumen por WhatsApp?")){
            const txt = `*PRESUPUESTO*%0A*Cliente:* ${clienteActual.nombre}%0A*Total:* ${total.toFixed(2)}€%0A%0A_Adjunto envío PDF..._`;
            window.open(`https://wa.me/?text=${txt}`, '_blank');
        }
        clienteActual.presupuestos.push({...obraEnCurso, total});
        asegurarGuardado();
        irAPantalla('expediente');
    }, 1500);
};

window.onload = () => renderListaClientes();
