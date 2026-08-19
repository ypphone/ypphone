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
