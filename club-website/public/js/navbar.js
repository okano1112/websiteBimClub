document.addEventListener('DOMContentLoaded', () => {
    const isSubdir = window.location.pathname.includes('/page/');
    const basePath = isSubdir ? '../' : './';
    const logoPath = '/assets/img/logobranding/logobim.png';
    
    const navbarHTML = `
        <div class="logo">
            <a href="${basePath}index.html">
                <img src="${logoPath}" width="80" height="50" alt="BimClub Logo" style="object-fit: contain;" />
            </a>
        </div>
        <nav class="menu">
            <ul>
                <li><a href="${basePath}index.html">หน้าแรก</a></li>
                <li><a href="${basePath}page/about.html">เกี่ยวกับเรา</a></li>
                <li><a href="${basePath}page/activity.html">กิจกรรม</a></li>
                <li><a href="${basePath}page/achievement.html">ผลงาน</a></li>
                <li><a href="${basePath}page/honor.html">เกียรติยศ</a></li>
                <li><a href="${basePath}page/login.html">เข้าสู่ระบบ</a></li>
                <li><a href="${basePath}page/register.html">สมัครสมาชิก</a></li>
            </ul>
        </nav>
    `;

    // Find the existing navbar or create one if it doesn't exist
    let navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.innerHTML = navbarHTML;
    } else {
        navbar = document.createElement('div');
        navbar.className = 'navbar';
        navbar.innerHTML = navbarHTML;
        document.body.prepend(navbar);
    }
});
