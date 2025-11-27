const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Регистрация студента
router.post('/register', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { lastName, password } = req.body;

    if (!lastName || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 4 символа' });
    }

    // Check if student exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('last_name', lastName)
      .eq('role', 'student')
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Студент с такой фамилией уже зарегистрирован' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        last_name: lastName,
        password: hashedPassword,
        role: 'student'
      })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { lastName, password } = req.body;

    if (!lastName || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('last_name', lastName)
      .single();

    if (!user) {
      return res.status(400).json({ error: 'Неверная фамилия или пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверная фамилия или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка токена
router.get('/me', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: user } = await supabase
      .from('users')
      .select('id, last_name, role')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    res.json({
      user: {
        id: user.id,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Неверный токен' });
  }
});

module.exports = router;
