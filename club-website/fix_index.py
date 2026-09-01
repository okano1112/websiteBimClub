import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Wrap info-blocks in a section + container
content = content.replace('<section class="info-blocks">', '<section class="info-section"><div class="container"><div class="info-blocks">')
content = content.replace('</section>\n\n  <script', '</div></div></section>\n\n  <script')

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
