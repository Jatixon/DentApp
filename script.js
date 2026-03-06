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
    selectedDate: new Date()
};

// Mock Data
const mockDoctors = [
    { id: 1, name: 'Петров Алексей Владимирович', specialty: 'Терапевт, хирург', experience: '12 лет', rating: 4.8 },
    { id: 2, name: 'Сидорова Ирина Петровна', specialty: 'Ортодонт', experience: '8 лет', rating: 4.9 },
    { id: 3, name: 'Козлов Сергей Дмитриевич', specialty: 'Протезист', experience: '15 лет', rating: 4.7 },
    { id: 4, name: 'Морозова Ольга Ивановна', specialty: 'Гигиенист', experience: '6 лет', rating: 4.6 }
];

const mockServices = [
    { id: 'therapy', name: 'Терапия (лечение кариеса)' },
    { id: 'hygiene', name: 'Гигиена и чистка' },
    { id: 'surgery', name: 'Хирургия (удаление зубов)' },
    { id: 'orthodontics', name: 'Ортодонтия (брекеты)' },
    { id: 'prosthetics', name: 'Протезирование' },
    { id: 'diagnostics', name: 'Диагностика и консультация' }
];

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
    // Check if user is logged in
    const savedUser = localStorage.getItem('dentapp_user');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        updateAuthUI();
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

    // Schedule (for doctors)
    document.getElementById('prevMonthBtn').addEventListener('click', prevMonth);
    document.getElementById('nextMonthBtn').addEventListener('click', nextMonth);
    document.getElementById('addScheduleSlotBtn').addEventListener('click', addScheduleSlot);

    // Initialize appointment doctors
    renderDoctors();
    
    // Initialize calendar
    renderCalendar();

    // Initialize history
    renderHistory();
});

// Navigation
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.main-content').forEach(section => {
        section.classList.remove('active');
    });

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });

    // Show selected page
    document.getElementById(page).classList.add('active');
    state.currentPage = page;

    // Update page-specific content
    if (page === 'dashboard') {
        updateDashboard();
    } else if (page === 'appointment') {
        resetAppointment();
    } else if (page === 'history') {
        renderHistory();
    } else if (page === 'schedule') {
        renderCalendar();
    }
}

// Auth functions
function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    // Clear form errors
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.querySelectorAll('.success-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    // Clear form fields
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

function login(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Simple validation
    let valid = true;
    
    if (!email) {
        document.getElementById('loginEmailError').textContent = 'Введите email или телефон';
        document.getElementById('loginEmailError').style.display = 'block';
        valid = false;
    } else {
        document.getElementById('loginEmailError').style.display = 'none';
    }
    
    if (!password) {
        document.getElementById('loginPasswordError').textContent = 'Введите пароль';
        document.getElementById('loginPasswordError').style.display = 'block';
        valid = false;
    } else {
        document.getElementById('loginPasswordError').style.display = 'none';
    }
    
    if (valid) {
        // Mock login - in a real app, this would be an API call
        // Check if user exists in localStorage
        const users = JSON.parse(localStorage.getItem('dentapp_users') || '[]');
        const user = users.find(u => (u.email === email || u.phone === email) && u.password === password);
        
        if (user) {
            // Success
            state.currentUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            };
            
            localStorage.setItem('dentapp_user', JSON.stringify(state.currentUser));
            
            document.getElementById('loginSuccess').textContent = 'Успешная авторизация! Перенаправление...';
            document.getElementById('loginSuccess').style.display = 'block';
            
            setTimeout(() => {
                hideAuthModal();
                updateAuthUI();
                navigateTo('dashboard');
            }, 1000);
        } else {
            document.getElementById('loginPasswordError').textContent = 'Неверный email/телефон или пароль';
            document.getElementById('loginPasswordError').style.display = 'block';
        }
    }
}

