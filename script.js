const API_BASE = '/api';

let realDoctors = [];
let realServices = [];

async function loadDoctors() {
  try {
    const data = await apiRequest('/doctors');
    realDoctors = data;
    renderDoctors();
  } catch (err) {
    console.error('Ошибка загрузки врачей', err);
  }
}

async function loadServices() {
  try {
    const data = await apiRequest('/services');
    realServices = data;
    const select = document.getElementById('serviceSelect');
    if (select) {
      select.innerHTML = '<option value="">-- Выберите услугу --</option>';
      realServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.name;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Ошибка загрузки услуг', err);
  }
}

async function loadAvailableSlots(doctorId, date) {
  try {
    const slots = await apiRequest(`/doctors/${doctorId}/slots?date=${date}`);
    return slots;
  } catch (err) {
    console.error('Ошибка загрузки слотов', err);
    return [];
  }
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = localStorage.getItem('dentapp_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка запроса');
  }
  return response.json();
}

// Application State
const state = {
    currentUser: null,
    currentPage: 'home',
    appointmentData: {
        service: '',
        doctor: null,
        date: '',
        time: ''
    },
    diagnosisStep: 0,
    diagnosisAnswers: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: new Date(),
    scheduleDoctor: 'all',
    scheduleDate: new Date()
};

// Mock Data (оставлено для совместимости с историей и диагностикой)
const mockDiagnosisQuestions = [
    {
        id: 1,
        text: 'Есть ли у вас острая зубная боль?',
        options: [
            { text: 'Да, сильная боль', value: 'severe_pain' },
            { text: 'Умеренная боль', value: 'moderate_pain' },
            { text: 'Нет боли', value: 'no_pain' }
        ]
    },
    {
        id: 2,
        text: 'Чувствительны ли ваши зубы к холодному/горячему?',
        options: [
            { text: 'Да, очень чувствительны', value: 'high_sensitivity' },
            { text: 'Иногда чувствительны', value: 'moderate_sensitivity' },
            { text: 'Не чувствительны', value: 'no_sensitivity' }
        ]
    },
    {
        id: 3,
        text: 'Замечали ли вы кровоточивость десен при чистке зубов?',
        options: [
            { text: 'Да, регулярно', value: 'regular_bleeding' },
            { text: 'Иногда', value: 'occasional_bleeding' },
            { text: 'Нет', value: 'no_bleeding' }
        ]
    }
];

