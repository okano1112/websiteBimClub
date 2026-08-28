document.addEventListener('DOMContentLoaded', async () => {
    
    // Auth Check
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error('Not logged in');
        const data = await res.json();
        const user = data.user;
        if (user.role !== 'admin') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = '../index.html';
            return;
        }
    } catch (err) {
        window.location.href = 'login.html';
        return;
    }

    const createForm = document.getElementById('createPostForm');
    const postContent = document.getElementById('postContent');
    const postImages = document.getElementById('postImages');
    const imagePreviews = document.getElementById('imagePreviews');
    const btnSubmit = document.getElementById('btnSubmit');
    const postsList = document.getElementById('postsList');

    // Image preview
    postImages.addEventListener('change', (e) => {
        imagePreviews.innerHTML = '';
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = document.createElement('img');
                img.src = ev.target.result;
                img.className = 'image-preview';
                imagePreviews.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    // Create post
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'กำลังอัปโหลด...';

        try {
            let imageUrls = [];
            
            // Upload images if any
            if (postImages.files.length > 0) {
                const formData = new FormData();
                Array.from(postImages.files).forEach(file => {
                    formData.append('images', file); // Field name depends on API config
                });
                const uploadRes = await fetch('/api/upload/images', {
                    method: 'POST',
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imageUrls = uploadData.urls || uploadData; // Adjust based on actual API
                }
            }

            // Create post
            const postRes = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postContent.value,
                    imageUrls: imageUrls
                })
            });

            if (postRes.ok) {
                createForm.reset();
                imagePreviews.innerHTML = '';
                loadPosts();
            } else {
                alert('เกิดข้อผิดพลาดในการสร้างโพสต์');
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'เผยแพร่';
        }
    });

    // Load Posts
    const loadPosts = async () => {
        try {
            const res = await fetch('/api/posts?page=1&limit=50');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            const posts = data.posts || data;
            
            postsList.innerHTML = '';
            
            if (!posts || posts.length === 0) {
                postsList.innerHTML = '<div class="loading-text">ยังไม่มีโพสต์</div>';
                return;
            }

            posts.forEach(post => {
                const div = document.createElement('div');
                div.className = 'post-item';
                
                const dateStr = new Date(post.created_at).toLocaleString('th-TH');
                
                let imgsHtml = '';
                if (post.image_urls && post.image_urls.length > 0) {
                    imgsHtml = `<div class="post-images-thumb">` + 
                        post.image_urls.map(url => `<img src="${url}">`).join('') +
                        `</div>`;
                }

                div.innerHTML = `
                    <div class="post-header">
                        <span style="font-weight:600">โดย: ${post.author_name || post.full_name || 'ผู้ดูแล'}</span>
                        <span class="post-date">${dateStr}</span>
                    </div>
                    <div class="post-content-container">
                        <div class="post-content">${post.content}</div>
                        ${imgsHtml}
                    </div>
                    <div class="post-actions">
                        <button class="btn-edit" data-id="${post.id}">แก้ไข</button>
                        <button class="btn-delete" data-id="${post.id}">ลบ</button>
                    </div>
                `;
                postsList.appendChild(div);
            });

            // Bind actions
            postsList.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    if (confirm('ยืนยันการลบโพสต์นี้?')) {
                        await fetch(`/api/posts/${id}`, { method: 'DELETE' });
                        loadPosts();
                    }
                });
            });

            postsList.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const postItem = e.target.closest('.post-item');
                    const contentContainer = postItem.querySelector('.post-content-container');
                    const oldContent = postItem.querySelector('.post-content').textContent;
                    
                    contentContainer.innerHTML = `
                        <textarea class="edit-textarea" style="width:100%; min-height:80px; margin-bottom:10px; padding:8px">${oldContent}</textarea>
                        <button class="btn-save-edit">บันทึก</button>
                        <button class="btn-cancel-edit" style="margin-left:8px">ยกเลิก</button>
                    `;
                    
                    const actions = postItem.querySelector('.post-actions');
                    actions.style.display = 'none';

                    contentContainer.querySelector('.btn-cancel-edit').addEventListener('click', () => {
                        loadPosts(); // simplest way to reset
                    });

                    contentContainer.querySelector('.btn-save-edit').addEventListener('click', async () => {
                        const newContent = contentContainer.querySelector('.edit-textarea').value;
                        await fetch(`/api/posts/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: newContent })
                        });
                        loadPosts();
                    });
                });
            });

        } catch (err) {
            console.error(err);
            postsList.innerHTML = '<div class="loading-text">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
        }
    };

    loadPosts();
});
