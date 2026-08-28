document.addEventListener('DOMContentLoaded', async () => {
  const feedGrid = document.getElementById('feedGrid');
  const feedLoading = document.getElementById('feedLoading');
  const feedEmpty = document.getElementById('feedEmpty');
  const feedHero = document.querySelector('.feed-hero');
  let currentUser = null;
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const date = value => new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  const nameOf = user => user.full_name || user.fullName || user.username || 'ผู้ใช้งาน';
  const canManage = authorId => currentUser && (currentUser.role === 'admin' || Number(authorId) === Number(currentUser.id));
  const showStatus = (text, error = false) => { const status = document.getElementById('feedStatus'); if (status) { status.textContent = text; status.className = `feed-status${error ? ' error' : ''}`; } };

  function renderComposer() {
    if (!currentUser) return;
    feedHero.insertAdjacentHTML('afterend', `<section class="create-post"><h2>สร้างโพสต์</h2><form id="postForm"><textarea id="postContent" maxlength="5000" placeholder="คุณกำลังคิดอะไรอยู่?" required></textarea><div class="composer-actions"><label class="upload-label">แนบรูปภาพ<input id="postImages" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple></label><button class="feed-button primary" type="submit">โพสต์</button></div><div id="feedStatus" class="feed-status" role="status"></div></form></section>`);
    document.getElementById('postForm').addEventListener('submit', createPost);
  }
  function commentHtml(comment) {
    const avatar = comment.avatar_url ? `<img src="${esc(comment.avatar_url)}" alt="" class="comment-avatar">` : `<span class="comment-avatar placeholder">${esc(nameOf(comment).charAt(0))}</span>`;
    return `<article class="comment" data-comment-id="${comment.id}">${avatar}<div class="comment-body"><div class="comment-bubble"><strong>${esc(nameOf(comment))}</strong><p>${esc(comment.content).replace(/\n/g, '<br>')}</p></div><div class="comment-meta">${date(comment.created_at)}${canManage(comment.author_id) ? `<button class="text-action" data-delete-comment="${comment.id}">ลบ</button>` : ''}</div></div></article>`;
  }
  function postHtml(post) {
    const avatar = post.avatar_url ? `<img src="${esc(post.avatar_url)}" alt="" class="post-card-avatar">` : `<span class="post-card-avatar-placeholder">${esc(nameOf(post).charAt(0))}</span>`;
    const role = post.role === 'admin' ? 'ผู้ดูแลระบบ' : post.role === 'instructor' ? 'อาจารย์' : '';
    const images = (post.image_urls || []).map(url => `<img src="${esc(url)}" alt="รูปภาพประกอบโพสต์">`).join('');
    return `<article class="post-card" data-post-id="${post.id}"><header class="post-card-header">${avatar}<div class="post-head-info"><strong>${esc(nameOf(post))}</strong>${role ? `<span class="post-card-badge">${role}</span>` : ''}<time>${date(post.created_at)}</time></div>${canManage(post.author_id) ? `<button class="text-action post-delete" data-delete-post="${post.id}">ลบโพสต์</button>` : ''}</header><p class="post-card-content">${esc(post.content).replace(/\n/g, '<br>')}</p>${images ? `<div class="post-images">${images}</div>` : ''}<div class="post-actions"><button class="like-button${post.isLiked ? ' liked' : ''}" data-like="${post.id}" aria-pressed="${Boolean(post.isLiked)}">♥ <span>${Number(post.likeCount || 0)}</span> ถูกใจ</button><span class="comment-count">ความคิดเห็น ${post.comments?.length || 0}</span></div><section class="comments" id="comments-${post.id}">${(post.comments || []).map(commentHtml).join('') || '<p class="no-comments">ยังไม่มีความคิดเห็น</p>'}${currentUser ? `<form class="comment-form" data-comment-form="${post.id}"><input maxlength="2000" placeholder="เขียนความคิดเห็น..." required><button class="feed-button" type="submit">ส่ง</button></form>` : '<p class="login-hint"><a href="login.html">เข้าสู่ระบบ</a> เพื่อกดถูกใจหรือแสดงความคิดเห็น</p>'}</section></article>`;
  }
  async function loadPosts() {
    try { const response = await fetch('/api/posts?page=1&limit=30'); const data = await response.json(); if (!response.ok) throw new Error(data.message); feedLoading.hidden = true; feedGrid.innerHTML = ''; if (!data.posts.length) { feedEmpty.hidden = false; return; } feedEmpty.hidden = true; feedGrid.innerHTML = data.posts.map(postHtml).join(''); } catch (error) { feedLoading.textContent = error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'; }
  }
  async function createPost(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); button.disabled = true; showStatus('กำลังสร้างโพสต์...');
    try { let imageUrls = []; const files = document.getElementById('postImages').files; if (files.length) { const body = new FormData(); [...files].slice(0, 10).forEach(file => body.append('images', file)); const upload = await fetch('/api/upload/images', { method: 'POST', body }); const uploaded = await upload.json(); if (!upload.ok) throw new Error(uploaded.message); imageUrls = uploaded.urls; } const response = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: document.getElementById('postContent').value.trim(), imageUrls }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); form.reset(); showStatus('โพสต์เรียบร้อยแล้ว'); await loadPosts(); } catch (error) { showStatus(error.message || 'ไม่สามารถสร้างโพสต์ได้', true); } finally { button.disabled = false; }
  }
  feedGrid.addEventListener('click', async event => {
    const like = event.target.closest('[data-like]'); const deleteComment = event.target.closest('[data-delete-comment]'); const deletePost = event.target.closest('[data-delete-post]');
    try { if (like) { if (!currentUser) return location.href = 'login.html'; const active = like.classList.contains('liked'); const response = await fetch(`/api/posts/${like.dataset.like}/likes`, { method: active ? 'DELETE' : 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.message); like.classList.toggle('liked', data.isLiked); like.setAttribute('aria-pressed', data.isLiked); like.querySelector('span').textContent = data.likeCount; } if (deleteComment) { if (!confirm('ต้องการลบความคิดเห็นนี้ใช่หรือไม่?')) return; const post = deleteComment.closest('.post-card').dataset.postId; const response = await fetch(`/api/posts/${post}/comments/${deleteComment.dataset.deleteComment}`, { method: 'DELETE' }); const data = await response.json(); if (!response.ok) throw new Error(data.message); await loadPosts(); } if (deletePost) { if (!confirm('ต้องการลบโพสต์นี้ใช่หรือไม่?')) return; const response = await fetch(`/api/posts/${deletePost.dataset.deletePost}`, { method: 'DELETE' }); const data = await response.json(); if (!response.ok) throw new Error(data.message); await loadPosts(); } } catch (error) { alert(error.message || 'ไม่สามารถทำรายการได้'); }
  });
  feedGrid.addEventListener('submit', async event => {
    const form = event.target.closest('[data-comment-form]'); if (!form) return; event.preventDefault(); const postId = form.dataset.commentForm; const input = form.querySelector('input'); const button = form.querySelector('button'); button.disabled = true;
    try { const response = await fetch(`/api/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: input.value.trim() }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); input.value = ''; await loadPosts(); } catch (error) { alert(error.message || 'ไม่สามารถแสดงความคิดเห็นได้'); } finally { button.disabled = false; }
  });
  try { const response = await fetch('/api/auth/me'); if (response.ok) currentUser = (await response.json()).user; renderComposer(); await loadPosts(); } catch (error) { feedLoading.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล'; }
});
