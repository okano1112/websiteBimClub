import os
import re

for root, _, files in os.walk('public/css'):
    for file in files:
        if file.endswith('.css') and file != 'global.css':
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove * { margin: 0; padding: 0; box-sizing: border-box; }
            content = re.sub(r'\*\s*\{\s*margin:\s*0;\s*padding:\s*0;\s*box-sizing:\s*border-box;\s*\}', '', content)
            content = re.sub(r'\*\s*\{\s*margin:\s*0;\s*padding:\s*0[^}]*\}', '', content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
