// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// ===== CURRENT DATE =====
const dateEl = document.getElementById('currentDate');
if (dateEl) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-US', options);
}

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const mainNav = document.getElementById('mainNav');
if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => {
        const navList = mainNav.querySelector('.nav-list');
        navList.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !mainNav.contains(e.target)) {
            mainNav.querySelector('.nav-list').classList.remove('open');
        }
    });
}

// ===== DUPLICATE TICKER FOR SEAMLESS LOOP =====
const ticker = document.getElementById('ticker');
if (ticker) {
    const items = ticker.innerHTML;
    ticker.innerHTML = items + items;
}

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== PAGE TRANSITIONS =====
const transitionEl = document.getElementById('pageTransition');
if (transitionEl) {
    // Intercept all internal navigation links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');

        // Only intercept same-origin, same-page navigations (not external, not admin, not # anchors)
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('/admin') || href.startsWith('/article/') || link.target === '_blank') return;

        // Only intercept category/search links (same base path)
        const url = new URL(href, window.location.origin);
        if (url.pathname !== '/' && url.pathname !== window.location.pathname) return;

        // Don't intercept if already on same URL
        if (url.search === window.location.search) return;

        e.preventDefault();

        // Activate transition overlay
        transitionEl.classList.add('active', 'fade-in');
        transitionEl.classList.remove('fade-out');

        // Navigate after overlay is visible
        setTimeout(() => {
            window.location.href = href;
        }, 300);
    });

    // On page load, fade out the overlay
    if (transitionEl.classList.contains('active')) {
        transitionEl.classList.add('fade-out');
        setTimeout(() => {
            transitionEl.classList.remove('active', 'fade-in', 'fade-out');
        }, 400);
    }
}

// ===== LAZY LOAD IMAGES =====
if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
} else {
    const images = document.querySelectorAll('img[loading="lazy"]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.src;
                observer.unobserve(img);
            }
        });
    });
    images.forEach((img) => observer.observe(img));
}
