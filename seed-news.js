const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'newspulse.db'));
db.pragma('journal_mode = WAL');

// Get existing categories
const categories = {};
db.prepare('SELECT * FROM categories').all().forEach(c => {
    categories[c.slug] = c.id;
});

console.log('Existing categories:', categories);

// Helper: slugify
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// ===== REALISTIC NEWS ARTICLES =====
const newsArticles = [
    // --- TECHNOLOGY ---
    {
        title: "OpenAI Unveils GPT-6 with Unprecedented Reasoning Capabilities",
        excerpt: "The latest AI model demonstrates near-human performance on complex scientific and mathematical reasoning tasks, setting a new benchmark in artificial intelligence.",
        content: "<p>OpenAI has officially released GPT-6, its most advanced AI model to date, featuring dramatic improvements in logical reasoning, code generation, and multi-step problem solving.</p><p>In benchmark tests, GPT-6 achieved near-human performance on graduate-level science exams, complex mathematical proofs, and nuanced legal analysis tasks that previously stumped earlier models.</p><p>This represents a fundamental leap in what AI can accomplish. GPT-6 is not just incrementally better \u2014 it opens up entirely new use cases.</p><p>Key improvements include:</p><ul><li>40% better performance on PhD-level STEM problems</li><li>Native support for 50+ languages with near-native fluency</li><li>Advanced code reasoning across 20+ programming languages</li><li>Real-time collaboration features for teams</li></ul><p>The model is available immediately through the API and will roll out to ChatGPT Plus subscribers over the next two weeks.</p>",
        image_url: "https://picsum.photos/seed/gpt6ai/800/500",
        category_slug: "technology",
        is_featured: 1,
        is_trending: 1,
        author: "Tech Desk",
    },
    {
        title: "Apple Announces Vision Pro 2 with Sleeker Design and Half the Price",
        excerpt: "The second-generation spatial computing headset is lighter, more comfortable, and priced at $1,799 to reach mainstream consumers.",
        content: "<p>Apple has unveiled the Vision Pro 2 at its annual Worldwide Developers Conference, featuring a dramatically slimmed-down design weighing just 350 grams \u2014 nearly half the weight of the original.</p><p>The most significant change is the price: at $1,799, the Vision Pro 2 is $1,700 cheaper than its predecessor, making spatial computing accessible to a much broader audience.</p><p>New features include all-day battery life via an integrated micro-battery, prescription lens support built into the device, and a breakthrough Ambient Mode that lets the headset blend digital content seamlessly with the real world.</p><p>Apple also announced partnerships with Netflix, Disney+, and ESPN to create immersive spatial content exclusively for the platform.</p>",
        image_url: "https://picsum.photos/seed/visionpro2/800/500",
        category_slug: "technology",
        is_featured: 0,
        is_trending: 1,
        author: "Apple Insider",
    },
    {
        title: "Quantum Computing Breakthrough: IBM Achieves 10,000 Qubit Processor",
        excerpt: "IBM\u2019s latest quantum processor shatters records and brings practical quantum advantage closer to reality for drug discovery and materials science.",
        content: "<p>IBM has announced the successful development of its Condor-2 quantum processor, which achieves an unprecedented 10,000 qubits with error rates low enough for practical computation.</p><p>The achievement, which took three years of development, represents a tenfold increase over the previous record and brings the industry closer to solving real-world problems in pharmaceutical research, climate modeling, and financial optimization.</p><p>We have crossed the threshold where quantum computers can solve problems that classical computers simply cannot.</p><p>The processor will be available through IBM Cloud by the end of the year, with early access programs already open for pharmaceutical companies and research institutions.</p>",
        image_url: "https://picsum.photos/seed/quantum2026/800/500",
        category_slug: "technology",
        is_featured: 0,
        is_trending: 0,
        author: "Science Desk",
    },

    // --- POLITICS ---
    {
        title: "G20 Leaders Reach Landmark Agreement on Global AI Governance Framework",
        excerpt: "World leaders unanimously agree on a comprehensive international framework for regulating artificial intelligence development and deployment.",
        content: "<p>In a historic session at the G20 summit in Rio de Janeiro, leaders from the world\u2019s 20 largest economies have unanimously agreed on the first-ever global framework for AI governance.</p><p>The Rio AI Accord establishes binding commitments for AI safety testing, transparency requirements for large-scale AI systems, and a new international body \u2014 the Global AI Safety Authority \u2014 to monitor compliance.</p><p>Key provisions include mandatory safety cards for AI systems deployed in critical infrastructure, requirements for watermarking AI-generated content, and a $50 billion international fund to help developing nations build AI capacity.</p><p>The agreement is seen as a major diplomatic breakthrough, particularly given the tensions between the US and China on technology regulation. Both nations committed to working within the framework, with implementation beginning in January 2027.</p>",
        image_url: "https://picsum.photos/seed/g20ai2026/800/500",
        category_slug: "politics",
        is_featured: 1,
        is_trending: 1,
        author: "World Bureau",
    },
    {
        title: "EU Passes Sweeping Digital Privacy Act with Strict Data Collection Limits",
        excerpt: "The European Parliament votes overwhelmingly for new legislation that fundamentally changes how tech companies handle user data.",
        content: "<p>The European Parliament has passed the Digital Privacy Act 2026 with a decisive 487-112 vote, establishing the strictest data protection rules in the world.</p><p>The new law goes far beyond GDPR, requiring companies to obtain explicit opt-in consent for each individual use of personal data, banning the sale of behavioral data entirely, and imposing fines up to 10% of global revenue for violations.</p><p>Perhaps most significantly, the Act introduces a right to algorithmic explanation, requiring companies to explain in plain language how any automated decision affecting users is made.</p><p>Tech industry groups have criticized the regulation as overreaching, while privacy advocates hailed it as a landmark victory for digital rights.</p>",
        image_url: "https://picsum.photos/seed/euprivacy2026/800/500",
        category_slug: "politics",
        is_featured: 0,
        is_trending: 1,
        author: "European Bureau",
    },
    {
        title: "India and Australia Sign Historic Trade and Technology Partnership",
        excerpt: "The bilateral agreement eliminates tariffs on key industries and establishes joint R&D programs in clean energy and biotechnology.",
        content: "<p>Indian Prime Minister Narendra Modi and Australian PM Anthony Albanese signed a comprehensive trade and technology partnership in New Delhi this week, marking the most significant bilateral agreement between the two nations.</p><p>The pact eliminates tariffs on 95% of goods traded between the countries, establishes joint research centers for green hydrogen and battery technology, and creates a fast-track visa program for tech workers.</p><p>Economic analysts project the deal will boost bilateral trade by $45 billion annually within five years and create over 200,000 jobs across both nations.</p><p>This partnership reflects the deep strategic alignment between our democracies in the Indo-Pacific region.</p>",
        image_url: "https://picsum.photos/seed/indiaaus2026/800/500",
        category_slug: "politics",
        is_featured: 0,
        is_trending: 0,
        author: "Asia Bureau",
    },

    // --- SPORTS ---
    {
        title: "Lionel Messi Announces Retirement After Record-Breaking Inter Miami Season",
        excerpt: "The Argentine legend confirms he will hang up his boots at the end of the MLS season after leading Inter Miami to a historic treble.",
        content: "<p>Lionel Messi has confirmed that the 2026 MLS season will be his last as a professional footballer, ending a career widely regarded as the greatest in the history of the sport.</p><p>The 39-year-old Argentine captain made the announcement in an emotional press conference at Chase Stadium, surrounded by teammates and family.</p><p>Every dream I ever had as a boy from Rosario has come true many times over. It is time to enjoy the last months and then be with my family.</p><p>This season, Messi led Inter Miami to a historic treble \u2014 winning the MLS Supporters\u2019 Shield, the US Open Cup, and the Leagues Cup \u2014 while scoring 32 goals and providing 28 assists, both MLS records.</p><p>He retires with eight Ballon d\u2019Or titles, a World Cup, four Champions League trophies, and over 900 career goals for club and country.</p>",
        image_url: "https://picsum.photos/seed/messiretire2026/800/500",
        category_slug: "sports",
        is_featured: 1,
        is_trending: 1,
        author: "Sports Desk",
    },
    {
        title: "Coco Gauff Wins US Open Title for Second Consecutive Year",
        excerpt: "The American tennis star defeats world No. 1 Iga Swiatek in a thrilling three-set final at Arthur Ashe Stadium.",
        content: "<p>Coco Gauff has won the 2026 US Open, defeating top-seeded Iga Swiatek 6-4, 3-6, 7-5 in a dramatic final that lasted nearly two and a half hours.</p><p>The 22-year-old American becomes the first woman to successfully defend the US Open title since Serena Williams did it in 2014, cementing her status as the face of women\u2019s tennis.</p><p>This crowd, this city \u2014 there is nothing like it. I dreamed about this moment since I was a kid watching Serena on this court.</p><p>The match featured incredible momentum swings, with Swiatek dominating the second set before Gauff rallied from 4-2 down in the decider to claim the championship.</p>",
        image_url: "https://picsum.photos/seed/gauffusopen2026/800/500",
        category_slug: "sports",
        is_featured: 0,
        is_trending: 1,
        author: "Tennis Desk",
    },
    {
        title: "2026 FIFA World Cup Quarter-Finals Deliver Unforgettable Night of Football",
        excerpt: "Four dramatic matches see underdogs rise and giants fall in one of the greatest World Cup nights in history.",
        content: "<p>The 2026 FIFA World Cup quarter-finals delivered one of the most extraordinary nights in football history, with all four matches going to extra time or penalties.</p><p>In the standout match, Japan stunned Brazil 3-2 with a last-minute header from Takefusa Kubo, completing one of the greatest World Cup upsets ever. The result sends Japan to their first-ever World Cup semi-final.</p><p>Argentina edged out Germany 4-3 on penalties after a pulsating 2-2 draw, while Spain defeated Morocco 1-0 in extra time thanks to a Lamine Yamal wondergoal. France booked their spot with a dramatic 3-2 win over England, with Kylian Mbapp\u00e9 scoring twice.</p><p>The semi-finals will see Japan face Argentina and Spain take on France in what promises to be a spectacular conclusion to the tournament hosted across the United States, Canada, and Mexico.</p>",
        image_url: "https://picsum.photos/seed/worldcupqf2026/800/500",
        category_slug: "sports",
        is_featured: 1,
        is_trending: 0,
        author: "Football Desk",
    },

    // --- ENTERTAINMENT ---
    {
        title: "Beyonc\u00e9 Announces Global Renaissance World Tour II with Immersive Tech Experience",
        excerpt: "The multi-time Grammy winner plans to bring AI-powered stage visuals and holographic performances to 60 cities worldwide.",
        content: "<p>Beyonc\u00e9 has officially announced Renaissance World Tour II, a massive 60-city global tour featuring cutting-edge AI-generated visual effects and holographic stage designs.</p><p>Produced in partnership with Disguise and Epic Games\u2019 Unreal Engine team, each concert will feature real-time AI-generated visuals that respond to the music and crowd energy, creating a unique experience at every show.</p><p>Every night will be different because the visuals are alive \u2014 they think, they breathe, they dance with me.</p><p>Tour dates begin in March 2027 in Paris and will span six continents, with ticket presales starting September 1. Industry analysts expect the tour to gross over $2 billion, which would shatter the previous record held by her own Renaissance World Tour.</p>",
        image_url: "https://picsum.photos/seed/beytour2026/800/500",
        category_slug: "entertainment",
        is_featured: 1,
        is_trending: 1,
        author: "Music Desk",
    },
    {
        title: "Christopher Nolan\u2019s New Film Meridian Selected as Venice Film Festival Opener",
        excerpt: "The Oscar-winning director\u2019s sci-fi epic about parallel universes stars Cillian Murphy, Zendaya, and Robert Downey Jr.",
        content: "<p>Venice Film Festival organizers have announced that Christopher Nolan\u2019s highly anticipated film Meridian will open the 83rd edition of the prestigious festival on August 27.</p><p>The sci-fi drama, described as Nolan\u2019s most personal and ambitious film yet, stars Cillian Murphy as a physicist who discovers that parallel universes are beginning to collapse into each other. Zendaya and Robert Downey Jr. co-star in what sources describe as career-best performances.</p><p>Film critics who attended early screenings have already called it a masterpiece and the best Nolan film since Interstellar.</p><p>Meridian will hit theaters worldwide on October 23, with an IMAX release featuring a revolutionary new film format developed specifically for the project.</p>",
        image_url: "https://picsum.photos/seed/nolanmeridian2026/800/500",
        category_slug: "entertainment",
        is_featured: 0,
        is_trending: 1,
        author: "Film Desk",
    },
    {
        title: "Spotify Surpasses 1 Billion Active Users, Announces Lossless Audio for All",
        excerpt: "The streaming giant celebrates the milestone by making high-fidelity audio free for every subscriber tier.",
        content: "<p>Spotify has officially surpassed 1 billion monthly active users, becoming the first music streaming platform to reach that milestone, and is celebrating by making lossless audio available to all subscribers at no extra cost.</p><p>Previously reserved for the Premium tier at an additional fee, Spotify HiFi (lossless audio up to 24-bit/48kHz) will now be available to all users, including those on the free, ad-supported tier.</p><p>Music sounds best when everyone can hear it the way artists intended. This is our thank you to a billion people who chose Spotify.</p><p>The announcement sent Spotify\u2019s stock up 8% in after-hours trading, as analysts noted the move could significantly increase user retention and ad revenue from the free tier.</p>",
        image_url: "https://picsum.photos/seed/spotify1b2026/800/500",
        category_slug: "entertainment",
        is_featured: 0,
        is_trending: 0,
        author: "Tech Desk",
    },

    // --- BUSINESS ---
    {
        title: "Tesla Unveils Fully Autonomous Robotaxi Fleet Launching in 10 US Cities",
        excerpt: "Elon Musk confirms Tesla will begin commercial driverless ride-hailing service in Austin, San Francisco, and Miami by year-end.",
        content: "<p>Tesla has officially unveiled its long-awaited autonomous ride-hailing service, branded Tesla Network, with commercial operations set to begin in 10 US cities before the end of 2026.</p><p>The service will use a fleet of purpose-built Cybercabs \u2014 two-seater autonomous vehicles with no steering wheel or pedals \u2014 along with existing Tesla vehicles running the company\u2019s Full Self-Driving software.</p><p>Starting fares will be $0.30 per mile, significantly undercutting both Uber and traditional taxi services. Musk claims the service will be profitable within six months of launch.</p><p>This is the moment we have been working toward since Tesla was founded. Autonomous driving is not the future \u2014 it is happening now.</p><p>Regulatory approval has been secured in Texas, California, and Florida, with applications pending in seven additional states.</p>",
        image_url: "https://picsum.photos/seed/teslarobotaxi2026/800/500",
        category_slug: "business",
        is_featured: 1,
        is_trending: 1,
        author: "Business Desk",
    },
    {
        title: "Global Stock Markets Rally as Inflation Falls to Lowest Level in a Decade",
        excerpt: "Major indices hit all-time highs as central banks signal the end of the tightening cycle and begin discussing rate cuts.",
        content: "<p>Global stock markets surged to all-time highs this week as new data showed inflation falling to 1.8% across major economies \u2014 the lowest level in over a decade.</p><p>The S&P 500 crossed 6,500 for the first time, the Nikkei 225 surged past 48,000, and European markets posted their best weekly gains since 2021.</p><p>The Federal Reserve, European Central Bank, and Bank of England all signaled that interest rate cuts could begin as early as October, marking a major shift in monetary policy.</p><p>Economists attribute the disinflation to a combination of falling energy prices, improved supply chains, and the productivity gains from widespread AI adoption across industries.</p><p>We are entering a goldilocks economy. Growth is solid, inflation is tame, and the labor market is strong.</p>",
        image_url: "https://picsum.photos/seed/stockrally2026/800/500",
        category_slug: "business",
        is_featured: 0,
        is_trending: 1,
        author: "Finance Desk",
    },
    {
        title: "Saudi Arabia Opens $50 Billion The Line District to First Residents",
        excerpt: "The first phase of NEOM\u2019s revolutionary linear city welcomes 100,000 residents in a milestone for the kingdom\u2019s Vision 2030 project.",
        content: "<p>Saudi Arabia has opened the first 50-kilometer section of The Line, the kingdom\u2019s ambitious mirror-clad linear city that is the centerpiece of the NEOM megaproject.</p><p>The first residents moved in this week, occupying 25,000 residential units in a car-free, zero-emission city that rises 500 meters high and extends into the desert.</p><p>The initial phase includes schools, hospitals, vertical farms capable of producing 20% of the residents\u2019 food, and an AI-managed transportation system using high-speed rail that connects any point in the 50km section in under 10 minutes.</p><p>When fully completed, The Line will stretch 170 kilometers and house 9 million people, making it one of the largest construction projects in human history.</p>",
        image_url: "https://picsum.photos/seed/theline2026/800/500",
        category_slug: "business",
        is_featured: 0,
        is_trending: 0,
        author: "Middle East Bureau",
    },

    // --- LIFESTYLE ---
    {
        title: "WHO Declares Ultra-Processed Food Reduction a Global Health Priority",
        excerpt: "New guidelines recommend countries implement front-of-pack warning labels and sugar taxes to combat the obesity epidemic.",
        content: "<p>The World Health Organization has released sweeping new guidelines declaring ultra-processed food a leading global health threat, urging all 194 member states to implement mandatory front-of-pack warning labels by 2028.</p><p>The guidelines recommend a four-tier warning system \u2014 similar to Chile\u2019s successful model \u2014 with black labels on products highest in sugar, sodium, trans fats, and artificial additives.</p><p>WHO Director-General called ultra-processed foods the tobacco of our generation, citing research linking them to a 53% increased risk of heart disease and a 48% higher risk of anxiety and depression.</p><p>Food industry lobbyists have pushed back strongly, but public health experts say the evidence is now overwhelming and that voluntary measures have failed.</p>",
        image_url: "https://picsum.photos/seed/whofood2026/800/500",
        category_slug: "lifestyle",
        is_featured: 0,
        is_trending: 1,
        author: "Health Desk",
    },
    {
        title: "The Rise of Micro-Cations: Why Short Trips Are Reshaping Global Tourism",
        excerpt: "A growing trend sees travelers choosing 2-3 day getaways over traditional week-long vacations, boosting weekend tourism economies.",
        content: "<p>The global tourism industry is experiencing a fundamental shift as micro-cations \u2014 short trips lasting two to three days \u2014 now account for 45% of all leisure travel bookings worldwide.</p><p>Research from Booking.com shows that the average vacation length has shrunk from 8.5 days in 2019 to just 4.2 days in 2026, driven by remote work flexibility, rising costs, and a cultural shift toward frequent small experiences over rare big ones.</p><p>Cities like Lisbon, Kyoto, Marrakech, and Cartagena have seen the biggest gains, with weekend hotel bookings up 67% year-over-year.</p><p>People do not want one perfect vacation anymore \u2014 they want five or six great weekends. It is reshaping everything from airline pricing to hotel design.</p>",
        image_url: "https://picsum.photos/seed/microcation2026/800/500",
        category_slug: "lifestyle",
        is_featured: 0,
        is_trending: 0,
        author: "Travel Desk",
    },
    {
        title: "Japan\u2019s Quiet Luxury Workwear Trend Takes Over Corporate Fashion Globally",
        excerpt: "Minimalist Japanese-inspired office attire with premium natural fabrics becomes the fastest-growing fashion segment worldwide.",
        content: "<p>A minimalist fashion movement inspired by Japanese workwear aesthetics has become the fastest-growing segment in corporate fashion, with sales surging 340% over the past year.</p><p>The trend \u2014 characterized by clean lines, neutral earth tones, premium natural fabrics like raw linen and organic cotton, and functional details like hidden pockets \u2014 has been embraced by everyone from startup founders to Wall Street bankers.</p><p>Brands like Muji\u2019s new workwear line, Uniqlo Lab, and emerging labels such as Kado and Mono have led the movement, emphasizing quality over logos.</p><p>It is a rejection of fast fashion and conspicuous consumption. People want clothes that are quietly excellent \u2014 well-made, sustainable, and timeless.</p>",
        image_url: "https://picsum.photos/seed/japanworkwear2026/800/500",
        category_slug: "lifestyle",
        is_featured: 0,
        is_trending: 0,
        author: "Style Desk",
    },
];

