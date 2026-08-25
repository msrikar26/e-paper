// ===== API HELPER =====
async function apiFetch(url) {
    const res = await fetch(url);
    return res.json();
}

// ===== TIME HELPER =====
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

// ===== URL PARAMS =====
const urlParams = new URLSearchParams(window.location.search);
const currentCategory = urlParams.get('category');
const searchQuery = urlParams.get('search');

// ===== LOAD CATEGORIES (NAV + FOOTER) =====
async function loadCategories() {
    const cats = await apiFetch('/api/categories');
    const navList = document.getElementById('navList');
    const footerCats = document.getElementById('footerCategories');

    navList.innerHTML = '<li><a href="/" class="' + (!currentCategory ? 'active' : '') + '">Home</a></li>' +
        cats.map(c => `<li><a href="/?category=${c.slug}" class="${currentCategory === c.slug ? 'active' : ''}">${c.name}</a></li>`).join('');

    footerCats.innerHTML = cats.map(c => `<li><a href="/?category=${c.slug}">${c.name}</a></li>`).join('');
}

// ===== LOAD BREAKING NEWS =====
async function loadBreakingNews() {
    const items = await apiFetch('/api/breaking');
    const ticker = document.getElementById('ticker');
    if (items.length === 0) {
        ticker.innerHTML = '<li><a href="#">Welcome to NewsPulse — Your trusted news source</a></li>';
        return;
    }
    ticker.innerHTML = items.map(b => `<li><a href="${b.link || '#'}">${b.text}</a></li>`).join('');
}

// ===== HERO CAROUSEL =====
let heroCurrentSlide = 0;
let heroInterval = null;