const mockHistory = [
    {
        id: 1,
        date: '15.07.2023',
        doctor: 'Петров А.В.',
        service: 'Лечение кариеса',
        diagnosis: 'Кариес жевательной поверхности',
        recommendations: 'Чистка зубов 2 раза в день, использование зубной нити',
        cost: '3500 руб'
    },
    {
        id: 2,
        date: '10.06.2023',
        doctor: 'Сидорова И.П.',
        service: 'Консультация ортодонта',
        diagnosis: 'Незначительное смещение зубов',
        recommendations: 'Рассмотреть вариант установки брекет-системы',
        cost: '1500 руб'
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    const savedUser = localStorage.getItem('dentapp_user');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        updateAuthUI();
        loadDoctors();
        loadServices();
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            navigateTo(page);
        });
    });

    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', showAuthModal);
    document.getElementById('registerBtn').addEventListener('click', showAuthModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('closeAuthModal').addEventListener('click', hideAuthModal);

    // Auth tabs
    document.getElementById('loginTab').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('registerTab').addEventListener('click', () => switchAuthTab('register'));

    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', login);
    document.getElementById('registerForm').addEventListener('submit', register);

    // Quick actions
    document.getElementById('startAppointment').addEventListener('click', () => navigateTo('appointment'));
    document.getElementById('quickAppointmentBtn').addEventListener('click', () => navigateTo('appointment'));
    document.getElementById('quickDiagnosisBtn').addEventListener('click', () => navigateTo('diagnosis'));
    document.getElementById('viewHistoryBtn').addEventListener('click', () => navigateTo('history'));
    document.getElementById('editProfileBtn').addEventListener('click', editProfile);

    // Appointment navigation
    document.getElementById('nextStep1').addEventListener('click', nextAppointmentStep);
    document.getElementById('nextStep2').addEventListener('click', nextAppointmentStep);
    document.getElementById('nextStep3').addEventListener('click', nextAppointmentStep);
    document.getElementById('prevStep2').addEventListener('click', prevAppointmentStep);
    document.getElementById('prevStep3').addEventListener('click', prevAppointmentStep);
    document.getElementById('prevStep4').addEventListener('click', prevAppointmentStep);
    document.getElementById('confirmAppointment').addEventListener('click', confirmAppointment);
    document.getElementById('newAppointmentBtn').addEventListener('click', startNewAppointment);

    // Diagnosis
    document.getElementById('startDiagnosisBtn').addEventListener('click', startDiagnosis);

    // History
    document.getElementById('applyHistoryFilter').addEventListener('click', applyHistoryFilter);

    // Schedule
    document.getElementById('prevMonthBtn')?.addEventListener('click', prevMonth);
    document.getElementById('nextMonthBtn')?.addEventListener('click', nextMonth);
    const addSlotBtn = document.getElementById('addScheduleSlotBtn');
    if (addSlotBtn) addSlotBtn.style.display = 'none';

    // Notification bell click
    document.getElementById('notificationBell')?.addEventListener('click', () => {
        navigateTo('dashboard');
        setTimeout(() => {
            const notifBlock = document.getElementById('notificationsList');
            if (notifBlock) notifBlock.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    });

    // Schedule doctor filter
    document.getElementById('scheduleDoctorFilter')?.addEventListener('change', function() {
        state.scheduleDoctor = this.value;
        renderPublicSchedule();
    });

    // Periodic notification refresh
    setInterval(() => {
        if (state.currentUser) {
            updateNotificationBell();
        }
    }, 30000);

    // Initialize
    renderDoctors();
    renderCalendar();
    renderHistory();

    const appointmentDateInput = document.getElementById('appointmentDate');
    if (appointmentDateInput) {
        appointmentDateInput.addEventListener('change', renderTimeSlots);
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        appointmentDateInput.setAttribute('min', `${y}-${m}-${d}`);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const ty = tomorrow.getFullYear();
        const tm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const td = String(tomorrow.getDate()).padStart(2, '0');
        appointmentDateInput.value = `${ty}-${tm}-${td}`;
    }
});

// Navigation
function navigateTo(page) {
  if (page === 'dashboard' && !state.currentUser) {
    showAuthModal();
    return;
  }
  document.querySelectorAll('.main-content').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === page) link.classList.add('active');
  });
  document.getElementById(page).classList.add('active');
  state.currentPage = page;
  if (page === 'dashboard') {
    updateDashboard();
    updateNotificationBell();
    loadNotifications();
  } else if (page === 'appointment') {
    resetAppointment();
    updateNotificationBell();
  } else if (page === 'history') {
    renderHistory();
  } else if (page === 'schedule') {
    initPublicSchedule();
  }
}

// Auth functions
function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.querySelectorAll('.success-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.getElementById('registerTab').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

async function login(e) {
  e.preventDefault();
  const credential = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  document.getElementById('loginEmailError').style.display = 'none';
  document.getElementById('loginPasswordError').style.display = 'none';
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ credential, password }),
    });
    localStorage.setItem('dentapp_token', data.access_token);
    localStorage.setItem('dentapp_user', JSON.stringify(data.user));
    state.currentUser = data.user;
    document.getElementById('loginSuccess').textContent = 'Успешный вход!';
    document.getElementById('loginSuccess').style.display = 'block';
    setTimeout(() => {
      hideAuthModal();
      updateAuthUI();
      navigateTo('dashboard');
    }, 1000);
  } catch (err) {
    document.getElementById('loginPasswordError').textContent = err.message;
    document.getElementById('loginPasswordError').style.display = 'block';
  }
}

async function register(e) {
  e.preventDefault();
  document.querySelectorAll('#registerForm .error-message').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
  document.querySelectorAll('#registerForm .success-message').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
  const name = document.getElementById('registerName').value;
  const phone = document.getElementById('registerPhone').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  const phoneRegex = /^[\d+\-\s\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    document.getElementById('registerPhoneError').textContent = 'Телефон может содержать только цифры и символы +, -, пробел, (, )';
    document.getElementById('registerPhoneError').style.display = 'block';
    return;
  }
  if (password !== confirmPassword) {
    document.getElementById('registerConfirmPasswordError').textContent = 'Пароли не совпадают';
    document.getElementById('registerConfirmPasswordError').style.display = 'block';
    return;
  }
  try {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    });
    const loginData = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ credential: email, password }),
    });
    localStorage.setItem('dentapp_token', loginData.access_token);
    localStorage.setItem('dentapp_user', JSON.stringify(loginData.user));
    state.currentUser = loginData.user;
    document.getElementById('registerSuccess').textContent = 'Аккаунт создан! Выполняется вход...';
    document.getElementById('registerSuccess').style.display = 'block';
    setTimeout(() => {
      hideAuthModal();
      updateAuthUI();
      navigateTo('dashboard');
    }, 1500);
  } catch (err) {
    document.getElementById('registerEmailError').textContent = err.message;
    document.getElementById('registerEmailError').style.display = 'block';
  }
}

