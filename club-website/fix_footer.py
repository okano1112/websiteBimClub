import os
import re

FOOTER_PAGE = """
    <!-- Global Footer -->
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-col">
                    <h3>BimClub</h3>
                    <p>ชมรมที่สร้างสรรค์และพัฒนาทักษะด้าน BIM (Building Information Modeling) ให้แก่นิสิตและผู้สนใจอย่างมืออาชีพ</p>
                </div>
                <div class="footer-col">
                    <h3>เมนู</h3>
                    <ul>
                        <li><a href="../index.html">หน้าแรก</a></li>
                        <li><a href="about.html">เกี่ยวกับเรา</a></li>
                        <li><a href="activity.html">กิจกรรม</a></li>
                        <li><a href="achievement.html">ผลงาน</a></li>
                        <li><a href="honor.html">เกียรติยศ</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h3>ติดต่อเรา</h3>
                    <p>มหาวิทยาลัย xxxx<br>อาคารคณะวิศวกรรมศาสตร์</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 BimClub. All Rights Reserved.</p>
            </div>
        </div>
    </footer>
"""

FOOTER_INDEX = """
    <!-- Global Footer -->
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-col">
                    <h3>BimClub</h3>
                    <p>ชมรมที่สร้างสรรค์และพัฒนาทักษะด้าน BIM (Building Information Modeling) ให้แก่นิสิตและผู้สนใจอย่างมืออาชีพ</p>
                </div>
                <div class="footer-col">
                    <h3>เมนู</h3>
                    <ul>
                        <li><a href="index.html">หน้าแรก</a></li>
                        <li><a href="page/about.html">เกี่ยวกับเรา</a></li>
                        <li><a href="page/activity.html">กิจกรรม</a></li>
                        <li><a href="page/achievement.html">ผลงาน</a></li>
                        <li><a href="page/honor.html">เกียรติยศ</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h3>ติดต่อเรา</h3>
                    <p>มหาวิทยาลัย xxxx<br>อาคารคณะวิศวกรรมศาสตร์</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 BimClub. All Rights Reserved.</p>
            </div>
        </div>
    </footer>
"""

def process_file(filepath, footer_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove existing footer blocks
    content = re.sub(r'<!-- Global Footer -->[\s\S]*?</footer>', '', content)
    
    # Inject before </body>
    content = content.replace('</body>', f'{footer_str}\n</body>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('public/index.html', FOOTER_INDEX)

for root, _, files in os.walk('public/page'):
    for file in files:
        if file.endswith('.html'):
            process_file(os.path.join(root, file), FOOTER_PAGE)

print("Footers injected correctly.")
