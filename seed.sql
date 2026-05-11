-- Добавляем тестовых пользователей (пароль: 123456, хеш bcrypt)
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('Иван Петров', 'ivan@example.com', '+71234567890', '$2b$10$r0Yi0h7Q2Rn3VJ5VKqO6wO9XmXkXkXkXkXkXkXkXkXkXkXkXkXk', 'patient'),
('Анна Сидорова', 'anna@example.com', '+79876543210', '$2b$10$r0Yi0h7Q2Rn3VJ5VKqO6wO9XmXkXkXkXkXkXkXkXkXkXkXkXkXk', 'patient'),
('Петров Алексей Владимирович', 'alex@dentapp.ru', '+79031234567', '$2b$10$r0Yi0h7Q2Rn3VJ5VKqO6wO9XmXkXkXkXkXkXkXkXkXkXkXkXkXk', 'doctor'),
('Владимир Владимирович Владов', 'vladov@dentapp.ru', '+79051112233', '$2b$10$r0Yi0h7Q2Rn3VJ5VKqO6wO9XmXkXkXkXkXkXkXkXkXkXkXkXkXk', 'doctor'),
('Ченджинджи Кубаки', 'kubaki@dentapp.ru', '+79052223344', '$2b$10$r0Yi0h7Q2Rn3VJ5VKqO6wO9XmXkXkXkXkXkXkXkXkXkXkXkXkXk', 'doctor');

-- Данные врачей (id подставятся по email)
INSERT INTO doctors (id, specialty, experience_years, rating, bio)
SELECT u.id, d.specialty, d.experience_years, d.rating, d.bio
FROM (VALUES 
    ('alex@dentapp.ru', 'Терапевт, хирург', 12, 4.8, 'Врач высшей категории'),
    ('vladov@dentapp.ru', 'Ортодонт', 10, 4.5, 'Опытный врач-ортодонт'),
    ('kubaki@dentapp.ru', 'Хирург', 15, 4.9, 'Ведущий хирург-стоматолог')
) AS d(email, specialty, experience_years, rating, bio)
JOIN users u ON u.email = d.email;

-- Услуги
INSERT INTO services (name, description, duration_minutes, price) VALUES
('Лечение кариеса', 'Полное удаление кариозных поражений', 60, 3500),
('Гигиена и чистка', 'Профессиональная чистка зубов', 40, 2500),
('Удаление зуба', 'Хирургическое удаление', 30, 5000);

-- Слоты расписания для всех врачей на 14 дней
INSERT INTO schedule (doctor_id, slot_date, slot_time, is_available)
SELECT 
  d.id,
  current_date + interval '1 day' * day.day,
  t.time,
  true
FROM doctors d
CROSS JOIN generate_series(0, 13) AS day(day)
CROSS JOIN (VALUES ('09:00'), ('10:00'), ('11:00'), ('12:00'), ('14:00'), ('15:00'), ('16:00'), ('17:00')) AS t(time)
WHERE EXTRACT(DOW FROM current_date + interval '1 day' * day.day) NOT IN (0, 6)
ON CONFLICT (doctor_id, slot_date, slot_time) DO NOTHING;у