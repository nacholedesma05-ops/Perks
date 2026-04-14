// =============================================
// 1. ESTADO GLOBAL
// =============================================
let activities = [];
let userCredits = 0;
let timerInterval;
let startTime;
let currentAct = null;
let isRunning = false;
let tandaGoalMs = 0;
let currentCreationMode = 'perk';
let currentUser = null;

// Gráficas
let lineChart = null;
let pieChart = null;

// =============================================
// 2. INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();       // Aplicar tema/colores guardados ANTES de mostrar nada
    checkAuth();          // Ver si ya hay sesión → mostrar app o login
    setupWheelPickers();
    setupEventListeners();
    setupLoginTabs();
});

// =============================================
// 3. AUTH — Login persistente
// =============================================
function checkAuth() {
    const saved = localStorage.getItem('perks_app_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        currentUser = parsed.userSession || null;
    }

    if (currentUser) {
        showApp();
        loadFromLocalStorage();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-dashboard').style.display = 'none';
    }
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
    updateAccountDisplay();
    loadFromLocalStorage();
}

function loginCustom() {
    const username = document.getElementById('login-username').value.trim();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !email || !password) {
        showToast('⚠️ Completá todos los campos');
        return;
    }
    if (!email.includes('@')) {
        showToast('⚠️ Email inválido');
        return;
    }

    currentUser = { name: username, email: email, method: 'custom', avatar: null };
    saveToLocalStorage();
    showApp();
    showToast(`¡Bienvenido, ${username}! 👋`);
}

function loginGoogle() {
    // Simulación — para producción integrá Firebase Auth
    currentUser = { name: 'Usuario Google', email: 'usuario@gmail.com', method: 'google', avatar: null };
    saveToLocalStorage();
    showApp();
    showToast('Sesión iniciada con Google ✓');
}

function loginGuest() {
    currentUser = { name: 'Invitado', email: '', method: 'guest', avatar: null };
    saveToLocalStorage();
    showApp();
    showToast('Entrando como invitado 👾');
}

function handleLogout() {
    if (confirm('¿Cerrar sesión? Tus datos se mantienen en el dispositivo.')) {
        currentUser = null;
        saveToLocalStorage();
        closeAllScreens();
        document.getElementById('main-dashboard').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        // Limpiar campos de login
        document.getElementById('login-username').value = '';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    }
}

function updateAccountDisplay() {
    if (!currentUser) return;
    const nameEl  = document.getElementById('account-display-name');
    const emailEl = document.getElementById('account-display-email');
    const typeEl  = document.getElementById('account-display-type');
    if (nameEl)  nameEl.textContent  = currentUser.name || 'Usuario';
    if (emailEl) emailEl.textContent = currentUser.email || '—';
    if (typeEl) {
        const labels = { custom: 'Cuenta Personalizada', google: 'Google', guest: 'Invitado' };
        typeEl.textContent = labels[currentUser.method] || 'Cuenta';
    }
}

// =============================================
// 4. TABS DEL LOGIN
// =============================================
function setupLoginTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tab = document.getElementById('tab-' + btn.dataset.tab);
            if (tab) tab.classList.add('active');
        });
    });
}

// =============================================
// 5. MENÚ LATERAL
// =============================================
function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('active');
    document.getElementById('menu-overlay').classList.toggle('active');
}

function handleMenuClick(option) {
    toggleMenu();
    if (option === 'Cuenta') {
        updateAccountDisplay();
        document.getElementById('screen-account').style.display = 'flex';
    } else if (option === 'Configuración') {
        document.getElementById('screen-settings').style.display = 'flex';
        syncSettingsUI();
    } else if (option === 'Mercado') {
        showToast(`🛒 Mercado próximamente. Créditos: 💰 ${userCredits}`);
    }
}

// =============================================
// 6. CONFIGURACIÓN — Temas, colores, fuente
// =============================================
const DEFAULT_SETTINGS = {
    theme: 'dark',
    accentColor: '#00d2ff',
    fontSize: 'medium',
    animations: true,
    vibration: true,
};

function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('perks_settings') || 'null') || DEFAULT_SETTINGS;
    applySettings(saved);
}

function applySettings(s) {
    const root = document.documentElement;

    // Tema
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(s.theme === 'light' ? 'theme-light' : 'theme-dark');

    // Acento
    root.style.setProperty('--accent-blue', s.accentColor);

    // Tamaño fuente
    const sizes = { small: '13px', medium: '15px', large: '17px' };
    root.style.setProperty('--font-size-base', sizes[s.fontSize] || '15px');

    // Animaciones
    root.style.setProperty('--transition-speed', s.animations ? '0.3s' : '0s');
}

