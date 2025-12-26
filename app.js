// 1. CONFIGURACIÓN
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

// 2. GESTIÓN DE CLIENTES
window.nuevoCliente = () => {
    const n = prompt("Nombre del Cliente:");
    if(!n) return;
    const tlf = prompt("Teléfono:");
    const obra = prompt("Dirección de la Obra:");
    db.clientes.push({ 
        id: Date.now(), 
        nombre: n, 
        telefono: tlf || "No indicado",
        direccion: obra || "No indicada",
        presupuestos: [] 
    });
    save();
    renderListaClientes();
};

window.renderListaClientes = () => {
    document.getElementById('lista-clientes').innerHTML = db.clientes.map((c, i) => `
        <div class="flex items-center gap-2 mb-3">
            <div onclick="abrirExpediente(${c.id})" class="flex-1 bg-white p-5 rounded-3xl border font-black uppercase flex justify-between items-center shadow-sm italic">
                <div class="flex flex-col text-left">
                    <span class="truncate text-blue-800">${c.nombre}</span>
                    <span class="text-[9px] text-slate-400 font-bold lowercase">${c.direccion}</span>
                </div>
                <span class="text-blue-500 ml-2">➔</span>
            </div>
            <button onclick="borrarCliente(${i})" class="bg-red-50 text-red-500 border border-red-200 h-[64px] w-[60px] rounded-3xl flex items-center justify-center text-xl">🗑️</button>
        </div>`).join('');
};

window.abrirExpediente = id => { 
    clienteActual = db.clientes.find(c => c.id === id); 
    irAPantalla('expediente'); 
    renderHistorial(); 
};

// 3. CALCULADORA (SUMAS)
window.teclear = n => {
    const disp = document.getElementById('calc-display');
    if (n === 'DEL') {
        calcEstado.valor = calcEstado.valor.toString().slice(0, -1);
    } else if (n === 'OK') {
        try {
            let formula = calcEstado.valor.replace(/,/g, '.');
            if(!formula) formula = "0";
            const resultado = eval(formula);
            calcEstado.datos[calcEstado.campo] = resultado;
            cerrarCalc(); 
            siguientePaso(); 
            return;
        } catch (e) {
            alert("Error en la suma.");
            calcEstado.valor = "";
        }
    } else {
        calcEstado.valor += n;
    }
    disp.innerText = calcEstado.valor || '0';
};

// 4. LÓGICA DE MEDICIÓN (CORREGIDA PARA HORAS)
window.prepararMedida = tipo => {
    const p = prompt(`Precio para ${CONFIG[tipo].n}:`, "0");
    if(!p) return;
    let conc = prompt(`¿Qué trabajo se ha hecho?`, "Montaje/Varios");
    calcEstado = { tipo: tipo, precio: parseFloat(p.replace(',','.')), valor: '', datos: {}, concepto: conc || "" };
    siguientePaso();
};

function siguientePaso() {
    const t = calcEstado.tipo, d = calcEstado.datos;
    
    if (['tabiques','techos','tabicas','cajones','cantoneras'].includes(t)) {
        if (d.largo === undefined) { 
            calcEstado.campo = 'largo'; 
            abrirCalc(`MEDIDA TRAMOS (+)`); 
        }
        else if (d.segundo_dato === undefined) { 
            calcEstado.campo = 'segundo_dato'; 
            abrirCalc(`ALTURA / MULTIPLICADOR`); 
        }
        else { finalizarMedicion(); }
    } else if (t === 'horas') {
        // CORRECCIÓN: Ahora las horas también pasan por la calculadora para sumar
        if (d.total === undefined) {
            calcEstado.campo = 'total';
            abrirCalc(`SUMAR HORAS (+)`); // Aquí pones 8+8+4...
        } else {
            finalizarMedicion();
        }
    }
}

function finalizarMedicion() {
    const d = calcEstado.datos;
    let cant = (d.largo !== undefined && d.segundo_dato !== undefined) ? d.largo * d.segundo_dato : (d.total || 0);
    
    if (cant > 0) {
        trabajoActual.lineas.push({ 
            tipo: calcEstado.tipo, 
            cantidad: cant, 
            precio: calcEstado.precio, 
            icono: CONFIG[calcEstado.tipo].i, 
            nombre: `${CONFIG[calcEstado.tipo].n} (${calcEstado.concepto})` 
        });
        renderListaMedidas();
        calcEstado.datos = {};
    }
}