function logout() {
  state.currentUser = null;
  localStorage.removeItem('dentapp_token');
  localStorage.removeItem('dentapp_user');
  updateAuthUI();
  navigateTo('home');
}

function updateAuthUI() {
    if (state.currentUser) {
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('notificationBell').style.display = 'flex';
        document.getElementById('userName').textContent = state.currentUser.name;
        document.getElementById('userAvatar').textContent = getInitials(state.currentUser.name);
        document.getElementById('dashboardUserName').textContent = state.currentUser.name;
        document.getElementById('dashboardUserEmail').textContent = state.currentUser.email;
        document.getElementById('dashboardUserPhone').textContent = state.currentUser.phone;
        document.getElementById('dashboardUserAvatar').textContent = getInitials(state.currentUser.name);
        loadDoctors();
        loadServices();
        updateNotificationBell();
    } else {
        document.getElementById('authButtons').style.display = 'flex';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('notificationBell').style.display = 'none';
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

// Dashboard functions
async function updateDashboard() {
  if (!state.currentUser) return;
  loadNotifications();

  if (state.currentUser.role === 'doctor') {
    // Для врача – показываем список его приёмов
    try {
      const appointments = await apiRequest('/appointments');
      const upcomingContainer = document.getElementById('upcomingAppointments');
      if (!upcomingContainer) return;

      if (appointments.length === 0) {
        upcomingContainer.innerHTML = '<p>У вас нет запланированных приёмов</p>';
      } else {
        upcomingContainer.innerHTML = '';
        appointments.forEach(app => {
          if (app.status !== 'scheduled') return; // показываем только активные
          const div = document.createElement('div');
          div.style.cssText = 'padding:10px; border-bottom:1px solid var(--light-gray);';
          div.innerHTML = `
            <div><strong>${app.service_name}</strong></div>
            <div>Пациент: ${app.patient_name}</div>
            <div>${app.appointment_date} в ${app.appointment_time}</div>
            <button class="btn btn-danger btn-sm cancel-appointment-btn" data-appointment-id="${app.id}" style="margin-top:5px;">Отменить запись</button>
          `;
          upcomingContainer.appendChild(div);
        });

        // Навешиваем обработчики на кнопки отмены
        document.querySelectorAll('.cancel-appointment-btn').forEach(btn => {
          btn.addEventListener('click', async function() {
            const appointmentId = this.getAttribute('data-appointment-id');
            if (confirm('Вы уверены, что хотите отменить эту запись?')) {
              try {
                await apiRequest(`/appointments/${appointmentId}/cancel`, { method: 'PATCH' });
                alert('Запись отменена. Пациент получит уведомление.');
                updateDashboard(); // обновляем список
                updateNotificationBell(); // если вдруг врач тоже видит колокольчик
              } catch (err) {
                alert('Ошибка: ' + err.message);
              }
            }
          });
        });
      }
    } catch (err) {
      console.error('Ошибка загрузки записей врача:', err);
    }
    return; // врач больше ничего не видит из стандартного дашборда
  }

  // Обычное поведение для пациента (уже существующий код)
  try {
    const appointments = await apiRequest('/appointments');
    const upcomingContainer = document.getElementById('upcomingAppointments');
    if (!upcomingContainer) return;

    if (appointments.length === 0) {
      upcomingContainer.innerHTML = '<p>У вас нет запланированных приемов</p>';
    } else {
      upcomingContainer.innerHTML = '';
      appointments.forEach(app => {
        const div = document.createElement('div');
        let displayDate = app.appointment_date;
        if (displayDate) {
          const dateObj = new Date(displayDate);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            displayDate = `${day}.${month}.${year}`;
          }
        }
        div.innerHTML = `
          <div style="padding: 10px; border-bottom: 1px solid var(--light-gray);">
            <div><strong>${app.service_name}</strong></div>
            <div>${app.doctor_name}</div>
            <div>${displayDate} в ${app.appointment_time}</div>
          </div>`;
        upcomingContainer.appendChild(div);
      });
    }

    const historyStats = document.getElementById('visitStats');
    if (historyStats) {
      historyStats.innerHTML = `<p>Всего посещений: <strong>0</strong></p><p>Последний визит: <strong>нет данных</strong></p>`;
    }
  } catch (err) {
    console.error('Ошибка загрузки записей в дашборде:', err);
    const upcomingContainer = document.getElementById('upcomingAppointments');
    if (upcomingContainer) upcomingContainer.innerHTML = '<p>Ошибка загрузки записей</p>';
  }
}

function editProfile() {
    alert('Редактирование профиля. В реальном приложении здесь будет форма редактирования.');
}

// Appointment functions
function renderDoctors() {
  const container = document.getElementById('doctorsGrid');
  if (!container) return;
  container.innerHTML = '';
  if (!realDoctors.length) {
    container.innerHTML = '<p>Загрузка врачей...</p>';
    return;
  }
  realDoctors.forEach(doctor => {
    const doctorCard = document.createElement('div');
    doctorCard.className = 'doctor-card';
    doctorCard.setAttribute('data-doctor-id', doctor.id);
    doctorCard.innerHTML = `
      <h4>${doctor.name}</h4>
      <div class="doctor-specialty">${doctor.specialty || ''}</div>
      <div>Опыт: ${doctor.experience_years || ''} лет</div>
      <div>Рейтинг: ${doctor.rating || '—'} ★</div>
    `;
    doctorCard.addEventListener('click', () => {
      document.querySelectorAll('.doctor-card').forEach(card => card.classList.remove('selected'));
      doctorCard.classList.add('selected');
      state.appointmentData.doctor = doctor;
    });
    container.appendChild(doctorCard);
  });
}

function nextAppointmentStep() {
    const currentStep = document.querySelector('.appointment-steps .step.active');
    if (!currentStep) return;
    const currentStepNum = parseInt(currentStep.getAttribute('data-step'));
    let valid = true;
    if (currentStepNum === 1) {
        const service = document.getElementById('serviceSelect').value;
        if (!service) {
            alert('Выберите услугу');
            valid = false;
        } else {
            state.appointmentData.service = service;
        }
    } else if (currentStepNum === 2) {
        if (!state.appointmentData.doctor) {
            alert('Выберите врача');
            valid = false;
        }
    } else if (currentStepNum === 3) {
        const date = document.getElementById('appointmentDate').value;
        const selectedTimeSlot = document.querySelector('.time-slot-card.selected');
        if (!date) {
            alert('Выберите дату');
            valid = false;
        } else if (!selectedTimeSlot) {
            alert('Выберите время');
            valid = false;
        } else {
            state.appointmentData.date = date;
            state.appointmentData.time = selectedTimeSlot.getAttribute('data-time');
        }
    }
    if (!valid) return;
    currentStep.classList.remove('active');
    currentStep.classList.add('completed');
    const nextStep = document.querySelector(`.appointment-steps .step[data-step="${currentStepNum + 1}"]`);
    if (nextStep) nextStep.classList.add('active');
    document.getElementById(`step${currentStepNum}`).classList.remove('active');
    if (currentStepNum + 1 <= 4) {
        document.getElementById(`step${currentStepNum + 1}`).classList.add('active');
        if (currentStepNum + 1 === 3) {
            renderTimeSlots();
        }
        if (currentStepNum + 1 === 4) {
            renderAppointmentSummary();
        }
    }
}

function prevAppointmentStep() {
    const currentStep = document.querySelector('.appointment-steps .step.active');
    if (!currentStep) return;
    const currentStepNum = parseInt(currentStep.getAttribute('data-step'));
    if (currentStepNum === 1) return;
    currentStep.classList.remove('active');
    const prevStep = document.querySelector(`.appointment-steps .step[data-step="${currentStepNum - 1}"]`);
    if (prevStep) {
        prevStep.classList.remove('completed');
        prevStep.classList.add('active');
    }
    document.getElementById(`step${currentStepNum}`).classList.remove('active');
    document.getElementById(`step${currentStepNum - 1}`).classList.add('active');
}

async function renderTimeSlots() {
  const container = document.getElementById('timeSlotsContainer');
  const date = document.getElementById('appointmentDate').value;
  const doctor = state.appointmentData.doctor;
  if (!date || !doctor) {
    container.innerHTML = '<p>Выберите врача и дату для просмотра слотов</p>';
    return;
  }
  container.innerHTML = '<p>Загрузка...</p>';
  const slots = await loadAvailableSlots(doctor.id, date);
  if (slots.length === 0) {
    container.innerHTML = '<p>Нет доступных слотов на выбранную дату</p>';
    return;
  }
  container.innerHTML = '<h4>Доступные слоты:</h4><div class="time-slots-grid" id="timeSlotsGrid"></div>';
  const grid = document.getElementById('timeSlotsGrid');
  grid.innerHTML = '';
  slots.forEach(slot => {
    const slotCard = document.createElement('div');
    slotCard.className = 'time-slot-card';
    slotCard.setAttribute('data-time', slot);
    slotCard.innerHTML = `<div style="text-align:center;"><strong>${slot}</strong><div style="color:var(--success);">Свободно</div></div>`;
    slotCard.addEventListener('click', function() {
      document.querySelectorAll('.time-slot-card').forEach(card => card.classList.remove('selected'));
      this.classList.add('selected');
      state.appointmentData.time = slot;
    });
    grid.appendChild(slotCard);
  });
}

function renderAppointmentSummary() {
    const container = document.getElementById('appointmentSummary');
    const service = realServices.find(s => s.id == state.appointmentData.service);
    container.innerHTML = `
        <div style="background-color: var(--light-gray); padding: 20px; border-radius: var(--border-radius);">
            <h4>Детали записи</h4>
            <div style="margin-top: 15px;">
                <div><strong>Услуга:</strong> ${service ? service.name : ''}</div>
                <div><strong>Врач:</strong> ${state.appointmentData.doctor ? state.appointmentData.doctor.name : ''}</div>
                <div><strong>Дата:</strong> ${formatDate(state.appointmentData.date)}</div>
                <div><strong>Время:</strong> ${state.appointmentData.time}</div>
            </div>
        </div>
    `;
}

async function confirmAppointment() {
  if (!state.currentUser) {
    alert('Для записи на прием необходимо авторизоваться');
    showAuthModal();
    return;
  }
  const serviceId = document.getElementById('serviceSelect').value;
  const doctor = state.appointmentData.doctor;
  const date = state.appointmentData.date;
  const time = state.appointmentData.time;
  if (!serviceId || !doctor || !date || !time) {
    alert('Заполните все шаги');
    return;
  }
  try {
    await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        doctor_id: doctor.id,
        service_id: parseInt(serviceId),
        date: date,
        time: time,
        notes: ''
      })
    });
    document.getElementById('step4').style.display = 'none';
    document.getElementById('appointmentSuccess').style.display = 'block';
    document.querySelectorAll('.appointment-steps .step').forEach(step => step.classList.remove('active', 'completed'));
    document.querySelector('.appointment-steps .step[data-step="4"]').classList.add('completed');
    updateDashboard();
    updateNotificationBell();
  } catch (err) {
    alert('Ошибка записи: ' + err.message);
  }
}

