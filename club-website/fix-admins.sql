UPDATE users SET password = '\$2b\$10\$NIdi.1sFZd4TBVLfGDxKXOgHg1PWPpXGUwayPPc95OG/pLLYAM2OS' WHERE username = 'admin';
INSERT IGNORE INTO users (username, email, password, full_name, role, is_verified) VALUES 
('admin2', 'admin2@bimclub.com', '\$2b\$10\$NIdi.1sFZd4TBVLfGDxKXOgHg1PWPpXGUwayPPc95OG/pLLYAM2OS', 'แอดมินคนที่สอง', 'admin', 1);
INSERT IGNORE INTO portfolios (user_id) SELECT id FROM users WHERE username = 'admin2';
