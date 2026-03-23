-- Пользователи (пациенты и администраторы/врачи)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'patient', -- 'patient', 'doctor', 'admin'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Врачи (расширенная информация, если не хранить в users)
CREATE TABLE doctors (
    id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    specialty TEXT,
    experience_years INTEGER,
    rating DECIMAL(3,2),
    bio TEXT
);

-- Услуги
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER, -- продолжительность приёма
    price DECIMAL(10,2)
);

-- Записи на приём (предстоящие)
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- История посещений (завершённые приёмы)
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id),
    visit_date DATE NOT NULL,
    diagnosis TEXT,
    recommendations TEXT,
    cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Сессии предварительной диагностики (опросы)
CREATE TABLE diagnosis_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    result_diagnosis TEXT,
    result_recommendation TEXT
);

-- Ответы на вопросы диагностики
CREATE TABLE diagnosis_answers (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES diagnosis_sessions(id) ON DELETE CASCADE,
    question_key VARCHAR(50), -- идентификатор вопроса (например, 'pain', 'sensitivity')
    answer_value VARCHAR(50)
);

-- Расписание врачей (слоты)
CREATE TABLE schedule (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, slot_date, slot_time)
);