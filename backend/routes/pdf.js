const express = require('express');
const PDFDocument = require('pdfkit');
const { auth, teacherOnly } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Функция для регистрации шрифта с поддержкой кириллицы
const registerCyrillicFont = (doc) => {
  try {
    // Попробуем найти системный шрифт с поддержкой кириллицы
    const systemFonts = [
      '/System/Library/Fonts/Supplemental/Arial.ttf', // macOS
      '/System/Library/Fonts/Helvetica.ttc', // macOS (может не работать)
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', // Linux
      'C:/Windows/Fonts/arial.ttf', // Windows
      'C:/Windows/Fonts/calibri.ttf' // Windows
    ];
    
    let foundFont = null;
    for (const fontPath of systemFonts) {
      if (fs.existsSync(fontPath)) {
        try {
          doc.registerFont('Cyrillic', fontPath);
          foundFont = fontPath;
          break;
        } catch (err) {
          console.log(`Не удалось загрузить шрифт ${fontPath}:`, err.message);
          continue;
        }
      }
    }
    
    if (foundFont) {
      // Регистрируем жирный вариант (используем тот же файл)
      try {
        doc.registerFont('Cyrillic-Bold', foundFont);
      } catch (err) {
        // Если не получилось, используем обычный шрифт для жирного
        console.log('Не удалось зарегистрировать жирный шрифт');
      }
      return 'Cyrillic';
    }
  } catch (error) {
    console.log('Ошибка при поиске системных шрифтов:', error.message);
  }
  
  // Если не нашли системный шрифт, возвращаем null - будет использован стандартный
  // Но он не поддерживает кириллицу, поэтому лучше выбросить ошибку
  console.warn('Не найден шрифт с поддержкой кириллицы. Русские буквы могут отображаться некорректно.');
  return null;
};

// Вспомогательная функция для форматирования полного имени
const formatFullName = (user) => {
  if (user.first_name && user.last_name) {
    return `${user.last_name} ${user.first_name}`;
  }
  return user.last_name || '';
};

