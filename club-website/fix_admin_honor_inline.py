import re

with open('public/page/admin-honor.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('style="max-width: 1200px;"', '')
content = content.replace('style="overflow-x: auto;"', 'class="table-responsive"')
content = content.replace('style="text-align: center;"', 'class="text-center"')
content = content.replace('style="display:flex; gap:10px;"', 'class="form-row"')
content = content.replace('class="form-group" style="flex:1;"', 'class="form-group flex-1"')
content = content.replace('style="margin-bottom: 5px; width: 100%;"', 'class="w-100 mb-2"')
content = content.replace('style="margin-top:5px; display:none;"', 'class="mt-3 d-none"')
content = content.replace('style="height:100px; border-radius:8px; object-fit:cover;"', 'class="rounded-sm" style="height:100px; object-fit:cover;"')
content = content.replace('class="form-group" style="flex:1; display:flex; align-items:center; gap:8px; margin-top:25px;"', 'class="form-group flex-1 d-flex align-items-center gap-2 mt-3"')
content = content.replace('style="width:auto; margin:0;"', '')
content = content.replace('style="margin:0;"', '')

with open('public/page/admin-honor.html', 'w', encoding='utf-8') as f:
    f.write(content)
