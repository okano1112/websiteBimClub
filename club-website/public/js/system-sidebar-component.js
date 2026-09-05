class SystemSidebarComponent extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;
    this.dataset.ready = 'true';
    this.user = null;
    this.lastFocusedElement = null;

    this.innerHTML = `
      <div class="system-sidebar-backdrop" data-sidebar-close hidden></div>
      <aside class="system-sidebar-panel" id="system-sidebar-panel" aria-label="เมนูระบบ" aria-hidden="true">
        <header class="system-sidebar-header">
          <div>
            <p class="system-sidebar-eyebrow">BIMCLUB WORKSPACE</p>
            <h2>เมนูระบบ</h2>
          </div>
          <button class="system-sidebar-close" type="button" data-sidebar-close aria-label="ปิดเมนูระบบ">×</button>
        </header>
        <div class="system-sidebar-user">
          <span class="system-sidebar-avatar" aria-hidden="true">U</span>
          <div>
            <strong data-sidebar-user-name>ผู้ใช้งาน</strong>
            <span data-sidebar-user-role>กำลังโหลดสิทธิ์...</span>
          </div>
        </div>
        <nav class="system-sidebar-nav" aria-label="เมนูจัดการ" data-sidebar-nav></nav>
        <div class="system-sidebar-footer">
          <button class="system-sidebar-logout" type="button" data-sidebar-logout>ออกจากระบบ</button>
        </div>
      </aside>
    `;

    this.panel = this.querySelector('.system-sidebar-panel');
    this.backdrop = this.querySelector('.system-sidebar-backdrop');
    this.nav = this.querySelector('[data-sidebar-nav]');
    this.closeButtons = this.querySelectorAll('[data-sidebar-close]');
    this.logoutButton = this.querySelector('[data-sidebar-logout]');

    this.closeButtons.forEach((button) => button.addEventListener('click', () => this.close()));
    this.logoutButton.addEventListener('click', () => this.logout());
    document.addEventListener('keydown', (event) => this.handleKeydown(event));
    document.addEventListener('bimclub:auth-resolved', (event) => this.setUser(event.detail?.user || null));
    document.addEventListener('bimclub:sidebar-open', () => this.open());

    this.setUser(window.BimClubAuthState?.user || null);
  }

  pageUrl(filename) {
    return window.location.pathname.includes('/page/') ? filename : `./page/${filename}`;
  }

  buildSections(role) {
    const sections = [];

    if (role === 'admin') {
      sections.push({
        label: 'Administration',
        items: [
          ['admin-dashboard.html', 'Dashboard', 'ภาพรวมระบบ'],
          ['admin-users.html', 'Users', 'บัญชีและสิทธิ์'],
          ['manage-courses.html', 'Courses', 'หลักสูตรและการเผยแพร่'],
          ['admin-cms.html', 'Content', 'กิจกรรมและผลงาน'],
          ['admin-members.html', 'Members', 'สมาชิกชุมชน'],
          ['admin-reports.html', 'Reports', 'รายงานและแนวโน้ม'],
          ['admin-system-settings.html', 'Settings', 'ตั้งค่าระบบ']
        ]
      });
      sections.push({
        label: 'Operations',
        items: [
          ['admin.html', 'Posts', 'ดูแลโพสต์'],
          ['admin-instructor-requests.html', 'Instructor Requests', 'คำขอสิทธิ์อาจารย์'],
          ['admin-honor.html', 'Hall of Honor', 'บุคคลเกียรติยศ']
        ]
      });
    } else if (role === 'instructor') {
      sections.push({
        label: 'Instructor',
        items: [['manage-courses.html', 'Courses', 'สร้างและจัดการคอร์ส']]
      });
    }

    const personalItems = [
      ['portfolio.html', 'Profile', 'พอร์ตโฟลิโอของฉัน'],
      ['settings.html', 'Account Settings', 'ข้อมูลและความปลอดภัย']
    ];
    if (role === 'user') {
      personalItems.push(['request-instructor.html', 'Instructor Access', 'ขอสิทธิ์อาจารย์']);
    }
    sections.push({ label: 'Personal', items: personalItems });
    return sections;
  }

  setUser(user) {
    this.user = user;
    const toggles = document.querySelectorAll('#system-sidebar-toggle, [data-open-system-sidebar]');
    toggles.forEach((toggle) => {
      toggle.hidden = !user;
      if (!toggle.dataset.sidebarBound) {
        toggle.dataset.sidebarBound = 'true';
        toggle.addEventListener('click', () => this.open());
      }
    });

    if (!user) {
      this.close();
      this.nav.innerHTML = '';
      return;
    }

    const name = user.fullName || user.full_name || user.username || 'ผู้ใช้งาน';
    const roleLabel = user.roleLabel || ({ admin: 'ผู้ดูแลระบบ', instructor: 'อาจารย์', user: 'ผู้ใช้ทั่วไป' }[user.role]) || 'ผู้ใช้ทั่วไป';
    this.querySelector('[data-sidebar-user-name]').textContent = name;
    this.querySelector('[data-sidebar-user-role]').textContent = roleLabel;
    this.querySelector('.system-sidebar-avatar').textContent = name.charAt(0).toUpperCase();
    this.renderNavigation(user.role || 'user');
  }

  renderNavigation(role) {
    this.nav.innerHTML = '';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    this.buildSections(role).forEach((section) => {
      const group = document.createElement('section');
      group.className = 'system-sidebar-group';
      const title = document.createElement('p');
      title.className = 'system-sidebar-group-title';
      title.textContent = section.label;
      group.appendChild(title);

      section.items.forEach(([filename, label, description]) => {
        const link = document.createElement('a');
        link.href = this.pageUrl(filename);
        link.className = 'system-sidebar-link';
        if (currentPage === filename) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
        const labelElement = document.createElement('strong');
        labelElement.textContent = label;
        const descriptionElement = document.createElement('span');
        descriptionElement.textContent = description;
        link.append(labelElement, descriptionElement);
        group.appendChild(link);
      });
      this.nav.appendChild(group);
    });
  }

  open() {
    if (!this.user) return;
    this.lastFocusedElement = document.activeElement;
    this.panel.classList.add('open');
    this.backdrop.hidden = false;
    this.panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('system-sidebar-is-open');
    document.querySelectorAll('#system-sidebar-toggle, [data-open-system-sidebar]').forEach((toggle) => {
      toggle.setAttribute('aria-expanded', 'true');
    });
    this.querySelector('.system-sidebar-close').focus();
  }

  close() {
    if (!this.panel) return;
    this.panel.classList.remove('open');
    this.backdrop.hidden = true;
    this.panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('system-sidebar-is-open');
    document.querySelectorAll('#system-sidebar-toggle, [data-open-system-sidebar]').forEach((toggle) => {
      toggle.setAttribute('aria-expanded', 'false');
    });
    if (this.lastFocusedElement?.focus) this.lastFocusedElement.focus();
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.panel?.classList.contains('open')) this.close();
  }

  async logout() {
    this.logoutButton.disabled = true;
    this.logoutButton.textContent = 'กำลังออกจากระบบ...';
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('ออกจากระบบไม่สำเร็จ');
      window.location.href = window.location.pathname.includes('/page/') ? '../index.html' : './index.html';
    } catch (error) {
      this.logoutButton.disabled = false;
      this.logoutButton.textContent = error.message || 'ลองออกจากระบบอีกครั้ง';
    }
  }
}

customElements.define('system-sidebar', SystemSidebarComponent);

function mountSystemSidebar() {
  if (!document.querySelector('system-sidebar')) {
    document.body.appendChild(document.createElement('system-sidebar'));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountSystemSidebar, { once: true });
} else {
  mountSystemSidebar();
}