function register(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validation
    let valid = true;
    
    // Clear previous errors
    document.querySelectorAll('#registerForm .error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    
    if (!name) {
        document.getElementById('registerNameError').textContent = 'Введите ФИО';
        document.getElementById('registerNameError').style.display = 'block';
        valid = false;
    }
    
    if (!phone) {
        document.getElementById('registerPhoneError').textContent = 'Введите телефон';
        document.getElementById('registerPhoneError').style.display = 'block';
        valid = false;
    }
    
    if (!email) {
        document.getElementById('registerEmailError').textContent = 'Введите email';
        document.getElementById('registerEmailError').style.display = 'block';
        valid = false;
    } else if (!email.includes('@')) {
        document.getElementById('registerEmailError').textContent = 'Введите корректный email';
        document.getElementById('registerEmailError').style.display = 'block';
        valid = false;
    }
    
    if (!password) {
        document.getElementById('registerPasswordError').textContent = 'Введите пароль';
        document.getElementById('registerPasswordError').style.display = 'block';
        valid = false;
    } else if (password.length < 6) {
        document.getElementById('registerPasswordError').textContent = 'Пароль должен быть не менее 6 символов';
        document.getElementById('registerPasswordError').style.display = 'block';
        valid = false;
    }
    
    if (password !== confirmPassword) {
        document.getElementById('registerConfirmPasswordError').textContent = 'Пароли не совпадают';
        document.getElementById('registerConfirmPasswordError').style.display = 'block';
        valid = false;
    }
    
    // Check if email is unique
    if (email) {
        const users = JSON.parse(localStorage.getItem('dentapp_users') || '[]');
        const emailExists = users.some(u => u.email === email);
        
        if (emailExists) {
            document.getElementById('registerEmailError').textContent = 'Этот email уже зарегистрирован';
            document.getElementById('registerEmailError').style.display = 'block';
            valid = false;
        }
    }
    
    if (valid) {
        // Create user
        const users = JSON.parse(localStorage.getItem('dentapp_users') || '[]');
        const newUser = {
            id: Date.now(),
            name,
            phone,
            email,
            password
        };
        
        users.push(newUser);
        localStorage.setItem('dentapp_users', JSON.stringify(users));
        
        // Auto-login
        state.currentUser = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone
        };
        
        localStorage.setItem('dentapp_user', JSON.stringify(state.currentUser));
        
        document.getElementById('registerSuccess').textContent = 'Аккаунт успешно создан! Выполняется автоматическая авторизация...';
        document.getElementById('registerSuccess').style.display = 'block';
        
        setTimeout(() => {
            hideAuthModal();
            updateAuthUI();
            navigateTo('dashboard');
        }, 1500);
    }
}

function logout() {
    state.currentUser = null;
    localStorage.removeItem('dentapp_user');
    updateAuthUI();
    navigateTo('home');
}

