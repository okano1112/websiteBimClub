const Course = require('../models/course.model');

function mapCourse(row) {
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
    updatedAt: row.updated_at
  };
}

async function listPublished(req, res, next) {
  try {
    const courses = await Course.findPublished();
    res.json({ success: true, courses: courses.map(mapCourse) });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const isPublished = req.body.isPublished === true || req.body.isPublished === 1 || req.body.isPublished === '1';

    if (title.length < 3) {
      return res.status(400).json({ success: false, message: 'ชื่อคอร์สต้องมีอย่างน้อย 3 ตัวอักษร' });
    }
    if (title.length > 255) {
      return res.status(400).json({ success: false, message: 'ชื่อคอร์สต้องไม่เกิน 255 ตัวอักษร' });
    }

    const course = await Course.create({
      instructorId: req.currentUser.id,
      title,
      description,
      isPublished
    });

    res.status(201).json({
      success: true,
      message: isPublished ? 'สร้างและเผยแพร่คอร์สสำเร็จ' : 'บันทึกคอร์สเป็นฉบับร่างสำเร็จ',
      course: mapCourse(course)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, listPublished, mapCourse };
