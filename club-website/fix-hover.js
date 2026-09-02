const fs = require('fs');

// 1. Fix CSS
let css = fs.readFileSync('public/css/navbar.css', 'utf8');

// Replace .nav-submenu to have higher specificity
css = css.replace(/\.nav-submenu \{/g, '.menu .nav-submenu {');
css = css.replace(/\.nav-submenu\.show \{/g, '.menu .nav-submenu.show {');
css = css.replace(/\.nav-submenu::before \{/g, '.menu .nav-submenu::before {');
css = css.replace(/\.nav-submenu li \{/g, '.menu .nav-submenu li {');
css = css.replace(/\.nav-submenu a \{/g, '.menu .nav-submenu a {');
css = css.replace(/\.nav-submenu a:hover \{/g, '.menu .nav-submenu a:hover {');

// Add hover rules for desktop
css += `
/* Add hover capability for dropdown */
@media (min-width: 769px) {
  .menu .nav-dropdown-wrapper:hover .nav-submenu,
  .menu .nav-dropdown-wrapper:focus-within .nav-submenu {
    display: flex;
  }
}
`;

fs.writeFileSync('public/css/navbar.css', css, 'utf8');

// 2. Fix JS
let js = fs.readFileSync('public/js/navbar-component.js', 'utf8');

// On mobile, they probably still need click because hover doesn't exist on mobile.
// Wait, the user said "เฉพาะเวลา เอาเมาส์ไปจ่อเท่านั้น" (ONLY when mouse hovers).
// On mobile, tap acts like hover on some devices, but it's better to keep the click toggle for mobile, or let's keep the JS click toggle but make it work cleanly, OR just remove JS toggle for desktop.

// Actually, in CSS hover will work on desktop. 
// If they click on desktop, the JS will toggle .show, which is fine, but they asked for hover ONLY.
// So let's remove the JS click for the dropdown so it strictly uses CSS hover.

js = js.replace(/const dropdownToggle = this\.querySelector\('\.nav-dropdown-toggle'\);[\s\S]*?\}\);[\s\S]*?\}/, `
    const dropdownToggle = this.querySelector('.nav-dropdown-toggle');
    const submenu = this.querySelector('.nav-submenu');
    
    // For mobile, we might still need click to expand
    if (dropdownToggle && submenu) {
        dropdownToggle.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
                dropdownToggle.setAttribute('aria-expanded', !isExpanded);
                submenu.classList.toggle('show');
            }
        });
    }
`);

fs.writeFileSync('public/js/navbar-component.js', js, 'utf8');
