document.addEventListener('DOMContentLoaded', async () => {
  const createForm = document.getElementById('createPostForm');
  const postContent = document.getElementById('postContent');
  const postImages = document.getElementById('postImages');
  const imagePreviews = document.getElementById('imagePreviews');
  const submitButton = document.getElementById('btnSubmit');
  const postsList = document.getElementById('postsList');
  const search = document.getElementById('postSearch');
  const sort = document.getElementById('postSort');
  const pageSize = 8;
  let posts = [];
  let page = 1;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));

  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    if (!response.ok) return window.location.href = 'login.html';
    if (data.user?.role !== 'admin') return window.location.href = '../index.html';
  } catch (error) { return window.location.href = 'login.html'; }

  postImages.addEventListener('change', (event) => {
    imagePreviews.innerHTML = '';
    Array.from(event.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const image = document.createElement('img'); image.src = loadEvent.target.result; image.className = 'image-preview'; image.alt = 'ตัวอย่างรูปที่จะอัปโหลด';
        imagePreviews.appendChild(image);
      };
      reader.readAsDataURL(file);
    });
  });

  function filteredPosts() {
    const query = search.value.trim().toLocaleLowerCase('th');
    const filtered = posts.filter((post) => `${post.content} ${post.full_name || post.username || ''}`.toLocaleLowerCase('th').includes(query));
    if (sort.value === 'oldest') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  }

  function renderPosts() {
    const filtered = filteredPosts();
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pageCount);
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    postsList.innerHTML = '';
    if (!visible.length) postsList.innerHTML = '<div class="admin-empty">ไม่พบโพสต์ตามเงื่อนไข</div>';
    visible.forEach((post) => {
      const item = document.createElement('article');
      item.className = 'post-item';
      const images = Array.isArray(post.image_urls) ? post.image_urls : [];
      item.innerHTML = `
        <div class="post-header"><span class="post-author">โดย: ${escapeHtml(post.full_name || post.username || 'ผู้ใช้งาน')}</span><span class="post-date">${new Date(post.created_at).toLocaleString('th-TH')}</span></div>
        <div class="post-content-container"><div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>${images.length ? `<div class="post-images-thumb">${images.map((url) => `<img src="${escapeHtml(url)}" alt="รูปประกอบโพสต์">`).join('')}</div>` : ''}</div>
        <div class="post-actions"><button class="btn-edit" type="button" data-edit="${post.id}">แก้ไข</button><button class="btn-delete" type="button" data-delete="${post.id}">ลบ</button></div>`;
      postsList.appendChild(item);
    });
    document.getElementById('postPageInfo').textContent = `หน้า ${page} จาก ${pageCount} · ${filtered.length} โพสต์`;
    document.getElementById('postPrev').disabled = page <= 1;
    document.getElementById('postNext').disabled = page >= pageCount;
  }

  async function loadPosts() {
    const response = await fetch('/api/posts?page=1&limit=100');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'โหลดโพสต์ไม่สำเร็จ');
    posts = data.posts || [];
    renderPosts();
  }

  createForm.addEventListener('submit', async (event) => {
    event.preventDefault(); submitButton.disabled = true; submitButton.textContent = 'กำลังอัปโหลด...';
    try {
      let imageUrls = [];
      if (postImages.files.length) {
        const formData = new FormData(); Array.from(postImages.files).forEach((file) => formData.append('images', file));
        const uploadResponse = await fetch('/api/upload/images', { method: 'POST', body: formData });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.success) throw new Error(uploadData.message || 'อัปโหลดรูปไม่สำเร็จ');
        imageUrls = uploadData.urls;
      }
      const response = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: postContent.value, imageUrls }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'สร้างโพสต์ไม่สำเร็จ');
      createForm.reset(); imagePreviews.innerHTML = ''; page = 1; await loadPosts();
    } catch (error) { alert(error.message || 'เกิดข้อผิดพลาด'); }
    finally { submitButton.disabled = false; submitButton.textContent = 'เผยแพร่'; }
  });

  postsList.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-delete]');
    const editButton = event.target.closest('[data-edit]');
    try {
      if (deleteButton) {
        if (!confirm('ยืนยันการลบโพสต์นี้?')) return;
        const response = await fetch(`/api/posts/${deleteButton.dataset.delete}`, { method: 'DELETE' });
        const data = await response.json(); if (!response.ok) throw new Error(data.message);
        return loadPosts();
      }
      if (editButton) {
        const post = posts.find((item) => Number(item.id) === Number(editButton.dataset.edit));
        const item = editButton.closest('.post-item');
        const container = item.querySelector('.post-content-container');
        container.innerHTML = '';
        const textarea = document.createElement('textarea'); textarea.className = 'edit-textarea'; textarea.value = post.content;
        const save = document.createElement('button'); save.className = 'btn-save-edit'; save.type = 'button'; save.textContent = 'บันทึก';
        const cancel = document.createElement('button'); cancel.className = 'btn-cancel-edit'; cancel.type = 'button'; cancel.textContent = 'ยกเลิก';
        container.append(textarea, save, cancel); item.querySelector('.post-actions').hidden = true;
        cancel.addEventListener('click', renderPosts);
        save.addEventListener('click', async () => {
          save.disabled = true;
          try {
            const response = await fetch(`/api/posts/${post.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: textarea.value }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'แก้ไขโพสต์ไม่สำเร็จ');
            await loadPosts();
          } catch (error) {
            alert(error.message || 'แก้ไขโพสต์ไม่สำเร็จ');
            save.disabled = false;
          }
        });
      }
    } catch (error) { alert(error.message || 'ดำเนินการไม่สำเร็จ'); }
  });

  [search, sort].forEach((control) => control.addEventListener('input', () => { page = 1; renderPosts(); }));
  document.getElementById('postPrev').addEventListener('click', () => { page -= 1; renderPosts(); });
  document.getElementById('postNext').addEventListener('click', () => { page += 1; renderPosts(); });
  try { await loadPosts(); } catch (error) { postsList.innerHTML = '<div class="admin-error"></div>'; postsList.firstElementChild.textContent = error.message; }
});