function startNewAppointment() {
    resetAppointment();
    document.getElementById('appointmentSuccess').style.display = 'none';
    document.getElementById('step1').classList.add('active');
}

function resetAppointment() {
    state.appointmentData = {
        service: '',
        doctor: null,
        date: '',
        time: ''
    };
    document.querySelectorAll('.appointment-steps .step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    const firstStep = document.querySelector('.appointment-steps .step[data-step="1"]');
    if (firstStep) firstStep.classList.add('active');
    document.getElementById('serviceSelect').value = '';
    document.querySelectorAll('.appointment-form-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('step1').classList.add('active');
    document.getElementById('appointmentSuccess').style.display = 'none';
}

// Diagnosis functions
function startDiagnosis() {
    state.diagnosisStep = 0;
    state.diagnosisAnswers = [];
    document.getElementById('diagnosisIntro').style.display = 'none';
    document.getElementById('diagnosisQuestions').style.display = 'block';
    document.getElementById('diagnosisResult').style.display = 'none';
    showDiagnosisQuestion();
}

function showDiagnosisQuestion() {
    const container = document.getElementById('diagnosisQuestions');
    const question = mockDiagnosisQuestions[state.diagnosisStep];
    if (!question) {
        showDiagnosisResult();
        return;
    }
    container.innerHTML = `
        <div class="diagnosis-question">
            <h3>Вопрос ${state.diagnosisStep + 1} из ${mockDiagnosisQuestions.length}</h3>
            <p>${question.text}</p>
            <div class="diagnosis-options" id="diagnosisOptions"></div>
        </div>
    `;
    const optionsContainer = document.getElementById('diagnosisOptions');
    question.options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'diagnosis-option';
        optionElement.textContent = option.text;
        optionElement.setAttribute('data-value', option.value);
        optionElement.addEventListener('click', function() {
            state.diagnosisAnswers.push({
                questionId: question.id,
                value: this.getAttribute('data-value')
            });
            state.diagnosisStep++;
            if (state.diagnosisStep < mockDiagnosisQuestions.length) {
                showDiagnosisQuestion();
            } else {
                showDiagnosisResult();
            }
        });
        optionsContainer.appendChild(optionElement);
    });
}

