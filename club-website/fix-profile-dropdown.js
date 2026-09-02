const fs = require('fs');
let css = fs.readFileSync('public/css/navbar.css', 'utf8');

css = css.replace(/\.nav-dropdown \{/g, '.menu .nav-dropdown {');
css = css.replace(/\.nav-dropdown\.show \{/g, '.menu .nav-dropdown.show {');
css = css.replace(/\.nav-dropdown::before \{/g, '.menu .nav-dropdown::before {');
css = css.replace(/\.nav-profile:hover \.nav-dropdown/g, '.menu .nav-profile:hover .nav-dropdown');
css = css.replace(/\.nav-profile:focus-within \.nav-dropdown/g, '.menu .nav-profile:focus-within .nav-dropdown');

fs.writeFileSync('public/css/navbar.css', css, 'utf8');
