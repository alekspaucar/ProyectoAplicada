function actualizarDatos() {
    const boton = document.querySelector('.actualizar-btn');
    boton.innerHTML = '<span>⏳</span> Actualizando...';
    boton.disabled = true;

    fetch("http://localhost:5000/api/datos")  // Este endpoint es el correcto
        .then(response => response.json())
        .then(data => {
            actualizarTabla(data);
            boton.innerHTML = '<span>🔄</span> Actualizar';
            boton.disabled = false;
        })
        .catch(error => {
            console.error('Error:', error);
            boton.innerHTML = '<span>❌</span> Error';
            setTimeout(() => {
                boton.innerHTML = '<span>🔄</span> Actualizar';
                boton.disabled = false;
            }, 2000);
        });
}

//***************************************************************************************** */
// ... dentro de tu función actualizarTabla(datos):
function actualizarTabla(datos) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    const pad = n => String(n).padStart(2, '0');

    datos.forEach(reg => {
        // reg.fecha_hora viene "2025-07-29 08:02:13"
        const d = new Date(reg.fecha_hora.replace(' ', 'T'));
        const fecha = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

        const fila = document.createElement("tr");
        fila.innerHTML = `
        <td>${reg.id || ''}</td>   <!-- ← Agrega el ID aquí -->
        <td>${fecha}</td>
        <td>${hora}</td>
        <td>${reg.humedad}%</td>
        <td>${formatearEstado(reg.estado_suelo)}</td>
    `;
        tbody.appendChild(fila);
    });
}


//***************************************************************************************** */



function formatearEstado(estado) {
    if (estado.includes("Baja")) {
        return "⚠️ " + estado;
    } else {
        return "✅ " + estado;
    }
}

// Para que se cargue automáticamente al abrir la página
document.addEventListener("DOMContentLoaded", actualizarDatos);
