import os
import re

auth_files = ['public/page/login.html', 'public/page/register.html', 'public/page/forget.html', 'public/page/reset-password.html']

for filepath in auth_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Specific string replacements based on what we injected
        content = content.replace('style="color:var(--danger); text-align:center; margin-bottom:15px; display:none; font-size:0.9rem;"', 'class="text-danger text-center mb-3 d-none"')
        content = content.replace('style="background:#fef3c7; color:#92400e; text-align:center; margin-bottom:15px; padding:12px; border-radius:6px; display:none; font-size:0.9rem;"', 'class="bg-warning-light text-center mb-3 p-3 rounded-sm d-none"')
        content = content.replace('style="margin-top:8px; padding:6px 12px; font-size:0.8rem; width:100%;"', 'class="btn btn-outline w-100 mt-3"')
        content = content.replace('style="justify-content: center; margin-top:20px;"', 'class="auth-links justify-content-center mt-3"')
        content = content.replace('style="font-weight:600; color:var(--primary-color);"', '')
        content = content.replace('style="color:var(--success); text-align:center; margin-bottom:15px; display:none; font-size:0.9rem; background:#d1fae5; padding:12px; border-radius:6px;"', 'class="bg-success-light text-center mb-3 p-3 rounded-sm d-none"')
        content = content.replace('style="text-align:center; color:var(--text-body); font-size:0.9rem; margin-bottom:var(--space-3);"', 'class="text-center text-muted mb-3"')
        content = content.replace('style="text-align:center; margin-bottom:15px; display:none; font-size:0.9rem; padding:12px; border-radius:6px;"', 'class="text-center mb-3 p-3 rounded-sm d-none"')
        content = content.replace('style="justify-content:center; margin-top:15px;"', 'class="auth-links justify-content-center mt-3"')
        content = content.replace('style="max-width: 500px;"', '')

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
