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