function initHeroCarousel(articles) {
    const carousel = document.getElementById('heroCarousel');
    const dotsContainer = document.getElementById('heroDots');
    if (!carousel || !articles || articles.length === 0) return;

    // Use top 5 featured articles
    const slides = articles.slice(0, 5);
    heroCurrentSlide = 0;

    // Build slides
    carousel.innerHTML = slides.map((a, i) => `
        <a href="/article/${a.slug}" class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
            <img src="${a.image_url || 'https://picsum.photos/seed/hero' + a.id + '/1200/600'}" alt="${a.title}" loading="lazy">
            <div class="hero-overlay">
                <span class="hero-badge">${a.category_name || 'News'}</span>
                <h2>${a.title}</h2>
                <p>${a.excerpt || ''}</p>
                <div class="hero-meta">
                    <span>By ${a.author || 'Staff'}</span>
                    <time>${timeAgo(a.created_at)}</time>
                </div>
            </div>
        </a>
    `).join('') + `
        <div class="hero-arrows">
            <button class="hero-arrow" id="heroPrev" aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button class="hero-arrow" id="heroNext" aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><path d="M9 18l6-6-6-6"/></svg>
            </button>
        </div>
        <div class="hero-dots" id="heroDots"></div>`;

    // Build dots
    const dotsEl = document.getElementById('heroDots');
    dotsEl.innerHTML = slides.map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`).join('');

    // Arrow handlers
    document.getElementById('heroPrev').addEventListener('click', () => heroGoTo((heroCurrentSlide - 1 + slides.length) % slides.length));
    document.getElementById('heroNext').addEventListener('click', () => heroGoTo((heroCurrentSlide + 1) % slides.length));

    // Dot handlers
    dotsEl.addEventListener('click', (e) => {
        const dot = e.target.closest('.hero-dot');
        if (dot) heroGoTo(parseInt(dot.dataset.index));
    });

    // Auto-rotate every 5 seconds
    heroInterval = setInterval(() => heroGoTo((heroCurrentSlide + 1) % slides.length), 5000);

    // Pause on hover
    carousel.addEventListener('mouseenter', () => clearInterval(heroInterval));
    carousel.addEventListener('mouseleave', () => {
        heroInterval = setInterval(() => heroGoTo((heroCurrentSlide + 1) % slides.length), 5000);
    });
}

function heroGoTo(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;
    slides[heroCurrentSlide].classList.remove('active');
    dots[heroCurrentSlide].classList.remove('active');
    heroCurrentSlide = index;
    slides[heroCurrentSlide].classList.add('active');
    dots[heroCurrentSlide].classList.add('active');
}

// ===== LOAD FEATURED STORIES (Home only) =====
async function loadFeatured() {
    if (currentCategory || searchQuery) return;
    const articles = await apiFetch('/api/articles?limit=6');
    const grid = document.getElementById('featuredGrid');

    if (articles.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888">No articles yet. Add some in the admin panel.</div>';
        return;
    }

    // Initialize hero carousel with the first articles
    initHeroCarousel(articles);

    const hero = articles[0];
    const sidebar = articles.slice(1, 4);

    grid.innerHTML = `
        <article class="featured-card large">
            <a href="/article/${hero.slug}">
                <div class="card-image">
                    <img src="${hero.image_url || 'https://picsum.photos/seed/hero/800/500'}" alt="${hero.title}" loading="lazy">
                    <span class="category-badge">${hero.category_name || 'News'}</span>
                </div>
                <div class="card-body">
                    <h3>${hero.title}</h3>
                    <p>${hero.excerpt || ''}</p>
                    <div class="card-meta">
                        <span class="author">By ${hero.author || 'Staff'}</span>
                        <time>${timeAgo(hero.created_at)}</time>
                    </div>
                </div>
            </a>
        </article>
        <div class="featured-sidebar">
            ${sidebar.map(a => `
                <article class="featured-card small">
                    <a href="/article/${a.slug}">
                        <div class="card-image">
                            <img src="${a.image_url || 'https://picsum.photos/seed/' + a.id + '/400/250'}" alt="${a.title}" loading="lazy">
                        </div>
                        <div class="card-body">
                            <h4>${a.title}</h4>
                            <time>${timeAgo(a.created_at)}</time>
                        </div>
                    </a>
                </article>
            `).join('')}
        </div>`;
}

// ===== LOAD POLITICAL NEWS (Home only) =====
async function loadPolitical() {
    if (currentCategory || searchQuery) return;
    const articles = await apiFetch('/api/articles?category=politics&limit=4');
    const grid = document.getElementById('politicalGrid');

    if (articles.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#888">No political news yet.</div>';
        return;
    }

    grid.innerHTML = articles.map(a => `
        <article class="news-card">
            <a href="/article/${a.slug}">
                <div class="card-image">
                    <img src="${a.image_url || 'https://picsum.photos/seed/pol' + a.id + '/400/250'}" alt="${a.title}" loading="lazy">
                </div>
                <div class="card-body">
                    <span class="category-tag" style="background:${a.category_color || '#c0392b'}">${a.category_name || 'Politics'}</span>
                    <h3>${a.title}</h3>
                    <time>${timeAgo(a.created_at)}</time>
                </div>
            </a>
        </article>
    `).join('');
}

// ===== LOAD MOVIE NEWS (Home only) =====
async function loadMovieNews() {
    if (currentCategory || searchQuery) return;
    const articles = await apiFetch('/api/articles?category=entertainment&limit=6');
    const grid = document.getElementById('movieGrid');

    if (articles.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#888">No entertainment news yet.</div>';
        return;
    }

    grid.innerHTML = articles.map(a => `
        <article class="news-card">
            <a href="/article/${a.slug}">
                <div class="card-image">
                    <img src="${a.image_url || 'https://picsum.photos/seed/mov' + a.id + '/400/250'}" alt="${a.title}" loading="lazy">
                </div>
                <div class="card-body">
                    <span class="category-tag entertainment">${a.category_name || 'Entertainment'}</span>
                    <h3>${a.title}</h3>
                    <time>${timeAgo(a.created_at)}</time>
                </div>
            </a>
        </article>
    `).join('');
}

// ===== LOAD REVIEWS (Home only) =====
async function loadReviews() {
    if (currentCategory || searchQuery) return;
    const reviews = await apiFetch('/api/reviews');
    const grid = document.getElementById('reviewsGrid');

    if (reviews.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#888">No reviews yet.</div>';
        return;
    }

    grid.innerHTML = reviews.map(r => `
        <article class="review-card">
            <a href="/review/${r.slug}" target="_blank">
                <div class="card-image">
                    <img src="${r.image_url || 'https://picsum.photos/seed/rev' + r.id + '/300/400'}" alt="${r.title}" loading="lazy">
                    <div class="rating-badge">${r.rating}/5</div>
                </div>
                <div class="card-body">
                    <span class="category-tag entertainment">Review</span>
                    <h3>${r.title}</h3>
                    <p>${r.excerpt || ''}</p>
                </div>
            </a>
        </article>
    `).join('');
}

// ===== LOAD TRENDING (Home only) =====
async function loadTrending() {
    if (currentCategory || searchQuery) return;
    const articles = await apiFetch('/api/articles?trending=1&limit=5');
    const list = document.getElementById('trendingList');

    if (articles.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">No trending articles yet.</div>';
        return;
    }

    list.innerHTML = articles.map((a, i) => `
        <article class="trending-item">
            <span class="trend-number">${i + 1}</span>
            <a href="/article/${a.slug}">
                <div class="card-image small-thumb">
                    <img src="${a.image_url || 'https://picsum.photos/seed/trend' + a.id + '/120/80'}" alt="" loading="lazy">
                </div>
                <div class="card-body">
                    <h4>${a.title}</h4>
                    <time>${timeAgo(a.created_at)}</time>
                </div>
            </a>
        </article>
    `).join('');
}

// ===== LOAD PHOTOS (Home only) =====
async function loadPhotos() {
    if (currentCategory || searchQuery) return;
    const photos = await apiFetch('/api/photos');
    const grid = document.getElementById('photosGrid');

    if (photos.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#888">No photo galleries yet.</div>';
        return;
    }

    grid.innerHTML = photos.map(p => `
        <article class="photo-card">
            <a href="#">
                <div class="card-image">
                    <img src="${p.image_url}" alt="${p.title}" loading="lazy">
                    <div class="photo-overlay">
                        <span class="photo-count">📷 ${p.photo_count} Photos</span>
                    </div>
                </div>
                <div class="card-body">
                    <h4>${p.title}</h4>
                </div>
            </a>
        </article>
    `).join('');
}

// ===== LOAD CATEGORY ARTICLES (Category/Search pages) =====
async function loadCategoryArticles() {
    if (!currentCategory && !searchQuery) return;

    const grid = document.getElementById('featuredGrid');
    const sectionHeader = grid.closest('.section').querySelector('.section-header h2');

    let apiUrl = '/api/articles?limit=20';
    let pageTitle = 'All Articles';

    if (currentCategory) {
        apiUrl += '&category=' + currentCategory;
        // Capitalize category name for the title
        pageTitle = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
    } else if (searchQuery) {
        apiUrl += '&search=' + encodeURIComponent(searchQuery);
        pageTitle = 'Search: "' + searchQuery + '"';
    }

    if (sectionHeader) sectionHeader.textContent = pageTitle;
    document.title = pageTitle + ' - NewsPulse';

    const articles = await apiFetch(apiUrl);

    if (articles.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888">
            <p style="font-size:18px;margin-bottom:8px">No articles found</p>
            <p>There are no articles in this category yet.</p>
        </div>`;
        return;
    }

    grid.innerHTML = articles.map(a => `
        <article class="news-card">
            <a href="/article/${a.slug}">
                <div class="card-image">
                    <img src="${a.image_url || 'https://picsum.photos/seed/art' + a.id + '/400/250'}" alt="${a.title}" loading="lazy">
                </div>
                <div class="card-body">
                    <span class="category-tag" style="background:${a.category_color || '#c0392b'}">${a.category_name || 'News'}</span>
                    <h3>${a.title}</h3>
                    <p style="font-size:13px;color:#6c757d;margin-bottom:8px">${a.excerpt || ''}</p>
                    <div class="card-meta">
                        <span>By ${a.author || 'Staff'}</span>
                        <time>${timeAgo(a.created_at)}</time>

                    </div>
                </div>
            </a>
        </article>
    `).join('');

    // On category/search pages, hide the other home-only sections and carousel
    const heroCarousel = document.getElementById('heroCarousel');
    if (heroCarousel) heroCarousel.style.display = 'none';

    const sectionsToHide = ['politicalGrid', 'movieGrid', 'reviewsGrid', 'trendingList', 'photosGrid'];
    sectionsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const section = el.closest('.section');
            if (section) section.style.display = 'none';
        }
    });

    // Also hide the ad-between sections between hidden sections
    document.querySelectorAll('.ad-between').forEach(el => el.style.display = 'none');
}

