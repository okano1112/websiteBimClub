import re

with open('public/css/activity.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace hardcoded heights with aspect-ratio
css = re.sub(r'\.card-image\s*\{[^}]*\}', '.card-image {\n  position: relative;\n  aspect-ratio: 16/9;\n  width: 100%;\n  overflow: hidden;\n  background: var(--secondary-color);\n}', css)

# Replace some hardcoded colors with vars
css = css.replace('#ad0f0f', 'var(--primary-color)')
css = css.replace('#fff', 'var(--white)')
css = css.replace('#ffffff', 'var(--white)')
css = css.replace('#1e293b', 'var(--text-dark)')
css = css.replace('#64748b', 'var(--text-body)')
css = css.replace('#94a3b8', 'var(--text-muted)')
css = css.replace('#f1f5f9', 'var(--border-color)')

# Fix redundant body styles if present
css = re.sub(r'body\s*\{[^}]*\}', '', css)

with open('public/css/activity.css', 'w', encoding='utf-8') as f:
    f.write(css)
