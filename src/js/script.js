const menuButton = document.querySelector("[data-menu-button]");
const menuClose = document.querySelector("[data-menu-close]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

function setMenu(open) {
  if (!mobileMenu) return;
  mobileMenu.classList.toggle("is-open", open);
  mobileMenu.setAttribute("aria-hidden", String(!open));
  menuButton?.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
}

menuButton?.addEventListener("click", () => setMenu(true));
menuClose?.addEventListener("click", () => setMenu(false));

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

// The production host serves clean URLs, while the local static preview needs
// the physical .html filename. Keep production links canonical and adapt only
// the local preview so every header, footer, and bottom-nav link remains usable.
if (["127.0.0.1", "localhost"].includes(window.location.hostname)) {
  document.querySelectorAll('a[href^="/src/pages/"]').forEach((link) => {
    const url = new URL(link.href);
    if (!url.pathname.endsWith(".html")) {
      url.pathname = `${url.pathname}.html`;
    }
    url.searchParams.set("preview", "20260819-3");
    link.href = `${url.pathname}${url.search}${url.hash}`;
  });
}

// Warm only the page the visitor shows intent to open. This keeps the initial
// page light while reducing the wait between same-origin service pages.
const prefetchedPages = new Set();
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const mayPrefetch = !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType);

function prefetchPage(link) {
  if (!mayPrefetch || !link) return;

  const url = new URL(link.href, window.location.href);
  const currentUrl = new URL(window.location.href);
  const isPublicPage = url.pathname === "/" || url.pathname.startsWith("/src/pages/");

  if (
    url.origin !== window.location.origin ||
    !isPublicPage ||
    (url.pathname === currentUrl.pathname && url.search === currentUrl.search) ||
    prefetchedPages.has(url.href)
  ) {
    return;
  }

  const hint = document.createElement("link");
  hint.rel = "prefetch";
  hint.as = "document";
  hint.href = url.href;
  document.head.append(hint);
  prefetchedPages.add(url.href);
}

let prefetchTimer;

document.addEventListener("pointerover", (event) => {
  const link = event.target.closest?.("a[href]");
  window.clearTimeout(prefetchTimer);
  prefetchTimer = window.setTimeout(() => prefetchPage(link), 120);
});

document.addEventListener("pointerout", () => window.clearTimeout(prefetchTimer));
document.addEventListener("focusin", (event) => prefetchPage(event.target.closest?.("a[href]")));
document.addEventListener("touchstart", (event) => prefetchPage(event.target.closest?.("a[href]")), {
  passive: true,
});

// Marketing measurement is routed through one neutral event layer. GA4 uses
// the semantic event name, while Naver receives reportable custom conversion
// slots. Future Daangn/Meta pixels can subscribe to the same browser event
// without changing the site's links again.
const providedMarketingConfig = window.YP_MARKETING_CONFIG || {};
const marketingConfig = Object.freeze({
  gtmContainerId: /^GTM-[A-Z0-9]+$/.test(providedMarketingConfig.gtmContainerId || "") ? providedMarketingConfig.gtmContainerId : "",
  naverAccountId: /^[a-z0-9_]{8,64}$/i.test(providedMarketingConfig.naverAccountId || "") ? providedMarketingConfig.naverAccountId : "",
  naverCookieDomain: providedMarketingConfig.naverCookieDomain || "xn--299am38ap8d3qdvts.com",
  naverConversions: Object.freeze({
    click_call: "custom001",
    click_kakao: "custom002",
    click_directions: "custom003",
    click_naver_talk: "custom004",
  }),
});

const isLocalPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const marketingDebugEvents = [];
window.__ypMarketingDebug = marketingDebugEvents;

