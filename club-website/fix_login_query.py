with open('routes/auth.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("SELECT * FROM users WHERE email = ?', [email]", "SELECT * FROM users WHERE email = ? OR username = ?', [email, email]")

with open('routes/auth.js', 'w', encoding='utf-8') as f:
    f.write(content)