function showDiagnosisResult() {
    document.getElementById('diagnosisQuestions').style.display = 'none';
    document.getElementById('diagnosisResult').style.display = 'block';
    let recommendation = 'Рекомендуется запись к стоматологу-терапевту';
    let diagnosis = 'Предположительно: нет серьезных проблем';
    const hasSeverePain = state.diagnosisAnswers.some(a => a.value === 'severe_pain');
    const hasRegularBleeding = state.diagnosisAnswers.some(a => a.value === 'regular_bleeding');
    if (hasSeverePain) {
        recommendation = 'Рекомендуется срочная запись к стоматологу-хирургу';
        diagnosis = 'Предположительно: острый пульпит или периодонтит';
    } else if (hasRegularBleeding) {
        recommendation = 'Рекомендуется запись к пародонтологу';
        diagnosis = 'Предположительно: гингивит или пародонтит';
    }
    document.getElementById('diagnosisResult').innerHTML = `
        <h3>Результаты предварительной диагностики</h3>
        <div style="margin: 20px 0;">
            <div style="background-color: rgba(42, 157, 143, 0.1); padding: 15px; border-radius: var(--border-radius); margin-bottom: 15px;">
                <h4>Предварительный диагноз:</h4>
                <p>${diagnosis}</p>
            </div>
            <div style="background-color: rgba(233, 196, 106, 0.1); padding: 15px; border-radius: var(--border-radius);">
                <h4>Рекомендация:</h4>
                <p>${recommendation}</p>
            </div>
        </div>
        <div style="display: flex; gap: 15px;">
            <button class="btn btn-primary" id="bookAppointmentFromDiagnosis">Записаться на прием</button>
            <button class="btn btn-outline" id="restartDiagnosis">Пройти диагностику еще раз</button>
        </div>
    `;
    document.getElementById('bookAppointmentFromDiagnosis').addEventListener('click', () => {
        navigateTo('appointment');
    });
    document.getElementById('restartDiagnosis').addEventListener('click', startDiagnosis);
}

