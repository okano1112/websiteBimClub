document.addEventListener('DOMContentLoaded', async () => {
  const isSubdir = window.location.pathname.includes('/page/');
  const settingsUrl = isSubdir ? 'settings.html' : './page/settings.html';

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

      const profileLi = document.createElement('li');
      profileLi.className = 'nav-profile';
      
      const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" class="nav-avatar" alt="รูปโปรไฟล์">`
        : `<div class="nav-avatar-placeholder">${escapeHtml(userName.charAt(0).toUpperCase())}</div>`;

      profileLi.innerHTML = `
        <button class="nav-profile-summary" type="button"
          aria-controls="profile-dropdown" aria-haspopup="true" aria-expanded="false" aria-label="เปิดเมนูโปรไฟล์ของ ${escapeHtml(userName)}">
          ${avatarHtml}
          <div class="nav-profile-text">
            <span class="nav-profile-name">${escapeHtml(userName)}</span>
            <span class="nav-profile-role">${escapeHtml(roleLabel)}</span>
          </div>
          <span class="nav-profile-menu-icon" aria-hidden="true">▾</span>
        </button>
        <div id="profile-dropdown" class="nav-dropdown profile-dropdown" role="menu">
          <div class="nav-dropdown-header">
            <div class="nav-dropdown-name">${escapeHtml(userName)}</div>
            <div class="nav-dropdown-email">${escapeHtml(user.email || '')}</div>
            <span class="nav-dropdown-role">${escapeHtml(roleLabel)}</span>
          </div>
          <ul class="nav-dropdown-menu">
            <li><a class="nav-dropdown-item nav-dropdown-portfolio" role="menuitem" href="${settingsUrl.replace('settings.html', 'portfolio.html')}">Portfolio ของฉัน</a></li>
            <li class="nav-dropdown-divider" aria-hidden="true"></li>
            <li><a class="nav-dropdown-item" role="menuitem" href="${settingsUrl}#profile">ตั้งค่าโปรไฟล์</a></li>
            <li><a class="nav-dropdown-item" role="menuitem" href="${settingsUrl}#password">ตั้งค่ารหัสผ่าน</a></li>
            <li><a class="nav-dropdown-item" role="menuitem" href="${settingsUrl}#recovery">เบอร์โทรศัพท์เพื่อกู้คืน / เบอร์สำรอง</a></li>
            <li class="nav-dropdown-divider" aria-hidden="true"></li>
            <li><button class="nav-dropdown-logout" type="button" role="menuitem">ออกจากระบบ</button></li>
          </ul>
        </div>
      `;

      menuUl.appendChild(profileLi);
      const profileButton = profileLi.querySelector('.nav-profile-summary');
      const profileDropdown = profileLi.querySelector('.profile-dropdown');
      const closeProfileMenu = () => {
        profileDropdown.classList.remove('show');
        profileButton.setAttribute('aria-expanded', 'false');
      };
      profileButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = !profileDropdown.classList.contains('show');
        profileDropdown.classList.toggle('show', willOpen);
        profileButton.setAttribute('aria-expanded', String(willOpen));
      });
      profileLi.querySelector('.nav-dropdown-logout').addEventListener('click', async () => {
        const logoutResponse = await fetch('/api/auth/logout', { method: 'POST' });
        if (logoutResponse.ok) location.href = isSubdir ? 'login.html' : './page/login.html';
      });
      document.addEventListener('click', (event) => {
        if (!profileLi.contains(event.target)) closeProfileMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeProfileMenu();
          profileButton.focus();
        }
      });
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
                border: 0;
                padding: 0;
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
            @media (max-width: 600px) {
                #ai-chatbot-btn { right: 16px; bottom: 16px; width: 52px; height: 52px; }
                #ai-chatbot-btn img { width: 32px; height: 32px; }
            }
        `;
        document.head.appendChild(style);

        const chatbotBtn = document.createElement('button');
        chatbotBtn.id = 'ai-chatbot-btn';
        chatbotBtn.type = 'button';
        chatbotBtn.setAttribute('aria-label', 'เปิดผู้ช่วย BIM');
        chatbotBtn.innerHTML = `
            <img src="/assets/img/logobranding/logobim.png" width="38" height="38" alt="">
            <span class="ai-chatbot-tooltip">ผู้ช่วย BIM</span>
        `;
        document.body.appendChild(chatbotBtn);

        const modal = document.createElement('div');
        modal.id = 'ai-chatbot-modal';
        modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: #fff; padding: 30px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: chatbotFadeIn 0.3s;">
                <img src="/assets/img/logobranding/logobim.png" width="64" height="64" alt="โลโก้ BimClub" style="object-fit:contain; margin:0 auto 16px;">
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
            chatbotBtn.focus();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
                chatbotBtn.focus();
            }
        });
    }
    // MOCKUP-END: AI CHATBOT
}
