const express = require('express');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();
const db = require('../config/database');
const requireLogin = require('../middleware/requireLogin');
const requireInstructor = require('../middleware/requireInstructor');
const requireAdmin = require('../middleware/requireAdmin');

function parseJson(value, fallback) {
    if (value == null) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function cleanText(value) {
    return String(value || '').trim();
}

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function canManage(user, course) {
    return user.role === 'admin' || Number(course.instructor_id) === Number(user.id);
}

function isUploadPath(url, extraPrefix) {
    if (!url) return true;
    return url.startsWith('/uploads/') || (extraPrefix && url.startsWith(extraPrefix));
}

function normalizeVideoUrl(value) {
    const raw = cleanText(value);
    if (!raw) return '';
    if (raw.startsWith('/uploads/videos/')) return raw;

    // รับทั้ง URL YouTube และ iframe แต่เก็บเป็น URL embed ที่ควบคุมได้เท่านั้น
    const match = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (!match) return null;
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
}

async function deleteStoredVideo(url) {
    if (!url || !url.startsWith('/uploads/videos/')) return;
    const filename = path.basename(url);
    if (filename !== url.slice('/uploads/videos/'.length)) return;
    const [references] = await db.query('SELECT id FROM courses WHERE video_url = ? LIMIT 1', [url]);
    if (references.length) return;
    try {
        await fs.unlink(path.join(__dirname, '..', 'uploads', 'videos', filename));
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('ไม่สามารถลบไฟล์วิดีโอเดิม:', error);
    }
}

function normalizeQuestions(rawList, label) {
    if (!Array.isArray(rawList)) {
        return { error: `รูปแบบ${label}ไม่ถูกต้อง` };
    }

    const questions = [];
    for (let i = 0; i < rawList.length; i += 1) {
        const item = rawList[i] || {};
        const question = cleanText(item.question);
        const options = Array.isArray(item.options)
            ? item.options.map((option) => cleanText(option)).filter(Boolean)
            : [];
        const correctIndex = Number(item.correctIndex ?? item.correct_index);
        const timeSeconds = Number(item.timeSeconds ?? item.time_seconds);

        if (!question) {
            return { error: `กรุณากรอกคำถามของ${label}ข้อที่ ${i + 1}` };
        }
        if (options.length < 2 || options.length > 6) {
            return { error: `${label}ข้อที่ ${i + 1} ต้องมีตัวเลือก 2-6 ข้อ` };
        }
        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
            return { error: `คำตอบที่ถูกของ${label}ข้อที่ ${i + 1} ไม่ถูกต้อง` };
        }

        const row = { question, options, correctIndex, displayOrder: i };
        if (label === 'จุดหยุด') {
            if (!Number.isInteger(timeSeconds) || timeSeconds < 0) {
                return { error: `เวลาของจุดหยุดข้อที่ ${i + 1} ไม่ถูกต้อง` };
            }
            row.timeSeconds = timeSeconds;
        }
        questions.push(row);
    }

    return { questions };
}

function mapCourse(row, extras = {}) {
    return {
        id: row.id,
        instructorId: row.instructor_id,
        instructorName: row.instructor_name || row.full_name || null,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnail_url,
        videoUrl: row.video_url,
        passScore: row.pass_score,
        isPublished: Boolean(row.is_published),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...extras
    };
}

async function fetchCourseRow(id) {
    const [rows] = await db.query(
        `SELECT c.*, u.full_name AS instructor_name
         FROM courses c
         JOIN users u ON u.id = c.instructor_id
         WHERE c.id = ?`,
        [id]
    );
    return rows[0] || null;
}

async function fetchStops(courseId) {
    const [rows] = await db.query(
        'SELECT * FROM course_video_stops WHERE course_id = ? ORDER BY time_seconds ASC, display_order ASC, id ASC',
        [courseId]
    );
    return rows.map((row) => ({
        id: row.id,
        timeSeconds: row.time_seconds,
        question: row.question,
        options: parseJson(row.options, []),
        correctIndex: row.correct_index
    }));
}

function withoutAnswers(items) {
    return items.map(({ correctIndex, ...item }) => item);
}

async function fetchQuizQuestions(courseId, includeAnswers) {
    const [rows] = await db.query(
        'SELECT * FROM course_quiz_questions WHERE course_id = ? ORDER BY display_order ASC, id ASC',
        [courseId]
    );
    return rows.map((row) => {
        const item = {
            id: row.id,
            question: row.question,
            options: parseJson(row.options, [])
        };
        if (includeAnswers) item.correctIndex = row.correct_index;
        return item;
    });
}

