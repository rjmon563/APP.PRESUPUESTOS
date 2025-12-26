const CONFIG = {
    'tabiques': { n: 'Tabiques', i: '🧱', uni: 'm²' },
    'techos': { n: 'Techos', i: '🏠', uni: 'm²' },
    'cajones': { n: 'Cajones', i: '📦', uni: 'm²' },
    'tabicas': { n: 'Tabicas', i: '📐', uni: 'm²' },
    'cantoneras': { n: 'Cantoneras', i: '📏', uni: 'ml' },
    'horas': { n: 'Horas', i: '⏱️', uni: 'hrs' }
};

let db = JSON.parse(localStorage.getItem('presupro_v3')) || { clientes: [] };
let clienteActual = null;
let trabajoActual = { lineas: [], total: 0, lugar: "", firma: null };
let calcEstado = { tipo: '', campo: '', valor: '', precio: 0, datos: {}, concepto: '' };

window.save = () => localStorage.setItem('presupro_v3', JSON.stringify(db));

// --- GESTIÓN DE CLIENTES ---
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if(!n) return;
    const t = prompt("Teléfono:");
    const d = prompt("Dirección de la Obra:");
    db.clientes.push({ id: Date.now(), nombre: n.toUpperCase(), telefono: t || "", direccion: d || "", presupuestos: [] });
    save();
    renderListaClientes();
};

window.renderListaClientes = () => {
    const lista = document.getElementById('lista-clientes');
    if(!lista) return;
    lista.innerHTML = db.clientes.map((c, i) => `
        <div class="flex items-center gap-2 mb-2">
            <div onclick="abrirExpediente(${c.id})" class="flex-1 bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center italic">
                <div class="flex flex-col text-left">
                    <span class="font-black text-blue-800 uppercase">${c.nombre}</span>
                    <span class="text-[9px] text-slate-400 font-bold">${c.direccion}</span>
                </div>
                <span class="text-blue-400">➔</span>
            </div>
            <button onclick="borrarCliente(${i})" class="bg-red-50 text-red-500 w-12 h-[60px] rounded-2xl flex items-center justify-center">🗑️</button>
        </div>`).join('');
};

window.abrirExpediente = id => { clienteActual = db.clientes.find(c => c.id === id); irAPantalla('expediente'); renderHistorial(); };

// --- CALCULADORA ---
window.teclear = n => {
    const disp = document.getElementById('calc-display');
    if (n === 'DEL') { calcEstado.valor = calcEstado.valor.slice(0, -1); }
    else if (n === 'OK') {
        try {
            let res = eval(calcEstado.valor.replace(/,/g, '.'));
            calcEstado.datos[calcEstado.campo] = res;
            cerrarCalc();
            siguientePaso();
        } catch (e) { alert("Error"); calcEstado.valor = ""; }
    } else { calcEstado.valor += n; }
    disp.innerText = calcEstado.valor || '0';
};

// --- LÓGICA DE MEDICIÓN ---
window.prepararMedida = tipo => {
    const p = prompt(`Precio para ${CONFIG[tipo].n}:`, "0"); if(!p) return;
    const c = prompt("Trabajo realizado:", "Montaje");
    calcEstado = { tipo: tipo, precio: parseFloat(p.replace(',','.')), valor: '', datos: {}, concepto: c };
    siguientePaso();
};

function siguientePaso() {
    const t = calcEstado.tipo, d = calcEstado.datos;
    if (t === 'techos') {
        if (d.largo === undefined) { calcEstado.campo = 'largo'; abrirCalc("LARGO DEL TECHO"); }
        else if (d.segundo_dato === undefined) { calcEstado.campo = 'segundo_dato'; abrirCalc("ANCHO DEL TECHO"); }
        else { finalizarMedicion(); }
    } else if (['tabiques','tabicas','cajones','cantoneras'].includes(t)) {
        if (d.largo === undefined) { calcEstado.campo = 'largo'; abrirCalc("SUMA TRAMOS (+)"); }
        else if (d.segundo_dato === undefined) { calcEstado.campo = 'segundo_dato'; abrirCalc("ALTURA"); }
        else { finalizarMedicion(); }
    } else {
        if (d.total === undefined) { calcEstado.campo = 'total'; abrirCalc("SUMA HORAS (+)"); }
        else { finalizarMedicion(); }
    }
}

function finalizarMedicion() {
    const d = calcEstado.datos;
    let cant = (d.largo !== undefined && d.segundo_dato !== undefined) ? d.largo * d.segundo_dato : (d.total || 0);
    trabajoActual.lineas.push({ tipo: calcEstado.tipo, cantidad: cant, precio: calcEstado.precio, icono: CONFIG[calcEstado.tipo].i, nombre: `${CONFIG[calcEstado.tipo].n} (${calcEstado.concepto})` });
    renderListaMedidas();
}

// --- EDICIÓN DE LÍNEAS (NUEVO) ---
window.editarLinea = i => {
    const l = trabajoActual.lineas[i];
    const nuevoNombre = prompt("Modificar trabajo realizado:", l.nombre);
    const nuevaCant = prompt("Modificar cantidad (m², ml o hrs):", l.cantidad);
    const nuevoPrecio = prompt("Modificar precio:", l.precio);
    
    if (nuevoNombre !== null) l.nombre = nuevoNombre;
    if (nuevaCant !== null) l.cantidad = parseFloat(nuevaCant.replace(',','.'));
    if (nuevoPrecio !== null) l.precio = parseFloat(nuevoPrecio.replace(',','.'));
    
    renderListaMedidas();
    if (!document.getElementById('vista-economico').classList.contains('hidden')) renderPresupuesto();
};