function loadGoogleTagManager() {
  if (isLocalPreview || !marketingConfig.gtmContainerId) return false;
  if (document.querySelector('script[data-yp-google-tag-manager="true"]')) return true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(marketingConfig.gtmContainerId)}`;
  script.async = true;
  script.dataset.ypGoogleTagManager = "true";
  document.head.append(script);
  return true;
}

function getMarketingService() {
  const path = window.location.pathname;
  if (path.includes("/buy")) return "buyback";
  if (path.includes("/sell")) return "retail";
  if (path.includes("/prepaid")) return "prepaid";
  if (path.includes("/datarecover")) return "data_recovery";
  return "home";
}

function getMarketingPlacement(link) {
  if (link.closest(".mobile-header-contact")) return "mobile_header";
  if (link.closest(".quick-contact")) return "floating_contact";
  if (link.closest(".hero-actions, .sp-hero-actions")) return "hero";
  if (link.closest(".mobile-bottom-nav")) return "mobile_bottom_nav";
  if (link.closest("footer, .site-footer")) return "footer";
  if (link.closest(".visit-actions, .visit-card, .home-visit")) return "visit_section";
  return "content";
}

function buildMarketingPayload(eventName, details = {}) {
  const pageUrl = new URL(window.location.href);
  return {
    event: eventName,
    event_category: "contact",
    service: getMarketingService(),
    page_path: `${pageUrl.pathname}${pageUrl.search}`,
    page_title: document.title,
    ...details,
  };
}

function pushGa4MarketingEvent(payload) {
  marketingDebugEvents.push({ provider: "ga4", ...payload });
  if (isLocalPreview) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

let naverTrackingPromise;

function loadNaverTracking() {
  if (isLocalPreview || !marketingConfig.naverAccountId) return Promise.resolve(false);
  if (naverTrackingPromise) return naverTrackingPromise;

  naverTrackingPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-yp-naver-tracking="true"]');
    if (existing && window.wcs) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://wcs.naver.net/wcslog.js";
    script.async = true;
    script.dataset.ypNaverTracking = "true";
    script.addEventListener("load", () => {
      if (!window.wcs) {
        resolve(false);
        return;
      }
      window.wcs_add = window.wcs_add || {};
      window.wcs_add.wa = marketingConfig.naverAccountId;
      window.wcs.inflow(marketingConfig.naverCookieDomain);
      window.wcs_do?.();
      resolve(true);
    });
    script.addEventListener("error", () => resolve(false));
    document.head.append(script);
  });

  return naverTrackingPromise;
}

async function pushNaverMarketingEvent(eventName) {
  const conversionType = marketingConfig.naverConversions[eventName];
  if (!conversionType) return;

  const testMode = new URLSearchParams(window.location.search).get("naver_test") === "1";
  const type = testMode ? `test_${conversionType}` : conversionType;
  marketingDebugEvents.push({ provider: "naver", event: eventName, type, testMode });

  if (!(await loadNaverTracking()) || !window.wcs?.trans) return;
  window.wcs.trans({ type });
}

function trackMarketingEvent(eventName, details = {}) {
  const payload = buildMarketingPayload(eventName, details);
  pushGa4MarketingEvent(payload);
  void pushNaverMarketingEvent(eventName);
  window.dispatchEvent(new CustomEvent("yp:marketing-event", { detail: payload }));
}

function classifyMarketingLink(link) {
  const href = link.getAttribute("href") || "";
  if (href.startsWith("tel:")) return "click_call";
  if (href.includes("pf.kakao.com")) return "click_kakao";
  if (href.includes("talk.naver.com")) return "click_naver_talk";
  if (href.includes("map.naver.com")) return "click_directions";
  return null;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a[href]");
  if (!link) return;
  const eventName = classifyMarketingLink(link);
  if (!eventName) return;

  trackMarketingEvent(eventName, {
    link_url: link.href,
    link_text: (link.textContent || link.getAttribute("aria-label") || "").trim().slice(0, 120),
    placement: getMarketingPlacement(link),
  });
});

window.setTimeout(() => {
  const payload = buildMarketingPayload("engaged_30s", { event_category: "engagement" });
  pushGa4MarketingEvent(payload);
  window.dispatchEvent(new CustomEvent("yp:marketing-event", { detail: payload }));
}, 30_000);

const locationSection = document.querySelector(".home-visit, .visit-card, .map-link");
if (locationSection && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      const payload = buildMarketingPayload("view_location", { event_category: "engagement" });
      pushGa4MarketingEvent(payload);
      window.dispatchEvent(new CustomEvent("yp:marketing-event", { detail: payload }));
      observer.disconnect();
    },
    { threshold: 0.35 },
  );
  observer.observe(locationSection);
}

loadGoogleTagManager();
void loadNaverTracking();
