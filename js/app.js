// --- 1. ESTADO GLOBAL ---
let activities = [];
let userCredits = 0;
let timerInterval;
let startTime;
let currentAct = null;
let isRunning = false;
let tandaGoalMs = 0;
let currentCreationMode = 'perk';

// Gráficas
let lineChart = null;
let pieChart = null;

// --- 2. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    setupWheelPickers();
    setupEventListeners();
});

function setupEventListeners() {
    // Menú Lateral (Sidebar)
    document.getElementById('btn-settings').onclick = toggleMenu;

    // Configuración de nueva actividad
    document.getElementById('btn-tipo-diario').onclick = () => toggleCargaType('diario');
    document.getElementById('btn-tipo-semanal').onclick = () => toggleCargaType('semanal');
    document.querySelectorAll('.day-opt').forEach(el => {
        el.onclick = () => el.classList.toggle('active');
    });

    document.getElementById('btn-save-activity').onclick = createActivity;

    // Navegación y Cronómetros
    document.getElementById('btn-cronometrar').onclick = openSetupSession;
    document.getElementById('btn-start-focus').onclick = startFocusSession;
    document.getElementById('btn-stop-timer').onclick = finishSession;
    document.getElementById('btn-cargar-manual').onclick = openManualScreen;
    document.getElementById('btn-save-manual').onclick = saveManualTime;

    // Secciones de Navegación Inferior
    document.getElementById('go-to-stats').onclick = openStats;
    document.getElementById('go-to-schedule').onclick = openSchedule;
}

// --- 3. MENÚ LATERAL (SIDEBAR) ---
function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('active');
    document.getElementById('menu-overlay').classList.toggle('active');
}

function handleMenuClick(option) {
    toggleMenu();
    if (option === 'Mercado') {
        alert(`🛒 Mercado Perks\nCréditos disponibles: 💰 ${userCredits}\nPróximamente: Canjeá créditos por tiempo de Hobbies.`);
    } else {
        alert(`${option}: Esta sección estará disponible en la próxima actualización.`);
    }
}

// --- 4. GESTIÓN DE PANTALLAS ---
function openNewActivity(mode) {
    currentCreationMode = mode;
    const title = document.getElementById('new-activity-title');
    const labelGoal = document.getElementById('label-goal-contexto');
    const labelDias = document.getElementById('label-dias-contexto');
    
    if (mode === 'perk') {
        title.innerText = "NUEVO PERK (META)";
        labelGoal.innerText = "HORAS OBJETIVO (A CUMPLIR)";
        labelDias.innerText = "DÍAS QUE VAS A HACERLO";
    } else {
        title.innerText = "NUEVO HOBBY (LÍMITE)";
        labelGoal.innerText = "LÍMITE DE HORAS (MÁXIMO)";
        labelDias.innerText = "DÍAS DE LÍMITE";
    }
    document.getElementById('screen-new-activity').style.display = 'flex';
}

function closeAllScreens() {
    document.querySelectorAll('.full-screen-overlay').forEach(s => s.style.display = 'none');
    if (isRunning) stopTimer();
    resetCreationInputs();
}

function resetCreationInputs() {
    document.getElementById('name-input').value = "";
    document.getElementById('goal-hours').value = "";
    document.querySelectorAll('.day-opt').forEach(el => el.classList.remove('active'));
}

// --- 5. LÓGICA DE CREACIÓN ---
function toggleCargaType(type) {
    const isSemanal = type === 'semanal';
    document.getElementById('btn-tipo-semanal').classList.toggle('active', isSemanal);
    document.getElementById('btn-tipo-diario').classList.toggle('active', !isSemanal);
}

function createActivity() {
    const name = document.getElementById('name-input').value;
    const hoursInput = parseFloat(document.getElementById('goal-hours').value);
    const selectedDays = Array.from(document.querySelectorAll('.day-opt.active')).map(el => parseInt(el.dataset.day));
    
    if (!name || !hoursInput || selectedDays.length === 0) return alert("Faltan datos o seleccionar días");

    const isSemanal = document.getElementById('btn-tipo-semanal').classList.contains('active');
    const dailyGoalMs = isSemanal ? (hoursInput / selectedDays.length) * 3600000 : hoursInput * 3600000;

    activities.push({
        id: Date.now(),
        name: name,
        dailyGoalMs: dailyGoalMs,
        totalConfiguredHours: hoursInput,
        currentMs: 0,
        type: currentCreationMode,
        days: selectedDays,
        isSemanal: isSemanal
    });

    updateDashboard();
    closeAllScreens();
}

// --- 6. CRONÓMETRO Y TANDAS ---
function openSetupSession() {
    const id = document.getElementById('perk-selector').value;
    if (!id) return alert("Seleccioná una actividad");
    
    currentAct = activities.find(a => a.id == id);
    const progresoActual = Math.floor((currentAct.currentMs / currentAct.dailyGoalMs) * 100);
    
    document.getElementById('setup-perk-name').innerText = currentAct.name.toUpperCase();
    document.getElementById('current-progress-info').innerText = `Llevás el ${progresoActual}% de tu meta diaria.`;
    document.getElementById('screen-setup-session').style.display = 'flex';
}

