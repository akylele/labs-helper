require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const authRoutes = require('./routes/auth');
const labsRoutes = require('./routes/labs');

const app = express();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Make supabase available to routes
app.locals.supabase = supabase;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', labsRoutes);

// Создание учителя при старте
const createTeacher = async () => {
  try {
    const { data: existingTeacher } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'teacher')
      .single();

    if (!existingTeacher) {
      const hashedPassword = await bcrypt.hash(process.env.TEACHER_PASSWORD, 10);
      await supabase.from('users').insert({
        last_name: process.env.TEACHER_LOGIN,
        password: hashedPassword,
        role: 'teacher'
      });
      console.log('Учитель создан:', process.env.TEACHER_LOGIN);
    }
  } catch (error) {
    // Teacher might already exist
    console.log('Проверка учителя завершена');
  }
};

// Start server
const PORT = process.env.PORT || 5050;

createTeacher().then(() => {
  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });
});
