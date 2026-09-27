// Validate submitted fields before any writes; accept existing camelCase/snake_case aliases.
module.exports = function portfolioInput(body) {
  const fail = () => { throw Object.assign(new Error('รูปแบบข้อมูลพอร์ตโฟลิโอไม่ถูกต้อง'), { status: 400 }); };
  for (const [key, max] of Object.entries({ headline: 255, targetRole: 255, target_role: 255, summary: 20000, careerObjective: 20000, career_objective: 20000, websiteUrl: 500, website_url: 500 })) {
    if (body[key] != null && (typeof body[key] !== 'string' || body[key].length > max)) fail();
  }
  for (const key of ['websiteUrl', 'website_url']) {
    if (!body[key]) continue;
    try { const url = new URL(body[key]); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(); }
    catch { fail(); }
  }
  for (const key of ['isPublic', 'is_public']) {
    if (body[key] !== undefined && ![true, false, 0, 1, '0', '1', 'true', 'false'].includes(body[key])) fail();
  }
  for (const key of ['skills', 'extraSections', 'extra_sections', 'portfolioSettings', 'portfolio_settings', 'cvSettings', 'cv_settings']) {
    if (body[key] === undefined) continue;
    let parsed = body[key];
    if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { fail(); } }
    if (key === 'skills') {
      if (!Array.isArray(parsed) || parsed.length > 100 || parsed.some(value => typeof value !== 'string' || value.length > 200)) fail();
    } else if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail();
  }
};
