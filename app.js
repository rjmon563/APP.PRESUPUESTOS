// MEMORIA Y DATOS
let db = JSON.parse(localStorage.getItem('presupro_v3')) || { 
    clientes: [], 
    ajustes: { nombre: '', tel: '', cif: '', dir: '', cp: '', ciudad: '', nPresu: 1 } 
};

let clienteActual = null;
let obraEnCurso = { nombre: '', lineas: [] };
let calcEstado = { tipo: '', paso: 1, v1: 0, v2: 0, memoria: '', zona: '', tarea: '', modo: 'medida' }; 

const CONFIG_MEDIDAS = {
    'techos': { n: 'Techo', i: '🏠', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'tabiques': { n: 'Tabique', i: '🧱', pasos: 2, m1: 'Suma de tramos', m2: 'Altura' },
    'cajones': { n: 'Cajón', i: '📦', pasos: 2, m1: 'Suma de tramos', m2: 'Altura/Fondo' },
    'tabicas': { n: 'Tabica', i: '📐', pasos: 2, m1: 'Ancho', m2: 'Largo' },
    'cantoneras': { n: 'Cantonera', i: '📏', pasos: 1, m1: 'Metros Totales' }
};

const asegurarGuardado = () => localStorage.setItem('presupro_v3', JSON.stringify(db));
const fNum = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

window.irAPantalla = (id) => {
    document.querySelectorAll('[id^="pantalla-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if (id === 'clientes') renderListaClientes();
    if (id === 'ajustes') {
        ['nombre','cif','tel','dir','cp','ciudad','nPresu'].forEach(k => {
            document.getElementById(`config-${k}`).value = db.ajustes[k] || (k === 'nPresu' ? 1 : '');
        });
    }
};

window.guardarAjustes = () => {
    db.ajustes = {
        nombre: document.getElementById('config-nombre').value.toUpperCase(),
        cif: document.getElementById('config-cif').value.toUpperCase(),
        tel: document.getElementById('config-tel').value,
        dir: document.getElementById('config-dir').value.toUpperCase(),
        cp: document.getElementById('config-cp').value,
        ciudad: document.getElementById('config-ciudad').value.toUpperCase(),
        nPresu: parseInt(document.getElementById('config-nPresu').value) || 1
    };
    asegurarGuardado();
    alert("✅ Datos guardados correctamente");
    irAPantalla('clientes');
};

window.nuevoCliente = () => {
    ['cli-nombre', 'cli-cif', 'cli-tel', 'cli-dir'].forEach(i => document.getElementById(i).value = "");
    irAPantalla('nuevo-cliente');
};

window.guardarDatosCliente = () => {
    const nom = document.getElementById('cli-nombre').value.trim();
    if (!nom) return alert("El nombre es obligatorio");
    db.clientes.push({ 
        id: Date.now(), 
        nombre: nom.toUpperCase(), 
        cif: document.getElementById('cli-cif').value.toUpperCase() || "S/N",
        tel: document.getElementById('cli-tel').value || "S/T",
        dir: document.getElementById('cli-dir').value.toUpperCase() || "S/D",
        presupuestos: [] 
    });
    asegurarGuardado();
    irAPantalla('clientes');
};

window.renderListaClientes = () => {
    const cont = document.getElementById('lista-clientes');
    cont.innerHTML = db.clientes.length === 0 ? '<p class="text-center opacity-40 py-10 italic">NO HAY CLIENTES</p>' :
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
    const zona = prompt("¿ZONA/ESTANCIA?", "GENERAL"); if (!zona) return;
    const tarea = prompt("¿TAREA?", "MONTAJE"); if (!tarea) return;
    calcEstado = { tipo: t, paso: 1, v1: 0, v2: 0, memoria: '', zona: zona.toUpperCase(), tarea: tarea.toUpperCase(), modo: 'medida' };
    abrirCalculadora();
};

function abrirCalculadora() {
    const conf = CONFIG_MEDIDAS[calcEstado.tipo];
    let txt = calcEstado.modo === 'precio' ? `PRECIO PARA ${calcEstado.tarea}` : (calcEstado.paso === 1 ? conf.m1 : conf.m2);
    document.getElementById('calc-titulo').innerText = txt;
    document.getElementById('calc-display').innerText = calcEstado.memoria.replace(/\./g, ',') || '0';
    document.getElementById('modal-calc').classList.remove('hidden');
}

window.teclear = (n) => {
    const disp = document.getElementById('calc-display');
    if (n === 'OK') {
        let cifra = 0;
        try { cifra = eval(calcEstado.memoria) || 0; } catch(e) { alert("Error"); return; }
        const conf = CONFIG_MEDIDAS[calcEstado.tipo];
        if (calcEstado.modo === 'medida') {
            if (calcEstado.paso < conf.pasos) {
                calcEstado.v1 = cifra; calcEstado.paso++; calcEstado.memoria = ''; abrirCalculadora();
            } else {
                calcEstado.totalMetros = (conf.pasos === 1) ? cifra : calcEstado.v1 * cifra;
                calcEstado.modo = 'precio'; calcEstado.memoria = ''; abrirCalculadora();
            }
        } else {
            obraEnCurso.lineas.push({
                id: Date.now(),
                nombre: `${CONFIG_MEDIDAS[calcEstado.tipo].i} ${calcEstado.tarea} - ${calcEstado.zona}`,
                cantidad: calcEstado.totalMetros, precio: cifra, subtotal: calcEstado.totalMetros * cifra
            });
            document.getElementById('modal-calc').classList.add('hidden');
            renderMedidas();
        }
    } else if (n === 'DEL') { calcEstado.memoria = ''; disp.innerText = '0'; }
    else { calcEstado.memoria += n; disp.innerText = calcEstado.memoria.replace(/\./g, ','); }
};

function renderMedidas() {
    const cont = document.getElementById('lista-medidas-obra');
    const total = obraEnCurso.lineas.reduce((a, b) => a + b.subtotal, 0);
    cont.innerHTML = obraEnCurso.lineas.map(l => `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm font-bold text-[10px] uppercase italic">
            <div>
                <p class="text-blue-800">${l.nombre}</p>
                <p class="opacity-40">${fNum(l.cantidad)} x ${fNum(l.precio)}€</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-black text-xs">${fNum(l.subtotal)}€</span>
                <button onclick="borrarLinea(${l.id})" class="text-red-400 p-2 rounded-xl bg-red-50 text-xs">✕</button>
            </div>
        </div>`).reverse().join('') + 
        (total > 0 ? `<div class="bg-slate-900 text-green-400 p-6 rounded-[35px] text-center font-black mt-5 shadow-xl">TOTAL: ${fNum(total)}€</div>` : '');
}

window.borrarLinea = (id) => { if(confirm("¿Borrar?")) { obraEnCurso.lineas = obraEnCurso.lineas.filter(x => x.id !== id); renderMedidas(); } };
window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');

window.guardarObraCompleta = async () => {
    if (obraEnCurso.lineas.length === 0) return alert("Sin datos");
    const total = obraEnCurso.lineas.reduce((a,b) => a+b.subtotal, 0);
    const numFactura = `${new Date().getFullYear()}/${String(db.ajustes.nPresu).padStart(3, '0')}`;
    const el = document.createElement('div');
    el.innerHTML = `
        <div style="padding:40px; font-family:sans-serif; color:#333;">
            <div style="display:flex; justify-content:space-between; border-bottom:4px solid #2563eb; padding-bottom:15px; margin-bottom:20px;">
                <div>
                    <h1 style="margin:0; color:#2563eb; font-size:24px; font-style:italic;">PRESUPUESTO</h1>
                    <p style="margin:5px 0 0 0; font-weight:bold;">${db.ajustes.nombre}</p>
                    <p style="margin:0; font-size:11px;">CIF: ${db.ajustes.cif} | TEL: ${db.ajustes.tel}</p>
                    <p style="margin:0; font-size:11px;">${db.ajustes.dir} - ${db.ajustes.cp} ${db.ajustes.ciudad}</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; font-weight:bold; color:#2563eb;">Nº: ${numFactura}</p>
                    <p style="margin:0; font-size:11px;">Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
                </div>
            </div>
            <div style="background:#f8fafc; padding:15px; border-radius:10px; margin-bottom:20px; font-size:11px; border:1px solid #e2e8f0;">
                <p style="margin:0; color:#64748b; font-weight:bold; font-size:9px; text-transform:uppercase;">Datos del Cliente</p>
                <p style="margin:0; font-weight:bold; font-size:13px;">${clienteActual.nombre}</p>
                <p style="margin:0;">DIRECCIÓN: ${clienteActual.dir}</p>
                <p style="margin:0;">CIF: ${clienteActual.cif}</p>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#2563eb; color:white; font-size:10px;">
                        <th style="padding:10px; text-align:left;">DESCRIPCIÓN / ZONA</th>
                        <th style="padding:10px; text-align:right;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${obraEnCurso.lineas.map(l => `<tr><td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:11px;"><b>${l.nombre}</b><br><span style="color:#666;">${fNum(l.cantidad)} unid. x ${fNum(l.precio)}€</span></td><td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold; font-size:11px;">${fNum(l.subtotal)}€</td></tr>`).join('')}
                </tbody>
            </table>
            <div style="margin-top:30px; text-align:right;">
                <h2 style="margin:0; color:#16a34a; font-size:28px;">TOTAL: ${fNum(total)}€</h2>
            </div>
        </div>`;
    html2pdf().from(el).set({ margin: 0.5, filename: `Presu_${numFactura.replace('/','-')}.pdf`, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).save();
    setTimeout(() => {
        db.ajustes.nPresu++; 
        asegurarGuardado(); irAPantalla('expediente');
        alert("Presupuesto guardado y número actualizado.");
    }, 1500);
};

// COPIA DE SEGURIDAD
window.exportarDatos = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", "copia_presupro.json");
    document.body.appendChild(a); a.click(); a.remove();
};
window.importarDatos = () => {
    const f = document.createElement('input'); f.type = 'file';
    f.onchange = e => {
        const reader = new FileReader(); reader.readAsText(e.target.files[0],'UTF-8');
        reader.onload = r => { try { db = JSON.parse(r.target.result); asegurarGuardado(); location.reload(); } catch(e){ alert("Error"); } }
    }; f.click();
};

window.onload = () => renderListaClientes();