async function fetchCertificate(userId, courseId) {
    const [rows] = await db.query(
        `SELECT cert.*, c.title AS course_title, u.full_name, u.username
         FROM certificates cert
         JOIN courses c ON c.id = cert.course_id
         JOIN users u ON u.id = cert.user_id
         WHERE cert.user_id = ? AND cert.course_id = ?`,
        [userId, courseId]
    );
    return rows[0] || null;
}

async function issueCertificate(connection, userId, courseId, issuedVia) {
    const [existing] = await connection.query(
        'SELECT * FROM certificates WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
    );
    if (existing.length > 0) return existing[0];

    const certificateCode = `BIM-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const [result] = await connection.query(
        `INSERT INTO certificates (user_id, course_id, certificate_code, issued_via)
         VALUES (?, ?, ?, ?)`,
        [userId, courseId, certificateCode, issuedVia]
    );
    const [rows] = await connection.query('SELECT * FROM certificates WHERE id = ?', [result.insertId]);
    return rows[0];
}

async function replaceStops(connection, courseId, stops) {
    await connection.query('DELETE FROM course_video_stops WHERE course_id = ?', [courseId]);
    for (const stop of stops) {
        await connection.query(
            `INSERT INTO course_video_stops (course_id, time_seconds, question, options, correct_index, display_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [courseId, stop.timeSeconds, stop.question, JSON.stringify(stop.options), stop.correctIndex, stop.displayOrder]
        );
    }
}

