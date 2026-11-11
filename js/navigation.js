(() => {
  const routeKey = "skillex-current-route";
  const initialUrl = new URL(window.location.href);
  const appPages = new Set([
    "about.html",
    "browse.html",
    "communities.html",
    "complete-profile.html",
    "contact.html",
    "dashboard.html",
    "forgot-password.html",
    "index.html",
    "login.html",
    "privacy.html",
    "profile.html",
    "reset-password.html",
    "saved-skills.html",
    "settings.html",
    "signup.html",
    "skill.html",
    "swap.html",
    "terms.html"
  ]);
  const resolveRoute = (url) => {
    if (url.origin !== window.location.origin) return null;
    if (url.pathname.endsWith(".html")) return url;

    const pathname = url.pathname.replace(/\/+$/, "");
    const filename = pathname.split("/").pop() || "index";
    if (!appPages.has(`${filename}.html`)) return null;
    return new URL(`/${filename}.html${url.search}${url.hash}`, url.origin);
  };
  const initialRoute = resolveRoute(initialUrl);
  const isDirectPage = initialUrl.pathname !== "/" && initialRoute !== null;
  const authParams = new URLSearchParams(initialUrl.search);
  new URLSearchParams(initialUrl.hash.slice(1)).forEach((value, key) => authParams.set(key, value));
  const authType = authParams.get("type");
  const isAuthCallback = (url) => {
    const params = new URLSearchParams(url.search);
    new URLSearchParams(url.hash.slice(1)).forEach((value, key) => params.set(key, value));
    return params.has("access_token") || params.has("refresh_token") || params.has("code")
      || params.has("error") || params.has("error_description");
  };
  let route = isDirectPage
    ? `${initialRoute.pathname}${window.location.search}${window.location.hash}`
    : authType === "invite"
      ? `/complete-profile.html${window.location.search}${window.location.hash}`
      : authType === "recovery"
        ? `/reset-password.html${window.location.search}${window.location.hash}`
        : null;

  if (!route) {
    try {
      route = sessionStorage.getItem(routeKey) || "/index.html";
    } catch (error) {
      console.error("Could not restore the current Skillex page:", error);
      route = "/index.html";
    }
  }

  window.SKILLEX_ROUTE_URL = new URL(route, window.location.origin);
  if (isDirectPage) {
    try {
      sessionStorage.setItem(routeKey, route);
      if (!isAuthCallback(initialUrl)) {
        history.replaceState({ skillexRoute: route }, "", window.location.origin);
      }
    } catch (error) {
      console.error("Could not normalize the Skillex page address:", error);
    }
  }

  const navigationLoader = document.createElement("div");
  navigationLoader.className = "navigation-loader";
  navigationLoader.setAttribute("role", "status");
  navigationLoader.setAttribute("aria-live", "polite");
  navigationLoader.setAttribute("aria-hidden", "true");
  navigationLoader.innerHTML = `
    <span class="navigation-loader__spinner" aria-hidden="true"></span>
    <span>Loading Skillex</span>
  `;
  document.body.append(navigationLoader);

  function setNavigationLoading(isLoading) {
    navigationLoader.dataset.visible = String(isLoading);
    navigationLoader.setAttribute("aria-hidden", String(!isLoading));
    document.body.toggleAttribute("aria-busy", isLoading);
  }

  function loadScripts(documentToRender) {
    const scripts = [...documentToRender.body.querySelectorAll("script")];
    return scripts.reduce((queue, sourceScript) => queue.then(() => {
      if (sourceScript.src.endsWith("/js/navigation.js")) return;
      if (sourceScript.src.includes("/@supabase/supabase-js@2") && window.supabase?.createClient) return;
      const script = document.createElement("script");
      for (const attribute of sourceScript.attributes) {
        script.setAttribute(attribute.name, attribute.value);
      }
      if (sourceScript.src) {
        return new Promise((resolve, reject) => {
          script.addEventListener("load", resolve, { once: true });
          script.addEventListener("error", () => reject(new Error(`Could not load ${sourceScript.src}.`)), { once: true });
          document.body.append(script);
        });
      }
      script.textContent = sourceScript.textContent;
      document.body.append(script);
    }), Promise.resolve());
  }

  async function replaceHead(nextDocument) {
    const stylesheetKey = (link) => {
      const href = link.getAttribute("href");
      return href ? new URL(href, window.location.href).href : null;
    };
    const existingStylesheets = new Map(
      [...document.head.querySelectorAll('link[rel~="stylesheet"]')]
        .map((link) => [stylesheetKey(link), link])
        .filter(([href]) => href)
    );
    const nextStylesheets = new Map(existingStylesheets);

    for (const sourceLink of nextDocument.head.querySelectorAll('link[rel~="stylesheet"]')) {
      const href = stylesheetKey(sourceLink);
      if (!href || nextStylesheets.has(href)) continue;

      const link = sourceLink.cloneNode(true);
      if (new URL(href).origin === window.location.origin) {
        await new Promise((resolve, reject) => {
          link.addEventListener("load", resolve, { once: true });
          link.addEventListener("error", () => reject(new Error(`Could not load stylesheet ${href}.`)), { once: true });
          document.head.append(link);
        });
      }
      nextStylesheets.set(href, link);
    }

    const headNodes = [...nextDocument.head.childNodes].map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches('link[rel~="stylesheet"]')) {
        return nextStylesheets.get(stylesheetKey(node)) || node.cloneNode(true);
      }
      return node.cloneNode(true);
    });
    document.head.replaceChildren(...headNodes);
  }

  function renderQuickNavigation() {
    const siteHeader = document.querySelector(".site-header");
    if (!siteHeader) return;
    let quickNav = document.querySelector(".quick-nav");
    if (!quickNav) {
      quickNav = document.createElement("div");
      quickNav.className = "quick-nav";
      quickNav.innerHTML = `
        <div class="container">
          <nav class="quick-nav__links" aria-label="Main navigation">
            <a class="quick-nav__link" href="index.html"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg><span>Home</span></a>
            <a class="quick-nav__link" href="browse.html"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><span>Browse</span></a>
            <a class="quick-nav__link" href="dashboard.html"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg><span>Dashboard</span></a>
            <a class="quick-nav__link" href="swap.html"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h15l-3-3M20 17H5l3 3"/></svg><span>Swap</span></a>
            <a class="quick-nav__link" href="communities.html"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1zm13-9a3 3 0 1 0-1-5.8M18 14a5 5 0 0 1 3 4.6v1"/></svg><span>Community</span></a>
            <a class="quick-nav__link" href="saved-skills.html"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z"/></svg><span>Saved</span></a>
            <a class="quick-nav__link" href="about.html"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/></svg><span>About</span></a>
            <a class="quick-nav__link" href="contact.html"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><span>Contact</span></a>
            <a class="quick-nav__link" href="settings.html" data-auth="settings" hidden><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1) scale(1.08)"/></svg><span>Settings</span></a>
          </nav>
        </div>
      `;
      siteHeader.insertAdjacentElement("afterend", quickNav);
    } else if (quickNav.previousElementSibling !== siteHeader) {
      siteHeader.insertAdjacentElement("afterend", quickNav);
    }

    const currentPage = window.SKILLEX_ROUTE_URL.pathname.split("/").pop() || "index.html";
    quickNav.querySelectorAll(".quick-nav__link").forEach((link) => {
      const targetPage = link.getAttribute("href")?.split("/").pop() || "index.html";
      if (currentPage === targetPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
    });
  }

  async function renderPage(html, target) {
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    const quickNavigation = document.querySelector(".quick-nav");
    const bodyNodes = [...nextDocument.body.childNodes].map((node) => node.cloneNode(true));
    document.title = nextDocument.title;
    document.documentElement.lang = nextDocument.documentElement.lang || "en";
    await replaceHead(nextDocument);
    document.body.replaceChildren(...bodyNodes, navigationLoader);
    document.body.classList.toggle("dark", document.documentElement.classList.contains("dark"));
    window.SKILLEX_ROUTE_URL = target;
    if (quickNavigation) {
      document.querySelector(".site-header")?.insertAdjacentElement("afterend", quickNavigation);
    }
    renderQuickNavigation();
    await loadScripts(nextDocument);
  }

  let navigationSequence = 0;

  async function navigate(url, historyMode = "push") {
    const requestedUrl = new URL(url, window.location.origin);
    const target = resolveRoute(requestedUrl);
    if (!target) {
      window.location.assign(requestedUrl.href);
      return;
    }

    if (target.href === window.SKILLEX_ROUTE_URL.href) return;

    const sequence = ++navigationSequence;
    const routePath = `${target.pathname}${target.search}${target.hash}`;
    setNavigationLoading(true);
    try {
      const response = await fetch(routePath, { headers: { "X-Skillex-Navigation": "1" } });
      if (!response.ok) throw new Error(`Page request failed (${response.status}).`);
      const html = await response.text();
      if (sequence !== navigationSequence) return;
      try {
        sessionStorage.setItem(routeKey, routePath);
      } catch (error) {
        console.error("Could not save the current Skillex page:", error);
      }
      if (historyMode === "push") {
        history.pushState({ skillexRoute: routePath }, "", window.location.origin);
      } else if (historyMode === "replace" && !isAuthCallback(target)) {
        history.replaceState({ skillexRoute: routePath }, "", window.location.origin);
      }
      await renderPage(html, target);
    } catch (error) {
      if (sequence === navigationSequence) {
        console.error("Skillex page navigation failed:", error);
        window.SkillexShowToast?.("This page could not be loaded. Please try again.", "error");
      }
    } finally {
      if (sequence === navigationSequence) setNavigationLoading(false);
    }
  }

  window.SkillexNavigate = navigate;
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest("a[href]");
    if (!anchor || anchor.target && anchor.target !== "_self" || anchor.hasAttribute("download")) return;
    if (anchor.getAttribute("href")?.startsWith("#")) return;
    const target = resolveRoute(new URL(anchor.href, window.location.href));
    if (!target) return;
    event.preventDefault();
    navigate(target.href);
  });

  window.addEventListener("popstate", (event) => {
    const directRoute = resolveRoute(new URL(window.location.href))?.href || "/index.html";
    navigate(event.state?.skillexRoute || directRoute, "none");
  });

  renderQuickNavigation();
  if (!isDirectPage && window.SKILLEX_ROUTE_URL.pathname !== "/"
    && window.SKILLEX_ROUTE_URL.pathname !== "/index.html") {
    navigate(window.SKILLEX_ROUTE_URL, "replace");
  }
})();