// History functions
function renderHistory() {
    const container = document.getElementById('historyList');
    const emptyMessage = document.getElementById('emptyHistoryMessage');
    let history = JSON.parse(localStorage.getItem('dentapp_history') || '[]');
    if (state.currentUser) {
        history = history.filter(h => h.userId === state.currentUser.id);
    }
    if (history.length === 0) {
        history = mockHistory;
    }
    if (history.length === 0) {
        if (emptyMessage) emptyMessage.style.display = 'block';
        if (container) container.innerHTML = '';
    } else {
        if (emptyMessage) emptyMessage.style.display = 'none';
        if (container) {
            container.innerHTML = '';
            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-date">${item.date}</div>
                    <div class="history-doctor"><strong>Врач:</strong> ${item.doctor}</div>
                    <div><strong>Услуга:</strong> ${item.service}</div>
                    <div><strong>Диагноз:</strong> ${item.diagnosis}</div>
                    <div><strong>Рекомендации:</strong> ${item.recommendations}</div>
                    <div><strong>Стоимость:</strong> ${item.cost}</div>
                    <button class="btn btn-outline" style="margin-top: 10px;" onclick="viewVisitDetails(${item.id})">Подробнее</button>
                `;
                container.appendChild(historyItem);
            });
        }
    }
}

function applyHistoryFilter() {
    alert('Фильтр применен. В реальном приложении здесь будет фильтрация истории.');
    renderHistory();
}

function viewVisitDetails(id) {
    alert(`Просмотр деталей посещения #${id}. В реальном приложении здесь будет открытие модального окна с полной информацией.`);
}

// Schedule functions (public)
function renderCalendar() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const currentMonthEl = document.getElementById('currentMonth');
    if (currentMonthEl) currentMonthEl.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;

    const daysContainer = document.getElementById('calendarDays');
    if (!daysContainer) return;
    daysContainer.innerHTML = '';

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayNames.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.style.fontWeight = 'bold';
        dayElement.textContent = day;
        daysContainer.appendChild(dayElement);
    });

    const firstDay = new Date(state.currentYear, state.currentMonth, 1);
    let startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        emptyDay.style.visibility = 'hidden';
        daysContainer.appendChild(emptyDay);
    }

    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        if (day === today.getDate() && state.currentMonth === today.getMonth() && state.currentYear === today.getFullYear()) {
            dayElement.classList.add('today');
        }
        dayElement.textContent = day;
        dayElement.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
            dayElement.classList.add('active');
            state.selectedDate = new Date(state.currentYear, state.currentMonth, day);
            const selectedText = document.getElementById('selectedDateText');
            if (selectedText) selectedText.textContent = formatDate(state.selectedDate);
            renderPublicSchedule();
        });
        daysContainer.appendChild(dayElement);
    }

    if (!document.querySelector('.calendar-day.active')) {
        const todayEl = Array.from(daysContainer.querySelectorAll('.calendar-day')).find(el => {
            return parseInt(el.textContent) === today.getDate() &&
                   state.currentMonth === today.getMonth() &&
                   state.currentYear === today.getFullYear();
        });
        if (todayEl) todayEl.click();
    }
}

