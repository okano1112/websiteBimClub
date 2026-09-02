class NavbarComponent extends HTMLElement {
  connectedCallback() {
    const pathname = window.location.pathname;
    const isSubdir = pathname.includes('/page/');
    const basePath = isSubdir ? '../' : './';
    const pagePath = 'page/';
    const logoPath = '/assets/img/logobranding/logobim.png';

    const isActive = (path) => pathname.includes(path) ? 'active' : '';
    const ariaCurrent = (path) => pathname.includes(path) ? 'aria-current="page"' : '';
    
    // Check if index
    const isHome = pathname.endsWith('index.html') || pathname.endsWith('/') || pathname === '';
    const homeActive = isHome ? 'active' : '';
    const homeAria = isHome ? 'aria-current="page"' : '';

    this.innerHTML = `
      <div class="navbar">
        <div class="logo">
          <a href="${basePath}index.html">
            <img src="${logoPath}" width="80" height="50" alt="BimClub Logo" style="object-fit: contain;" />
          </a>
        </div>
        
        <button class="nav-hamburger" aria-label="เปิดเมนูหลัก" aria-expanded="false" id="mobile-menu-btn">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <nav class="menu" role="navigation" aria-label="เมนูหลัก" id="main-nav-menu">
          <ul>
            <li><a href="${basePath}index.html" class="${homeActive}" ${homeAria}>หน้าแรก</a></li>
            <li><a href="${basePath}${pagePath}about.html" class="${isActive('about.html')}" ${ariaCurrent('about.html')}>เกี่ยวกับเรา</a></li>
            <li><a href="${basePath}${pagePath}activity.html" class="${isActive('activity.html')}" ${ariaCurrent('activity.html')}>กิจกรรม</a></li>
            <li><a href="${basePath}${pagePath}courses.html" class="${isActive('courses.html')}" ${ariaCurrent('courses.html')}>คอร์สเรียน</a></li>
            
            <li class="nav-dropdown-wrapper">
                <button class="nav-dropdown-toggle ${isActive('achievement.html') || isActive('honor.html') ? 'active' : ''}" aria-haspopup="true" aria-expanded="false">
                    ผลงาน ▾
                </button>
                <ul class="nav-submenu">
                    <li><a href="${basePath}${pagePath}achievement.html" class="${isActive('achievement.html')}">ผลงานสมาชิก</a></li>
                    <li><a href="${basePath}${pagePath}honor.html" class="${isActive('honor.html')}">ศิษย์เก่าของชมรม</a></li>
                </ul>
            </li>

            <!-- Default state is loading skeleton to prevent Layout Shift -->
            <li class="nav-auth-skeleton">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-text"></div>
            </li>

            <li class="auth-guest-link" style="display: none;"><a href="${basePath}${pagePath}login.html" class="${isActive('login.html')}">เข้าสู่ระบบ</a></li>
            <li class="auth-guest-link" style="display: none;"><a href="${basePath}${pagePath}register.html" class="${isActive('register.html')}">สมัครสมาชิก</a></li>
          </ul>
        </nav>
      </div>
    `;

    this.setupInteractions();
  }

  setupInteractions() {
    const hamburger = this.querySelector('#mobile-menu-btn');
    const menu = this.querySelector('#main-nav-menu');
    
    if (hamburger && menu) {
        hamburger.addEventListener('click', () => {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
            hamburger.classList.toggle('is-active');
            menu.classList.toggle('show');
        });
    }

    const dropdownToggle = this.querySelector('.nav-dropdown-toggle');
    const submenu = this.querySelector('.nav-submenu');
    
    if (dropdownToggle && submenu) {
        dropdownToggle.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
                dropdownToggle.setAttribute('aria-expanded', !isExpanded);
                submenu.classList.toggle('show');
            }
        });
        
        // Close when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !this.contains(e.target)) {
                dropdownToggle.setAttribute('aria-expanded', 'false');
                submenu.classList.remove('show');
            }
        });
    }
  }
}
customElements.define('site-navbar', NavbarComponent);
