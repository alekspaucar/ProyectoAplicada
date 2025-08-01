/*  --------------------------------------
    TOMA DE DECISIONES – FRONTEND
    Refactor 2025‑07‑31 (versión completa)
    --------------------------------------
    • Velocímetro: tiempo real (polling cada 2 s)
    • Línea: histórico por rango fecha/hora
    • Barra: promedio de rango seleccionado

    Endpoints Flask esperados:
    GET /api/ultima-humedad
      → { humedad: <number> }
    GET /api/datos-filtrados?inicio=<yyyy-mm-dd HH:MM:SS>&fin=<yyyy-mm-dd HH:MM:SS>
      → [{ fecha_hora: "YYYY-MM-DD HH:MM:SS", humedad: <number> }, …]
*/

// ----------------------
// Variables globales y configuración
// ----------------------
// Configuración global para los gráficos Chart.js
Chart.defaults.color = '#fff';
Chart.defaults.font.family = 'Poppins, sans-serif';
Chart.defaults.font.size = 14;
Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.2)';
Chart.defaults.plugins.tooltip.titleColor = '#fff';
Chart.defaults.plugins.tooltip.bodyColor = '#fff';

// Variables para guardar las instancias de los gráficos
let velocimetroChart = null;
let lineChart = null;
let barChart = null;

// Selector rápido para elementos del DOM
const $ = selector => document.querySelector(selector);

// ----------------------
// Arranque principal: se ejecuta cuando carga la página
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
  initVelocimetro();              // Inicializa el gráfico del velocímetro
  fetchDatoActual();              // Hace la primera lectura de humedad
  setInterval(fetchDatoActual, 2000); // Consulta el dato cada 2 segundos (real time)
  configurarBotonesNavegacion();  // Botones de navegación (volver y actualizar)
  inicializarCalendario();        // Prepara el selector de fechas
  inicializarGraficos();          // Inicializa el resto de gráficos
});

// ----------------------
// Navegación (volver y actualizar)
// ----------------------
function configurarBotonesNavegacion() {
  $('.actualizar-btn').addEventListener('click', () => {
    location.reload(); // Recarga toda la página para refrescar todo
  });

  $('.volver-btn').addEventListener('click', () => {
    // Va a la pantalla principal (ajusta la ruta si es necesario)
    window.location.href = '../home/index.html';
  });
}

// ----------------------
// Inicialización de gráficos secundarios
// ----------------------
function inicializarGraficos() {
  initVelocimetro();
  startRealTimeVelocimetro(); // Dispara el intervalo de lectura en el velocímetro
}

// ----------------------
// Velocímetro en tiempo real
// ----------------------
function initVelocimetro() {
  const ctx = document.getElementById('velocimetroChart').getContext('2d');
  velocimetroChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['Humedad', 'Resto'], datasets: [{ data: [0, 100] }] },
    options: {
      rotation: -90,           // Muestra como "media luna"
      circumference: 180,      // 180 grados
      cutout: '70%',           // Grosor de la dona
      plugins: { legend: { display: false } }
    }
  });
}

// Dispara la consulta en tiempo real al backend para el velocímetro
function startRealTimeVelocimetro() {
  fetchDatoActual(); // Primer dato al iniciar
  setInterval(fetchDatoActual, 2000); // Luego cada 2 segundos
}