// Выгрузка PDF посещаемости
router.get('/attendance', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const startDate = req.query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const endDate = req.query.endDate || new Date().toISOString().substring(0, 10);

    const [{ data: students, error: studentsError }, { data: attendance, error: attendanceError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('id, last_name, first_name')
          .eq('role', 'student')
          .order('last_name'),
        supabase
          .from('attendance')
          .select('user_id, lesson_date, status')
          .gte('lesson_date', startDate)
          .lte('lesson_date', endDate)
          .order('lesson_date', { ascending: true })
      ]);

    if (studentsError || attendanceError) {
      throw studentsError || attendanceError;
    }

    // Генерируем диапазон дат
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().substring(0, 10));
    }

    // Создаем карту посещаемости
    const attendanceMap = {};
    (attendance || []).forEach((record) => {
      const key = `${record.user_id}-${record.lesson_date}`;
      attendanceMap[key] = record.status;
    });

    // Создаем PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${startDate}_${endDate}.pdf"`);
    
    doc.pipe(res);

    // Регистрируем шрифт с поддержкой кириллицы
    const fontName = registerCyrillicFont(doc);
    const fontBold = fontName ? fontName + '-Bold' : 'Helvetica-Bold';
    const fontRegular = fontName || 'Helvetica';

    // Заголовок
    doc.font(fontRegular).fontSize(18).text('Сводная таблица посещаемости', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Период: ${startDate} - ${endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Таблица
    const rowHeight = 20;
    const colWidth = 60;
    const nameWidth = 120;
    const pageHeight = doc.page.height; // Высота страницы в альбомной ориентации (~595)
    const maxY = pageHeight - 50; // Максимальная Y позиция с учетом нижнего отступа
    let y = doc.y;

    // Функция для перерисовки заголовков
    const drawHeaders = () => {
      doc.font(fontBold).fontSize(10);
      doc.text('ФИО', 50, y, { width: nameWidth });
      let x = 50 + nameWidth;
      dates.forEach((date) => {
        const dateStr = new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        doc.text(dateStr, x, y, { width: colWidth, align: 'center' });
        x += colWidth;
      });
      y += rowHeight;
      doc.font(fontRegular);
    };

    // Заголовки на первой странице
    drawHeaders();

    // Данные
    (students || []).forEach((student) => {
      // Проверяем, нужно ли добавить новую страницу ПЕРЕД добавлением строки
      if (y + rowHeight > maxY) {
        doc.addPage();
        y = 50; // Сбрасываем позицию Y на новой странице
        drawHeaders(); // Перерисовываем заголовки
      }
      doc.text(formatFullName(student), 50, y, { width: nameWidth });
      let x = 50 + nameWidth;
      dates.forEach((date) => {
        const status = attendanceMap[`${student.id}-${date}`];
        let symbol = '';
        if (status === 'present') symbol = '+';
        else if (status === 'absent') symbol = '−';
        else if (status === 'late') symbol = '0';
        doc.text(symbol, x, y, { width: colWidth, align: 'center' });
        x += colWidth;
      });
      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
});

// Выгрузка PDF оценок за занятия
router.get('/lessons', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const startDate = req.query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const endDate = req.query.endDate || new Date().toISOString().substring(0, 10);

    const [{ data: students, error: studentsError }, { data: grades, error: gradesError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('id, last_name, first_name')
          .eq('role', 'student')
          .order('last_name'),
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

    // Генерируем диапазон дат
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().substring(0, 10));
    }

    // Создаем карту оценок
    const gradesMap = {};
    (grades || []).forEach((record) => {
      const key = `${record.user_id}-${record.lesson_date}`;
      if (!gradesMap[key]) {
        gradesMap[key] = [];
      }
      const index = (record.grade_index || 1) - 1;
      gradesMap[key][index] = record.grade_value;
    });

    // Преобразуем массивы в строки
    const gradesStrMap = {};
    Object.keys(gradesMap).forEach((key) => {
      const values = gradesMap[key].filter(v => v !== undefined && v !== null);
      if (values.length > 0) {
        gradesStrMap[key] = values.join(', ');
      }
    });

    // Создаем PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lesson_grades_${startDate}_${endDate}.pdf"`);
    
    doc.pipe(res);

    // Регистрируем шрифт с поддержкой кириллицы
    const fontName = registerCyrillicFont(doc);
    const fontBold = fontName ? fontName + '-Bold' : 'Helvetica-Bold';
    const fontRegular = fontName || 'Helvetica';

    // Заголовок
    doc.font(fontRegular).fontSize(18).text('Сводная таблица оценок за занятия', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Период: ${startDate} - ${endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Таблица
    const rowHeight = 20;
    const colWidth = 60;
    const nameWidth = 120;
    const pageHeight = doc.page.height; // Высота страницы в альбомной ориентации (~595)
    const maxY = pageHeight - 50; // Максимальная Y позиция с учетом нижнего отступа
    let y = doc.y;

    // Функция для перерисовки заголовков
    const drawHeaders = () => {
      doc.font(fontBold).fontSize(10);
      doc.text('ФИО', 50, y, { width: nameWidth });
      let x = 50 + nameWidth;
      dates.forEach((date) => {
        const dateStr = new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        doc.text(dateStr, x, y, { width: colWidth, align: 'center' });
        x += colWidth;
      });
      y += rowHeight;
      doc.font(fontRegular);
    };

    // Заголовки на первой странице
    drawHeaders();

    // Данные
    (students || []).forEach((student) => {
      // Проверяем, нужно ли добавить новую страницу ПЕРЕД добавлением строки
      if (y + rowHeight > maxY) {
        doc.addPage();
        y = 50; // Сбрасываем позицию Y на новой странице
        drawHeaders(); // Перерисовываем заголовки
      }
      doc.text(formatFullName(student), 50, y, { width: nameWidth });
      let x = 50 + nameWidth;
      dates.forEach((date) => {
        const gradeStr = gradesStrMap[`${student.id}-${date}`] || '';
        doc.text(gradeStr, x, y, { width: colWidth, align: 'center' });
        x += colWidth;
      });
      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
});

// Выгрузка PDF контрольных
router.get('/exams', auth, teacherOnly, async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const [{ data: students, error: studentsError }, { data: grades, error: gradesError }] =
      await Promise.all([
        supabase
          .from('users')
          .select('id, last_name, first_name')
          .eq('role', 'student')
          .order('last_name'),
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

    // Создаем карту оценок
    const gradesMap = {};
    (grades || []).forEach((record) => {
      const key = `${record.user_id}-${record.exam_name}`;
      gradesMap[key] = record.grade_value;
    });

    // Создаем PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="exam_grades_${new Date().toISOString().substring(0, 10)}.pdf"`);
    
    doc.pipe(res);

    // Регистрируем шрифт с поддержкой кириллицы
    const fontName = registerCyrillicFont(doc);
    const fontBold = fontName ? fontName + '-Bold' : 'Helvetica-Bold';
    const fontRegular = fontName || 'Helvetica';

    // Заголовок
    doc.font(fontRegular).fontSize(18).text('Сводная таблица оценок за контрольные', { align: 'center' });
    doc.moveDown(2);

    // Таблица
    const rowHeight = 20;
    const colWidth = 80;
    const nameWidth = 120;
    const pageHeight = doc.page.height; // Высота страницы в альбомной ориентации (~595)
    const maxY = pageHeight - 50; // Максимальная Y позиция с учетом нижнего отступа
    let y = doc.y;

    // Функция для перерисовки заголовков
    const drawHeaders = () => {
      doc.font(fontBold).fontSize(10);
      doc.text('ФИО', 50, y, { width: nameWidth });
      let x = 50 + nameWidth;
      examNames.forEach((examName) => {
        const truncated = examName.length > 12 ? examName.substring(0, 12) + '...' : examName;
        doc.text(truncated, x, y, { width: colWidth, align: 'center' });
        x += colWidth;
      });
      y += rowHeight;
      doc.font(fontRegular);
    };

    // Заголовки на первой странице
    drawHeaders();

    // Данные
    (students || []).forEach((student) => {
      // Проверяем, нужно ли добавить новую страницу ПЕРЕД добавлением строки
      if (y + rowHeight > maxY) {
        doc.addPage();
        y = 50; // Сбрасываем позицию Y на новой странице
        drawHeaders(); // Перерисовываем заголовки
      }
      doc.text(formatFullName(student), 50, y, { width: nameWidth });
      let x = 50 + nameWidth;
      examNames.forEach((examName) => {
        const grade = gradesMap[`${student.id}-${examName}`] || '';
        doc.text(grade.toString(), x, y, { width: colWidth, align: 'center' });
        x += colWidth;
      });
      y += rowHeight;
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка генерации PDF' });
  }
});

module.exports = router;

