// Esta función se encarga de pedir los datos al backend y actualizar la tabla en pantalla.
function actualizarDatos() {
    // Busca el botón "Actualizar" y lo deshabilita mientras carga los datos.
    const boton = document.querySelector('.actualizar-btn');
    boton.innerHTML = '<span>⏳</span> Actualizando...';
    boton.disabled = true;
    // Realiza una petición GET al endpoint Flask que devuelve los datos de la tabla.
    fetch("http://localhost:5000/api/datos")
        .then(response => response.json()) // Convierte la respuesta a JSON.
        .then(data => {
            actualizarTabla(data); // Llama a la función que dibuja la tabla con los datos nuevos.
            boton.innerHTML = '<span>🔄</span> Actualizar';
            boton.disabled = false;
        })
        .catch(error => {
            // Si hay error, lo muestra en consola y pone el botón en estado de error temporalmente.
            console.error('Error:', error);
            boton.innerHTML = '<span>❌</span> Error';
            setTimeout(() => {
                boton.innerHTML = '<span>🔄</span> Actualizar';
                boton.disabled = false;
            }, 2000);
        });
}

// ---------------------------------------------------------------------------
// Dibuja la tabla HTML con los datos traídos del backend
function actualizarTabla(datos) {
    // Selecciona el tbody de la tabla y lo limpia
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";
    // Función para rellenar con ceros (ej: "08" en vez de "8")
    const pad = n => String(n).padStart(2, '0');
    // Para cada registro (fila) recibido del backend:
    datos.forEach(reg => {
        // Convierte la fecha/hora a un objeto Date para separarla en partes.
        const d = new Date(reg.fecha_hora.replace(' ', 'T'));
        const fecha = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        // Crea una fila HTML con los datos formateados:
        const fila = document.createElement("tr");
        fila.innerHTML = `
        <td>${reg.id || ''}</td>   <!-- Muestra el ID traído desde la BD -->
        <td>${fecha}</td>
        <td>${hora}</td>
        <td>${reg.humedad}%</td>
        <td>${formatearEstado(reg.estado_suelo)}</td>
    `;
        tbody.appendChild(fila); // Añade la fila a la tabla.
    });
}

// ---------------------------------------------------------------------------
// Convierte el estado de texto a un estado con ícono (rojo o verde).
function formatearEstado(estado) {
    if (estado.includes("Baja")) {
        return "⚠️ " + estado; // Si es baja, pone el ícono de advertencia.
    } else {
        return "✅ " + estado; // Si es adecuada, pone el check verde.
    }
}
// ---------------------------------------------------------------------------
// Cuando la página se carga por primera vez, ejecuta la función para traer los datos.
document.addEventListener("DOMContentLoaded", actualizarDatos);
