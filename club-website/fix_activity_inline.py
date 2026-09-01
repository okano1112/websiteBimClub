import re

with open('public/page/activity.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('style="max-width: 1100px; margin: 40px auto; padding: 0 20px;"', 'class="container section"')
content = content.replace('class="section-header" style="text-align: center; margin-bottom: 30px;"', 'class="section-header text-center mb-3"')
content = content.replace('style="background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 10px 24px rgba(0,0,0,0.08);"', 'class="card p-3 rounded-md shadow-md"')

with open('public/page/activity.html', 'w', encoding='utf-8') as f:
    f.write(content)