// ===== INSERT ARTICLES =====
const insertArticle = db.prepare(`
    INSERT INTO articles (title, slug, excerpt, content, image_url, category_id, is_featured, is_trending, is_breaking, views, author, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Check for duplicates by title
const existingTitles = db.prepare('SELECT title FROM articles').all().map(a => a.title);
const newArticles = newsArticles.filter(a => !existingTitles.includes(a.title));

console.log("Existing articles:", existingTitles.length);
console.log("New articles to insert:", newArticles.length);

const insertAll = db.transaction(() => {
    for (const article of newArticles) {
        const slug = slugify(article.title) + "-" + Date.now();
        const categoryId = categories[article.category_slug] || 1;
        const views = Math.floor(Math.random() * 50000) + 5000;
        insertArticle.run(
            article.title,
            slug,
            article.excerpt,
            article.content,
            article.image_url,
            categoryId,
            article.is_featured ? 1 : 0,
            article.is_trending ? 1 : 0,
            0,
            views,
            article.author,
            "published"
        );
        console.log("  Inserted: " + article.title);
    }
});

insertAll();

// ===== ALSO ADD SOME BREAKING NEWS =====
const insertBreaking = db.prepare("INSERT INTO breaking_news (text, link) VALUES (?, ?)");
const breakingNews = [
    ["GPT-6 launched by OpenAI \u2014 near-human reasoning capabilities demonstrated", "#"],
    ["Messi confirms retirement at end of 2026 MLS season", "#"],
    ["G20 leaders agree on historic global AI governance framework", "#"],
    ["Global stock markets hit all-time highs as inflation drops to 1.8%", "#"],
    ["Tesla begins commercial robotaxi service in Austin, Texas", "#"],
    ["Japan stuns Brazil 3-2 in World Cup quarter-final thriller", "#"],
];

const insertBreakingAll = db.transaction(() => {
    for (const item of breakingNews) {
        insertBreaking.run(item[0], item[1]);
        console.log("  Breaking: " + item[0]);
    }
});

insertBreakingAll();

const finalCount = db.prepare("SELECT COUNT(*) as count FROM articles").get().count;
console.log("\nDone! Total articles in database: " + finalCount);
console.log("Breaking news items: " + db.prepare("SELECT COUNT(*) as count FROM breaking_news").get().count);

db.close();