// Hace la consulta al endpoint para mostrar la última humedad
function fetchDatoActual() {
  fetch('http://127.0.0.1:5000/api/ultima-humedad')
    .then(res => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(({ humedad }) => {
      // Clamp para que esté entre 0 y 100%
      const pct = Math.max(0, Math.min(100, parseFloat(humedad)));
      velocimetroChart.data.datasets[0].data = [pct, 100 - pct];
      velocimetroChart.update();
      document.getElementById('mensajeHumedad')
        .textContent = `Humedad actual: ${pct.toFixed(1)}%`;
    })
    .catch(err => {
      // Si hay error lo muestra
      document.getElementById('mensajeHumedad')
        .textContent = `🔴 Error al leer sensor`;
      console.error(err);
    });
}

// Si quieres actualizar el velocímetro manualmente (no usado mucho)
function updateVelocimetro(pct) {
  if (!velocimetroChart) return;
  
  const pctClamped = Math.max(0, Math.min(100, pct));
  
  const pctRound = Math.round(pctClamped * 10) / 10;
  
  velocimetroChart.data.datasets[0].data = [pctRound, 100 - pctRound];
  velocimetroChart.update();
  document.getElementById('mensajeHumedad')
    .textContent = `El porcentaje de humedad es de ${pctRound}%`;
}

// ----------------------
// Gráfico de barras (promedio de humedad)
// ----------------------
function renderBar(promedio) {
  if (barChart) barChart.destroy(); // Si ya existe, destruye el anterior

  const ctx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Promedio'],
      datasets: [{
        label: 'Humedad % promedio',
        data: [promedio],
        backgroundColor: '#00bfff'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: '% Humedad' }
        }
      },
      plugins: {
        // Línea roja del umbral crítico (por ejemplo, 30%)
        annotation: {
          annotations: {
            umbralCritico: {
              type: 'line',
              yMin: 30, yMax: 30,
              borderColor: 'red',
              borderWidth: 2,
              borderDash: [8, 4],
              label: {
                enabled: true,
                content: 'Umbral crítico (30%)',
                position: 'end',
                backgroundColor: 'rgba(255,255,255,0.8)',
                color: 'red',
                font: { size: 12 }
              }
            }
          }
        }
      }
    }
  });
}

// Formatea una hora tipo "YYYY-MM-DD HH:mm:ss" → "HH:mm"
function formatearHora(tickValue) {

  const d = new Date(tickValue.replace(' ', 'T'));
  
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ----------------------
// Gráfico de línea (histórico de humedad en intervalo)
// ----------------------
function renderLine(labels, values) {
  const canvas = document.getElementById('lineChart');
  if (!canvas) {
    alert('NO existe el canvas de línea');
    return;
  }
  const ctx = canvas.getContext('2d');
  if (lineChart) lineChart.destroy(); // Destruye el gráfico anterior

  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,      // Lista de fechas/horas
      datasets: [{
        label: 'Humedad %',
        data: values,
        borderColor: '#00ffff',
        backgroundColor: 'rgba(0,255,255,0.2)',
        pointRadius: 3,
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Fecha y Hora' },
          ticks: {
            autoSkip: true,         // Solo muestra algunos ticks si son muchos
            maxTicksLimit: 15,      // Ajusta cuántas etiquetas máximo (hazlo menos o más si quieres)
            maxRotation: 45,        // Rota las fechas a 45 grados
            minRotation: 45,
            callback: function(value, index, ticks) {
              // Muestra fecha y hora en dos líneas si hay mucho dato
              const fullLabel = labels[value] || '';
              
              const [fecha, hora] = fullLabel.split(' ');
              return `${fecha}\n${hora}`;
            }
          }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: '% Humedad' }
        }
      },
      plugins: {
        annotation: {
          annotations: {
            umbralCritico: {
              type: 'line',
              yMin: 30,
              yMax: 30,
              borderColor: 'red',
              borderWidth: 2,
              borderDash: [8, 4],
              label: {
                enabled: true,
                content: 'Umbral crítico (30%)',
                position: 'start',
                backgroundColor: 'rgba(255,255,255,0.8)',
                color: 'red',
                font: { size: 12 }
              }
            }
          }
        }
      }
    }
  });
  }


