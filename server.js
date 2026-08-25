const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('./db');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'newspulse-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }
}));

// File upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.upload = upload;

// Static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ===== VISIT TRACKING MIDDLEWARE =====
app.use((req, res, next) => {
    // Skip static files, API calls, and admin panel
    if (req.path.startsWith('/css/') || req.path.startsWith('/js/') || 
        req.path.startsWith('/uploads/') || req.path.startsWith('/api/') ||
        req.path.startsWith('/admin') || req.path.includes('.')) {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const page = req.path;
    const userAgent = req.get('User-Agent') || '';

    try {
        // Record the visit
        db.prepare('INSERT INTO visits (ip, page, user_agent) VALUES (?, ?, ?)').run(ip, page, userAgent);

        // Update online users tracking
        const existing = db.prepare('SELECT id FROM online_users WHERE ip = ?').get(ip);
        if (existing) {
            db.prepare('UPDATE online_users SET last_active = CURRENT_TIMESTAMP WHERE ip = ?').run(ip);
        } else {
            db.prepare('INSERT INTO online_users (ip) VALUES (?)').run(ip);
        }

        // Clean up old online users (inactive for more than 5 minutes)
        db.prepare(`DELETE FROM online_users WHERE last_active < datetime('now', '-5 minutes')`).run();
    } catch (e) {
        // Silently ignore tracking errors
    }

    next();
});

// ===== HELPER: slugify =====
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// ===== API ROUTES =====

// --- Auth ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/change-password', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
    res.json({ success: true });
});

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email);
    if (!user) return res.status(404).json({ error: 'No account found with this email' });
    // Generate a temporary token (valid for 15 minutes)
    const token = bcrypt.hashSync(Date.now().toString(), 10).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    const expires = Date.now() + 15 * 60 * 1000;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('reset_token_' + user.id, JSON.stringify({ token, expires }));
    res.json({ success: true, message: 'Password reset link sent to your email', username: user.username });
});

app.post('/api/auth/reset-password', (req, res) => {
    const { token, userId, newPassword } = req.body;
    if (!token || !userId || !newPassword) return res.status(400).json({ error: 'All fields are required' });
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('reset_token_' + userId);
    if (!setting) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const data = JSON.parse(setting.value);
    if (data.token !== token || Date.now() > data.expires) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
    db.prepare('DELETE FROM settings WHERE key = ?').run('reset_token_' + userId);
    res.json({ success: true, message: 'Password reset successfully' });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// --- Users (Admin only) ---
app.get('/api/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC').all();
    // Add isMasterAdmin flag so frontend knows who is protected
    const masterAdminName = process.env.ADMIN_USERNAME || 'admin';
    const enriched = users.map(u => ({ ...u, isMasterAdmin: u.username === masterAdminName || (users.length > 0 && u.id === Math.min(...users.map(x => x.id))) }));
    res.json(enriched);
});

app.post('/api/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
    const { username, password, email, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
        const result = db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)').run(username, hashedPassword, email || '', role || 'editor');
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

app.put('/api/users/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
    const { username, password, email, role } = req.body;
    const userId = req.params.id;
    
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Only the master admin can change other admins
    // Master admin: env username or first user in DB
    const allUsers = db.prepare('SELECT id FROM users ORDER BY id ASC').all();
    const isFirstUser = allUsers.length > 0 && targetUser.id === allUsers[0].id;
    const isEnvMaster = targetUser.username === (process.env.ADMIN_USERNAME || 'admin');
    if ((isEnvMaster || isFirstUser) && role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change the master admin role' });
    }
    // Editors cannot edit admin users
    if (req.session.user.role !== 'admin' && targetUser.role === 'admin') {
        return res.status(403).json({ error: 'Editors cannot modify admin accounts' });
    }

    if (password && password.trim()) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET username = ?, password = ?, email = ?, role = ? WHERE id = ?').run(username, hashedPassword, email || '', role || 'editor', userId);
    } else {
        db.prepare('UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?').run(username, email || '', role || 'editor', userId);
    }
    res.json({ success: true });
});

