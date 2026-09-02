const fs = require('fs');

let js = fs.readFileSync('public/js/auth.js', 'utf8');
js = js.replace(/profileBtn\.addEventListener\('click', \(e\) => \{[\s\S]*?dropdown\.classList\.toggle\('show'\);\n\s*\}\);/, `
      profileBtn.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
          profileBtn.setAttribute('aria-expanded', !isExpanded);
          dropdown.classList.toggle('show');
        }
      });
`);

fs.writeFileSync('public/js/auth.js', js, 'utf8');
