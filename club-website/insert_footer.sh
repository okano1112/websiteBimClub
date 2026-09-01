#!/bin/bash
FOOTER='
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
    </footer>'

for file in public/page/*.html; do
  awk -v f="$FOOTER" '/<script/ && !done { print f; done=1 } { print }' "$file" > tmp && mv tmp "$file"
done

# index.html needs correct relative paths in footer
FOOTER_INDEX='
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
    </footer>'

awk -v f="$FOOTER_INDEX" '/<script/ && !done { print f; done=1 } { print }' public/index.html > tmp && mv tmp public/index.html