app.delete('/api/users/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.params.id;
    
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Nobody can delete the master admin (env username or first user in DB)
    const allUsers = db.prepare('SELECT id FROM users ORDER BY id ASC').all();
    const isFirstUser = allUsers.length > 0 && targetUser.id === allUsers[0].id;
    const isEnvMaster = targetUser.username === (process.env.ADMIN_USERNAME || 'admin');
    if (isEnvMaster || isFirstUser) {
        return res.status(400).json({ error: 'Cannot delete the master admin account' });
    }
    // Editors cannot delete any admin user
    if (req.session.user.role !== 'admin' && targetUser.role === 'admin') {
        return res.status(403).json({ error: 'Editors cannot remove admin users' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ success: true });
});

// --- Categories ---
app.get('/api/categories', (req, res) => {
    const cats = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(cats);
});

app.post('/api/categories', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, color } = req.body;
    const slug = slugify(name);
    try {
        const result = db.prepare('INSERT INTO categories (name, slug, color) VALUES (?, ?, ?)').run(name, slug, color || '#c0392b');
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/categories/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, color } = req.body;
    const slug = slugify(name);
    db.prepare('UPDATE categories SET name = ?, slug = ?, color = ? WHERE id = ?').run(name, slug, color, req.params.id);
    res.json({ success: true });
});

app.delete('/api/categories/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// --- Articles ---
app.get('/api/articles', (req, res) => {
    const { category, featured, trending, limit, offset, search } = req.query;
    let query = 'SELECT a.*, c.name as category_name, c.slug as category_slug, c.color as category_color FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.status = ?';
    const params = ['published'];

    if (category) {
        query += ' AND c.slug = ?';
        params.push(category);
    }
    if (featured === '1') {
        query += ' AND a.is_featured = 1';
    }
    if (trending === '1') {
        query += ' AND a.is_trending = 1';
    }
    if (search) {
        query += ' AND (a.title LIKE ? OR a.excerpt LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY a.created_at DESC';

    if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
    }
    if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
    }

    const articles = db.prepare(query).all(...params);
    res.json(articles);
});

app.get('/api/articles/:slug', (req, res) => {
    const article = db.prepare(`
        SELECT a.*, c.name as category_name, c.slug as category_slug, c.color as category_color
        FROM articles a LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.slug = ? AND a.status = ?
    `).get(req.params.slug, 'published');
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Get related articles
    const related = db.prepare(`
        SELECT a.id, a.title, a.slug, a.image_url, a.created_at, c.name as category_name
        FROM articles a LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.category_id = ? AND a.id != ? AND a.status = 'published'
        ORDER BY a.created_at DESC LIMIT 4
    `).all(article.category_id, article.id);

    res.json({ ...article, related });
});

app.post('/api/articles', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, excerpt, content, image_url, category_id, is_featured, is_breaking, is_trending, author, status } = req.body;
    const slug = slugify(title) + '-' + Date.now();
    try {
        const result = db.prepare(`
            INSERT INTO articles (title, slug, excerpt, content, image_url, category_id, is_featured, is_breaking, is_trending, author, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(title, slug, excerpt, content, image_url, category_id, is_featured ? 1 : 0, is_breaking ? 1 : 0, is_trending ? 1 : 0, author || 'Staff', status || 'published');
        res.json({ success: true, id: result.lastInsertRowid, slug });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/articles/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, excerpt, content, image_url, category_id, is_featured, is_breaking, is_trending, author, status } = req.body;
    db.prepare(`
        UPDATE articles SET title = ?, excerpt = ?, content = ?, image_url = ?, category_id = ?, is_featured = ?, is_breaking = ?, is_trending = ?, author = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(title, excerpt, content, image_url, category_id, is_featured ? 1 : 0, is_breaking ? 1 : 0, is_trending ? 1 : 0, author || 'Staff', status || 'published', req.params.id);
    res.json({ success: true });
});

