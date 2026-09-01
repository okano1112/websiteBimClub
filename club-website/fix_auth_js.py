import re

with open('public/js/auth.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Inject Global Footer block
content = re.sub(r'// 2\. Inject Global Footer[\s\S]*?document\.body\.appendChild\(footer\);\n\s*\}', '', content)

with open('public/js/auth.js', 'w', encoding='utf-8') as f:
    f.write(content)
