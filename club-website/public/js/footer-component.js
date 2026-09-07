class FooterComponent extends HTMLElement {
  connectedCallback() {
    const pathname = window.location.pathname;
    const isSubdir = pathname.includes('/page/');
    const basePath = isSubdir ? '../' : './';
    const pagePath = 'page/';

    this.innerHTML = `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-col footer-brand">
                    <h3>BimClub</h3>
                    <p>ชมรมที่สร้างสรรค์และพัฒนาทักษะด้าน BIM (Building Information Modeling) ให้แก่นิสิตและผู้สนใจอย่างมืออาชีพ</p>
                </div>
                <nav class="footer-col footer-nav" aria-label="เมนูส่วนท้าย">
                    <h3>เมนู</h3>
                    <ul>
                        <li><a href="${basePath}index.html">หน้าแรก</a></li>
                        <li><a href="${basePath}${pagePath}about.html">เกี่ยวกับเรา</a></li>
                        <li><a href="${basePath}${pagePath}activity.html">กิจกรรม</a></li>
                        <li><a href="${basePath}${pagePath}courses.html">คอร์สเรียน</a></li>
                        <li><a href="${basePath}${pagePath}achievement.html">ผลงานสมาชิก</a></li>
                        <li><a href="${basePath}${pagePath}honor.html">ศิษย์เก่าของชมรม</a></li>
                    </ul>
                </nav>
                <address class="footer-col footer-contact">
                    <h3>ติดต่อเรา</h3>
                    <p>มหาวิทยาลัยศรีปทุม<br>อาคารคณะวิศวกรรมศาสตร์</p>
                </address>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 BimClub · All Rights Reserved.</p>
            </div>
        </div>
    </footer>
    `;
  }
}
customElements.define('site-footer', FooterComponent);
