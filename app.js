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

window.irAPantalla = id => {
    document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(`pantalla-${id}`).classList.remove('hidden');
    if(id === 'clientes') renderListaClientes();
};

window.cambiarVista = v => {
    document.querySelectorAll('.vista-trabajo').forEach(div => div.classList.add('hidden'));
    document.getElementById(`vista-${v}`).classList.remove('hidden');
    document.getElementById('tab-medidas').className = v === 'medidas' ? 'flex-1 py-4 font-black uppercase text-[10px] border-b-4 border-blue-600 text-blue-600' : 'flex-1 py-4 font-black uppercase text-[10px] text-slate-400';
    document.getElementById('tab-economico').className = v === 'economico' ? 'flex-1 py-4 font-black uppercase text-[10px] border-b-4 border-blue-600 text-blue-600' : 'flex-1 py-4 font-black uppercase text-[10px] text-slate-400';
    if(v === 'economico') renderPresupuesto();
};

window.renderListaClientes = () => {
    document.getElementById('lista-clientes').innerHTML = db.clientes.map((c, i) => `
        <div class="flex items-center gap-2 mb-3">
            <div onclick="abrirExpediente(${c.id})" class="flex-1 bg-white p-5 rounded-3xl border font-black uppercase flex justify-between shadow-sm italic overflow-hidden">
                <span class="truncate">${c.nombre}</span><span class="text-blue-500 ml-2">➔</span>
            </div>
            <button onclick="borrarCliente(${i})" class="bg-red-50 text-red-500 border border-red-200 h-[64px] w-[60px] rounded-3xl flex items-center justify-center text-xl">🗑️</button>
        </div>`).join('');
};

window.abrirExpediente = id => { clienteActual = db.clientes.find(c => c.id === id); irAPantalla('expediente'); renderHistorial(); };

window.prepararMedida = tipo => {
    const p = prompt(`Precio para ${CONFIG[tipo].n}:`, "0");
    if(!p) return;
    let conc = (tipo === 'horas') ? prompt(`Días y trabajo:`, "Admin") : prompt(`¿Qué trabajo?`, "Montaje");
    calcEstado = { tipo: tipo, precio: parseFloat(p.replace(',','.')), valor: '', datos: {}, concepto: conc || "" };
    siguientePaso();
};

function siguientePaso() {
    const t = calcEstado.tipo, d = calcEstado.datos;
    if (['tabiques','techos','tabicas','cajones'].includes(t)) {
        if (d.largo === undefined) { calcEstado.campo = 'largo'; abrirCalc(`LARGO (+)`); }
        else if (d.segundo_dato === undefined) { calcEstado.campo = 'segundo_dato'; abrirCalc(`ANCHO/ALTO (+)`); }
        else { finalizarMedicion(); }
    } else { calcEstado.campo = 'total'; abrirCalc('TOTAL (+)'); }
}

window.teclear = n => {
    const disp = document.getElementById('calc-display');
    if (n === 'DEL') {
        calcEstado.valor = calcEstado.valor.toString().slice(0, -1);
    } else if (n === 'OK') {
        try {
            // Esta es la mejora: Calcula la suma de lo que hayas escrito (1+5+8...)
            const resultado = eval(calcEstado.valor.replace(/,/g, '.'));
            calcEstado.datos[calcEstado.campo] = resultado;
            cerrarCalc(); 
            siguientePaso(); 
            return;
        } catch (e) {
            alert("Operación no válida");
            calcEstado.valor = "";
        }
    } else {
        // Permite ir acumulando números y el signo +
        calcEstado.valor += n;
    }
    disp.innerText = calcEstado.valor || '0';
};
function finalizarMedicion() {
    const d = calcEstado.datos;
    // Calcula la cantidad final (Largo x Ancho o Total directo)
    let cant = (d.largo !== undefined && d.segundo_dato !== undefined) ? d.largo * d.segundo_dato : (d.total || 0);
    
    if (cant > 0) {
        // Añadimos la línea al trabajo actual
        trabajoActual.lineas.push({ 
            tipo: calcEstado.tipo, 
            cantidad: cant, 
            precio: calcEstado.precio, 
            icono: CONFIG[calcEstado.tipo].i, 
            nombre: `${CONFIG[calcEstado.tipo].n} (${calcEstado.concepto})` 
        });
        
        // ¡ESTO ES LO IMPORTANTE!: Ordenamos que se pinte el icono y el resultado en la pantalla
        renderListaMedidas();
        
        // Limpiamos los datos para la siguiente medida
        calcEstado.datos = {};
    }
}

window.renderListaMedidas = () => {
    const contenedor = document.getElementById('resumen-medidas-pantalla');
    if (!contenedor) return;
    
    // Dibujamos cada línea con su icono (🧱, 🏠, etc.) y el dinero que suma
    contenedor.innerHTML = trabajoActual.lineas.map((l, i) => `
        <div class="flex justify-between items-center bg-white p-4 rounded-2xl border mb-2 shadow-sm animate-in fade-in">
            <div class="flex items-center gap-3">
                <span class="text-2xl">${l.icono}</span>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase text-blue-600">${l.nombre}</span>
                    <span class="text-[9px] text-slate-400 font-bold">${l.cantidad.toFixed(2)} ${CONFIG[l.tipo].uni} x ${l.precio}€</span>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-black text-slate-700">${(l.cantidad * l.precio).toFixed(2)}€</span>
                <button onclick="trabajoActual.lineas.splice(${i},1);renderListaMedidas()" class="text-red-400 p-2">✕</button>
            </div>
        </div>`).join('');
};
}