// ===== LOAD MOST VIEWED (SIDEBAR) =====
async function loadMostViewed() {
    const articles = await apiFetch('/api/articles?limit=5');
    articles.sort((a, b) => b.views - a.views);
    const list = document.getElementById('mostViewedList');

    if (articles.length === 0) {
        list.innerHTML = '<li style="text-align:center;padding:20px;color:#888">No articles yet.</li>';
        return;
    }

    list.innerHTML = articles.map(a => `
        <li>
            <a href="/article/${a.slug}">
                <img src="${a.image_url || 'https://picsum.photos/seed/mv' + a.id + '/80/60'}" alt="" loading="lazy">
                <div>
                    <h4>${a.title}</h4>
                    <time>${timeAgo(a.created_at)}</time>
                </div>
            </a>
        </li>
    `).join('');
}

// ===== LOAD LATEST UPDATES (SIDEBAR) =====
async function loadLatestUpdates() {
    const articles = await apiFetch('/api/articles?limit=5');
    const list = document.getElementById('latestUpdates');

    if (articles.length === 0) {
        list.innerHTML = '<li style="text-align:center;padding:20px;color:#888">No updates yet.</li>';
        return;
    }

    list.innerHTML = articles.map(a => {
        const mins = Math.floor((new Date() - new Date(a.created_at)) / 60000);
        let timeLabel = mins < 60 ? mins + 'm' : mins < 1440 ? Math.floor(mins / 60) + 'h' : Math.floor(mins / 1440) + 'd';
        return `
            <li>
                <a href="/article/${a.slug}">
                    <span class="update-time">${timeLabel}</span>
                    <div><h4>${a.title}</h4></div>
                </a>
            </li>`;
    }).join('');
}

