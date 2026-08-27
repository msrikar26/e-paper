const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'newspulse.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== CREATE TABLES =====
db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#c0392b',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        excerpt TEXT,
        content TEXT,
        image_url TEXT,
        category_id INTEGER,
        is_featured INTEGER DEFAULT 0,
        is_breaking INTEGER DEFAULT 0,
        is_trending INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        status TEXT DEFAULT 'published',
        author TEXT DEFAULT 'Staff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        gallery_name TEXT,
        photo_count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        excerpt TEXT,
        content TEXT,
        image_url TEXT,
        rating REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        ad_code TEXT NOT NULL,
        position TEXT NOT NULL,
        size TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS breaking_news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        link TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_count INTEGER DEFAULT 0,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
        page TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS online_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ===== SEED DATA =====
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (categoryCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, slug, color) VALUES (?, ?, ?)');
    const categories = [
        ['Politics', 'politics', '#c0392b'],
        ['Entertainment', 'entertainment', '#8e44ad'],
        ['Technology', 'technology', '#2980b9'],
        ['Sports', 'sports', '#27ae60'],
        ['Business', 'business', '#f39c12'],
        ['Lifestyle', 'lifestyle', '#e67e22'],
    ];
    const insertCategories = db.transaction(() => {
        for (const cat of categories) insertCategory.run(...cat);
    });
    insertCategories();

    // Seed articles
    const insertArticle = db.prepare(`
        INSERT INTO articles (title, slug, excerpt, content, image_url, category_id, is_featured, is_trending, views, author)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const articles = [
        [
            'Government Unveils Ambitious Infrastructure Plan Worth $500 Billion',
            'govt-infrastructure-plan-500b',
            'The comprehensive development project aims to transform transportation networks across the nation over the next decade.',
            '<p>The government announced today a massive infrastructure investment plan worth $500 billion, aimed at transforming the nation\'s transportation networks, digital infrastructure, and public utilities over the next decade.</p><p>Key highlights include:</p><ul><li>$150B for highway and bridge construction</li><li>$100B for high-speed rail networks</li><li>$80B for broadband expansion</li><li>$70B for clean energy grid upgrades</li><li>$100B for urban development and smart cities</li></ul><p>Economists project this will create over 10 million jobs and boost GDP by 2.5% annually.</p>',
            'https://picsum.photos/seed/news1/800/500', 1, 1, 1, 45230, 'Sarah Mitchell'
        ],
        [
            'Tech Companies Report Record Q3 Earnings Amid AI Boom',
            'tech-companies-record-q3-earnings-ai',
            'The biggest tech firms have posted their highest quarterly earnings ever, driven by massive AI investment returns.',
            '<p>Major technology companies have reported record-breaking third-quarter earnings, with artificial intelligence driving unprecedented revenue growth across the sector.</p><p>The combined profits of the top 10 tech companies exceeded $200 billion, a 45% increase from the same period last year.</p>',
            'https://picsum.photos/seed/news2/800/500', 3, 0, 1, 32100, 'Tech Desk'
        ],
        [
            'Historic Peace Agreement Signed Between Nations After Decade of Conflict',
            'historic-peace-agreement-signed',
            'A landmark peace accord has been signed, ending ten years of conflict and opening a new chapter of cooperation.',
            '<p>In a ceremony attended by world leaders, a historic peace agreement was signed today, formally ending a decade-long conflict that has displaced millions and reshaped regional geopolitics.</p><p>The agreement includes provisions for economic cooperation, refugee resettlement, and cultural exchange programs.</p>',
            'https://picsum.photos/seed/news3/800/500', 1, 0, 0, 28900, 'World Desk'
        ],
        [
            'Parliament Debates New Economic Reform Bill in Historic Session',
            'parliament-economic-reform-bill',
            'A sweeping economic reform bill faces intense debate as lawmakers weigh its potential impact on businesses and workers.',
            '<p>Parliament convened for a historic session today to debate the most significant economic reform bill in a generation. The proposed legislation aims to modernize tax codes, streamline business regulations, and strengthen worker protections.</p>',
            'https://picsum.photos/seed/pol1/800/500', 1, 0, 0, 18750, 'Political Bureau'
        ],
        [
            'Opposition Leader Calls for Joint Committee on Electoral Reforms',
            'opposition-electoral-reforms-committee',
            'The opposition leader has proposed a bipartisan committee to overhaul the electoral system.',
            '<p>In a bold political move, the opposition leader called for the formation of a joint parliamentary committee dedicated to comprehensive electoral reforms.</p>',
            'https://picsum.photos/seed/pol2/800/500', 1, 0, 1, 15200, 'Political Bureau'
        ],
        [
            'Blockbuster Sequel Breaks Opening Weekend Records Worldwide',
            'blockbuster-sequel-record-opening',
            'The highly anticipated sequel has shattered box office records in its opening weekend across all markets.',
            '<p>The much-anticipated sequel to last year\'s hit film has demolished opening weekend records, earning a staggering $520 million worldwide in its first three days.</p><p>Industry analysts predict the film could surpass $2 billion globally by the end of its theatrical run.</p>',
            'https://picsum.photos/seed/mov1/800/500', 2, 0, 1, 52300, 'Entertainment Desk'
        ],
        [
            'Award-Winning Director Announces Star-Studded New Project',
            'director-announces-new-project',
            'The acclaimed filmmaker reveals plans for a new epic featuring an ensemble cast of Hollywood\'s biggest names.',
            '<p>Following the massive success of their last three films, the award-winning director has announced a new project that brings together an extraordinary ensemble cast.</p>',
            'https://picsum.photos/seed/mov2/800/500', 2, 0, 0, 21400, 'Entertainment Desk'
        ],
        [
            'Revolutionary Battery Technology Could Double EV Range',
            'revolutionary-battery-double-ev-range',
            'Scientists have developed a new battery chemistry that promises to double the range of electric vehicles.',
            '<p>A team of researchers has unveiled a breakthrough battery technology that could fundamentally change the electric vehicle industry.</p>',
            'https://picsum.photos/seed/mv1/800/500', 3, 0, 1, 67800, 'Tech Desk'
        ],
        [
            'Scientists Discover New Species Deep in the Amazon Rainforest',
            'scientists-discover-new-species-amazon',
            'A new expedition has uncovered previously unknown species in unexplored regions of the Amazon.',
            '<p>Scientists conducting research in a remote section of the Amazon rainforest have discovered at least 12 previously unknown species of plants and animals.</p>',
            'https://picsum.photos/seed/trend1/800/500', 4, 0, 1, 125000, 'Science Desk'
        ],
        [
            'Electric Vehicle Sales Surpass Gas Cars for the First Time',
            'ev-sales-surpass-gas-cars-first-time',
            'In a historic milestone, electric vehicle sales have overtaken traditional combustion engine cars.',
            '<p>For the first time in automotive history, monthly sales of electric vehicles have surpassed those of traditional gasoline-powered cars in major markets.</p>',
            'https://picsum.photos/seed/trend4/800/500', 5, 0, 1, 76000, 'Business Desk'
        ],
    ];
    const insertArticles = db.transaction(() => {
        for (const art of articles) insertArticle.run(...art);
    });
    insertArticles();

    // Seed photos
    const insertPhoto = db.prepare('INSERT INTO photos (title, image_url, gallery_name, photo_count) VALUES (?, ?, ?, ?)');
    const photos = [
        ['Stunning Landscapes from Around the World', 'https://picsum.photos/seed/photo1/400/300', 'Landscapes', 12],
        ['Red Carpet Moments from the Film Awards', 'https://picsum.photos/seed/photo2/400/300', 'Film Awards', 8],
        ['Behind the Scenes of the Biggest Blockbuster', 'https://picsum.photos/seed/photo3/400/300', 'BTS', 15],
        ["Nature's Wonders: Wildlife Photography Showcase", 'https://picsum.photos/seed/photo4/400/300', 'Wildlife', 10],
    ];
    const insertPhotos = db.transaction(() => {
        for (const p of photos) insertPhoto.run(...p);
    });
    insertPhotos();

    // Seed reviews
    const insertReview = db.prepare('INSERT INTO reviews (title, slug, excerpt, content, image_url, rating) VALUES (?, ?, ?, ?, ?, ?)');
    const reviews = [
        ['"Echoes of Tomorrow" — A Masterclass in Storytelling', 'echoes-of-tomorrow-review', 'A breathtaking sci-fi drama that pushes the boundaries of cinematic imagination.', '<p>This is a deeply moving and visually stunning film that will leave audiences thinking for days.</p>', 'https://picsum.photos/seed/rev1/300/400', 4.5],
        ['"The Last Horizon" — Visually Stunning but Narratively Thin', 'last-horizon-review', "Great visuals and action sequences can't fully compensate for a predictable plot.", '<p>While the film delivers on spectacle, its story falls short of its visual ambitions.</p>', 'https://picsum.photos/seed/rev2/300/400', 3.5],
        ['"Silk Roads" — A Timeless Epic of Love and War', 'silk-roads-review', 'This sweeping historical saga delivers emotion and grandeur in equal measure.', '<p>A masterfully crafted epic that transports viewers to another time and place.</p>', 'https://picsum.photos/seed/rev3/300/400', 5],
        ['"Neon Nights" — An Electrifying Thriller That Never Lets Up', 'neon-nights-review', 'Pulse-pacing action and a charismatic lead make this a must-watch.', '<p>A relentless thriller that keeps you on the edge of your seat from start to finish.</p>', 'https://picsum.photos/seed/rev4/300/400', 4],
    ];
    const insertReviews = db.transaction(() => {
        for (const r of reviews) insertReview.run(...r);
    });
    insertReviews();

    // Seed breaking news
    const insertBreaking = db.prepare('INSERT INTO breaking_news (text, link) VALUES (?, ?)');
    const breakingNews = [
        ['Major policy reform announced by the government — new education bill passed', '#'],
        ['Stock markets hit all-time high amid global optimism', '#'],
        ['Space agency confirms new satellite launch scheduled for next month', '#'],
        ['International summit on climate change begins today', '#'],
        ['Tech giant releases revolutionary AI-powered device', '#'],
    ];
    const insertBreakingNews = db.transaction(() => {
        for (const b of breakingNews) insertBreaking.run(...b);
    });
    insertBreakingNews();

    // Seed ads
    const insertAd = db.prepare('INSERT INTO ads (title, ad_code, position, size, is_active) VALUES (?, ?, ?, ?, ?)');
    const ads = [
        ['Top Banner', '<ins class="adsbygoogle" style="display:inline-block;width:728px;height:90px" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="XXXXXXXXXX"></ins>', 'top-banner', '728x90', 1],
        ['In Article', '<ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="XXXXXXXXXX"></ins>', 'in-article', '300x250', 1],
        ['Sidebar Top', '<ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="XXXXXXXXXX"></ins>', 'sidebar-top', '300x250', 1],
        ['Sidebar Mid', '<ins class="adsbygoogle" style="display:inline-block;width:300px;height:600px" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="XXXXXXXXXX"></ins>', 'sidebar-mid', '300x600', 1],
        ['Footer Banner', '<ins class="adsbygoogle" style="display:inline-block;width:728px;height:90px" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="XXXXXXXXXX"></ins>', 'footer', '728x90', 1],
    ];
    const insertAds = db.transaction(() => {
        for (const a of ads) insertAd.run(...a);
    });
    insertAds();

    // Seed settings
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const settings = [
        ['site_name', 'NewsPulse'],
        ['site_tagline', 'Breaking News, Politics, Entertainment & More'],
        ['posts_per_page', '12'],
    ];
    const insertSettings = db.transaction(() => {
        for (const s of settings) insertSetting.run(...s);
    });
    insertSettings();

    // Create default admin user
    const adminUser = process.env.ADMIN_USERNAME || 'srikar';
    const adminPass = process.env.ADMIN_PASSWORD || 'srikar2727';
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const hashedPassword = bcrypt.hashSync(adminPass, 10);
    db.prepare('INSERT OR IGNORE INTO users (username, password, email, role) VALUES (?, ?, ?, ?)').run(adminUser, hashedPassword, adminEmail, 'admin');

    console.log('✅ Database seeded successfully');
}

// ===== MIGRATIONS =====
// Add email column to users if missing
try {
    db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
} catch (e) {
    // Column already exists, ignore
}

module.exports = db;
