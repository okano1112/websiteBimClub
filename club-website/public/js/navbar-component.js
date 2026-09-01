class NavbarComponent extends HTMLElement {
  connectedCallback() {
    const pathname = window.location.pathname;
    const isSubdir = pathname.includes('/page/');
    const basePath = isSubdir ? '../' : './';
    const pagePath = 'page/';
    const logoPath = '/assets/img/logobranding/logobim.png';

    this.innerHTML = `
      <div class="navbar">
        <div class="logo">
          <a href="${basePath}index.html">
            <img src="${logoPath}" width="80" height="50" alt="BimClub Logo" style="object-fit: contain;" />
          </a>
        </div>
        <nav class="menu">
          <ul>
            <li><a href="${basePath}index.html" class="${pathname.endsWith('index.html') || pathname.endsWith('/') ? 'active' : ''}">หน้าแรก</a></li>
            <li><a href="${basePath}${pagePath}about.html" class="${pathname.includes('about.html') ? 'active' : ''}">เกี่ยวกับเรา</a></li>
            <li><a href="${basePath}${pagePath}activity.html" class="${pathname.includes('activity.html') ? 'active' : ''}">กิจกรรม</a></li>
            <li><a href="${basePath}${pagePath}achievement.html" class="${pathname.includes('achievement.html') ? 'active' : ''}">ผลงาน</a></li>
            <li><a href="${basePath}${pagePath}honor.html" class="${pathname.includes('honor.html') ? 'active' : ''}">เกียรติยศ</a></li>
            <li><a href="${basePath}${pagePath}login.html" class="${pathname.includes('login.html') ? 'active' : ''}">เข้าสู่ระบบ</a></li>
            <li><a href="${basePath}${pagePath}register.html" class="${pathname.includes('register.html') ? 'active' : ''}">สมัครสมาชิก</a></li>
          </ul>
        </nav>
      </div>
    `;
  }
}
customElements.define('site-navbar', NavbarComponent);
