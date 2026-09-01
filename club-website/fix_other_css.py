import re
import os

def fix_css(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        css = f.read()

    css = css.replace('#ad0f0f', 'var(--primary-color)')
    css = css.replace('#fff', 'var(--white)')
    css = css.replace('#ffffff', 'var(--white)')
    css = css.replace('#1e293b', 'var(--text-dark)')
    css = css.replace('#0f172a', 'var(--text-dark)')
    css = css.replace('#64748b', 'var(--text-body)')
    css = css.replace('#475569', 'var(--text-body)')
    css = css.replace('#94a3b8', 'var(--text-muted)')
    css = css.replace('#f1f5f9', 'var(--border-color)')
    css = css.replace('#e2e8f0', 'var(--border-color)')
    
    # Remove * { margin: 0; padding: 0 }
    css = re.sub(r'\*\s*\{\s*margin:\s*0;\s*padding:\s*0[^}]*\}', '', css)
    
    # Remove body {...}
    css = re.sub(r'body\s*\{[^}]*\}', '', css)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(css)

for css_file in ['public/css/achievement.css', 'public/css/honor.css', 'public/css/about.css', 'public/css/courses.css', 'public/css/login.css', 'public/css/register.css', 'public/main.css']:
    if os.path.exists(css_file):
        fix_css(css_file)

