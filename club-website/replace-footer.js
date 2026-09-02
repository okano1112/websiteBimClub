const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (filePath.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const htmlFiles = findHtmlFiles(path.join(__dirname, 'public'));

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find the footer tag using Regex
  const footerRegex = /<footer class="site-footer">[\s\S]*?<\/footer>/;
  
  if (footerRegex.test(content)) {
    // Replace footer
    content = content.replace(footerRegex, '<site-footer></site-footer>');
    
    // Add script tag if not exists
    const scriptRegex = /<script src="(\.\.\/)?js\/footer-component\.js"><\/script>/;
    if (!scriptRegex.test(content)) {
      const isSubdir = file.includes('/page/');
      const basePath = isSubdir ? '../' : '';
      const scriptTag = `<script src="${basePath}js/footer-component.js"></script>\n</body>`;
      content = content.replace('</body>', scriptTag);
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  } else {
    // Some pages might not have a footer, we just add it anyway above </body>
    const hasComponent = /<site-footer>/.test(content);
    if (!hasComponent) {
      const isSubdir = file.includes('/page/');
      const basePath = isSubdir ? '../' : '';
      const tag = `\n    <site-footer></site-footer>\n    <script src="${basePath}js/footer-component.js"></script>\n</body>`;
      content = content.replace('</body>', tag);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Added to', file);
    }
  }
});