function startFocusSession() {
    const choice = document.getElementById('session-tanda-selector').value;
    tandaGoalMs = (choice === 'final') ? (currentAct.dailyGoalMs - currentAct.currentMs) : (parseInt(choice) * 60000);
    if (tandaGoalMs < 60000) tandaGoalMs = 60000;

    document.getElementById('screen-setup-session').style.display = 'none';
    document.getElementById('screen-timer').style.display = 'flex';
    document.getElementById('active-perk-name').innerText = currentAct.name;
    
    isRunning = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimerUI, 1000);
}

function updateTimerUI() {
    const diff = Date.now() - startTime;
    document.getElementById('big-timer-display').innerText = formatTime(diff);
    
    const totalProgreso = Math.floor(((currentAct.currentMs + diff) / currentAct.dailyGoalMs) * 100);
    document.getElementById('active-percent').innerText = `${totalProgreso}%`;

    const status = document.getElementById('progress-status');
    if (diff >= tandaGoalMs) {
        status.innerText = "¡TANDA COMPLETADA!";
        status.style.color = "var(--accent-green)";
    } else if (diff >= tandaGoalMs / 2) {
        status.innerText = "MITAD DE LA TANDA";
        status.style.color = "var(--accent-orange)";
    }
}

function finishSession() {
    const diff = Date.now() - startTime;
    saveProgress(currentAct.id, diff);
    closeAllScreens();
}

// --- 7. CRONOGRAMA DE HORARIOS ---
function openSchedule() {
    document.getElementById('screen-schedule').style.display = 'flex';
    const list = document.getElementById('schedule-list');
    list.innerHTML = "";
    const diasNombre = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    diasNombre.forEach((dia, index) => {
        const actividadesDelDia = activities.filter(act => act.days.includes(index));
        let diaHtml = `<div class="schedule-day-group"><h4 class="day-title">${dia}</h4>`;
        
        if (actividadesDelDia.length === 0) {
            diaHtml += `<p class="no-activity">Libre</p>`;
        } else {
            actividadesDelDia.forEach(act => {
                const horas = (act.dailyGoalMs / 3600000).toFixed(1);
                diaHtml += `<div class="schedule-item"><span>${act.name}</span><span class="badge-${act.type}">${horas}h</span></div>`;
            });
        }
        list.innerHTML += diaHtml + `</div>`;
    });

    let footerHtml = `<div class="schedule-footer"><h3 class="section-subtitle">RESUMEN TOTAL</h3>`;
    activities.forEach(act => {
        footerHtml += `<p><strong>${act.name}:</strong> ${act.totalConfiguredHours}h (${act.type === 'perk' ? 'Objetivo' : 'Límite'})</p>`;
    });
    list.innerHTML += footerHtml + `</div>`;
}

// --- 8. ESTADÍSTICAS Y GRÁFICAS ---
function openStats() {
    document.getElementById('screen-stats').style.display = 'flex';
    document.getElementById('stat-credits').innerText = userCredits;
    const totalMs = activities.reduce((acc, act) => acc + act.currentMs, 0);
    document.getElementById('stat-total-hours').innerText = (totalMs / 3600000).toFixed(1) + 'h';
    initCharts();
}