app.delete('/api/articles/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// --- Comments ---
app.get('/api/comments/:articleId', (req, res) => {
    const comments = db.prepare('SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC').all(req.params.articleId);
    res.json(comments);
});

app.post('/api/comments', (req, res) => {
    const { article_id, name, text } = req.body;
    if (!article_id || !name || !text) return res.status(400).json({ error: 'All fields are required' });
    const result = db.prepare('INSERT INTO comments (article_id, name, text) VALUES (?, ?, ?)').run(article_id, name, text);
    res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/comments/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// --- Reviews ---
app.get('/api/reviews', (req, res) => {
    const reviews = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all();
    res.json(reviews);
});

app.get('/api/reviews/:slug', (req, res) => {
    const review = db.prepare('SELECT * FROM reviews WHERE slug = ?').get(req.params.slug);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
});

app.post('/api/reviews', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, excerpt, content, image_url, rating } = req.body;
    const slug = slugify(title) + '-' + Date.now();
    try {
        const result = db.prepare('INSERT INTO reviews (title, slug, excerpt, content, image_url, rating) VALUES (?, ?, ?, ?, ?, ?)').run(title, slug, excerpt, content, image_url, rating || 0);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/reviews/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, excerpt, content, image_url, rating } = req.body;
    db.prepare('UPDATE reviews SET title = ?, excerpt = ?, content = ?, image_url = ?, rating = ? WHERE id = ?')
        .run(title, excerpt, content, image_url, rating || 0, req.params.id);
    res.json({ success: true });
});

app.delete('/api/reviews/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// --- Photos ---
app.get('/api/photos', (req, res) => {
    const photos = db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all();
    res.json(photos);
});

app.post('/api/photos', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, image_url, gallery_name, photo_count } = req.body;
    try {
        const result = db.prepare('INSERT INTO photos (title, image_url, gallery_name, photo_count) VALUES (?, ?, ?, ?)').run(title, image_url, gallery_name, photo_count || 1);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/photos/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, image_url, gallery_name, photo_count } = req.body;
    db.prepare('UPDATE photos SET title = ?, image_url = ?, gallery_name = ?, photo_count = ? WHERE id = ?')
        .run(title, image_url, gallery_name, photo_count || 1, req.params.id);
    res.json({ success: true });
});

app.delete('/api/photos/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// --- Subscribers ---
app.post('/api/subscribe', (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email address' });
    try {
        const existing = db.prepare('SELECT id, is_active FROM subscribers WHERE email = ?').get(email);
        if (existing) {
            if (existing.is_active === 0) {
                db.prepare('UPDATE subscribers SET is_active = 1, name = ? WHERE email = ?').run(name || '', email);
                return res.json({ success: true, message: 'Welcome back! You have been resubscribed.' });
            }
            return res.json({ success: true, message: 'You are already subscribed!' });
        }
        db.prepare('INSERT INTO subscribers (email, name) VALUES (?, ?)').run(email, name || '');
        res.json({ success: true, message: 'Successfully subscribed! You will receive daily news updates.' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/subscribers', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const subscribers = db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();
    res.json(subscribers);
});

app.delete('/api/subscribers/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.put('/api/subscribers/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { is_active } = req.body;
    db.prepare('UPDATE subscribers SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, req.params.id);
    res.json({ success: true });
});

// Helper: get SMTP transporter
function getSmtpTransporter() {
    const settings = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('smtp_%');
    const config = {};
    settings.forEach(s => config[s.key] = s.value);
    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) return null;
    return nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port) || 587,
        secure: (config.smtp_secure === '1'),
        auth: { user: config.smtp_user, pass: config.smtp_pass },
        tls: { rejectUnauthorized: false }
    });
}

function getSmtpFromAddress() {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_from');
    return setting ? setting.value : '';
}

// --- SMTP Settings ---
app.get('/api/smtp/settings', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const settings = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('smtp_%');
    const config = {};
    settings.forEach(s => config[s.key] = s.value);
    // Mask password for security
    if (config.smtp_pass) config.smtp_pass = '••••••••';
    res.json(config);
});

app.put('/api/smtp/settings', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    if (smtp_host) stmt.run('smtp_host', smtp_host);
    if (smtp_port) stmt.run('smtp_port', smtp_port);
    if (smtp_secure !== undefined) stmt.run('smtp_secure', smtp_secure ? '1' : '0');
    if (smtp_user) stmt.run('smtp_user', smtp_user);
    if (smtp_pass && smtp_pass !== '••••••••') stmt.run('smtp_pass', smtp_pass);
    if (smtp_from) stmt.run('smtp_from', smtp_from);
    res.json({ success: true, message: 'SMTP settings saved' });
});

