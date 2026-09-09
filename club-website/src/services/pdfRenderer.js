const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const PortfolioTemplates = require('../../public/js/portfolio-templates');

const projectRoot = path.resolve(__dirname, '../../../');
const websiteRoot = path.resolve(__dirname, '../../');

/**
 * Resolve local relative URLs (/assets/..., /uploads/...) to file:// or data URI
 */
function resolveLocalUrls(html) {
    if (!html) return '';

    // Replace /assets/
    html = html.replace(/src="\/assets\/([^"]+)"/g, (match, relPath) => {
        const fullPath = fs.existsSync('/usr/src/assets')
            ? path.join('/usr/src/assets', relPath)
            : path.join(projectRoot, 'assets', relPath);
        if (fs.existsSync(fullPath)) {
            try {
                const ext = path.extname(fullPath).toLowerCase().replace('.', '');
                const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'png' ? 'image/png' : 'image/jpeg');
                const base64 = fs.readFileSync(fullPath).toString('base64');
                return `src="data:${mime};base64,${base64}"`;
            } catch (e) {
                return `src="file://${fullPath}"`;
            }
        }
        return match;
    });

    // Replace /uploads/
    html = html.replace(/src="\/uploads\/([^"]+)"/g, (match, relPath) => {
        const fullPath = path.join(websiteRoot, 'uploads', relPath);
        if (fs.existsSync(fullPath)) {
            try {
                const ext = path.extname(fullPath).toLowerCase().replace('.', '');
                const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'png' ? 'image/png' : 'image/jpeg');
                const base64 = fs.readFileSync(fullPath).toString('base64');
                return `src="data:${mime};base64,${base64}"`;
            } catch (e) {
                return `src="file://${fullPath}"`;
            }
        }
        return match;
    });

    return html;
}

/**
 * Generate PDF buffer from document payload
 */
async function generatePdf(payload) {
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
    resolveLocalUrls
};
