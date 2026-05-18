const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Подключение к PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

pool.connect((err) => {
  if (err) console.error('Ошибка подключения к БД', err);
  else console.log('Подключено к PostgreSQL');
});

// ========== Вспомогательные функции ==========
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (userId, email, role) => {
  return jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ detail: 'Требуется авторизация' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ detail: 'Неверный или просроченный токен' });
    req.user = user;
    next();
  });
};

// ========== API ЭНДПОИНТЫ ==========

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ detail: 'Все поля обязательны' });
    }
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ detail: 'Email или телефон уже зарегистрированы' });
    }
    const hashed = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'patient')
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, phone, hashed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  try {
    const { credential, password } = req.body;
    if (!credential || !password) {
      return res.status(400).json({ detail: 'Укажите email/телефон и пароль' });
    }
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR phone = $1',
      [credential]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ detail: 'Неверные учётные данные' });
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ detail: 'Неверные учётные данные' });
    }
    const token = generateToken(user.id, user.email, user.role);
    res.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Профиль (GET)
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Обновление профиля (PUT)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const updates = [];
    const values = [];
    if (name) { updates.push(`name = $${updates.length + 1}`); values.push(name); }
    if (phone) { updates.push(`phone = $${updates.length + 1}`); values.push(phone); }
    if (email) { updates.push(`email = $${updates.length + 1}`); values.push(email); }
    if (updates.length === 0) return res.status(400).json({ detail: 'Нет данных для обновления' });
    values.push(req.user.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, name, email, phone, role, created_at`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ detail: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ detail: 'Email или телефон уже заняты' });
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Список врачей
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, d.specialty, d.experience_years, d.rating, d.bio
      FROM users u JOIN doctors d ON u.id = d.id
      WHERE u.role = 'doctor'
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Список услуг
app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Создание записи на приём
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { doctor_id, service_id, date, time, notes } = req.body;
    const patient_id = req.user.id;

    const doctorCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2', [doctor_id, 'doctor']);
    if (doctorCheck.rows.length === 0) {
      return res.status(400).json({ detail: 'Врач не найден' });
    }
    const serviceCheck = await pool.query('SELECT id FROM services WHERE id = $1', [service_id]);
    if (serviceCheck.rows.length === 0) {
      return res.status(400).json({ detail: 'Услуга не найдена' });
    }

    const slotCheck = await pool.query(
      'SELECT id FROM schedule WHERE doctor_id = $1 AND slot_date = $2 AND slot_time = $3 AND is_available = true',
      [doctor_id, date, time]
    );
    if (slotCheck.rows.length === 0) {
      return res.status(409).json({ detail: 'Выбранное время уже занято или недоступно' });
    }

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, service_id, appointment_date, appointment_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [patient_id, doctor_id, service_id, date, time, notes || null]
    );

    await pool.query(
      'UPDATE schedule SET is_available = false WHERE doctor_id = $1 AND slot_date = $2 AND slot_time = $3',
      [doctor_id, date, time]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Список записей текущего пользователя
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query;
    let params;

    if (role === 'doctor') {
      query = `
        SELECT a.id,
               TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date,
               a.appointment_time::text as appointment_time,
               a.status, a.notes,
               u.id as patient_id, u.name as patient_name,
               s.id as service_id, s.name as service_name
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        JOIN services s ON a.service_id = s.id
        WHERE a.doctor_id = $1
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
      `;
      params = [userId];
    } else {
      query = `
        SELECT a.id,
               TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date,
               a.appointment_time::text as appointment_time,
               a.status, a.notes,
               d.id as doctor_id, d.name as doctor_name,
               s.id as service_id, s.name as service_name
        FROM appointments a
        JOIN users d ON a.doctor_id = d.id
        JOIN services s ON a.service_id = s.id
        WHERE a.patient_id = $1
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Свободные слоты врача на дату
app.get('/api/doctors/:id/slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ detail: 'Не указана дата' });
    const result = await pool.query(
      `SELECT slot_time FROM schedule
       WHERE doctor_id = $1 AND slot_date = $2 AND is_available = true
       ORDER BY slot_time`,
      [req.params.id, date]
    );
    res.json(result.rows.map(row => row.slot_time));
  } catch (err) {
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Публичное расписание (общее или по врачу)
app.get('/api/public/schedule', async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!date) return res.status(400).json({ detail: 'Не указана дата' });

    let slotsQuery, slotsParams;
    if (doctorId) {
      slotsQuery = `
        SELECT s.slot_time, s.is_available, s.doctor_id,
               u.name AS doctor_name, d.specialty
        FROM schedule s
        JOIN users u ON s.doctor_id = u.id
        JOIN doctors d ON u.id = d.id
        WHERE s.doctor_id = $1 AND s.slot_date = $2
        ORDER BY s.slot_time
      `;
      slotsParams = [doctorId, date];
    } else {
      slotsQuery = `
        SELECT s.slot_time, s.is_available, s.doctor_id,
               u.name AS doctor_name, d.specialty
        FROM schedule s
        JOIN users u ON s.doctor_id = u.id
        JOIN doctors d ON u.id = d.id
        WHERE s.slot_date = $1
        ORDER BY u.name, s.slot_time
      `;
      slotsParams = [date];
    }

    const slotsResult = await pool.query(slotsQuery, slotsParams);

    const appointmentsQuery = `
      SELECT a.appointment_time, a.doctor_id,
             p.name AS patient_name,
             srv.name AS service_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN services srv ON a.service_id = srv.id
      WHERE a.appointment_date = $1 AND a.status = 'scheduled'
      ORDER BY a.appointment_time
    `;
    const appointmentsResult = await pool.query(appointmentsQuery, [date]);

    const bookedMap = new Map();
    appointmentsResult.rows.forEach(app => {
      bookedMap.set(`${app.doctor_id}:${app.appointment_time}`, {
        patient: app.patient_name,
        service: app.service_name,
      });
    });

    const schedule = slotsResult.rows.map(slot => {
      const booking = bookedMap.get(`${slot.doctor_id}:${slot.slot_time}`);
      if (booking) {
        return {
          time: slot.slot_time,
          status: 'booked',
          doctor_id: slot.doctor_id,
          doctor_name: slot.doctor_name,
          specialty: slot.specialty,
          patient: booking.patient,
          service: booking.service,
        };
      } else {
        return {
          time: slot.slot_time,
          status: slot.is_available ? 'available' : 'unavailable',
          doctor_id: slot.doctor_id,
          doctor_name: slot.doctor_name,
          specialty: slot.specialty,
          patient: null,
          service: null,
        };
      }
    });

    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Публичный список врачей
app.get('/api/public/doctors', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, d.specialty, d.experience_years, d.rating
       FROM users u JOIN doctors d ON u.id = d.id
       WHERE u.role = 'doctor'
       ORDER BY u.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Уведомления пользователя
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, appointment_id, message, created_at, is_read
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Отметить уведомление прочитанным
app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// ========== CRON-ЗАДАЧА ДЛЯ НАПОМИНАНИЙ ==========
cron.schedule('* * * * *', async () => {
  console.log(`[CRON] Проверка в ${new Date().toLocaleString()}`);
  try {
    // --- 1. Обработка прошедших приёмов ---
    const now = new Date();
    const pastResult = await pool.query(`
      UPDATE appointments
      SET status = 'completed', updated_at = NOW()
      WHERE status = 'scheduled'
        AND (appointment_date + appointment_time) < NOW() AT TIME ZONE 'Europe/Moscow'
    `);
    if (pastResult.rowCount > 0) {
      console.log(`[CRON] Завершено прошедших приёмов: ${pastResult.rowCount}`);
    }

    // --- 2. Поиск записей на завтра (напоминания) ---
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    console.log(`[CRON] Ищем записи на ${formattedDate}`);

    const result = await pool.query(
      `SELECT a.id, a.patient_id, a.doctor_id, a.appointment_time,
              u.name AS patient_name, d.name AS doctor_name, s.name AS service_name
       FROM appointments a
       JOIN users u ON a.patient_id = u.id
       JOIN users d ON a.doctor_id = d.id
       JOIN services s ON a.service_id = s.id
       WHERE a.appointment_date = $1 AND a.status = 'scheduled'`,
      [formattedDate]
    );

    if (result.rows.length === 0) {
      console.log(`[CRON] Нет записей на завтра (${formattedDate})`);
      return;
    }

    for (const row of result.rows) {
      const message = `Напоминание: завтра (${formattedDate}) в ${row.appointment_time} у вас приём у ${row.doctor_name} (${row.service_name}).`;
      console.log(`[CRON] Напоминание для ${row.patient_name}: ${message}`);
    }
    console.log(`[CRON] Найдено записей на завтра: ${result.rows.length}`);
  } catch (err) {
    console.error('[CRON] Ошибка:', err);
  }
}, { timezone: "Europe/Moscow" });

console.log('[CRON] Планировщик запущен (ежеминутно для теста)');

app.patch('/api/appointments/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    // Получаем запись
    const appResult = await pool.query(
      'SELECT * FROM appointments WHERE id = $1',
      [appointmentId]
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Запись не найдена' });
    }
    const appointment = appResult.rows[0];

    // Проверка прав: пациент может отменить свою запись, врач – запись к нему
    if (role === 'patient' && appointment.patient_id !== userId) {
      return res.status(403).json({ detail: 'Нет прав для отмены этой записи' });
    }
    if (role === 'doctor' && appointment.doctor_id !== userId) {
      return res.status(403).json({ detail: 'Вы не можете отменить чужую запись' });
    }

    // Меняем статус
    await pool.query(
      `UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [appointmentId]
    );

    // Освобождаем слот
    await pool.query(
      `UPDATE schedule SET is_available = true
       WHERE doctor_id = $1 AND slot_date = $2 AND slot_time = $3`,
      [appointment.doctor_id, appointment.appointment_date, appointment.appointment_time]
    );

    // Создаём уведомление пациенту
    const patientResult = await pool.query('SELECT name FROM users WHERE id = $1', [appointment.patient_id]);
    const doctorResult = await pool.query('SELECT name FROM users WHERE id = $1', [appointment.doctor_id]);
    const serviceResult = await pool.query('SELECT name FROM services WHERE id = $1', [appointment.service_id]);

    const patientName = patientResult.rows[0]?.name || 'Пациент';
    const doctorName = doctorResult.rows[0]?.name || 'Врач';
    const serviceName = serviceResult.rows[0]?.name || 'услуга';

    const message = `Ваша запись на ${appointment.appointment_date} в ${appointment.appointment_time} (${serviceName}) к врачу ${doctorName} была отменена.`;
    await pool.query(
      `INSERT INTO notifications (user_id, appointment_id, message) VALUES ($1, $2, $3)`,
      [appointment.patient_id, appointmentId, message]
    );

    res.json({ success: true, message: 'Запись отменена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Ошибка сервера' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
