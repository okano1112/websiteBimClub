document.addEventListener('DOMContentLoaded', async () => {
  const isSubdir = window.location.pathname.includes('/page/');
  const feedUrl = isSubdir ? 'feed.html' : './page/feed.html';

  const roleLabels = {
    user: 'ผู้ใช้ทั่วไป',
    instructor: 'อาจารย์',
    admin: 'ผู้ดูแลระบบ'
  };

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const getUserName = (user) => user.fullName || user.full_name || user.username || 'ผู้ใช้งาน';
  const getAvatarUrl = (user) => user.avatarUrl || user.avatar_url || '';
  const getRoleLabel = (user) => user.roleLabel || roleLabels[user.role] || roleLabels.user;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const menuUl = document.querySelector('.menu ul') || document.querySelector('.menu');
    if (!menuUl) return;

    // Remove skeleton
    const skeleton = menuUl.querySelector('.nav-auth-skeleton');
    if (skeleton) skeleton.remove();

    if (res.ok) {
      const data = await res.json();
      const user = data.user;
      const userName = getUserName(user);
      const avatarUrl = getAvatarUrl(user);
      const roleLabel = getRoleLabel(user);
      window.BimClubAuthState = { user };
      
      // Remove Login and Register links completely
      const guestLinks = menuUl.querySelectorAll('.auth-guest-link');
      guestLinks.forEach(link => link.remove());

      // Add Feed link before the dropdown if possible
      const hasFeedLink = Array.from(menuUl.querySelectorAll('a')).some(link => link.href.includes('feed'));
      if (!hasFeedLink) {
        const feedLi = document.createElement('li');
        feedLi.innerHTML = `<a href="${feedUrl}">ฟีด</a>`;
        
        // Insert after Home (index 0)
        const firstLi = menuUl.querySelector('li');
        if (firstLi && firstLi.nextSibling) {
            menuUl.insertBefore(feedLi, firstLi.nextSibling);
        } else {
            menuUl.appendChild(feedLi);
        }
      }

      // Profile is now a direct entry point to the global system sidebar.
      // Management links are intentionally not rendered in a profile dropdown.
      const profileLi = document.createElement('li');
      profileLi.className = 'nav-profile';
      
      const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" class="nav-avatar" alt="รูปโปรไฟล์">`
        : `<div class="nav-avatar-placeholder">${escapeHtml(userName.charAt(0).toUpperCase())}</div>`;

      profileLi.innerHTML = `
        <button class="nav-profile-summary" type="button" data-open-system-sidebar
          aria-controls="system-sidebar-panel" aria-expanded="false" aria-label="เปิดเมนูระบบของ ${escapeHtml(userName)}">
          ${avatarHtml}
          <div class="nav-profile-text">
            <span class="nav-profile-name">${escapeHtml(userName)}</span>
            <span class="nav-profile-role">${escapeHtml(roleLabel)}</span>
          </div>
          <span class="nav-profile-menu-icon" aria-hidden="true">☰</span>
        </button>
      `;

      menuUl.appendChild(profileLi);
      document.dispatchEvent(new CustomEvent('bimclub:auth-resolved', { detail: { user } }));

      document.querySelectorAll('[data-disabled-feature]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          alert(link.getAttribute('data-disabled-feature'));
        });
      });

    } else {
      // Not logged in
      window.BimClubAuthState = { user: null };
      document.dispatchEvent(new CustomEvent('bimclub:auth-resolved', { detail: { user: null } }));
      const guestLinks = menuUl.querySelectorAll('.auth-guest-link');
      guestLinks.forEach(link => {
          link.style.display = 'flex'; // show them
      });
    }

    // Phase 1: Inject Global UI (Footer and Chatbot)
    injectGlobalUI();

  } catch (error) {
    console.error('Auth check failed:', error);
    window.BimClubAuthState = { user: null };
    document.dispatchEvent(new CustomEvent('bimclub:auth-resolved', { detail: { user: null } }));
    // In case of error, show login/register links just in case
    const menuUl = document.querySelector('.menu ul');
    if (menuUl) {
        const skeleton = menuUl.querySelector('.nav-auth-skeleton');
        if (skeleton) skeleton.remove();
        
        const guestLinks = menuUl.querySelectorAll('.auth-guest-link');
        guestLinks.forEach(link => {
            link.style.display = 'flex';
        });
    }
  }
});

function injectGlobalUI() {
    // MOCKUP-START: AI CHATBOT
    // MOCKUP UI ONLY - Replace with a real chatbot service before production.
    if (!document.getElementById('ai-chatbot-btn')) {
        const style = document.createElement('style');
        style.innerHTML = `
            #ai-chatbot-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: #ad0f0f;
                color: white;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(173, 15, 15, 0.4);
                z-index: 9999;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            #ai-chatbot-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(173, 15, 15, 0.6);
            }
            .ai-chatbot-tooltip {
                position: absolute;
                right: 70px;
                background: #333;
                color: #fff;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.85rem;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;
            }
            #ai-chatbot-btn:hover .ai-chatbot-tooltip {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);

        const chatbotBtn = document.createElement('div');
        chatbotBtn.id = 'ai-chatbot-btn';
        chatbotBtn.innerHTML = `
            <span style="font-size: 28px;">🤖</span>
            <div class="ai-chatbot-tooltip">AI Chatbot (Coming Soon)</div>
        `;
        document.body.appendChild(chatbotBtn);

        const modal = document.createElement('div');
        modal.id = 'ai-chatbot-modal';
        modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: #fff; padding: 30px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: chatbotFadeIn 0.3s;">
                <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
                <h3 style="color: #ad0f0f; margin-bottom: 12px; font-size: 1.4rem;">AI Chatbot</h3>
                <p style="color: #4b5563; margin-bottom: 24px;">ระบบ AI กำลังอยู่ระหว่างการพัฒนาฟีเจอร์ใหม่ โปรดรอติดตามเร็วๆ นี้ครับ</p>
                <button id="ai-chatbot-close" style="background: #ad0f0f; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600;">ปิดหน้าต่าง</button>
            </div>
            <style>
                @keyframes chatbotFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            </style>
        `;
        document.body.appendChild(modal);

        chatbotBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        document.getElementById('ai-chatbot-close').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    // MOCKUP-END: AI CHATBOT
}
