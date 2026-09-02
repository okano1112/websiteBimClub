import re

with open('docker-compose.yml', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'SMTP_USER=.*', 'SMTP_USER=nfuc6qldtcuvfxoj@ethereal.email', content)
content = re.sub(r'SMTP_PASS=.*', 'SMTP_PASS=QpDP8H5ajhHqbJrHcT', content)

with open('docker-compose.yml', 'w', encoding='utf-8') as f:
    f.write(content)