// ===== LOAD ADS =====
async function loadAds() {
    const positions = ['top-banner', 'in-article', 'sidebar-top', 'sidebar-mid', 'sidebar-bottom', 'footer'];
    const containerMap = {
        'top-banner': 'adTop',
        'in-article': 'adInArticle',
        'sidebar-top': 'adSidebarTop',
        'sidebar-mid': 'adSidebarMid',
        'sidebar-bottom': 'adSidebarBottom',
        'footer': 'adFooter'
    };

    for (const pos of positions) {
        const ads = await apiFetch('/api/ads?position=' + pos);
        const container = document.getElementById(containerMap[pos]);
        if (container && ads.length > 0) {
            container.innerHTML = `<div class="ad-container">${ads[0].ad_code}</div>`;
        }
    }
}

// ===== SEARCH =====
function doSearch() {
    const q = document.getElementById('searchInput').value.trim();
    if (q) window.location.href = '/?search=' + encodeURIComponent(q);
}

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
});

// ===== NEWSLETTER =====
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = newsletterForm.querySelector('input').value.trim();
        if (!email) return;
        const btn = newsletterForm.querySelector('button');
        btn.textContent = 'Subscribing...';
        btn.disabled = true;
        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.success) {
                btn.textContent = 'Subscribed ✓';
                btn.style.background = '#27ae60';
                newsletterForm.querySelector('input').value = '';
            } else {
                btn.textContent = data.error || 'Error';
                btn.style.background = '#e74c3c';
            }
        } catch(err) {
            btn.textContent = 'Error - Try again';
            btn.style.background = '#e74c3c';
        }
        setTimeout(() => {
            btn.textContent = 'Subscribe';
            btn.style.background = '';
            btn.disabled = false;
        }, 3000);
    });
}

// ===== INIT =====
async function init() {
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Always load these
    await Promise.all([
        loadCategories(),
        loadBreakingNews(),
        loadMostViewed(),
        loadLatestUpdates(),
        loadAds()
    ]);

    if (currentCategory || searchQuery) {
        // Category or search page
        await loadCategoryArticles();
    } else {
        // Home page
        await Promise.all([
            loadFeatured(),
            loadPolitical(),
            loadMovieNews(),
            loadReviews(),
            loadTrending(),
            loadPhotos()
        ]);
    }
}

init();