function updateAuthUI() {
    if (state.currentUser) {
        // User is logged in
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        
        // Set user info
        document.getElementById('userName').textContent = state.currentUser.name;
        document.getElementById('userAvatar').textContent = getInitials(state.currentUser.name);
        document.getElementById('dashboardUserName').textContent = state.currentUser.name;
        document.getElementById('dashboardUserEmail').textContent = state.currentUser.email;
        document.getElementById('dashboardUserPhone').textContent = state.currentUser.phone;
        document.getElementById('dashboardUserAvatar').textContent = getInitials(state.currentUser.name);
    } else {
        // User is not logged in
        document.getElementById('authButtons').style.display = 'flex';
        document.getElementById('userInfo').style.display = 'none';
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

// Dashboard functions
function updateDashboard() {
    // Update upcoming appointments
    const appointments = JSON.parse(localStorage.getItem('dentapp_appointments') || '[]');
    const userAppointments = appointments.filter(a => a.userId === state.currentUser?.id);
    
    const upcomingAppointmentsContainer = document.getElementById('upcomingAppointments');
    
    if (userAppointments.length > 0) {
        upcomingAppointmentsContainer.innerHTML = '';
        userAppointments.forEach(appointment => {
            const appointmentElement = document.createElement('div');
            appointmentElement.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid var(--light-gray);">
                    <div><strong>${appointment.service}</strong></div>
                    <div>${appointment.doctor}</div>
                    <div>${appointment.date} в ${appointment.time}</div>
                </div>
            `;
            upcomingAppointmentsContainer.appendChild(appointmentElement);
        });
    } else {
        upcomingAppointmentsContainer.innerHTML = '<p>У вас нет запланированных приемов</p>';
    }
    
    // Update visit stats
    const history = JSON.parse(localStorage.getItem('dentapp_history') || '[]');
    const userHistory = history.filter(h => h.userId === state.currentUser?.id);
    
    document.getElementById('visitStats').innerHTML = `
        <p>Всего посещений: <strong>${userHistory.length}</strong></p>
        <p>Последний визит: <strong>${userHistory.length > 0 ? userHistory[0].date : 'нет данных'}</strong></p>
    `;
}

function editProfile() {
    alert('Редактирование профиля. В реальном приложении здесь будет форма редактирования.');
}

// Appointment functions
function renderDoctors() {
    const container = document.getElementById('doctorsGrid');
    container.innerHTML = '';
    
    mockDoctors.forEach(doctor => {
        const doctorCard = document.createElement('div');
        doctorCard.className = 'doctor-card';
        doctorCard.setAttribute('data-doctor-id', doctor.id);
        doctorCard.innerHTML = `
            <h4>${doctor.name}</h4>
            <div class="doctor-specialty">${doctor.specialty}</div>
            <div>Опыт: ${doctor.experience}</div>
            <div>Рейтинг: ${doctor.rating} ★</div>
        `;
        
        doctorCard.addEventListener('click', function() {
            document.querySelectorAll('.doctor-card').forEach(card => {
                card.classList.remove('selected');
            });
            this.classList.add('selected');
            state.appointmentData.doctor = doctor;
        });
        
        container.appendChild(doctorCard);
    });
}

function nextAppointmentStep() {
    const currentStep = document.querySelector('.appointment-steps .step.active');
    const currentStepNum = parseInt(currentStep.getAttribute('data-step'));
    
    // Validate current step
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
    
    // Update steps UI
    currentStep.classList.remove('active');
    currentStep.classList.add('completed');
    
    const nextStep = document.querySelector(`.appointment-steps .step[data-step="${currentStepNum + 1}"]`);
    nextStep.classList.add('active');
    
    // Hide current form section
    document.getElementById(`step${currentStepNum}`).classList.remove('active');
    
    // Show next form section
    if (currentStepNum + 1 <= 4) {
        document.getElementById(`step${currentStepNum + 1}`).classList.add('active');
        
        // If moving to step 3, render time slots
        if (currentStepNum + 1 === 3) {
            renderTimeSlots();
        }
        
        // If moving to step 4, render summary
        if (currentStepNum + 1 === 4) {
            renderAppointmentSummary();
        }
    }
}

function prevAppointmentStep() {
    const currentStep = document.querySelector('.appointment-steps .step.active');
    const currentStepNum = parseInt(currentStep.getAttribute('data-step'));
    
    if (currentStepNum === 1) return;
    
    // Update steps UI
    currentStep.classList.remove('active');
    
    const prevStep = document.querySelector(`.appointment-steps .step[data-step="${currentStepNum - 1}"]`);
    prevStep.classList.remove('completed');
    prevStep.classList.add('active');
    
    // Hide current form section
    document.getElementById(`step${currentStepNum}`).classList.remove('active');
    
    // Show previous form section
    document.getElementById(`step${currentStepNum - 1}`).classList.add('active');
}

function renderTimeSlots() {
    const container = document.getElementById('timeSlotsContainer');
    const date = document.getElementById('appointmentDate').value;
    
    if (!date) {
        container.innerHTML = '<p>Выберите дату для просмотра доступных слотов</p>';
        return;
    }
    
    // Mock time slots
    const timeSlots = [
        '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'
    ];
    
    // Some random slots are "booked"
    const bookedSlots = ['10:00', '14:00'];
    
    container.innerHTML = '<h4>Доступные слоты:</h4><div class="time-slots-grid" id="timeSlotsGrid"></div>';
    const grid = document.getElementById('timeSlotsGrid');
    
    timeSlots.forEach(slot => {
        const isBooked = bookedSlots.includes(slot);
        const slotCard = document.createElement('div');
        slotCard.className = `time-slot-card ${isBooked ? 'booked' : ''}`;
        slotCard.setAttribute('data-time', slot);
        
        if (isBooked) {
            slotCard.innerHTML = `
                <div style="text-align: center;">
                    <div><strong>${slot}</strong></div>
                    <div style="color: var(--danger); font-size: 0.9rem;">Занято</div>
                </div>
            `;
        } else {
            slotCard.innerHTML = `
                <div style="text-align: center;">
                    <div><strong>${slot}</strong></div>
                    <div style="color: var(--success); font-size: 0.9rem;">Свободно</div>
                </div>
            `;
            
            slotCard.addEventListener('click', function() {
                if (this.classList.contains('selected')) {
                    this.classList.remove('selected');
                    state.appointmentData.time = '';
                } else {
                    document.querySelectorAll('.time-slot-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    this.classList.add('selected');
                    state.appointmentData.time = slot;
                }
            });
        }
        
        grid.appendChild(slotCard);
    });
}

function renderAppointmentSummary() {
    const container = document.getElementById('appointmentSummary');
    const service = mockServices.find(s => s.id === state.appointmentData.service);
    
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

function confirmAppointment() {
    if (!state.currentUser) {
        alert('Для записи на прием необходимо авторизоваться');
        showAuthModal();
        return;
    }
    
    // Save appointment
    const appointments = JSON.parse(localStorage.getItem('dentapp_appointments') || '[]');
    const service = mockServices.find(s => s.id === state.appointmentData.service);
    
    const newAppointment = {
        id: Date.now(),
        userId: state.currentUser.id,
        service: service ? service.name : state.appointmentData.service,
        doctor: state.appointmentData.doctor.name,
        date: formatDate(state.appointmentData.date),
        time: state.appointmentData.time,
        status: 'confirmed'
    };
    
    appointments.push(newAppointment);
    localStorage.setItem('dentapp_appointments', JSON.stringify(appointments));
    
    // Show success message
    document.getElementById('step4').style.display = 'none';
    document.getElementById('appointmentSuccess').style.display = 'block';
    
    // Update steps UI
    document.querySelectorAll('.appointment-steps .step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    document.querySelector('.appointment-steps .step[data-step="4"]').classList.add('completed');
    
    // Update dashboard
    updateDashboard();
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
    
    // Reset steps UI
    document.querySelectorAll('.appointment-steps .step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    document.querySelector('.appointment-steps .step[data-step="1"]').classList.add('active');
    
    // Reset forms
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
    
    // Simple logic to determine recommendation based on answers
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
    
    // Get user's history
    let history = JSON.parse(localStorage.getItem('dentapp_history') || '[]');
    
    // If user is logged in, filter their history
    if (state.currentUser) {
        history = history.filter(h => h.userId === state.currentUser.id);
    }
    
    // If no history, use mock data for demo
    if (history.length === 0) {
        history = mockHistory;
    }
    
    if (history.length === 0) {
        emptyMessage.style.display = 'block';
        container.innerHTML = '';
    } else {
        emptyMessage.style.display = 'none';
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

function applyHistoryFilter() {
    // In a real app, this would filter the history
    alert('Фильтр применен. В реальном приложении здесь будет фильтрация истории.');
    renderHistory();
}

function viewVisitDetails(id) {
    alert(`Просмотр деталей посещения #${id}. В реальном приложении здесь будет открытие модального окна с полной информацией.`);
}

// Schedule functions (for doctors)
function renderCalendar() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    document.getElementById('currentMonth').textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
    
    const daysContainer = document.getElementById('calendarDays');
    daysContainer.innerHTML = '';
    
    // Add day headers
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayNames.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.style.fontWeight = 'bold';
        dayElement.textContent = day;
        daysContainer.appendChild(dayElement);
    });
    
    // Get first day of month
    const firstDay = new Date(state.currentYear, state.currentMonth, 1);
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Adjust for Monday start
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        emptyDay.style.visibility = 'hidden';
        daysContainer.appendChild(emptyDay);
    }
    
    // Get days in month
    const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    
    // Add days of month
    const today = new Date();
    const isToday = (day) => {
        return day === today.getDate() && 
               state.currentMonth === today.getMonth() && 
               state.currentYear === today.getFullYear();
    };
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        if (isToday(day)) {
            dayElement.classList.add('active');
        }
        dayElement.textContent = day;
        
        dayElement.addEventListener('click', function() {
            document.querySelectorAll('.calendar-day').forEach(d => {
                d.classList.remove('active');
            });
            this.classList.add('active');
            
            state.selectedDate = new Date(state.currentYear, state.currentMonth, day);
            document.getElementById('selectedDateText').textContent = formatDate(state.selectedDate);
            
            renderScheduleForDay();
        });
        
        daysContainer.appendChild(dayElement);
    }
    
    // Set today as selected if not already selected
    if (!document.querySelector('.calendar-day.active')) {
        const todayElement = Array.from(daysContainer.querySelectorAll('.calendar-day')).find(el => {
            return el.textContent === today.getDate().toString() && 
                   !isNaN(parseInt(el.textContent));
        });
        if (todayElement) {
            todayElement.click();
        }
    } else {
        renderScheduleForDay();
    }
}

