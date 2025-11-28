const express = require('express');
const { auth, teacherOnly } = require('../middleware/auth');

const router = express.Router();

const clampGrade = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.min(10, Math.round(num)));
};

// Вспомогательная функция для форматирования полного имени
const formatFullName = (user) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.last_name || '';
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
          .select('id, last_name, first_name')
          .eq('role', 'student')
          .order('last_name'),
        supabase
          .from('grades')
          .select('id, user_id, grade_value, grade_index, comment')
          .eq('grade_type', 'lesson')
          .eq('lesson_date', lessonDate)
          .order('grade_index', { ascending: true })
      ]);

    if (studentsError || gradesError) {
      throw studentsError || gradesError;
    }

    // Группируем оценки по user_id, создавая массив до 3 элементов
    const gradesMap = {};
    (grades || []).forEach((grade) => {
      if (!gradesMap[grade.user_id]) {
        gradesMap[grade.user_id] = [];
      }
      const index = (grade.grade_index || 1) - 1; // grade_index 1-3 -> массив 0-2
      gradesMap[grade.user_id][index] = {
        id: grade.id,
        grade_value: grade.grade_value,
        comment: grade.comment,
        grade_index: grade.grade_index || 1
      };
    });

    const payload = students.map((student) => {
      const studentGrades = gradesMap[student.id] || [];
      // Создаем массив из 3 элементов, заполняя пустые места null
      const gradesArray = [];
      for (let i = 0; i < 3; i++) {
        gradesArray[i] = studentGrades[i] || null;
      }
      return {
        id: student.id,
        lastName: student.last_name,
        fullName: formatFullName(student),
        grades: gradesArray
      };
    });

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

    // Собираем всех студентов, для которых нужно обновить оценки
    const userIds = [...new Set(entries.map(e => e.userId).filter(Boolean))];
    
    if (userIds.length === 0) {
      return res.status(400).json({ error: 'Нет студентов для обновления' });
    }

    // Сначала удаляем все существующие оценки за эту дату для этих студентов
    const { error: deleteError } = await supabase
      .from('grades')
      .delete()
      .eq('grade_type', 'lesson')
      .eq('lesson_date', lessonDate)
      .in('user_id', userIds);

    if (deleteError) throw deleteError;

    // Затем собираем и вставляем только непустые оценки
    const rows = [];
    for (const entry of entries) {
      // entry.grades - массив до 3 оценок
      if (!entry.userId || !Array.isArray(entry.grades)) {
        continue;
      }

      entry.grades.forEach((gradeData, index) => {
        if (!gradeData || gradeData.gradeValue === null || gradeData.gradeValue === undefined || gradeData.gradeValue === '') {
          return; // Пропускаем пустые оценки
        }

        const gradeValue = clampGrade(gradeData.gradeValue);
        if (gradeValue === null) {
          return;
        }

        const gradeIndex = index + 1; // 0-2 -> 1-3

        rows.push({
          user_id: entry.userId,
          grade_type: 'lesson',
          grade_value: gradeValue,
          grade_index: gradeIndex,
          lesson_date: lessonDate,
          comment: gradeData.comment || null,
          exam_name: null
        });
      });
    }

    // Вставляем новые оценки (если есть)
    if (rows.length > 0) {
      const { error } = await supabase
        .from('grades')
        .insert(rows);

      if (error) throw error;
    }

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
          .select('id, last_name, first_name')
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
      fullName: formatFullName(student),
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
      .select('id, grade_type, grade_value, grade_index, lesson_date, exam_name, comment, created_at')
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

// Сводная таблица оценок за занятия
router.get('/lessons/summary', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const endDate = req.query.endDate || new Date().toISOString().substring(0, 10);
    const startDate =
      req.query.startDate ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    const [{ data: students, error: studentsError }, { data: grades, error: gradesError }] =
      await Promise.all([
        supabase.from('users').select('id, last_name, first_name').eq('role', 'student').order('last_name'),
        supabase
          .from('grades')
          .select('id, user_id, lesson_date, grade_value, grade_index')
          .eq('grade_type', 'lesson')
          .gte('lesson_date', startDate)
          .lte('lesson_date', endDate)
          .order('grade_index', { ascending: true })
      ]);

    if (studentsError || gradesError) {
      throw studentsError || gradesError;
    }

    res.json({
      startDate,
      endDate,
      students: (students || []).map(s => ({ ...s, fullName: formatFullName(s) })),
      grades: grades || []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Сводная таблица оценок за контрольные
router.get('/exams/summary', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const [{ data: students, error: studentsError }, { data: grades, error: gradesError }] =
      await Promise.all([
        supabase.from('users').select('id, last_name, first_name').eq('role', 'student').order('last_name'),
        supabase
          .from('grades')
          .select('id, user_id, exam_name, grade_value')
          .eq('grade_type', 'exam')
          .not('exam_name', 'is', null)
      ]);

    if (studentsError || gradesError) {
      throw studentsError || gradesError;
    }

    // Получаем уникальные названия контрольных
    const examNames = [...new Set((grades || []).map((g) => g.exam_name))].filter(Boolean).sort();

    res.json({
      students: (students || []).map(s => ({ ...s, fullName: formatFullName(s) })),
      grades: grades || [],
      examNames
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;