function saveSettings() {
    const s = {
        theme:       document.querySelector('.theme-btn.active')?.dataset.theme || 'dark',
        accentColor: document.getElementById('setting-color-custom')?.value || '#00d2ff',
        fontSize:    document.querySelector('.size-btn.active')?.dataset.size || 'medium',
        animations:  document.getElementById('setting-animations')?.checked ?? true,
        vibration:   document.getElementById('setting-vibration')?.checked ?? true,
    };
    localStorage.setItem('perks_settings', JSON.stringify(s));
    applySettings(s);
    showToast('Configuración guardada ✓');
}

function syncSettingsUI() {
    const s = JSON.parse(localStorage.getItem('perks_settings') || 'null') || DEFAULT_SETTINGS;

    // Tema
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === s.theme);
    });

    // Acento
    const colorInput = document.getElementById('setting-color-custom');
    if (colorInput) colorInput.value = s.accentColor;
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.color === s.accentColor);
    });

    // Fuente
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === s.fontSize);
    });

    // Toggles
    const animEl = document.getElementById('setting-animations');
    const vibEl  = document.getElementById('setting-vibration');
    if (animEl) animEl.checked = s.animations;
    if (vibEl)  vibEl.checked  = s.vibration;
}

function selectTheme(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    saveSettings();
}

function selectAccent(color) {
    const colorInput = document.getElementById('setting-color-custom');
    if (colorInput) colorInput.value = color;
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.color === color);
    });
    saveSettings();
}

function selectFontSize(size) {
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === size);
    });
    saveSettings();
}

function exportData() {
    const data = localStorage.getItem('perks_app_data');
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'perks_backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados ✓');
}

function resetData() {
    if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('perks_app_data');
        activities = [];
        userCredits = 0;
        updateDashboard();
        closeAllScreens();
        showToast('Datos borrados');
    }
}

// =============================================
// 7. GESTIÓN DE PANTALLAS
// =============================================
function openNewActivity(mode) {
    currentCreationMode = mode;
    const title    = document.getElementById('new-activity-title');
    const labelGoal = document.getElementById('label-goal-contexto');
    const labelDias = document.getElementById('label-dias-contexto');

    if (mode === 'perk') {
        title.innerText    = "NUEVO PERK (META)";
        labelGoal.innerText = "HORAS OBJETIVO (A CUMPLIR)";
        labelDias.innerText = "DÍAS QUE VAS A HACERLO";
    } else {
        title.innerText    = "NUEVO HOBBY (LÍMITE)";
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
    const ni = document.getElementById('name-input');
    const gi = document.getElementById('goal-hours');
    if (ni) ni.value = "";
    if (gi) gi.value = "";
    document.querySelectorAll('.day-opt').forEach(el => el.classList.remove('active'));
}

// =============================================
// 8. CREACIÓN DE ACTIVIDADES
// =============================================
function toggleCargaType(type) {
    const isSemanal = type === 'semanal';
    document.getElementById('btn-tipo-semanal').classList.toggle('active', isSemanal);
    document.getElementById('btn-tipo-diario').classList.toggle('active', !isSemanal);
}

function createActivity() {
    const name       = document.getElementById('name-input').value.trim();
    const hoursInput = parseFloat(document.getElementById('goal-hours').value);
    const selectedDays = Array.from(document.querySelectorAll('.day-opt.active')).map(el => parseInt(el.dataset.day));

    if (!name || !hoursInput || selectedDays.length === 0) {
        showToast('⚠️ Faltan datos o días seleccionados');
        return;
    }

    const isSemanal   = document.getElementById('btn-tipo-semanal').classList.contains('active');
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
    showToast(`✅ ${name} creado`);
}

// =============================================
// 9. CRONÓMETRO Y TANDAS
// =============================================
function openSetupSession() {
    const id = document.getElementById('perk-selector').value;
    if (!id) { showToast('Seleccioná una actividad'); return; }

    currentAct = activities.find(a => a.id == id);
    const progreso = Math.floor((currentAct.currentMs / currentAct.dailyGoalMs) * 100);

    document.getElementById('setup-perk-name').innerText    = currentAct.name.toUpperCase();
    document.getElementById('current-progress-info').innerText = `Llevás el ${progreso}% de tu meta diaria.`;
    document.getElementById('screen-setup-session').style.display = 'flex';
}

function startFocusSession() {
    const choice = document.getElementById('session-tanda-selector').value;
    tandaGoalMs  = (choice === 'final') ? (currentAct.dailyGoalMs - currentAct.currentMs) : (parseInt(choice) * 60000);
    if (tandaGoalMs < 60000) tandaGoalMs = 60000;

    document.getElementById('screen-setup-session').style.display = 'none';
    document.getElementById('screen-timer').style.display = 'flex';
    document.getElementById('active-perk-name').innerText = currentAct.name;

    isRunning = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimerUI, 1000);

    // Vibración Android al iniciar
    if (navigator.vibrate) navigator.vibrate(50);
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
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else if (diff >= tandaGoalMs / 2) {
        status.innerText = "MITAD DE LA TANDA";
        status.style.color = "var(--accent-orange)";
    }
}