window.renderPresupuesto = () => {
    let sub = trabajoActual.lineas.reduce((acc, l) => acc + (l.cantidad * l.precio), 0);
    let total = sub * 1.21;
    document.getElementById('desglose-precios').innerHTML = `
        <div class="text-[10px] font-black text-blue-500 mb-2 uppercase italic">${trabajoActual.lugar}</div>
        ${trabajoActual.lineas.map(l => `<div class="border-b py-2 text-[11px] font-bold"><div class="flex justify-between"><span>${l.icono} ${l.nombre}</span><span>${(l.cantidad*l.precio).toFixed(2)}€</span></div></div>`).join('')}
        <button onclick="abrirFirma()" class="w-full mt-4 border-2 border-dashed border-blue-200 py-3 rounded-xl text-blue-500 font-bold text-[10px] italic">AÑADIR FIRMA CLIENTE</button>
        ${trabajoActual.firma ? `<img src="${trabajoActual.firma}" class="h-16 mx-auto mt-2">` : ''}`;
    document.getElementById('total-final').innerText = total.toFixed(2) + "€";
    trabajoActual.total = total;
};

window.abrirCalc = t => { document.getElementById('calc-titulo').innerText = t; document.getElementById('calc-display').innerText = '0'; calcEstado.valor = ''; document.getElementById('modal-calc').classList.remove('hidden'); };
window.cerrarCalc = () => document.getElementById('modal-calc').classList.add('hidden');
window.renderListaMedidas = () => document.getElementById('resumen-medidas-pantalla').innerHTML = trabajoActual.lineas.map((l, i) => `<div class="flex justify-between bg-white p-4 rounded-2xl border mb-2 text-xs font-bold shadow-sm"><span>${l.icono} ${l.nombre}</span><span>${(l.cantidad*l.precio).toFixed(2)}€</span><button onclick="trabajoActual.lineas.splice(${i},1);renderListaMedidas()" class="text-red-500 ml-2">✕</button></div>`).join('');
window.save = () => localStorage.setItem('presupro_v3', JSON.stringify(db));
window.nuevoCliente = () => { const n = prompt("Nombre Cliente:"); if(n) { db.clientes.push({ id: Date.now(), nombre: n, presupuestos: [] }); save(); renderListaClientes(); } };
window.iniciarNuevaMedicion = () => { const l = prompt("Nombre de la Obra:"); if(l) { trabajoActual = { lugar: l, lineas: [], total: 0, firma: null }; irAPantalla('trabajo'); renderListaMedidas(); } };
window.guardarTodo = () => { clienteActual.presupuestos.push(JSON.parse(JSON.stringify(trabajoActual))); save(); irAPantalla('expediente'); renderHistorial(); };
window.renderHistorial = () => { 
    document.getElementById('titulo-cliente').innerHTML = `<div class="font-black text-blue-600 uppercase text-lg italic">${clienteActual.nombre}</div>`;
    document.getElementById('archivo-presupuestos').innerHTML = (clienteActual.presupuestos || []).map((p, i) => `<div class="bg-white p-4 rounded-2xl border mb-2 flex justify-between items-center shadow-sm"><span class="text-xs font-bold uppercase italic">${p.lugar}</span><div class="flex gap-2"><button onclick="generarPDF(${i})" class="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold">PDF</button><button onclick="borrarPresu(${i})" class="text-slate-300 text-xs">✕</button></div></div>`).reverse().join('');
};
window.borrarPresu = i => { if(confirm('¿Borrar?')) { clienteActual.presupuestos.splice(i,1); save(); renderHistorial(); } };
window.borrarCliente = i => { if(confirm('¿Borrar cliente y todo su historial?')) { db.clientes.splice(i,1); save(); renderListaClientes(); } };
window.generarPDF = i => {
    const p = clienteActual.presupuestos[i];
    const el = document.createElement('div');
    el.style.padding = '40px';
    el.innerHTML = `<h1 style="color:#1e40af">PRESUPUESTO: ${p.lugar}</h1><p>Cliente: ${clienteActual.nombre}</p><hr>` + 
        p.lineas.map(l => `<p>${l.nombre}: ${l.cantidad.toFixed(2)} x ${l.precio}€ = ${(l.cantidad*l.precio).toFixed(2)}€</p>`).join('') +
        `<hr><h2>TOTAL CON IVA: ${p.total.toFixed(2)}€</h2>` + (p.firma ? `<p>Firma:</p><img src="${p.firma}" style="width:200px">` : '');
    html2pdf().from(el).save(`${p.lugar}.pdf`);
};

let canvas, ctx, dibujando = false;
window.abrirFirma = () => {
    const h = `<div id="mf" class="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4"><div class="bg-white p-6 rounded-3xl w-full max-w-sm"><h3>Firma del Cliente</h3><canvas id="cf" class="border-2 border-dashed w-full h-40 bg-slate-50 rounded-xl touch-none"></canvas><div class="flex gap-2 mt-4"><button onclick="document.getElementById('mf').remove()" class="flex-1 bg-slate-100 py-3 rounded-xl font-bold">CANCELAR</button><button onclick="gf()" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">GUARDAR</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', h);
    canvas = document.getElementById('cf'); ctx = canvas.getContext('2d'); canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    canvas.ontouchstart = e => { dibujando = true; ctx.beginPath(); ctx.moveTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); };
    canvas.ontouchmove = e => { if(dibujando) { ctx.lineTo(e.touches[0].clientX - canvas.getBoundingClientRect().left, e.touches[0].clientY - canvas.getBoundingClientRect().top); ctx.stroke(); } e.preventDefault(); };
    canvas.ontouchend = () => dibujando = false;
};
window.gf = () => { trabajoActual.firma = canvas.toDataURL(); document.getElementById('mf').remove(); renderPresupuesto(); };

window.onload = () => renderListaClientes();

