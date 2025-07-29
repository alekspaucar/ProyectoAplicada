/*  ───────────────────────────────
    TOMA DE DECISIONES – FRONTEND
    Refactor 2025‑07‑31 (versión completa)
    ───────────────────────────────
    • Velocímetro: tiempo real (polling cada 5 s)
    • Línea: histórico por rango fecha/hora
    • Barra: promedio de rango seleccionado

    Endpoints Flask esperados:
    GET /api/ultima-humedad
      → { humedad: <number> }
    GET /api/datos-filtrados?inicio=<yyyy-mm-dd HH:MM:SS>&fin=<yyyy-mm-dd HH:MM:SS>
      → [{ fecha_hora: "YYYY-MM-DD HH:MM:SS", humedad: <number> }, …]
*/

// ----------------------
// Variables globales
// ----------------------
let velocimetroChart = null;
let lineChart = null;
let barChart = null;

// Selector abreviado
const $ = selector => document.querySelector(selector);

// ----------------------
// Arranque principal
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
  initVelocimetro();
  // Primera lectura inmediata:
  fetchDatoActual();
  // Luego, cada 5 segundos:
  setInterval(fetchDatoActual, 5000);
  configurarBotonesNavegacion();
  inicializarCalendario();
  inicializarGraficos();
  
});

// ----------------------
// Navegación
// ----------------------
function configurarBotonesNavegacion() {
  $('.actualizar-btn').addEventListener('click', () => {
    location.reload();
  });

  $('.volver-btn').addEventListener('click', () => {
    // Ajustar la ruta según tu estructura de carpetas
    window.location.href = '../home/index.html';
  });
}

// ----------------------
// Inicialización de gráficos
// ----------------------
function inicializarGraficos() {
  initVelocimetro();
  startRealTimeVelocimetro();
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
      rotation: -90, circumference: 180, cutout: '70%',
      plugins: { legend: { display: false } }
    }
  });
}

function startRealTimeVelocimetro() {
  // primera lectura inmediata
  fetchDatoActual();
  // luego polling cada 5 segundos
  setInterval(fetchDatoActual, 3000);
}
function fetchDatoActual() {
  fetch('http://127.0.0.1:5000/api/ultima-humedad')
    .then(res => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(({ humedad }) => {
      const pct = Math.max(0, Math.min(100, parseFloat(humedad)));
      velocimetroChart.data.datasets[0].data = [pct, 100 - pct];
      velocimetroChart.update();
      document.getElementById('mensajeHumedad')
              .textContent = `Humedad actual: ${pct.toFixed(1)}%`;
    })
    .catch(err => {
      // Muéstralo en pantalla para no tener que entrar a la consola:
      document.getElementById('mensajeHumedad')
              .textContent = `🔴 Error al leer sensor`;
      console.error(err);
    });
}


function updateVelocimetro(pct) {
  if (!velocimetroChart) return;

  // Nos aseguramos que pct esté en 0–100
  const pctClamped = Math.max(0, Math.min(100, pct));
  const pctRound = Math.round(pctClamped * 10) / 10;

  velocimetroChart.data.datasets[0].data = [pctRound, 100 - pctRound];
  velocimetroChart.update();
  document.getElementById('mensajeHumedad')
    .textContent = `El porcentaje de humedad es de ${pctRound}%`;
}


// ----------------------
// Gráfico de barras (promedio)
// ----------------------
function renderBar(promedio) {
  if (barChart) barChart.destroy();

  const ctx = $('#barChart').getContext('2d');
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
        y: { beginAtZero: true, title: { display: true, text: '% Humedad' } }
      }
    }
  });
}

// ----------------------
// Gráfico de línea (histórico por intervalo)
// ----------------------
function renderLine(labels, data) {
  if (lineChart) lineChart.destroy();

  const ctx = $('#lineChart').getContext('2d');
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Humedad %',
        data,
        borderColor: '#00ffff',
        fill: false,
        tension: 0.4
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Fecha y hora' } },
        y: { beginAtZero: true, title: { display: true, text: '% Humedad' } }
      }
    }
  });
}

// ----------------------
// Calendario & Selector de horas
// ----------------------
function inicializarCalendario() {
  // Elementos DOM
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

  // Variables de estado
  let currentDate = new Date();
  let startDate, endDate;
  let startTime, endTime;
  let selectingStart = true;

  // Abrir calendario
  $('#toggle-calendar').addEventListener('click', () => {
    resetSelection();
    showCalendar();
  });

  // Navegación meses
  prevBtn.addEventListener('click', () => changeMonth(-1));
  nextBtn.addEventListener('click', () => changeMonth(1));

  function resetSelection() {
    startDate = endDate = null;
    startTime = endTime = null;
    selectingStart = true;
    selectedRangeEl.style.display = 'none';
    errorMsgEl.style.display = 'none';
  }

  function showCalendar() {
    calendar.style.display = 'block';
    renderCalendar(currentDate);
  }

  function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar(currentDate);
  }

  function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    monthYearEl.textContent = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    datesContainer.innerHTML = '';
    // Espacios en blanco
    for (let i = 0; i < firstDay; i++) {
      datesContainer.innerHTML += '<div></div>';
    }
    // Días
    for (let d = 1; d <= lastDate; d++) {
      const dayEl = document.createElement('div');
      dayEl.textContent = d;
      dayEl.addEventListener('click', () => onDateClick(year, month, d));
      datesContainer.appendChild(dayEl);
    }
  }

  function onDateClick(y, m, d) {
    const selected = new Date(y, m, d);

    if (selectingStart) {
      startDate = selected;
      selectingStart = false;
      calendar.style.display = 'none';
      setTimeout(showCalendar, 200); // reabrir para endDate
    } else {
      if (selected < startDate) {
        errorMsgEl.textContent = '❌ La fecha final no puede ser anterior.';
        errorMsgEl.style.display = 'block';
        return;
      }
      endDate = selected;
      calendar.style.display = 'none';
      setTimeout(requestTimes, 200);
    }
  }

  async function requestTimes() {
    try {
      startTime = await pickTime('inicial');
      endTime = await pickTime('final');
      displayRange();
      fetchFilteredData();
    } catch {
      console.log('Selección de hora cancelada');
    }
  }

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

  function displayRange() {
    const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    selectedRangeEl.textContent = `🗓️ ${fmt(startDate)} ${startTime} → ${fmt(endDate)} ${endTime}`;
    selectedRangeEl.style.display = 'block';
  }

  function fetchFilteredData() {
    const pad = n => String(n).padStart(2, '0');
    const sd = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${startTime}:00`;
    const ed = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} ${endTime}:00`;

    fetch(`http://localhost:5000/api/datos-filtrados?inicio=${sd}&fin=${ed}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          alert('⚠️ No se encontraron datos en ese rango');
          return;
        }
        const labels = data.map(item => item.fecha_hora);
        const values = data.map(item => parseFloat(item.humedad));

        renderLine(labels, values);
        const avg = (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1);
        renderBar(avg);
      })
      .catch(err => console.error('Error fetchFilteredData:', err));
  }
}
