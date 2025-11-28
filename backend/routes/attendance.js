const express = require('express');
const { auth, teacherOnly } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['present', 'absent', 'late'];

// Получить посещаемость студентов за конкретную дату (преподаватель)
router.get('/', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const lessonDate = req.query.date;

    if (!lessonDate) {
      return res.status(400).json({ error: 'Укажите дату занятия' });
    }

    const [{ data: students, error: studentsError }, { data: attendance, error: attendanceError }] = await Promise.all([
      supabase
        .from('users')
        .select('id, last_name')
        .eq('role', 'student')
        .order('last_name'),
      supabase
        .from('attendance')
        .select('id, user_id, lesson_date, status, comment')
        .eq('lesson_date', lessonDate)
    ]);

    if (studentsError || attendanceError) {
      throw studentsError || attendanceError;
    }

    const attendanceMap = {};
    (attendance || []).forEach((item) => {
      attendanceMap[item.user_id] = item;
    });

    const payload = students.map((student) => ({
      id: student.id,
      lastName: student.last_name,
      attendance: attendanceMap[student.id] || null
    }));

    res.json({
      lessonDate,
      students: payload
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Массовое сохранение посещаемости
router.post('/bulk', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { lessonDate, entries } = req.body;

    if (!lessonDate || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Неверные данные для сохранения' });
    }

    for (const entry of entries) {
      if (!entry.userId || !VALID_STATUSES.includes(entry.status)) {
        return res.status(400).json({ error: 'Неверные значения статуса или пользователя' });
      }
    }

    const rows = entries.map((entry) => ({
      user_id: entry.userId,
      lesson_date: lessonDate,
      status: entry.status,
      comment: entry.comment || null
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'user_id,lesson_date' });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// История посещаемости студента
router.get('/my', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Доступ только для студентов' });
    }

    const { data, error } = await supabase
      .from('attendance')
      .select('id, lesson_date, status, comment')
      .eq('user_id', req.user.id)
      .order('lesson_date', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Изменить запись посещаемости (точечно)
router.patch('/:id', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { status, comment } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    const payload = {};
    if (status) payload.status = status;
    if (comment !== undefined) payload.comment = comment;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    const { data, error } = await supabase
      .from('attendance')
      .update(payload)
      .eq('id', req.params.id)
      .select('id, user_id, lesson_date, status, comment')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