function initCharts() {
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    const ctxPie = document.getElementById('pieChart').getContext('2d');

    if (lineChart) lineChart.destroy();
    if (pieChart) pieChart.destroy();

    const perkTotal = activities.filter(a => a.type === 'perk').reduce((acc, a) => acc + (a.currentMs / 3600000), 0);
    const hobbyTotal = activities.filter(a => a.type === 'hobby').reduce((acc, a) => acc + (a.currentMs / 3600000), 0);

    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
            datasets: [
                { label: 'Perks', data: [0, 0, 0, 0, 0, 0, perkTotal.toFixed(1)], borderColor: '#00d2ff', backgroundColor: 'rgba(0, 210, 255, 0.1)', fill: true, tension: 0.4 },
                { label: 'Hobbies', data: [0, 0, 0, 0, 0, 0, hobbyTotal.toFixed(1)], borderColor: '#ff9d00', backgroundColor: 'rgba(255, 157, 0, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#2d364f' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });

    pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Perks', 'Hobbies'],
            datasets: [{ data: [perkTotal || 1, hobbyTotal || 0], backgroundColor: ['#00d2ff', '#ff9d00'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });
}

// --- 9. CRÉDITOS Y CARGA MANUAL ---
function saveProgress(id, ms) {
    const act = activities.find(a => a.id == id);
    if (!act) return;
    const previo = act.currentMs;
    act.currentMs += ms;

    if (act.type === 'perk' && act.currentMs >= act.dailyGoalMs) {
        let msExtra = (previo < act.dailyGoalMs) ? (act.currentMs - act.dailyGoalMs) : ms;
        userCredits += Math.floor((msExtra / 60000) * 2);
        document.getElementById('user-credits').innerText = `💰 ${userCredits}`;
    }
    updateDashboard();
}

function setupWheelPickers() {
    const hCol = document.getElementById('picker-hours');
    const mCol = document.getElementById('picker-minutes');
    const fill = (col, max) => {
        col.innerHTML = '<div class="picker-number"></div>';
        for(let i=0; i<=max; i++) col.innerHTML += `<div class="picker-number">${i.toString().padStart(2,'0')}</div>`;
        col.innerHTML += '<div class="picker-number"></div>';
    };
    fill(hCol, 23); fill(mCol, 59);
}

function saveManualTime() {
    const h = Math.round(document.getElementById('picker-hours').scrollTop / 50);
    const m = Math.round(document.getElementById('picker-minutes').scrollTop / 50);
    saveProgress(document.getElementById('manual-perk-selector').value, ((h * 60) + m) * 60000);
    closeAllScreens();
}

function openManualScreen() {
    const id = document.getElementById('perk-selector').value;
    if (!id) return alert("Seleccioná una actividad");
    document.getElementById('manual-perk-selector').value = id;
    document.getElementById('screen-manual').style.display = 'flex';
}

function updateDashboard() {
    const perksCont = document.getElementById('perks-container');
    const hobbiesCont = document.getElementById('hobbies-container');
    const selector = document.getElementById('perk-selector');
    const manualSelector = document.getElementById('manual-perk-selector');

    // 1. Limpiamos los contenedores para no duplicar elementos
    perksCont.innerHTML = ""; 
    hobbiesCont.innerHTML = "";
    selector.innerHTML = '<option value="" disabled selected>Seleccioná una actividad...</option>';
    manualSelector.innerHTML = "";

    // 2. Recorremos el array de actividades para dibujarlas
    activities.forEach(act => {
        // Calculamos el porcentaje (máximo 100%)
        const progress = Math.min(Math.floor((act.currentMs / act.dailyGoalMs) * 100), 100);
        
        // Creamos el HTML de la barrita
        const html = `
            <div class="perk-item">
                <div class="perk-info">
                    <span>${act.name.toUpperCase()}</span>
                    <span>${progress}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-fill ${act.type === 'hobby' ? 'hobby-fill' : ''}" 
                         style="width: ${progress}%">
                    </div>
                </div>
            </div>`;
        
        // Lo mandamos al contenedor que corresponda (Perk o Hobby)
        if (act.type === 'perk') {
            perksCont.innerHTML += html;
        } else {
            hobbiesCont.innerHTML += html;
        }

        // 3. Actualizamos los selectores (dropdowns) para que aparezcan al cronometrar
        const opt = new Option(act.name, act.id);
        selector.add(opt.cloneNode(true));
        manualSelector.add(opt);
    });

    // 4. EL MOTOR DE GUARDADO: 
    // Llamamos a la función que pusiste al final del archivo para que salve los cambios
    saveToLocalStorage();
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function stopTimer() { clearInterval(timerInterval); isRunning = false; }

// --- SISTEMA DE CUENTAS ---
let currentUser = null;

function handleLogin(type) {
    if (type === 'google') {
        // Simulación de Google Auth
        console.log("Iniciando Firebase Auth...");
        currentUser = {
            name: "Usuario de Google",
            email: "user@gmail.com",
            method: 'google'
        };
        alert("Sesión iniciada con Google (Simulación)");
    } else if (type === 'personalizada') {
        const user = prompt("Ingresá tu nombre de usuario:");
        if (!user) return;
        currentUser = {
            name: user,
            email: `${user}@perks.com`,
            method: 'local'
        };
    } else {
        // Modo Invitado
        currentUser = {
            name: "Invitado",
            email: "Modo Local",
            method: 'guest'
        };
    }

    // Actualizar Interfaz
    document.getElementById('user-email').innerText = currentUser.email;
    document.getElementById('user-logged-out').style.display = 'none';
    document.getElementById('user-logged-in').style.display = 'block';
    
    // Guardamos el estado de la sesión
    saveToLocalStorage();
}

function handleLogout() {
    if (confirm("¿Cerrar sesión? Se mantendrán tus datos en este dispositivo.")) {
        currentUser = null;
        document.getElementById('user-logged-out').style.display = 'block';
        document.getElementById('user-logged-in').style.display = 'none';
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    const data = {
        activities: activities,
        userCredits: userCredits,
        userSession: currentUser
    }; 
    localStorage.setItem('perks_app_data', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('perks_app_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        activities = parsed.activities || [];
        userCredits = parsed.userCredits || 0;
        currentUser = parsed.userSession || null;

        if (currentUser) {
            document.getElementById('user-email').innerText = currentUser.email;
            document.getElementById('user-logged-out').style.display = 'none';
            document.getElementById('user-logged-in').style.display = 'block';
        }
        document.getElementById('user-credits').innerText = `💰 ${userCredits}`;
    }
}

window.toggleMenu = toggleMenu;
window.handleMenuClick = handleMenuClick;
window.handleLogin = handleLogin;
// ...etc