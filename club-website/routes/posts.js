const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireLogin = require('../middleware/requireLogin');

function cleanText(value) {
    return String(value || '').trim();
}

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function canModerate(user, authorId) {
    return user.role === 'admin' || Number(authorId) === Number(user.id);
}

async function fetchImages(postId) {
    const [images] = await db.query(
        'SELECT * FROM post_images WHERE post_id = ? ORDER BY display_order',
        [postId]
    );
    return images;
}

async function fetchComments(postId) {
    const [comments] = await db.query(
        `SELECT c.id, c.content, c.created_at, u.full_name, u.username, u.avatar_url, u.role, u.id AS author_id
         FROM post_comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
        [postId]
    );
    return comments;
}

async function fetchLikes(postIds, viewerId) {
    if (!postIds.length) return new Map();
    const placeholders = postIds.map(() => '?').join(', ');
    const [rows] = await db.query(
        `SELECT post_id, COUNT(*) AS like_count,
                MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS is_liked
         FROM post_likes WHERE post_id IN (${placeholders}) GROUP BY post_id`,
        [viewerId || 0, ...postIds]
    );
    return new Map(rows.map((row) => [Number(row.post_id), {
        likeCount: Number(row.like_count), isLiked: Boolean(row.is_liked)
    }]));
}

async function fetchPost(postId, viewerId) {
    const [posts] = await db.query(
        `SELECT p.*, u.username, u.full_name, u.avatar_url, u.role
         FROM posts p
         JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`,
        [postId]
    );
    if (posts.length === 0) return null;
    const post = posts[0];
    post.images = await fetchImages(postId);
    post.image_urls = post.images.map((image) => image.image_url);
    post.comments = await fetchComments(postId);
    const likes = await fetchLikes([postId], viewerId);
    Object.assign(post, likes.get(Number(postId)) || { likeCount: 0, isLiked: false });
    return post;
}

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const offset = (page - 1) * limit;

        const [countResult] = await db.query('SELECT COUNT(*) as total FROM posts');
        const total = countResult[0].total;

        const [posts] = await db.query(
            `SELECT p.*, u.username, u.full_name, u.avatar_url, u.role
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const likes = await fetchLikes(posts.map((post) => post.id), req.session?.user?.id);
        for (const post of posts) {
            post.images = await fetchImages(post.id);
            post.image_urls = post.images.map((image) => image.image_url);
            post.comments = await fetchComments(post.id);
            Object.assign(post, likes.get(Number(post.id)) || { likeCount: 0, isLiked: false });
        }

        res.json({
            success: true,
            posts,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโพสต์' });
    }
});

router.post('/', requireLogin, async (req, res) => {
    try {
        const content = cleanText(req.body.content);
        const imageUrls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [];

        if (!content) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกเนื้อหาโพสต์' });
        }

        if (imageUrls.some((url) => !String(url).startsWith('/uploads/'))) {
            return res.status(400).json({ success: false, message: 'รูปภาพต้องอัปโหลดผ่านระบบเท่านั้น' });
        }

        const [result] = await db.query(
            'INSERT INTO posts (author_id, content) VALUES (?, ?)',
            [req.currentUser.id, content]
        );
        const postId = result.insertId;

        for (let i = 0; i < imageUrls.length; i += 1) {
            await db.query(
                'INSERT INTO post_images (post_id, image_url, display_order) VALUES (?, ?, ?)',
                [postId, imageUrls[i], i]
            );
        }

        res.status(201).json({ success: true, post: await fetchPost(postId, req.currentUser.id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างโพสต์' });
    }
});

router.put('/:id', requireLogin, async (req, res) => {
    try {
        const postId = parseId(req.params.id);
        const content = cleanText(req.body.content);
        if (!postId) return res.status(400).json({ success: false, message: 'รหัสโพสต์ไม่ถูกต้อง' });
        if (!content) return res.status(400).json({ success: false, message: 'กรุณากรอกเนื้อหาโพสต์' });

        const [rows] = await db.query('SELECT author_id FROM posts WHERE id = ?', [postId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบโพสต์' });
        if (!canModerate(req.currentUser, rows[0].author_id)) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขโพสต์นี้' });
        }

        await db.query('UPDATE posts SET content = ? WHERE id = ?', [content, postId]);

        if (Array.isArray(req.body.imageUrls)) {
            await db.query('DELETE FROM post_images WHERE post_id = ?', [postId]);
            for (let i = 0; i < req.body.imageUrls.length; i += 1) {
                await db.query(
                    'INSERT INTO post_images (post_id, image_url, display_order) VALUES (?, ?, ?)',
                    [postId, req.body.imageUrls[i], i]
                );
            }
        }

        res.json({ success: true, post: await fetchPost(postId, req.currentUser.id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขโพสต์' });
    }
});

router.delete('/:id', requireLogin, async (req, res) => {
    try {
        const postId = parseId(req.params.id);
        if (!postId) return res.status(400).json({ success: false, message: 'รหัสโพสต์ไม่ถูกต้อง' });

        const [rows] = await db.query('SELECT author_id FROM posts WHERE id = ?', [postId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบโพสต์' });
        if (!canModerate(req.currentUser, rows[0].author_id)) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบโพสต์นี้' });
        }

        await db.query('DELETE FROM posts WHERE id = ?', [postId]);
        res.json({ success: true, message: 'ลบโพสต์สำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบโพสต์' });
    }
});

router.post('/:id/comments', requireLogin, async (req, res) => {
    try {
        const postId = parseId(req.params.id);
        const content = cleanText(req.body.content);
        if (!postId) return res.status(400).json({ success: false, message: 'รหัสโพสต์ไม่ถูกต้อง' });
        if (!content) return res.status(400).json({ success: false, message: 'กรุณากรอกข้อความความคิดเห็น' });
        if (content.length > 2000) {
            return res.status(400).json({ success: false, message: 'ความคิดเห็นยาวเกินไป' });
        }

        const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบโพสต์' });

        const [result] = await db.query(
            'INSERT INTO post_comments (post_id, author_id, content) VALUES (?, ?, ?)',
            [postId, req.currentUser.id, content]
        );

        const [comments] = await db.query(
            `SELECT c.id, c.content, c.created_at, u.full_name, u.username, u.avatar_url, u.role, u.id AS author_id
             FROM post_comments c
             JOIN users u ON u.id = c.author_id
             WHERE c.id = ?`,
            [result.insertId]
        );

        res.status(201).json({ success: true, comment: comments[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแสดงความคิดเห็น' });
    }
});

router.delete('/:id/comments/:commentId', requireLogin, async (req, res) => {
    try {
        const commentId = parseId(req.params.commentId);
        if (!commentId) return res.status(400).json({ success: false, message: 'รหัสความคิดเห็นไม่ถูกต้อง' });

        const [rows] = await db.query('SELECT author_id FROM post_comments WHERE id = ?', [commentId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบความคิดเห็น' });
        if (!canModerate(req.currentUser, rows[0].author_id)) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบความคิดเห็นนี้' });
        }

        await db.query('DELETE FROM post_comments WHERE id = ?', [commentId]);
        res.json({ success: true, message: 'ลบความคิดเห็นสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบความคิดเห็น' });
    }
});

// POST /:id/likes — กดถูกใจ (หนึ่งผู้ใช้ต่อหนึ่งโพสต์)
router.post('/:id/likes', requireLogin, async (req, res) => {
    try {
        const postId = parseId(req.params.id);
        if (!postId) return res.status(400).json({ success: false, message: 'รหัสโพสต์ไม่ถูกต้อง' });
        const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
        if (!posts.length) return res.status(404).json({ success: false, message: 'ไม่พบโพสต์' });
        await db.query('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, req.currentUser.id]);
        const likes = await fetchLikes([postId], req.currentUser.id);
        res.json({ success: true, ...(likes.get(postId) || { likeCount: 0, isLiked: true }) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการกดถูกใจ' });
    }
});

// DELETE /:id/likes — ยกเลิกถูกใจของตัวเอง
router.delete('/:id/likes', requireLogin, async (req, res) => {
    try {
        const postId = parseId(req.params.id);
        if (!postId) return res.status(400).json({ success: false, message: 'รหัสโพสต์ไม่ถูกต้อง' });
        await db.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, req.currentUser.id]);
        const likes = await fetchLikes([postId], req.currentUser.id);
        res.json({ success: true, ...(likes.get(postId) || { likeCount: 0, isLiked: false }) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยกเลิกถูกใจ' });
    }
});

module.exports = router;