async function renderPublicSchedule() {
    const container = document.getElementById('scheduleTimeSlots');
    if (!container) return;
    container.innerHTML = '<p>Загрузка...</p>';

    const selectedDate = state.selectedDate;
    const formattedDate = selectedDate.toISOString().split('T')[0];
    const doctorId = state.scheduleDoctor;

    try {
        let url = `/api/public/schedule?date=${formattedDate}`;
        if (doctorId !== 'all') {
            url += `&doctorId=${doctorId}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки');
        const slots = await response.json();

        if (!slots || slots.length === 0) {
            container.innerHTML = '<p>На выбранную дату нет слотов</p>';
            return;
        }

        container.innerHTML = '';
        const groupedByDoctor = {};
        slots.forEach(slot => {
            const key = slot.doctor_name;
            if (!groupedByDoctor[key]) {
                groupedByDoctor[key] = {
                    doctor_name: slot.doctor_name,
                    specialty: slot.specialty,
                    doctor_id: slot.doctor_id,
                    slots: []
                };
            }
            groupedByDoctor[key].slots.push(slot);
        });

        Object.values(groupedByDoctor).forEach(doctor => {
            const doctorCard = document.createElement('div');
            doctorCard.className = 'doctor-schedule-card';
            doctorCard.innerHTML = `
                <div class="doctor-schedule-header">
                    <h3>${doctor.doctor_name}</h3>
                    <span class="doctor-specialty">${doctor.specialty}</span>
                </div>
                <div class="doctor-slots-grid">
                    ${doctor.slots.map(slot => `
                        <div class="time-slot ${slot.status}">
                            <div class="slot-time">${slot.time}</div>
                            <div class="slot-info">
                                ${slot.status === 'booked' 
                                    ? `<span class="patient">👤 ${slot.patient}</span><br><span class="service">💊 ${slot.service}</span>`
                                    : `<span class="free">Свободно</span>`
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(doctorCard);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p>Ошибка загрузки расписания</p>';
    }
}

function initPublicSchedule() {
    const doctorFilter = document.getElementById('scheduleDoctorFilter');
    if (doctorFilter) {
        doctorFilter.innerHTML = '<option value="all">Все врачи</option>';
        fetch('/api/public/doctors')
            .then(r => r.json())
            .then(doctors => {
                doctorFilter.innerHTML = '<option value="all">Все врачи</option>';
                doctors.forEach(doc => {
                    doctorFilter.innerHTML += `<option value="${doc.id}">${doc.name}</option>`;
                });
                doctorFilter.value = state.scheduleDoctor;
                renderPublicSchedule();
            })
            .catch(err => {
                console.error('Ошибка загрузки списка врачей для фильтра:', err);
                doctorFilter.innerHTML = '<option value="all">Все врачи</option>';
                renderPublicSchedule();
            });
    } else {
        renderPublicSchedule();
    }
    renderCalendar();
}

function prevMonth() {
    if (state.currentMonth === 0) {
        state.currentMonth = 11;
        state.currentYear--;
    } else {
        state.currentMonth--;
    }
    renderCalendar();
}

function nextMonth() {
    if (state.currentMonth === 11) {
        state.currentMonth = 0;
        state.currentYear++;
    } else {
        state.currentMonth++;
    }
    renderCalendar();
}

function addScheduleSlot() {
    alert('Добавление нового слота в расписание. В реальном приложении здесь будет форма для добавления времени приема.');
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ========== Индикатор уведомлений (шапка) ==========
async function updateNotificationBell() {
  const bell = document.getElementById('notificationBell');
  const badge = document.getElementById('notificationBadge');
  if (!bell || !badge || !state.currentUser) return;

  bell.style.display = 'flex';

  try {
    const appointments = await apiRequest('/appointments');
    console.log('Все записи для индикатора:', appointments);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = appointments.filter(app => {
      if (!app.appointment_date || !app.appointment_time) return false;
      const appDate = new Date(app.appointment_date + 'T' + app.appointment_time);
      if (isNaN(appDate.getTime())) return false;
      return appDate >= now && appDate <= in24h && app.status === 'scheduled';
    });

    console.log('Предстоящих за 24ч:', upcoming.length);

    const notifData = await apiRequest('/notifications');
    const unread = notifData.filter(n => !n.is_read).length;
    console.log('Непрочитанных уведомлений:', unread);

    if (upcoming.length > 0 || unread > 0) {
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  } catch (err) {
    console.error('Ошибка в updateNotificationBell', err);
  }
}

async function loadNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container || !state.currentUser) return;
  try {
    const [notifData, appointments] = await Promise.all([
      apiRequest('/notifications'),
      apiRequest('/appointments')
    ]);

    console.log('Загружены уведомления из БД:', notifData);
    console.log('Все записи пациента:', appointments);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingAppointments = appointments
      .filter(app => {
        if (!app.appointment_date || !app.appointment_time) return false;
        const appDate = new Date(app.appointment_date + 'T' + app.appointment_time);
        if (isNaN(appDate.getTime())) return false;
        return appDate >= now && appDate <= in24h && app.status === 'scheduled';
      })
      .map(app => ({
        id: 'appt_' + app.id,
        appointment_id: app.id,
        message: `Скоро приём: ${app.appointment_date} в ${app.appointment_time} — ${app.doctor_name}, ${app.service_name}`,
        created_at: new Date().toISOString(),
        is_read: false,
        is_virtual: true
      }));

    const unread = notifData.filter(n => !n.is_read);

    const allNotifications = [...unread];
    upcomingAppointments.forEach(up => {
      if (!allNotifications.some(n => n.appointment_id == up.appointment_id)) {
        allNotifications.push(up);
      }
    });

    allNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (allNotifications.length === 0) {
      container.innerHTML = '<p>Нет новых уведомлений</p>';
      return;
    }

    container.innerHTML = '';
    allNotifications.forEach(notif => {
      const div = document.createElement('div');
      div.className = 'notification-item';
      div.style.cssText = 'padding:10px 0; border-bottom:1px solid var(--light-gray);';
      div.innerHTML = `
        <div style="font-size:0.9rem; color:var(--gray);">${new Date(notif.created_at).toLocaleString('ru-RU')}</div>
        <div style="margin-top:5px;">${notif.message}</div>
        ${!notif.is_virtual ? `<button class="btn btn-outline btn-sm" data-id="${notif.id}" onclick="markNotifRead(${notif.id})" style="margin-top:5px;">✓ Прочитано</button>` : ''}
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Ошибка загрузки уведомлений', err);
  }
}

async function markNotifRead(id) {
  if (typeof id === 'string' && id.startsWith('appt_')) return;
  try {
    await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    loadNotifications();
  } catch (e) {
    console.error(e);
  }
}

// =====================================================
// Салют из белых зубов при клике
// =====================================================
document.addEventListener('click', function(e) {
    if (e.button !== 0) return;
    const interactiveSelectors = 'button, a, .btn, .nav-link, .doctor-card, .time-slot-card, .diagnosis-option, .step, .calendar-day, .time-slot, input, select';
    if (e.target.closest(interactiveSelectors)) return;
    createToothBurst(e.clientX, e.clientY);
});

function createToothBurst(x, y) {
    const count = 30;
    const duration = 1200;
    for (let i = 0; i < count; i++) {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9999';
        container.style.transition = `all ${duration / 1000}s ease-out`;
        container.style.fontSize = (Math.random() * 20 + 16) + 'px';
        container.style.color = '#ffffff';
        container.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';
        container.style.width = 'auto';
        container.style.height = 'auto';
        container.innerHTML = '<i class="fas fa-tooth"></i>';
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 50;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        document.body.appendChild(container);
        requestAnimationFrame(() => {
            container.style.transform = `translate(${dx}px, ${dy}px)`;
            container.style.opacity = '0';
        });
        setTimeout(() => {
            if (container.parentNode) container.parentNode.removeChild(container);
        }, duration);
    }
}