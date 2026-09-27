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
async function renderPdf(payload, { launch, timeoutMs }) {
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
    const browser = await launch({
        timeout: Math.min(timeoutMs, 15000),
        protocolTimeout: timeoutMs,
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=none'
        ]
    });

    let timer;
    try {
        const render = async () => {
            const page = await browser.newPage();
            page.setDefaultTimeout(timeoutMs);
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
                timeout: timeoutMs
            });

            await page.evaluate(() => document.fonts.ready);
            // Determine format/dimensions
            let pdfOptions = {
                printBackground: true,
                timeout: timeoutMs,
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
          // Puppeteer returns Uint8Array; Express must receive binary PDF bytes.
          return Buffer.from(buffer);
        };
        const deadline = new Promise((_, reject) => {
            timer = setTimeout(() => {
                const error = new Error('PDF rendering timed out');
                error.status = 504;
                reject(error);
            }, timeoutMs);
        });
        return await Promise.race([render(), deadline]);
    } catch (error) {
        if (error.name === 'TimeoutError') error.status = 504;
        throw error;
    } finally {
        clearTimeout(timer);
        // A stuck renderer must not retain the only work slot indefinitely.
        let cleanupTimer;
        try {
            await Promise.race([
                browser.close(),
                new Promise((_, reject) => {
                    cleanupTimer = setTimeout(() => reject(new Error('Chromium close timeout')), 2000);
                })
            ]);
        } catch {
            browser.process()?.kill('SIGKILL');
        } finally {
            clearTimeout(cleanupTimer);
        }
    }
}

function createPdfRenderer({ launch = options => puppeteer.launch(options), timeoutMs = 30000, maxConcurrent = 1 } = {}) {
    const limit = require('./workLimit')(maxConcurrent);
    return payload => limit(async () => {
        try { return await renderPdf(payload, { launch, timeoutMs }); }
        catch (error) {
            if (error.name === 'TimeoutError') error.status = 504;
            throw error;
        }
    });
}
const generatePdf = createPdfRenderer();

module.exports = {
    generatePdf,
    createPdfRenderer,
    resolveLocalUrls,
    resolveWithinRoot,
    localImageData,
    allowedPdfRequest
};
