with open('public/page/login.html', 'r', encoding='utf-8') as f:
    content = f.read()

if 'login.js' not in content:
    content = content.replace('<script src="../js/auth.js"></script>', '<script src="../js/login.js"></script>\n    <script src="../js/auth.js"></script>')
    with open('public/page/login.html', 'w', encoding='utf-8') as f:
        f.write(content)
