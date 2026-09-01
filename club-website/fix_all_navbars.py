import os
import re

html_files = []
for root, _, files in os.walk('public'):
    for file in files:
        if file.endswith('.html'):
            html_files.append(os.path.join(root, file))

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue:
    #   <site-navbar></site-navbar>
    #     <nav class="menu">
    #       <ul>
    #         ...
    #       </ul>
    #     </nav>
    #   </div>
    # OR 
    #   <div class="menu">
    #     <ul>
    #        ...
    #     </ul>
    #   </div>
    # </nav>  (like in honor.html)
    
    # We can match `<site-navbar></site-navbar>` followed by anything up to the hanging `</div>` or `</nav>`
    # BUT we have to be extremely careful not to eat the rest of the page.
    # What usually follows the navbar?
    # A generic solution: Look for `<site-navbar></site-navbar>` and then the very next block that looks like a menu up to its closing tag.

    if '<site-navbar></site-navbar>' in content:
        # Check if there is a hanging menu
        hanging_menu = re.search(r'(<site-navbar></site-navbar>)\s*<(nav|div) class="menu">.*?</ul>\s*</\2>\s*</(div|nav)>', content, re.DOTALL)
        if hanging_menu:
            content = content.replace(hanging_menu.group(0), '<site-navbar></site-navbar>')
        
        # Another pattern: sometimes it's `<site-navbar></site-navbar>` immediately followed by `</ul>\s*</nav>\s*</div>` (if my previous script messed it up differently)
        hanging_close = re.search(r'(<site-navbar></site-navbar>)\s*</ul>\s*</nav>\s*</div>', content, re.DOTALL)
        if hanging_close:
            content = content.replace(hanging_close.group(0), '<site-navbar></site-navbar>')

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