function finishSession() {
    const diff = Date.now() - startTime;
    saveProgress(currentAct.id, diff);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    closeAllScreens();
    showToast(`✅ Sesión guardada: ${formatTime(diff)}`);
}

// =============================================
// 10. HORARIOS
// =============================================
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

// =============================================
// 11. ESTADÍSTICAS
// =============================================
function openStats() {
    document.getElementById('screen-stats').style.display = 'flex';
    document.getElementById('stat-credits').innerText = userCredits;
    const totalMs = activities.reduce((acc, act) => acc + act.currentMs, 0);
    document.getElementById('stat-total-hours').innerText = (totalMs / 3600000).toFixed(1) + 'h';
    initCharts();
}

function initCharts() {
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    const ctxPie  = document.getElementById('pieChart').getContext('2d');

    if (lineChart) lineChart.destroy();
    if (pieChart)  pieChart.destroy();

    const perkTotal  = activities.filter(a => a.type === 'perk').reduce((acc, a) => acc + (a.currentMs / 3600000), 0);
    const hobbyTotal = activities.filter(a => a.type === 'hobby').reduce((acc, a) => acc + (a.currentMs / 3600000), 0);

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim() || '#00d2ff';

    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
            datasets: [
                { label: 'Perks',   data: [0,0,0,0,0,0, perkTotal.toFixed(1)],  borderColor: accentColor,  backgroundColor: 'rgba(0,210,255,0.1)', fill: true, tension: 0.4 },
                { label: 'Hobbies', data: [0,0,0,0,0,0, hobbyTotal.toFixed(1)], borderColor: '#ff9d00', backgroundColor: 'rgba(255,157,0,0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#2d364f' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
    });

    pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Perks', 'Hobbies'],
            datasets: [{ data: [perkTotal || 1, hobbyTotal || 0], backgroundColor: [accentColor, '#ff9d00'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });
}

// =============================================
// 12. CRÉDITOS Y CARGA MANUAL
// =============================================
function saveProgress(id, ms) {
    const act = activities.find(a => a.id == id);
    if (!act) return;
    const previo = act.currentMs;
    act.currentMs += ms;

    if (act.type === 'perk' && act.currentMs >= act.dailyGoalMs) {
        const msExtra = (previo < act.dailyGoalMs) ? (act.currentMs - act.dailyGoalMs) : ms;
        userCredits += Math.floor((msExtra / 60000) * 2);
        document.getElementById('user-credits').innerText = `💰 ${userCredits}`;
    }
    updateDashboard();
}

function setupWheelPickers() {
    const hCol = document.getElementById('picker-hours');
    const mCol = document.getElementById('picker-minutes');
    if (!hCol || !mCol) return;
    const fill = (col, max) => {
        col.innerHTML = '<div class="picker-number"></div>';
        for (let i = 0; i <= max; i++) col.innerHTML += `<div class="picker-number">${i.toString().padStart(2,'0')}</div>`;
        col.innerHTML += '<div class="picker-number"></div>';
    };
    fill(hCol, 23);
    fill(mCol, 59);
}

function saveManualTime() {
    const h   = Math.round(document.getElementById('picker-hours').scrollTop / 50);
    const m   = Math.round(document.getElementById('picker-minutes').scrollTop / 50);
    const id  = document.getElementById('manual-perk-selector').value;
    if (!id)  { showToast('Seleccioná una actividad'); return; }
    saveProgress(id, ((h * 60) + m) * 60000);
    closeAllScreens();
    showToast(`✅ Tiempo cargado: ${h}h ${m}m`);
}

function openManualScreen() {
    const id = document.getElementById('perk-selector').value;
    if (!id) { showToast('Seleccioná una actividad'); return; }
    document.getElementById('manual-perk-selector').value = id;
    document.getElementById('screen-manual').style.display = 'flex';
}

// =============================================
// 13. DASHBOARD
// =============================================
function updateDashboard() {
    const perksCont   = document.getElementById('perks-container');
    const hobbiesCont = document.getElementById('hobbies-container');
    const selector    = document.getElementById('perk-selector');
    const manualSel   = document.getElementById('manual-perk-selector');

    if (!perksCont) return;

    perksCont.innerHTML   = "";
    hobbiesCont.innerHTML = "";
    selector.innerHTML    = '<option value="" disabled selected>Seleccioná una actividad...</option>';
    manualSel.innerHTML   = "";

    activities.forEach(act => {
        const progress = Math.min(Math.floor((act.currentMs / act.dailyGoalMs) * 100), 100);
        const html = `
            <div class="perk-item">
                <div class="perk-info">
                    <span>${act.name.toUpperCase()}</span>
                    <span>${progress}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-fill ${act.type === 'hobby' ? 'hobby-fill' : ''}" style="width: ${progress}%"></div>
                </div>
            </div>`;

        if (act.type === 'perk') {
            perksCont.innerHTML += html;
        } else {
            hobbiesCont.innerHTML += html;
        }

        const opt = new Option(act.name, act.id);
        selector.add(opt.cloneNode(true));
        manualSel.add(opt);
    });

    document.getElementById('user-credits').innerText = `💰 ${userCredits}`;
    saveToLocalStorage();
}

// =============================================
// 14. PERSISTENCIA
// =============================================
function saveToLocalStorage() {
    const data = {
        activities:  activities,
        userCredits: userCredits,
        userSession: currentUser
    };
    localStorage.setItem('perks_app_data', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('perks_app_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        activities   = parsed.activities  || [];
        userCredits  = parsed.userCredits || 0;
        currentUser  = parsed.userSession || null;
    }
    const credEl = document.getElementById('user-credits');
    if (credEl) credEl.innerText = `💰 ${userCredits}`;
    updateDashboard();
}

// =============================================
// 15. UTILIDADES
// =============================================
function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function stopTimer() {
    clearInterval(timerInterval);
    isRunning = false;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    t.classList.add('toast-visible');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => {
        t.classList.remove('toast-visible');
        setTimeout(() => { t.style.display = 'none'; }, 300);
    }, 2500);
}

// =============================================
// 16. SERVICE WORKER (Android / PWA)
// =============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registrado:', reg.scope))
            .catch(err => console.warn('SW no registrado:', err));
    });
}