app.post('/api/smtp/test', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const transporter = getSmtpTransporter();
    if (!transporter) return res.status(400).json({ error: 'SMTP not configured. Please fill in all SMTP settings first.' });
    try {
        await transporter.verify();
        res.json({ success: true, message: 'SMTP connection verified successfully!' });
    } catch (e) {
        res.status(400).json({ error: 'SMTP connection failed: ' + e.message });
    }
});

app.post('/api/subscribers/send-update', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required' });
    const activeSubscribers = db.prepare('SELECT email, name FROM subscribers WHERE is_active = 1').all();
    if (activeSubscribers.length === 0) return res.status(400).json({ error: 'No active subscribers' });

    const transporter = getSmtpTransporter();
    const fromAddress = getSmtpFromAddress() || process.env.SMTP_FROM || 'noreply@newspulse.com';

    if (!transporter) {
        // No SMTP configured — store update but can't send
        db.prepare('INSERT INTO email_updates (subject, body, sent_count) VALUES (?, ?, ?)').run(subject, body, 0);
        return res.json({
            success: false,
            error: 'SMTP not configured. Go to Settings > SMTP to configure email sending.',
            saved: true,
            subscribers: activeSubscribers.map(s => s.email)
        });
    }

    // Send emails
    let sentCount = 0;
    let failedEmails = [];
    for (const sub of activeSubscribers) {
        try {
            const personalizedBody = body.replace(/\{name\}/g, sub.name || 'Subscriber');
            await transporter.sendMail({
                from: `"NewsPulse" <${fromAddress}>`,
                to: sub.email,
                subject: subject,
                html: `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:#c0392b;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{padding:20px;background:#f9f9f9;border:1px solid #ddd;border-top:none}.footer{text-align:center;padding:15px;font-size:12px;color:#888;border-top:1px solid #eee}</style></head><body><div class="header"><h1 style="margin:0">NewsPulse</h1></div><div class="content"><h2>${subject}</h2>${personalizedBody}</div><div class="footer">You received this because you subscribed to NewsPulse updates.<br><a href="http://localhost:3001">Visit NewsPulse</a></div></body></html>`
            });
            sentCount++;
        } catch (e) {
            failedEmails.push(sub.email);
        }
    }

    // Store the update record
    db.prepare('INSERT INTO email_updates (subject, body, sent_count) VALUES (?, ?, ?)').run(subject, body, sentCount);

    res.json({
        success: sentCount > 0,
        message: `Sent ${sentCount}/${activeSubscribers.length} emails successfully`,
        failed: failedEmails
    });
});

app.get('/api/email-updates', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const updates = db.prepare('SELECT * FROM email_updates ORDER BY sent_at DESC').all();
    res.json(updates);
});

app.get('/api/subscribers/growth', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    // Signups per day (last 30 days)
    const growth = db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM subscribers
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at) ORDER BY date
    `).all();
    // Cumulative growth
    const cumulative = db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as total
        FROM subscribers
        GROUP BY DATE(created_at) ORDER BY date
    `).all();
    let running = 0;
    cumulative.forEach(c => { running += c.total; c.total = running; });
    res.json({ growth, cumulative });
});

// --- Breaking News ---
app.get('/api/breaking', (req, res) => {
    const items = db.prepare('SELECT * FROM breaking_news WHERE is_active = 1 ORDER BY created_at DESC').all();
    res.json(items);
});

app.post('/api/breaking', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { text, link } = req.body;
    const result = db.prepare('INSERT INTO breaking_news (text, link) VALUES (?, ?)').run(text, link || '#');
    res.json({ success: true, id: result.lastInsertRowid });
});

app.put('/api/breaking/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { text, link } = req.body;
    db.prepare('UPDATE breaking_news SET text = ?, link = ? WHERE id = ?').run(text, link || '#', req.params.id);
    res.json({ success: true });
});

app.delete('/api/breaking/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('DELETE FROM breaking_news WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// --- Ads ---
app.get('/api/ads', (req, res) => {
    const { position } = req.query;
    let query = 'SELECT * FROM ads WHERE is_active = 1';
    const params = [];
    if (position) {
        query += ' AND position = ?';
        params.push(position);
    }
    const ads = db.prepare(query).all(...params);
    res.json(ads);
});

app.get('/api/ads/all', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const ads = db.prepare('SELECT * FROM ads ORDER BY position').all();
    res.json(ads);
});

