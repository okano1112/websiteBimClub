document.addEventListener('DOMContentLoaded', async () => {
  const isSubdir = window.location.pathname.includes('/page/');
  const feedUrl = isSubdir ? 'feed.html' : './page/feed.html';
  const portfolioUrl = isSubdir ? 'portfolio.html' : './page/portfolio.html';
  const adminUrl = isSubdir ? 'admin-cms.html' : './page/admin-cms.html';
  const settingsUrl = isSubdir ? 'settings.html' : './page/settings.html';
  const coursesUrl = isSubdir ? 'courses.html' : './page/courses.html';
  const manageCoursesUrl = isSubdir ? 'manage-courses.html' : './page/manage-courses.html';

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

  const normalizeStaticNav = (menu) => {
    const labels = {
      Home: 'หน้าแรก',
      About: 'เกี่ยวกับเรา',
      Activities: 'กิจกรรม',
      Achievements: 'ผลงาน',
      Login: 'เข้าสู่ระบบ',
      Register: 'สมัครสมาชิก'
    };

    menu.querySelectorAll('li a').forEach((link) => {
      const text = link.textContent.trim();
      if (labels[text]) link.textContent = labels[text];
    });
  };
  
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const menuUl = document.querySelector('.menu ul') || document.querySelector('.menu');
    if (!menuUl) return;
    normalizeStaticNav(menuUl);

    if (res.ok) {
      const data = await res.json();
      const user = data.user;
      const userName = getUserName(user);
      const avatarUrl = getAvatarUrl(user);
      const roleLabel = getRoleLabel(user);
      
      // Remove Login and Register links
      const links = menuUl.querySelectorAll('li a');
      links.forEach(link => {
        if (link.href.includes('login') || link.href.includes('register')) {
          link.parentElement.remove();
        }
      });

      // Add Feed link
      const hasFeedLink = Array.from(menuUl.querySelectorAll('a')).some(link => link.href.includes('feed'));
      if (!hasFeedLink) {
        const feedLi = document.createElement('li');
        feedLi.innerHTML = `<a href="${feedUrl}">ฟีด</a>`;
        menuUl.appendChild(feedLi);
      }

      const hasCoursesLink = Array.from(menuUl.querySelectorAll('a')).some(link => link.href.includes('courses.html') && !link.classList.contains('nav-course-link'));
      if (!hasCoursesLink) {
        const learnLi = document.createElement('li');
        learnLi.innerHTML = `<a href="${coursesUrl}">คอร์สเรียน</a>`;
        menuUl.appendChild(learnLi);
      }

      if (user.role === 'instructor' || user.role === 'admin') {
        const hasCourseLink = Array.from(menuUl.querySelectorAll('a')).some(link => link.classList.contains('nav-course-link'));
        if (!hasCourseLink) {
          const courseLi = document.createElement('li');
          courseLi.innerHTML = `<a href="${manageCoursesUrl}" class="nav-course-link">จัดการคอร์ส</a>`;
          menuUl.appendChild(courseLi);
        }
      }

      // Add Profile section
      const profileLi = document.createElement('li');
      profileLi.className = 'nav-profile';
      
      const avatarHtml = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" class="nav-avatar" alt="รูปโปรไฟล์">`
        : `<div class="nav-avatar-placeholder">${escapeHtml(userName.charAt(0).toUpperCase())}</div>`;

      let adminLink = '';
      if (user.role === 'admin') {
        adminLink = `<li><a href="${adminUrl}" class="nav-dropdown-item">จัดการระบบ</a></li>`;
      }

      let instructorRequestLink = '';
      if (user.role === 'user') {
        const requestUrl = isSubdir ? 'request-instructor.html' : './page/request-instructor.html';
        instructorRequestLink = `<li><a href="${requestUrl}" class="nav-dropdown-item">ขอสิทธิ์อาจารย์</a></li>`;
      }

      profileLi.innerHTML = `
        <div class="nav-profile-summary" aria-label="โปรไฟล์ผู้ใช้">
          ${avatarHtml}
          <div class="nav-profile-text">
            <span class="nav-profile-name">${escapeHtml(userName)}</span>
            <span class="nav-profile-role">${escapeHtml(roleLabel)}</span>
          </div>
        </div>
        <div class="nav-dropdown">
          <div class="nav-dropdown-header">
            <div class="nav-dropdown-name">${escapeHtml(userName)}</div>
            <div class="nav-dropdown-email">${escapeHtml(user.email || '')}</div>
            <div class="nav-dropdown-role">${escapeHtml(roleLabel)}</div>
          </div>
          <ul class="nav-dropdown-menu">
            <li><a href="${settingsUrl}" class="nav-dropdown-item">ตั้งค่า</a></li>
            <li><a href="${portfolioUrl}" class="nav-dropdown-item">พอร์ตโฟลิโอของฉัน</a></li>
            ${adminLink}
            ${instructorRequestLink}
            <div class="nav-dropdown-divider"></div>
            <li><button class="nav-dropdown-logout" id="logoutBtn">ออกจากระบบ</button></li>
          </ul>
        </div>
      `;

      menuUl.appendChild(profileLi);

      // Toggle dropdown for touch devices; desktop hover is handled by CSS.
      profileLi.addEventListener('click', (e) => {
        if (e.target.closest('.nav-dropdown') && e.target.id !== 'logoutBtn') return;
        const dropdown = profileLi.querySelector('.nav-dropdown');
        dropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!profileLi.contains(e.target)) {
          const dropdown = profileLi.querySelector('.nav-dropdown');
          if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
          }
        }
      });

      // Handle logout
      document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.reload();
        } catch (err) {
          console.error('Logout failed', err);
        }
      });

      document.querySelectorAll('[data-disabled-feature]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          alert(link.getAttribute('data-disabled-feature'));
        });
      });

    } else {
      // Not logged in, just add Feed link
      const hasFeedLink = Array.from(menuUl.querySelectorAll('a')).some(link => link.href.includes('feed'));
      if (!hasFeedLink) {
        const feedLi = document.createElement('li');
        feedLi.innerHTML = `<a href="${feedUrl}">ฟีด</a>`;
        menuUl.appendChild(feedLi);
      }
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
});
