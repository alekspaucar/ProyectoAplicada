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

function actualizarTabla(datos) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    datos.forEach(registro => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
        <td>${registro.fecha}</td>
        <td>${registro.hora}</td>
        <td>${registro.humedad}%</td>
        <td>${formatearEstado(registro.estado_suelo)}</td>
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
