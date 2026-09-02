const fs = require('fs');

let content = fs.readFileSync('routes/portfolios.js', 'utf8');

// Update fetchCertificates calls
content = content.replace(/portfolio\.certificates = await fetchCertificates\(userId\);/g, 'portfolio.certificates = await fetchCertificates(userId, portfolio.id);');
content = content.replace(/portfolio\.certificates = await fetchCertificates\(targetUserId \|\| userId\);/g, 'portfolio.certificates = await fetchCertificates(targetUserId, portfolio.id);');

// Append POST and DELETE for manual certificates
const newRoutes = `

// POST /me/certificates
router.post('/me/certificates', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { title, issuer, issueDate, credentialUrl } = req.body;
        
        const [portfolios] = await db.query('SELECT id FROM portfolios WHERE user_id = ?', [userId]);
        const portfolioId = portfolios[0].id;
        
        const [result] = await db.query(
            'INSERT INTO portfolio_certificates (portfolio_id, title, issuer, issue_date, credential_url) VALUES (?, ?, ?, ?, ?)',
            [portfolioId, title, issuer, issueDate, credentialUrl]
        );
        
        const [newCert] = await db.query('SELECT * FROM portfolio_certificates WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, certificate: newCert[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มใบรับรอง' });
    }
});

// DELETE /me/certificates/:id
router.delete('/me/certificates/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const certId = req.params.id;
        
        const [certs] = await db.query(
            \`SELECT pc.id FROM portfolio_certificates pc 
            JOIN portfolios p ON pc.portfolio_id = p.id 
            WHERE pc.id = ? AND p.user_id = ?\`,
            [certId, userId]
        );
        
        if (certs.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบใบรับรองนี้' });
        }
        
        await db.query('DELETE FROM portfolio_certificates WHERE id = ?', [certId]);
        res.json({ success: true, message: 'ลบใบรับรองสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบใบรับรอง' });
    }
});
`;

if (!content.includes('/me/certificates')) {
    content = content.replace('module.exports = router;', newRoutes + '\nmodule.exports = router;');
}

fs.writeFileSync('routes/portfolios.js', content, 'utf8');
