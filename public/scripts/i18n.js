const T = {
  ar: {
    nav_home: "الرئيسية",
    nav_articles: "مقالات",
    nav_taammulat: "تأملات",
    nav_books: "كتب",
    nav_projects: "مشاريع",
    nav_categories: "التصنيفات",
    nav_archive: "الأرشيف",
    nav_tags: "الوسوم",
    site_name: "عبد الرحمان هلال",
    site_subtitle: "التقنية · التصميم · الحياة",
    latest_articles: "أحدث المقالات",
    view_all: "عرض جميع المقالات ←",
    about_title: "عن الكاتب",
    about_text: "أنا عبد الرحمان هلال. أكتب عن تطوير البرمجيات والتصميم والإنتاجية وتأملات الحياة.",
    categories_title: "التصنيفات",
    newsletter_title: "النشرة البريدية",
    newsletter_desc: "احصل على أحدث المقالات في بريدك الإلكتروني.",
    newsletter_btn: "اشترك",
    newsletter_ph: "أدخل بريدك الإلكتروني",
    read_more: "اقرأ المزيد",
    you_might_like: "قد يعجبك أيضاً",
    category_label: "التصنيف",
    tag_label: "الوسم",
    author_label: "الكاتب",
    back_home: "العودة إلى الرئيسية",
    all_categories: "جميع التصنيفات",
    all_tags: "جميع الوسوم",
    all_authors: "جميع الكتّاب",
    explore_category: "استكشف المقالات حسب التصنيف",
    explore_tag: "استكشف المقالات حسب الوسم",
    explore_author: "استكشف المقالات حسب الكاتب",
    footer_categories: "التصنيفات",
    footer_tags: "الوسوم",
    footer_archive: "الأرشيف",
    prev_page: "← السابق",
    next_page: "التالي →",
    copyright: "© 2026 عبد الرحمان هلال. جميع الحقوق محفوظة.",
    no_articles: "لا توجد مقالات.",
    all_projects: "المشاريع",
    explore_projects: "مشاريع وأعمال شخصية",
    visit_site: "زيارة الموقع",
    all_books: "ملخصات الكتب",
    explore_books: "ملخصات قصيرة لأفكار كتب قرأتها.",
  },
  en: {
    nav_home: "Home",
    nav_articles: "Articles",
    nav_taammulat: "Reflections",
    nav_books: "Books",
    nav_projects: "Projects",
    nav_categories: "Categories",
    nav_archive: "Archive",
    nav_tags: "Tags",
    site_name: "ABDERAHMANE HELLAL",
    site_subtitle: "Tech · Design · Life",
    latest_articles: "Latest Articles",
    view_all: "View All Posts →",
    about_title: "About",
    about_text: "I'm Abderahmane Hellal. I write about software development, design, productivity, and the occasional life reflections.",
    categories_title: "Categories",
    newsletter_title: "Newsletter",
    newsletter_desc: "Get new articles straight to your inbox.",
    newsletter_btn: "Subscribe",
    newsletter_ph: "Enter your email",
    read_more: "READ MORE →",
    you_might_like: "You Might Also Like",
    category_label: "Category",
    tag_label: "Tag",
    author_label: "Author",
    back_home: "Back to Home",
    all_categories: "All Categories",
    all_tags: "All Tags",
    all_authors: "All Authors",
    explore_category: "Explore by Category",
    explore_tag: "Explore by Tag",
    explore_author: "Explore by Author",
    footer_categories: "Categories",
    footer_tags: "Tags",
    footer_archive: "Archive",
    prev_page: "← Previous",
    next_page: "Next →",
    copyright: "© 2026 Abderahmane Hellal. All rights reserved.",
    no_articles: "No articles found.",
    all_projects: "Projects",
    explore_projects: "Personal projects and initiatives",
    visit_site: "Visit Site",
    all_books: "Book Summaries",
    explore_books: "Short summaries of books I've read.",
  }
}

function hasEnglish() {
  return document.documentElement.dataset.hasEnglish === "1"
}

function getLang() {
  if (!hasEnglish()) return "ar"
  return localStorage.getItem("lang") || "ar"
}

function applyLang(lang) {
  const html = document.documentElement
  html.lang = lang
  html.dir = lang === "ar" ? "rtl" : "ltr"

  // Static UI strings
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n")
    if (T[lang]?.[key] !== undefined) el.textContent = T[lang][key]
  })

  // Input placeholders
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const key = el.getAttribute("data-i18n-ph")
    if (T[lang]?.[key] !== undefined) el.placeholder = T[lang][key]
  })

  // Precomputed bilingual text (e.g. article counts, pagination info)
  document.querySelectorAll("[data-text-ar]").forEach(el => {
    el.textContent = lang === "ar" ? el.getAttribute("data-text-ar") : el.getAttribute("data-text-en")
  })

  // Bilingual dates
  document.querySelectorAll("[data-date-ar]").forEach(el => {
    el.textContent = lang === "ar" ? el.getAttribute("data-date-ar") : el.getAttribute("data-date-en")
  })

  // Hide posts/cards that don't belong to the active language
  document.querySelectorAll("[data-post-lang]").forEach(el => {
    el.style.display = el.getAttribute("data-post-lang") === lang ? "" : "none"
  })

  // Hide listing tiles (categories/tags/authors) with no posts in the active language
  document.querySelectorAll("[data-has-ar]").forEach(el => {
    const has = lang === "ar" ? el.getAttribute("data-has-ar") : el.getAttribute("data-has-en")
    el.style.display = has === "1" ? "" : "none"
  })

  // Masthead name font: Playfair for EN, Cairo for AR
  document.querySelectorAll(".masthead-name").forEach(el => {
    el.style.fontFamily = lang === "ar"
      ? "'Cairo', sans-serif"
      : "'Playfair Display', Georgia, serif"
  })

  // Language toggle label
  const btn = document.getElementById("lang-toggle")
  if (btn) btn.textContent = lang === "ar" ? "EN" : "عر"

  localStorage.setItem("lang", lang)
}

function toggleLang() {
  if (!hasEnglish()) return
  applyLang(getLang() === "ar" ? "en" : "ar")
}

// Apply immediately after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => applyLang(getLang()))
} else {
  applyLang(getLang())
}