// ----------------------
// Calendario y selector de horas
// ----------------------
function inicializarCalendario() {
  // Variables DOM
  const calendar = $('#calendar');
  const datesContainer = $('#calendar-dates');
  const monthYearEl = $('#month-year');
  const selectedRangeEl = $('#selected-range');
  const errorMsgEl = $('#error-msg');
  const prevBtn = $('#prev');
  const nextBtn = $('#next');
  const tpModal = $('#time-picker');
  const tpTitleEl = $('#tp-title');
  const tpInputEl = $('#tp-input');
  const tpOkBtn = $('#tp-ok');
  const tpCancelBtn = $('#tp-cancel');

  // Estado de la selección
  let currentDate = new Date();
  let startDate, endDate;
  let startTime, endTime;
  let selectingStart = true;

  // Abre el calendario al hacer click
  $('#toggle-calendar').addEventListener('click', () => {
    resetSelection();
    showCalendar();
  });

  // Botones para navegar por meses
  prevBtn.addEventListener('click', () => changeMonth(-1));
  nextBtn.addEventListener('click', () => changeMonth(1));

  // Reset de selección de fechas/horas
  function resetSelection() {
    startDate = endDate = null;
    startTime = endTime = null;
    selectingStart = true;
    selectedRangeEl.style.display = 'none';
    errorMsgEl.style.display = 'none';
  }

  // Muestra el calendario en pantalla
  function showCalendar() {
    calendar.style.display = 'block';
    renderCalendar(currentDate);
  }

  // Cambia de mes
  function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar(currentDate);
  }

  // Renderiza el calendario visualmente
  function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    monthYearEl.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    datesContainer.innerHTML = '';
    // Espacios vacíos al inicio del mes
    for (let i = 0; i < firstDay; i++) {
      datesContainer.innerHTML += '<div></div>';
    }
    // Días del mes
    for (let d = 1; d <= lastDate; d++) {
      const dayEl = document.createElement('div');
      dayEl.textContent = d;
      dayEl.addEventListener('click', () => onDateClick(year, month, d));
      datesContainer.appendChild(dayEl);
    }
  }

  // Lógica al hacer click en una fecha
  function onDateClick(y, m, d) {
    const selected = new Date(y, m, d);

    if (selectingStart) {
      startDate = selected;
      selectingStart = false;
      calendar.style.display = 'none';
      setTimeout(showCalendar, 200); // Reabrir para la fecha final
    } else {
      if (selected < startDate) {
        errorMsgEl.textContent = '❌ La fecha final no puede ser anterior.';
        errorMsgEl.style.display = 'block';
        return;
      }
      endDate = selected;
      calendar.style.display = 'none';
      setTimeout(requestTimes, 200); // Pide las horas ahora
    }
  }

  // Pide hora de inicio y fin usando modal tipo "time picker"
  async function requestTimes() {
    try {
      startTime = await pickTime('inicial');
      endTime = await pickTime('final');
      displayRange();         // Muestra el rango elegido
      fetchFilteredData();    // Pide los datos filtrados al backend
    } catch {
      console.log('Selección de hora cancelada');
    }
  }

  // Modal para elegir hora (devuelve la hora seleccionada)
  function pickTime(type) {
    return new Promise((resolve, reject) => {
      tpTitleEl.textContent = `🕒 Ingresa hora ${type}`;
      tpInputEl.value = '';
      tpModal.style.display = 'flex';

      tpCancelBtn.onclick = () => {
        tpModal.style.display = 'none';
        reject();
      };

      tpOkBtn.onclick = () => {
        if (!tpInputEl.value) return tpInputEl.focus();
        tpModal.style.display = 'none';
        resolve(tpInputEl.value);
      };
    });
  }

  // Muestra el rango de fechas/horas seleccionado en pantalla
  function displayRange() {
    const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    selectedRangeEl.textContent = `🗓️ ${fmt(startDate)} ${startTime} → ${fmt(endDate)} ${endTime}`;
    selectedRangeEl.style.display = 'block';
  }

  // Consulta al backend los datos filtrados y grafica
  function fetchFilteredData() {
    const pad = n => String(n).padStart(2, '0');
    const sd = `${startDate.getFullYear()}-${pad(startDate.getMonth()+1)}-${pad(startDate.getDate())} ${startTime}:00`;
    const ed = `${endDate.getFullYear()}-${pad(endDate.getMonth()+1)}-${pad(endDate.getDate())} ${endTime}:59`;

    fetch(`http://localhost:5000/api/datos-filtrados?inicio=${sd}&fin=${ed}`)
      .then(r => r.json())
      .then(data => {
        const labels = data.map(item => item.fecha_hora);
        const values = data.map(item => parseFloat(item.humedad));

        // Aquí se grafican los datos filtrados
        renderLine(labels, values, sd, ed);

        // Calcula y grafica el promedio
        const avg = (values.reduce((s,v)=>s+v,0)/values.length).toFixed(1);
        renderBar(avg);
      })
      .catch(err => console.error('Error fetchFilteredData:', err));
  }
}
