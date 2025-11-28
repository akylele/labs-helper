const express = require('express');
const { auth, teacherOnly } = require('../middleware/auth');

const router = express.Router();

const clampGrade = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num)));
};

// Получить оценки за пару (по дате)
router.get('/lessons', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const lessonDate = req.query.date;

    if (!lessonDate) {
      return res.status(400).json({ error: 'Укажите дату занятия' });
    }

    const [{ data: students, error: studentsError }, { data: grades, error: gradesError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('id, last_name')
          .eq('role', 'student')
          .order('last_name'),
        supabase
          .from('grades')
          .select('id, user_id, grade_value, comment')
          .eq('grade_type', 'lesson')
          .eq('lesson_date', lessonDate)
      ]);

    if (studentsError || gradesError) {
      throw studentsError || gradesError;
    }

    const gradesMap = {};
    (grades || []).forEach((grade) => {
      gradesMap[grade.user_id] = grade;
    });

    const payload = students.map((student) => ({
      id: student.id,
      lastName: student.last_name,
      grade: gradesMap[student.id] || null
    }));

    res.json({ lessonDate, students: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Массовое сохранение оценок за пару
router.post('/lessons/bulk', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { lessonDate, entries } = req.body;

    if (!lessonDate || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Неверные данные для сохранения' });
    }

    const rows = [];
    for (const entry of entries) {
      const gradeValue = clampGrade(entry.gradeValue);
      if (!entry.userId || gradeValue === null) {
        return res.status(400).json({ error: 'Неверные значения оценки или пользователя' });
      }
      rows.push({
        user_id: entry.userId,
        grade_type: 'lesson',
        grade_value: gradeValue,
        lesson_date: lessonDate,
        comment: entry.comment || null,
        exam_name: null
      });
    }

    const { error } = await supabase
      .from('grades')
      .upsert(rows, { onConflict: 'user_id,lesson_date,grade_type' });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список контрольных (уникальные названия)
router.get('/exams/list', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { data, error } = await supabase
      .from('grades')
      .select('exam_name')
      .eq('grade_type', 'exam')
      .not('exam_name', 'is', null)
      .order('exam_name', { ascending: true });

    if (error) throw error;

    const uniqueNames = [...new Set((data || []).map((item) => item.exam_name))].filter(Boolean);
    res.json(uniqueNames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить оценки за контрольную (по названию)
router.get('/exams', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const examName = req.query.name;

    if (!examName) {
      return res.status(400).json({ error: 'Укажите название контрольной' });
    }

    const [{ data: students, error: studentsError }, { data: grades, error: gradesError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('id, last_name')
          .eq('role', 'student')
          .order('last_name'),
        supabase
          .from('grades')
          .select('id, user_id, grade_value, comment')
          .eq('grade_type', 'exam')
          .eq('exam_name', examName)
      ]);

    if (studentsError || gradesError) {
      throw studentsError || gradesError;
    }

    const gradesMap = {};
    (grades || []).forEach((grade) => {
      gradesMap[grade.user_id] = grade;
    });

    const payload = students.map((student) => ({
      id: student.id,
      lastName: student.last_name,
      grade: gradesMap[student.id] || null
    }));

    res.json({ examName, students: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Массовое сохранение оценок за контрольную
router.post('/exams/bulk', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { examName, entries } = req.body;

    if (!examName || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Неверные данные для сохранения' });
    }

    const rows = [];
    for (const entry of entries) {
      const gradeValue = clampGrade(entry.gradeValue);
      if (!entry.userId || gradeValue === null) {
        return res.status(400).json({ error: 'Неверные значения оценки или пользователя' });
      }
      rows.push({
        user_id: entry.userId,
        grade_type: 'exam',
        grade_value: gradeValue,
        exam_name: examName,
        comment: entry.comment || null,
        lesson_date: null
      });
    }

    const { error } = await supabase
      .from('grades')
      .upsert(rows, { onConflict: 'user_id,exam_name,grade_type' });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// История оценок студента
router.get('/my', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Доступ только для студентов' });
    }

    const { data, error } = await supabase
      .from('grades')
      .select('id, grade_type, grade_value, lesson_date, exam_name, comment, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const lessons = [];
    const exams = [];

    (data || []).forEach((entry) => {
      if (entry.grade_type === 'lesson') {
        lessons.push(entry);
      } else if (entry.grade_type === 'exam') {
        exams.push(entry);
      }
    });

    res.json({ lessons, exams });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