// =============================================
// 17. EVENT LISTENERS
// =============================================
function setupEventListeners() {
    document.getElementById('btn-settings').onclick  = toggleMenu;
    document.getElementById('btn-tipo-diario').onclick  = () => toggleCargaType('diario');
    document.getElementById('btn-tipo-semanal').onclick = () => toggleCargaType('semanal');

    document.querySelectorAll('.day-opt').forEach(el => {
        el.onclick = () => el.classList.toggle('active');
    });

    document.getElementById('btn-save-activity').onclick = createActivity;
    document.getElementById('btn-cronometrar').onclick   = openSetupSession;
    document.getElementById('btn-start-focus').onclick   = startFocusSession;
    document.getElementById('btn-stop-timer').onclick    = finishSession;
    document.getElementById('btn-cargar-manual').onclick = openManualScreen;
    document.getElementById('btn-save-manual').onclick   = saveManualTime;
    document.getElementById('go-to-stats').onclick       = openStats;
    document.getElementById('go-to-schedule').onclick    = openSchedule;
}

// Exponemos funciones globales que el HTML llama con onclick
window.toggleMenu       = toggleMenu;
window.handleMenuClick  = handleMenuClick;
window.loginCustom      = loginCustom;
window.loginGoogle      = loginGoogle;
window.loginGuest       = loginGuest;
window.handleLogout     = handleLogout;
window.openNewActivity  = openNewActivity;
window.closeAllScreens  = closeAllScreens;
window.selectTheme      = selectTheme;
window.selectAccent     = selectAccent;
window.selectFontSize   = selectFontSize;
window.saveSettings     = saveSettings;
window.exportData       = exportData;
window.resetData        = resetData;