import os
import re

html_files = []
for root, _, files in os.walk('public'):
    for file in files:
        if file.endswith('.html'):
            html_files.append(os.path.join(root, file))

navbar_regex = re.compile(r'<!--\s*Navbar\s*-->\s*<div class="navbar">.*?</div>', re.DOTALL | re.IGNORECASE)

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the navbar block with our new custom element
    new_content = navbar_regex.sub('<!-- Navbar Component -->\n  <site-navbar></site-navbar>', content)
    
    # Inject the script into the head if it's not there
    if '<site-navbar>' in new_content and 'navbar-component.js' not in new_content:
        is_subdir = '/page/' in filepath
        script_path = '../js/navbar-component.js' if is_subdir else 'js/navbar-component.js'
        new_content = new_content.replace('</head>', f'  <script src="{script_path}"></script>\n</head>')
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