async function replaceQuiz(connection, courseId, questions) {
    await connection.query('DELETE FROM course_quiz_questions WHERE course_id = ?', [courseId]);
    for (const item of questions) {
        await connection.query(
            `INSERT INTO course_quiz_questions (course_id, question, options, correct_index, display_order)
             VALUES (?, ?, ?, ?, ?)`,
            [courseId, item.question, JSON.stringify(item.options), item.correctIndex, item.displayOrder]
        );
    }
}

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.id, c.title, c.description, c.thumbnail_url, c.pass_score, c.created_at,
                    u.full_name AS instructor_name
             FROM courses c
             JOIN users u ON u.id = c.instructor_id
             WHERE c.is_published = 1
             ORDER BY c.created_at DESC`
        );
        res.json({ success: true, courses: rows.map((row) => mapCourse(row)) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการคอร์ส' });
    }
});

router.get('/manage', requireInstructor, async (req, res) => {
    try {
        const params = [];
        let sql = `SELECT c.*, u.full_name AS instructor_name
                   FROM courses c
                   JOIN users u ON u.id = c.instructor_id`;
        if (req.currentUser.role !== 'admin') {
            sql += ' WHERE c.instructor_id = ?';
            params.push(req.currentUser.id);
        }
        sql += ' ORDER BY c.updated_at DESC';
        const [rows] = await db.query(sql, params);
        res.json({ success: true, courses: rows.map((row) => mapCourse(row)) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงคอร์สที่จัดการได้' });
    }
});

router.get('/certificate-by-code/:code', requireLogin, async (req, res) => {
    try {
        const code = cleanText(req.params.code);
        const [rows] = await db.query(
            `SELECT cert.*, c.title AS course_title, u.full_name, u.username
             FROM certificates cert
             JOIN courses c ON c.id = cert.course_id
             JOIN users u ON u.id = cert.user_id
             WHERE cert.certificate_code = ?`,
            [code]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบใบเซอร์' });
        }

        const cert = rows[0];
        if (req.currentUser.role !== 'admin' && Number(cert.user_id) !== Number(req.currentUser.id)) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ดูใบเซอร์นี้' });
        }

        res.json({
            success: true,
            certificate: {
                id: cert.id,
                certificateCode: cert.certificate_code,
                issuedVia: cert.issued_via,
                issuedAt: cert.issued_at,
                courseTitle: cert.course_title,
                fullName: cert.full_name || cert.username
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงใบเซอร์' });
    }
});

router.post('/', requireInstructor, async (req, res) => {
    try {
        const title = cleanText(req.body.title);
        const description = cleanText(req.body.description);
        if (!title) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อคอร์ส' });
        }

        const [result] = await db.query(
            `INSERT INTO courses (instructor_id, title, description, pass_score, is_published)
             VALUES (?, ?, ?, 70, 0)`,
            [req.currentUser.id, title, description]
        );
        const course = await fetchCourseRow(result.insertId);
        res.status(201).json({ success: true, message: 'สร้างคอร์สสำเร็จ', course: mapCourse(course) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างคอร์ส' });
    }
});

router.get('/:id/editor', requireInstructor, async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'รหัสคอร์สไม่ถูกต้อง' });

        const course = await fetchCourseRow(id);
        if (!course) return res.status(404).json({ success: false, message: 'ไม่พบคอร์ส' });
        if (!canManage(req.currentUser, course)) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขคอร์สนี้' });
        }

        const [stops, quizQuestions] = await Promise.all([
            fetchStops(id),
            fetchQuizQuestions(id, true)
        ]);

        res.json({
            success: true,
            course: mapCourse(course, { stops, quizQuestions })
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคอร์ส' });
    }
});

router.get('/:id', requireLogin, async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'รหัสคอร์สไม่ถูกต้อง' });

        const course = await fetchCourseRow(id);
        if (!course) return res.status(404).json({ success: false, message: 'ไม่พบคอร์ส' });

        const manager = canManage(req.currentUser, course);
        if (!course.is_published && !manager) {
            return res.status(404).json({ success: false, message: 'ไม่พบคอร์ส' });
        }

        const [stops, quizQuestions, certificate] = await Promise.all([
            fetchStops(id),
            fetchQuizQuestions(id, false),
            fetchCertificate(req.currentUser.id, id)
        ]);

        res.json({
            success: true,
            course: mapCourse(course, {
                // เฉลยของคำถามระหว่างวิดีโอเป็นข้อมูลของผู้สอนเท่านั้น
                stops: manager ? stops : withoutAnswers(stops),
                quizQuestions,
                certificate: certificate ? {
                    id: certificate.id,
                    certificateCode: certificate.certificate_code,
                    issuedVia: certificate.issued_via,
                    issuedAt: certificate.issued_at
                } : null
            })
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงคอร์ส' });
    }
});

router.put('/:id', requireInstructor, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'รหัสคอร์สไม่ถูกต้อง' });

    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const thumbnailUrl = cleanText(req.body.thumbnailUrl || req.body.thumbnail_url);
    const videoUrl = normalizeVideoUrl(req.body.videoUrl || req.body.video_url);
    const passScore = Number(req.body.passScore ?? req.body.pass_score);
    const rawPublished = req.body.isPublished ?? req.body.is_published;
    const isPublished = rawPublished === true || rawPublished === 1 || rawPublished === '1' || rawPublished === 'true';

    if (!title) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อคอร์ส' });
    if (!Number.isInteger(passScore) || passScore < 0 || passScore > 100) {
        return res.status(400).json({ success: false, message: 'เกณฑ์คะแนนผ่านต้องอยู่ระหว่าง 0-100' });
    }
    if (thumbnailUrl && !isUploadPath(thumbnailUrl)) {
        return res.status(400).json({ success: false, message: 'รูปปกต้องอัปโหลดผ่านระบบเท่านั้น' });
    }
    if (videoUrl === null) {
        return res.status(400).json({ success: false, message: 'วิดีโอต้องเป็นไฟล์ที่อัปโหลดผ่านระบบ หรือลิงก์/โค้ดฝังจาก YouTube เท่านั้น' });
    }

    const stopsResult = normalizeQuestions(req.body.stops || [], 'จุดหยุด');
    if (stopsResult.error) return res.status(400).json({ success: false, message: stopsResult.error });
    const quizResult = normalizeQuestions(req.body.quizQuestions || req.body.quiz_questions || [], 'แบบทดสอบ');
    if (quizResult.error) return res.status(400).json({ success: false, message: quizResult.error });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT * FROM courses WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'ไม่พบคอร์ส' });
        }
        if (!canManage(req.currentUser, rows[0])) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขคอร์สนี้' });
        }

        const oldVideoUrl = rows[0].video_url;
        await connection.query(
            `UPDATE courses
             SET title = ?, description = ?, thumbnail_url = ?, video_url = ?, pass_score = ?, is_published = ?
             WHERE id = ?`,
            [title, description || null, thumbnailUrl || null, videoUrl || null, passScore, isPublished ? 1 : 0, id]
        );

        await replaceStops(connection, id, stopsResult.questions);
        await replaceQuiz(connection, id, quizResult.questions);
        await connection.commit();
        if (oldVideoUrl && oldVideoUrl !== videoUrl) {
            await deleteStoredVideo(oldVideoUrl);
        }

        const updated = await fetchCourseRow(id);
        const [stops, quizQuestions] = await Promise.all([
            fetchStops(id),
            fetchQuizQuestions(id, true)
        ]);
        res.json({
            success: true,
            message: 'บันทึกคอร์สสำเร็จ',
            course: mapCourse(updated, { stops, quizQuestions })
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกคอร์ส' });
    } finally {
        connection.release();
    }
});

router.delete('/:id', requireInstructor, async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'รหัสคอร์สไม่ถูกต้อง' });

        const course = await fetchCourseRow(id);
        if (!course) return res.status(404).json({ success: false, message: 'ไม่พบคอร์ส' });
        if (!canManage(req.currentUser, course)) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบคอร์สนี้' });
        }

        await db.query('DELETE FROM courses WHERE id = ?', [id]);
        res.json({ success: true, message: 'ลบคอร์สสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบคอร์ส' });
    }
});

router.post('/:id/quiz/submit', requireLogin, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'รหัสคอร์สไม่ถูกต้อง' });

    const answers = Array.isArray(req.body.answers) ? req.body.answers : null;
    if (!answers) {
        return res.status(400).json({ success: false, message: 'กรุณาส่งคำตอบแบบทดสอบ' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [courses] = await connection.query('SELECT * FROM courses WHERE id = ?', [id]);
        if (courses.length === 0 || !courses[0].is_published) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'ไม่พบคอร์ส' });
        }

        const [questions] = await connection.query(
            'SELECT id, correct_index FROM course_quiz_questions WHERE course_id = ?',
            [id]
        );
        if (questions.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'คอร์สนี้ยังไม่มีแบบทดสอบท้ายคอร์ส' });
        }

        const answerMap = new Map();
        answers.forEach((item) => {
            const questionId = Number(item.questionId ?? item.question_id);
            const selectedIndex = Number(item.selectedIndex ?? item.selected_index);
            if (Number.isInteger(questionId)) answerMap.set(questionId, selectedIndex);
        });

        let correctCount = 0;
        questions.forEach((question) => {
            if (answerMap.get(question.id) === Number(question.correct_index)) {
                correctCount += 1;
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= Number(courses[0].pass_score);

        await connection.query(
            `INSERT INTO course_quiz_attempts (user_id, course_id, score, passed)
             VALUES (?, ?, ?, ?)`,
            [req.currentUser.id, id, score, passed ? 1 : 0]
        );

        let certificate = null;
        if (passed) {
            certificate = await issueCertificate(connection, req.currentUser.id, id, 'quiz_pass');
        }

        await connection.commit();
        res.json({
            success: true,
            score,
            passed,
            passScore: courses[0].pass_score,
            message: passed
                ? 'สอบผ่านเกณฑ์ ระบบออกใบเซอร์ให้แล้ว'
                : `คะแนนยังไม่ถึงเกณฑ์ผ่าน ${courses[0].pass_score}%`,
            certificate: certificate ? {
                id: certificate.id,
                certificateCode: certificate.certificate_code,
                issuedVia: certificate.issued_via,
                issuedAt: certificate.issued_at
            } : null
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจข้อสอบ' });
    } finally {
        connection.release();
    }
});

router.post('/:id/admin-grant-certificate', requireAdmin, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'รหัสคอร์สไม่ถูกต้อง' });

    const targetUserId = parseId(req.body.userId) || req.currentUser.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [courses] = await connection.query('SELECT id, title FROM courses WHERE id = ?', [id]);
        if (courses.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'ไม่พบคอร์ส' });
        }

        const [users] = await connection.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ที่ต้องการออกใบเซอร์' });
        }

        const certificate = await issueCertificate(connection, targetUserId, id, 'admin_bypass');
        await connection.commit();

        res.json({
            success: true,
            message: 'ออกใบเซอร์ด้วยสิทธิ์ผู้ดูแลระบบแล้ว (ไม่ผ่านการเรียน/สอบ)',
            issuedVia: 'admin_bypass',
            certificate: {
                id: certificate.id,
                certificateCode: certificate.certificate_code,
                issuedVia: certificate.issued_via,
                issuedAt: certificate.issued_at,
                courseTitle: courses[0].title
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการออกใบเซอร์' });
    } finally {
        connection.release();
    }
});

module.exports = router;