app.put('/api/ads/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { title, ad_code, position, size, is_active } = req.body;
    db.prepare('UPDATE ads SET title = ?, ad_code = ?, position = ?, size = ?, is_active = ? WHERE id = ?')
        .run(title, ad_code, position, size, is_active ? 1 : 0, req.params.id);
    res.json({ success: true });
});

// --- Settings ---
app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const obj = {};
    settings.forEach(s => obj[s.key] = s.value);
    res.json(obj);
});

app.put('/api/settings', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const update = db.transaction((settings) => {
        for (const [key, value] of Object.entries(settings)) {
            stmt.run(key, value);
        }
    });
    update(req.body);
    res.json({ success: true });
});

// --- Stats ---
app.get('/api/stats', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const articles = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
    const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    const reviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
    const totalViews = db.prepare('SELECT SUM(views) as total FROM articles').get().total || 0;
    const comments = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    res.json({ articles, categories, reviews, totalViews, comments, users });
});

app.get('/api/stats/charts', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    // Articles per category
    const byCategory = db.prepare(`
        SELECT c.name, COUNT(a.id) as count
        FROM categories c LEFT JOIN articles a ON c.id = a.category_id
        GROUP BY c.id ORDER BY count DESC
    `).all();
    // Articles created per day (last 7 days)
    const byDay = db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM articles
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY DATE(created_at) ORDER BY date
    `).all();
    // Articles by status
    const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count FROM articles GROUP BY status
    `).all();
    res.json({ byCategory, byDay, byStatus });
});

// --- Visitor Stats ---
app.get('/api/stats/visitors', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

    // Total visits
    const totalVisits = db.prepare('SELECT COUNT(*) as count FROM visits').get().count;

    // Unique visitors (by IP)
    const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT ip) as count FROM visits').get().count;

    // Online users (active in last 5 minutes)
    const onlineUsers = db.prepare(`SELECT COUNT(*) as count FROM online_users WHERE last_active >= datetime('now', '-5 minutes')`).get().count;

    // Visits per day (last 7 days)
    const visitsByDay = db.prepare(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM visits
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY DATE(created_at) ORDER BY date
    `).all();

    // Visits per hour (last 24 hours)
    const visitsByHour = db.prepare(`
        SELECT strftime('%H', created_at) as hour, COUNT(*) as count
        FROM visits
        WHERE created_at >= datetime('now', '-1 day')
        GROUP BY strftime('%H', created_at) ORDER BY hour
    `).all();

    // Most visited pages
    const topPages = db.prepare(`
        SELECT page, COUNT(*) as count
        FROM visits
        WHERE created_at >= datetime('now', '-7 days')
        GROUP BY page ORDER BY count DESC LIMIT 5
    `).all();

    // Visits by device type (simplified - mobile vs desktop from user agent)
    const byDevice = db.prepare(`
        SELECT 
            CASE 
                WHEN user_agent LIKE '%Mobile%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%iPhone%' THEN 'Mobile'
                ELSE 'Desktop'
            END as device,
            COUNT(*) as count
        FROM visits
        GROUP BY device
    `).all();

    res.json({
        totalVisits,
        uniqueVisitors,
        onlineUsers,
        visitsByDay,
        visitsByHour,
        topPages,
        byDevice
    });
});

// --- Online Users ---
app.get('/api/stats/online', (req, res) => {
    // Public endpoint - no auth required
    const onlineUsers = db.prepare(`SELECT COUNT(*) as count FROM online_users WHERE last_active >= datetime('now', '-5 minutes')`).get().count;
    res.json({ online: onlineUsers });
});

// --- Upload ---
app.post('/api/upload', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    app.upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        res.json({ url: '/uploads/' + req.file.filename });
    });
});

// ===== FRONTEND ROUTES =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/article/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'article.html'));
});

app.get('/review/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'review.html'));
});

app.get('/admin/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ===== START =====
const http = require('http');
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
    console.log(`\n🚀 NewsPulse server running at http://localhost:${PORT}`);
    console.log(`📰 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin/`);
    console.log(`📡 API: http://localhost:${PORT}/api/articles\n`);
});