window.renderListaMedidas = () => {
    document.getElementById('resumen-medidas-pantalla').innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-4 rounded-2xl border mb-2 shadow-sm text-left italic">
            <div class="flex items-center gap-3">
                <span class="text-2xl">${l.icono}</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase text-blue-600">${l.nombre}</span>
                    <span class="text-[9px] text-slate-400 font-bold">${l.cantidad.toFixed(2)} x ${l.precio}€</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="editarLinea(${i})" class="bg-blue-50 text-blue-600 p-2 rounded-lg">✏️</button>
                <button onclick="trabajoActual.lineas.splice(${i},1);renderListaMedidas()" class="bg-red-50 text-red-500 p-2 rounded-lg">✕</button>
            </div>
        </div>`).join('');
};

window.renderPresupuesto = () => {
    let sub = trabajoActual.lineas.reduce((acc, l) => acc + (l.cantidad * l.precio), 0);
    let total = sub * 1.21;
    document.getElementById('desglose-precios').innerHTML = `
        <div class="text-[10px] font-black text-blue-500 mb-3 uppercase italic text-left underline">${trabajoActual.lugar}</div>
        ` + trabajoActual.lineas.map((l, i) => `
        <div class="border-b py-3 text-[11px] font-bold flex justify-between items-center">
            <div class="flex flex-col">
                <span>${l.icono} ${l.nombre}</span>
                <span class="text-[9px] text-slate-400">${l.cantidad.toFixed(2)} x ${l.precio}€</span>
            </div>
            <div class="flex items-center gap-3">
                <span>${(l.cantidad*l.precio).toFixed(2)}€</span>
                <button onclick="editarLinea(${i})" class="text-blue-400 text-xs">edit</button>
            </div>
        </div>`).join('');
    document.getElementById('total-final').innerText = total.toFixed(2) + "€";
    trabajoActual.total = total;
};

// --- NAVEGACIÓN Y PDF ---
window.renderHistorial = () => {
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100 text-left">
            <div class="font-black text-blue-700 uppercase italic text-lg">${clienteActual.nombre}</div>
            <div class="text-[10px] text-slate-500 font-bold">📞 ${clienteActual.telefono} | 📍 ${clienteActual.direccion}</div>
        </div>`;
    document.getElementById('archivo-presupuestos').innerHTML = (clienteActual.presupuestos || []).map((p, i) => `
        <div class="bg-white p-4 rounded-2xl border mb-2 flex justify-between items-center italic">
            <span class="text-[11px] font-black uppercase text-slate-600">${p.lugar}</span>
            <div class="flex gap-2">
                <button onclick="generarPDF(${i})" class="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black">PDF</button>
                <button onclick="borrarPresu(${i})" class="text-slate-300 px-2 font-bold">✕</button>
            </div>
        </div>`).reverse().join('');
};

window.irAPantalla = id => {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.cambiarVista = v => {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    if(v === 'economico') renderPresupuesto();
};

window.abrirCalc = t => { document.getElementById('calc-titulo').innerText = t; document.getElementById('calc-display').innerText = '0'; calcEstado.valor = ''; document.getElementById('modal-calc').classList.remove('hidden'); };
window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');
window.iniciarNuevaMedicion = () => { const l = prompt("Nombre del Proyecto/Obra:"); if(l) { trabajoActual = { lugar: l, lineas: [], total: 0 }; irAPantalla('trabajo'); renderListaMedidas(); } };
window.guardarTodo = () => { clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual))); save(); irAPantalla('expediente'); renderHistorial(); };
window.borrarCliente = i => { if(confirm('¿Borrar cliente?')) { db.clientes.splice(i,1); save(); renderListaClientes(); } };
window.borrarPresu = i => { if(confirm('¿Borrar obra?')) { clienteActual.presupuestos.splice(i,1); save(); renderHistorial(); } };

window.generarPDF = i => {
    const p = clienteActual.presupuestos[i];
    const el = document.createElement('div');
    el.style.padding = '40px'; el.style.fontFamily = 'sans-serif';
    el.innerHTML = `
        <div style="border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color:#1e40af; margin:0; text-transform: uppercase;">Presupuesto de Pladur</h1>
            <p style="margin:5px 0; font-size: 14px;"><b>Proyecto:</b> ${p.lugar}</p>
        </div>
        <p><b>Cliente:</b> ${clienteActual.nombre}</p>
        <p><b>Dirección:</b> ${clienteActual.direccion}</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="background: #f1f5f9; text-align: left;">
                <th style="padding: 10px; border-bottom: 1px solid #ddd;">Concepto</th>
                <th style="padding: 10px; border-bottom: 1px solid #ddd;">Cantidad</th>
                <th style="padding: 10px; border-bottom: 1px solid #ddd;">Precio</th>
                <th style="padding: 10px; border-bottom: 1px solid #ddd;">Subtotal</th>
            </tr>
            ${p.lineas.map(l => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${l.nombre}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${l.cantidad.toFixed(2)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${l.precio.toFixed(2)}€</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>${(l.cantidad*l.precio).toFixed(2)}€</b></td>
                </tr>
            `).join('')}
        </table>
        <div style="text-align: right; margin-top: 30px;">
            <p style="font-size: 18px; color: #1e40af;"><b>TOTAL (IVA INC.): ${p.total.toFixed(2)}€</b></p>
        </div>
    `;
    html2pdf().from(el).set({ margin: 1, filename: `${p.lugar}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).save();
};

window.onload = () => renderListaClientes();