function renderScheduleForDay() {
    const container = document.getElementById('scheduleTimeSlots');
    container.innerHTML = '';
    
    // Mock schedule data
    const timeSlots = [
        { time: '09:00', status: 'booked', patient: 'Иванов И.И.' },
        { time: '10:00', status: 'available', patient: null },
        { time: '11:00', status: 'booked', patient: 'Петров П.П.' },
        { time: '12:00', status: 'available', patient: null },
        { time: '14:00', status: 'booked', patient: 'Сидорова С.С.' },
        { time: '15:00', status: 'available', patient: null },
        { time: '16:00', status: 'available', patient: null },
        { time: '17:00', status: 'booked', patient: 'Козлов К.К.' }
    ];
    
    timeSlots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `time-slot ${slot.status}`;
        slotElement.innerHTML = `
            <div><strong>${slot.time}</strong></div>
            <div>${slot.status === 'booked' ? `Запись: ${slot.patient}` : 'Свободно'}</div>
        `;
        
        if (slot.status === 'available') {
            slotElement.addEventListener('click', function() {
                if (confirm(`Добавить слот ${slot.time} в расписание?`)) {
                    alert(`Слот ${slot.time} добавлен в расписание на ${formatDate(state.selectedDate)}`);
                }
            });
        }
        
        container.appendChild(slotElement);
    });
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

// Initialize appointment date picker
document.getElementById('appointmentDate').addEventListener('change', renderTimeSlots);

// Set minimum date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('appointmentDate').setAttribute('min', today);

// Set default date to tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
document.getElementById('appointmentDate').value = tomorrow.toISOString().split('T')[0];