// 5. RENDERIZADO Y PANTALLAS
window.renderListaMedidas = () => {
    const contenedor = document.getElementById('resumen-medidas-pantalla');
    if (!contenedor) return;
    contenedor.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-4 rounded-2xl border mb-2 shadow-sm">
            <div class="flex items-center gap-3">
                <span class="text-2xl">${l.icono}</span>
                <div class="flex flex-col text-left">
                    <span class="text-[10px] font-black uppercase text-blue-600">${l.nombre}</span>
                    <span class="text-[9px] text-slate-400 font-bold">${l.cantidad.toFixed(2)} ${CONFIG[l.tipo].uni} x ${l.precio}€</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-black text-slate-700">${(l.cantidad * l.precio).toFixed(2)}€</span>
                <button onclick="trabajoActual.lineas.splice(${i},1);renderListaMedidas()" class="text-red-400 p-2">✕</button>
            </div>
        </div>`).join('');
};

window.renderHistorial = () => { 
    document.getElementById('ficha-cliente-detalle').innerHTML = `
        <div class="bg-blue-50 p-5 rounded-3xl mb-6 border border-blue-100 shadow-inner">
            <div class="font-black text-blue-700 uppercase text-xl italic text-left">${clienteActual.nombre}</div>
            <div class="flex flex-wrap gap-4 mt-2">
                <div class="text-[10px] text-slate-500 font-bold uppercase">📞 ${clienteActual.telefono}</div>
                <div class="text-[10px] text-slate-500 font-bold uppercase">📍 ${clienteActual.direccion}</div>
            </div>
        </div>
    `;
    document.getElementById('archivo-presupuestos').innerHTML = (clienteActual.presupuestos || []).map((p, i) => `
        <div class="bg-white p-4 rounded-2xl border mb-2 flex justify-between items-center shadow-sm text-left">
            <span class="text-[11px] font-black uppercase italic text-slate-600">${p.lugar}</span>
            <div class="flex gap-2">
                <button onclick="generarPDF(${i})" class="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black">PDF</button>
                <button onclick="borrarPresu(${i})" class="text-slate-300 text-xs px-2">✕</button>
            </div>
        </div>`).reverse().join('');
};

window.save = () => localStorage.setItem('presupro_v3', JSON.stringify(db));
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

window.abrirCalc = t => { 
    document.getElementById('calc-titulo').innerText = t; 
    document.getElementById('calc-display').innerText = '0'; 
    calcEstado.valor = ''; 
    document.getElementById('modal-calc').classList.remove('hidden'); 
};
window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');
window.iniciarNuevaMedicion = () => { 
    const l = prompt("Nombre de la Obra:"); 
    if(l) { trabajoActual = { lugar: l, lineas: [], total: 0, firma: null }; irAPantalla('trabajo'); renderListaMedidas(); } 
};
window.guardarTodo = () => { 
    clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual))); 
    save(); irAPantalla('expediente'); renderHistorial(); 
};

window.renderPresupuesto = () => {
    let sub = trabajoActual.lineas.reduce((acc, l) => acc + (l.cantidad * l.precio), 0);
    let total = sub * 1.21;
    document.getElementById('desglose-precios').innerHTML = `
        <div class="text-[10px] font-black text-blue-500 mb-2 uppercase italic text-left">${trabajoActual.lugar}</div>
        ${trabajoActual.lineas.map(l => `<div class="border-b py-2 text-[11px] font-bold flex justify-between"><span>${l.icono} ${l.nombre}</span><span>${(l.cantidad*l.precio).toFixed(2)}€</span></div>`).join('')}
        <button onclick="abrirFirma()" class="w-full mt-4 border-2 border-dashed border-blue-200 py-3 rounded-xl text-blue-500 font-bold text-[10px] italic">AÑADIR FIRMA CLIENTE</button>
        ${trabajoActual.firma ? `<img src="${trabajoActual.firma}" class="h-16 mx-auto mt-2">` : ''}`;
    document.getElementById('total-final').innerText = total.toFixed(2) + "€";
    trabajoActual.total = total;
};

window.generarPDF = i => {
    const p = clienteActual.presupuestos[i];
    const el = document.createElement('div');
    el.style.padding = '40px';
    el.innerHTML = `<h1 style="color:#1e40af">PRESUPUESTO: ${p.lugar}</h1><p><b>Cliente:</b> ${clienteActual.nombre}</p><p><b>Obra:</b> ${clienteActual.direccion}</p><hr>` + 
        p.lineas.map(l => `<p>${l.nombre}: ${l.cantidad.toFixed(2)} x ${l.precio}€ = <b>${(l.cantidad*l.precio).toFixed(2)}€</b></p>`).join('') +
        `<hr><h2 style="text-align:right">TOTAL CON IVA: ${p.total.toFixed(2)}€</h2>` + (p.firma ? `<p>Firma Cliente:</p><img src="${p.firma}" style="width:200px">` : '');
    html2pdf().from(el).save(`${p.lugar}.pdf`);
};

window.borrarPresu = i => { if(confirm('¿Borrar?')) { clienteActual.presupuestos.splice(i,1); save(); renderHistorial(); } };
window.borrarCliente = i => { if(confirm('¿Borrar cliente?')) { db.clientes.splice(i,1); save(); renderListaClientes(); } };

let canvas, ctx, dibujando = false;
window.abrirFirma = () => {
    const h = `<div id="mf" class="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4"><div class="bg-white p-6 rounded-3xl w-full max-w-sm"><h3>Firma del Cliente</h3><canvas id="cf" class="border-2 border-dashed w-full h-40 bg-slate-50 rounded-xl touch-none"></canvas><div class="flex gap-2 mt-4"><button onclick="document.getElementById('mf').remove()" class="flex-1 bg-slate-100 py-3 rounded-xl font-bold uppercase text-[10px]">Cancelar</button><button onclick="gf()" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-[10px]">Guardar Firma</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', h);
    canvas = document.getElementById('cf'); ctx = canvas.getContext('2d'); canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    canvas.ontouchstart = e => { dibujando = true; ctx.beginPath(); ctx.moveTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); };
    canvas.ontouchmove = e => { if(dibujando) { ctx.lineTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); ctx.stroke(); } e.preventDefault(); };
    canvas.ontouchend = () => dibujando = false;
};
window.gf = () => { trabajoActual.firma = canvas.toDataURL(); document.getElementById('mf').remove(); renderPresupuesto(); };

window.onload = () => renderListaClientes();
