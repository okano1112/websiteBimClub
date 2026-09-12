const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const PortfolioTemplates = require('../../public/js/portfolio-templates');

const projectRoot = path.resolve(__dirname, '../../../');
const websiteRoot = path.resolve(__dirname, '../../');

function resolveWithinRoot(root, relativePath) {
    const candidate = path.resolve(root, relativePath);
    const relative = path.relative(path.resolve(root), candidate);
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? candidate : null;
}

// Resolve only real image files contained in an approved directory, including symlinks.
function localImageData(root, relativePath) {
    try {
        const candidate = resolveWithinRoot(root, decodeURIComponent(relativePath));
        if (!candidate) return '';
        const realRoot = fs.realpathSync(root);
        const realFile = fs.realpathSync(candidate);
        if (!resolveWithinRoot(realRoot, path.relative(realRoot, realFile))) return '';
        const mime = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp' }[path.extname(realFile).toLowerCase()];
        const stat = fs.statSync(realFile);
        if (!mime || !stat.isFile() || stat.size > 5 * 1024 * 1024) return '';
        return `data:${mime};base64,${fs.readFileSync(realFile).toString('base64')}`;
    } catch { return ''; }
}

function resolveLocalUrls(html) {
    if (!html) return '';
    return html.replace(/src="\/(assets|uploads)\/([^"]+)"/g, (match, kind, relativePath) => {
        const root = kind === 'uploads' ? path.join(websiteRoot, 'uploads')
            : fs.existsSync('/usr/src/assets') ? '/usr/src/assets' : path.join(projectRoot, 'assets');
        return `src="${localImageData(root, relativePath)}"`;
    });
}

function allowedPdfRequest(value) {
    if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
            && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
    } catch { return false; }
}

/**
 * Generate PDF buffer from document payload
 */
async function generatePdf(payload) {
    const theme = payload.settings?.theme || {};
    for (const key of ['primary', 'secondary', 'textColor', 'accentColor']) {
        if (theme[key] && !/^#[0-9a-f]{6}$/i.test(theme[key])) throw new Error('Invalid PDF theme color');
    }
    let rawHtml = PortfolioTemplates.renderDocument(payload);
    let renderedHtml = resolveLocalUrls(rawHtml);

    const settings = payload.settings || {};
    const size = (settings.pageSize || 'a4').toLowerCase();
    const isLandscape = settings.orientation === 'landscape';

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : undefined);

    // Launch headless Chromium
    const browser = await puppeteer.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(false);
        await page.setRequestInterception(true);
        page.on('request', request => {
            const action = allowedPdfRequest(request.url()) ? request.continue() : request.abort();
            action.catch(() => {});
        });
        
        // Emulate screen/print media
        await page.emulateMediaType('print');

        // Set content and wait for fonts/images to finish loading
        await page.setContent(renderedHtml, {
            waitUntil: ['load', 'networkidle0'],
            timeout: 30000
        });

        // Determine format/dimensions
        let pdfOptions = {
            printBackground: true,
            preferCSSPageSize: true,
            landscape: isLandscape,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            }
        };

        if (size === 'a3') {
            pdfOptions.format = 'A3';
        } else if (size === 'letter') {
            pdfOptions.format = 'Letter';
        } else {
            pdfOptions.format = 'A4';
        }

        const buffer = await page.pdf(pdfOptions);
        return buffer;
    } finally {
        await browser.close();
    }
}

module.exports = {
    generatePdf,
    resolveLocalUrls,
    resolveWithinRoot,
    localImageData,
    allowedPdfRequest
};
