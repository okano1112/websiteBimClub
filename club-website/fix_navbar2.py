import os
import re

html_files = []
for root, _, files in os.walk('public'):
    for file in files:
        if file.endswith('.html'):
            html_files.append(os.path.join(root, file))

# Regex to match <div class="navbar">...</div> or <nav class="navbar">...</nav>
# This assumes the navbar block doesn't contain other <nav> or <div> that would break the non-greedy match, but actually it does contain <div> and <nav>!
# So regex is risky. Let's use a simpler approach: match from 'class="navbar"' until '</ul>\n        </div>\n    </nav>' or similar.
# A better way is using a simple script to find the start and end line.

def replace_navbar(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    start_idx = -1
    end_idx = -1
    
    for i, line in enumerate(lines):
        if 'class="navbar"' in line and start_idx == -1:
            start_idx = i
            # Look backwards for <!-- Navbar -->
            if i > 0 and '<!-- Navbar -->' in lines[i-1]:
                start_idx = i - 1
            
        # We need to find the end of the navbar. Usually it ends after </ul></nav></div> or </ul></div></nav>
        # Let's count tags if possible, or just look for the first </div> or </nav> that aligns with the root.
        # Actually, let's look for the line containing `<li><a href="login.html">` or `สมัครสมาชิก` and then find the next `</nav></div>` or `</div></nav>`
        
    if start_idx != -1:
        # Simple stack-based parser to find the end of the element
        stack = []
        element_started = False
        for i in range(start_idx, len(lines)):
            line = lines[i]
            # count <div, <nav, </div, </nav
            opens = len(re.findall(r'<(div|nav)\b', line, re.IGNORECASE))
            closes = len(re.findall(r'</(div|nav)>', line, re.IGNORECASE))
            
            if not element_started and (opens > 0):
                element_started = True
            
            for _ in range(opens): stack.append('open')
            for _ in range(closes): 
                if stack: stack.pop()
                
            if element_started and len(stack) == 0:
                end_idx = i
                break
                
        if end_idx != -1 and '<site-navbar>' not in ''.join(lines):
            # Replace lines[start_idx:end_idx+1] with <site-navbar>
            new_lines = lines[:start_idx] + ['  <!-- Navbar Component -->\n  <site-navbar></site-navbar>\n'] + lines[end_idx+1:]
            
            content = ''.join(new_lines)
            if 'navbar-component.js' not in content:
                is_subdir = '/page/' in filepath
                script_path = '../js/navbar-component.js' if is_subdir else 'js/navbar-component.js'
                content = content.replace('</head>', f'  <script src="{script_path}"></script>\n</head>')
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
                
for filepath in html_files:
    replace_navbar(filepath)
