const express = require('express');
const { auth, teacherOnly } = require('../middleware/auth');

const router = express.Router();

// Валидация GitLab MR ссылки
const isValidMrLink = (url) => {
  return /^https:\/\/gitlab\.com\/[\w\-\.\/]+\/-\/merge_requests\/\d+/.test(url) ||
         /^https:\/\/gitlab\.[\w\-\.]+\/[\w\-\.\/]+\/-\/merge_requests\/\d+/.test(url);
};

// ============ LABS (названия лабораторных) ============

// Получить все лабораторные (для дропдауна)
router.get('/labs', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    
    const { data: labs, error } = await supabase
      .from('labs')
      .select('*')
      .order('order_num', { ascending: true });

    if (error) throw error;
    res.json(labs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить лабораторную (преподаватель)
router.post('/labs', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Введите название' });
    }

    // Получить максимальный order_num
    const { data: maxOrder } = await supabase
      .from('labs')
      .select('order_num')
      .order('order_num', { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.order_num || 0) + 1;

    const { data: lab, error } = await supabase
      .from('labs')
      .insert({ name, order_num: newOrder })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Лабораторная с таким названием уже существует' });
      }
      throw error;
    }

    res.status(201).json(lab);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить лабораторную (преподаватель)
router.delete('/labs/:id', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    
    const { error } = await supabase
      .from('labs')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ SUBMISSIONS ============

// Получить свои лабораторные (студент)
router.get('/my', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Получить названия лаб отдельно
    const labIds = submissions.map(s => s.lab_id).filter(Boolean);
    let labsMap = {};
    if (labIds.length > 0) {
      const { data: labs } = await supabase
        .from('labs')
        .select('id, name')
        .in('id', labIds);
      labsMap = Object.fromEntries((labs || []).map(l => [l.id, l.name]));
    }

    res.json(submissions.map(s => ({
      _id: s.id,
      labId: s.lab_id,
      labName: labsMap[s.lab_id] || s.lab_name,
      mrLink: s.mr_link,
      status: s.status,
      submittedAt: s.submitted_at
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить лабораторную (студент)
router.post('/', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { labId, mrLink } = req.body;

    if (!labId || !mrLink) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    if (!isValidMrLink(mrLink)) {
      return res.status(400).json({ error: 'Некорректная ссылка на GitLab Merge Request' });
    }

    // Проверить что лаба существует
    const { data: lab } = await supabase
      .from('labs')
      .select('name')
      .eq('id', labId)
      .single();

    if (!lab) {
      return res.status(400).json({ error: 'Лабораторная не найдена' });
    }

    // Проверить что студент еще не сдавал эту лабу (или она отклонена)
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('user_id', req.user.id)
      .eq('lab_id', labId)
      .single();

    if (existing && existing.status !== 'rejected') {
      return res.status(400).json({ error: 'Вы уже сдали эту лабораторную' });
    }

    // Если была отклонена - удаляем старую запись
    if (existing && existing.status === 'rejected') {
      await supabase.from('submissions').delete().eq('id', existing.id);
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        user_id: req.user.id,
        lab_id: labId,
        lab_name: lab.name,
        mr_link: mrLink,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      _id: submission.id,
      labId: submission.lab_id,
      labName: submission.lab_name,
      mrLink: submission.mr_link,
      status: submission.status,
      submittedAt: submission.submitted_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить все лабораторные (преподаватель)
router.get('/all', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Получить пользователей и лабы отдельно
    const userIds = [...new Set(submissions.map(s => s.user_id).filter(Boolean))];
    const labIds = [...new Set(submissions.map(s => s.lab_id).filter(Boolean))];

    let usersMap = {};
    let labsMap = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, last_name')
        .in('id', userIds);
      usersMap = Object.fromEntries((users || []).map(u => [u.id, u.last_name]));
    }

    if (labIds.length > 0) {
      const { data: labs } = await supabase
        .from('labs')
        .select('id, name, order_num')
        .in('id', labIds);
      labsMap = Object.fromEntries((labs || []).map(l => [l.id, { name: l.name, order: l.order_num }]));
    }

    res.json(submissions.map(s => ({
      _id: s.id,
      labId: s.lab_id,
      labName: labsMap[s.lab_id]?.name || s.lab_name,
      labOrder: labsMap[s.lab_id]?.order,
      mrLink: s.mr_link,
      status: s.status,
      submittedAt: s.submitted_at,
      userId: s.user_id ? { _id: s.user_id, lastName: usersMap[s.user_id] } : null
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Сводная таблица (преподаватель)
router.get('/summary', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    
    // Получить всех студентов
    const { data: students } = await supabase
      .from('users')
      .select('id, last_name')
      .eq('role', 'student')
      .order('last_name');

    // Получить все лабораторные
    const { data: labs } = await supabase
      .from('labs')
      .select('*')
      .order('order_num');

    // Получить все сдачи
    const { data: submissions } = await supabase
      .from('submissions')
      .select('user_id, lab_id, status, mr_link');

    res.json({ students, labs, submissions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отменить свою работу (студент) - только если pending
router.delete('/:id', auth, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    // Проверить что работа принадлежит студенту и на проверке
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, user_id, status')
      .eq('id', req.params.id)
      .single();

    if (!submission) {
      return res.status(404).json({ error: 'Работа не найдена' });
    }

    if (submission.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({ error: 'Можно отменить только работу на проверке' });
    }

    await supabase.from('submissions').delete().eq('id', req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Изменить статус лабораторной (преподаватель)
router.patch('/:id/status', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    if (!submission) {
      return res.status(404).json({ error: 'Работа не найдена' });
    }

    // Получить имя пользователя
    let userName = null;
    if (submission.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('last_name')
        .eq('id', submission.user_id)
        .single();
      userName = user?.last_name;
    }

    res.json({
      _id: submission.id,
      labId: submission.lab_id,
      labName: submission.lab_name,
      mrLink: submission.mr_link,
      status: submission.status,
      submittedAt: submission.submitted_at,
      userId: submission.user_id ? { _id: submission.user_id, lastName: userName } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
