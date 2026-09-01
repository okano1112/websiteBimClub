with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to remove the hanging <nav class="menu"> ... </nav> </div>
# The current HTML has:
#   <!-- Navbar Component -->
#   <site-navbar></site-navbar>
# 
#     <nav class="menu">
#       <ul>
#         <li>...</li>
#       </ul>
#     </nav>
#   </div>

import re
content = re.sub(r'<site-navbar></site-navbar>.*?<nav class="menu">.*?</ul>\s*</nav>\s*</div>', '<site-navbar></site-navbar>', content, flags=re.DOTALL)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
