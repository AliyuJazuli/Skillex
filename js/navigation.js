(() => {
  const routeKey = "skillex-current-route";
  const pathname = window.location.pathname;
  const isDirectPage = pathname !== "/" && pathname.endsWith(".html");
  let route = isDirectPage ? `${pathname}${window.location.search}${window.location.hash}` : null;

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
      history.replaceState({ skillexRoute: route }, "", window.location.origin);
    } catch (error) {
      console.error("Could not normalize the Skillex page address:", error);
    }
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

  function renderQuickNavigation() {
    const siteHeader = document.querySelector(".site-header");
    if (!siteHeader) return;
    document.querySelector(".quick-nav")?.remove();

    const quickNav = document.createElement("div");
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
        </nav>
      </div>
    `;
    siteHeader.insertAdjacentElement("afterend", quickNav);

    const currentPage = window.SKILLEX_ROUTE_URL.pathname.split("/").pop() || "index.html";
    quickNav.querySelectorAll(".quick-nav__link").forEach((link) => {
      const targetPage = link.getAttribute("href")?.split("/").pop() || "index.html";
      if (currentPage === targetPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  async function renderPage(html, target) {
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    document.title = nextDocument.title;
    document.documentElement.lang = nextDocument.documentElement.lang || "en";
    document.head.replaceChildren(...[...nextDocument.head.childNodes].map((node) => node.cloneNode(true)));
    document.body.replaceChildren(...[...nextDocument.body.childNodes].map((node) => node.cloneNode(true)));
    document.body.classList.toggle("dark", document.documentElement.classList.contains("dark"));
    window.SKILLEX_ROUTE_URL = target;
    renderQuickNavigation();
    await loadScripts(nextDocument);
  }

  async function navigate(url, historyMode = "push") {
    const target = new URL(url, window.location.origin);
    if (target.origin !== window.location.origin || !target.pathname.endsWith(".html")) {
      window.location.assign(target.href);
      return;
    }

    const routePath = `${target.pathname}${target.search}${target.hash}`;
    try {
      const response = await fetch(routePath, { headers: { "X-Skillex-Navigation": "1" } });
      if (!response.ok) throw new Error(`Page request failed (${response.status}).`);
      const html = await response.text();
      try {
        sessionStorage.setItem(routeKey, routePath);
      } catch (error) {
        console.error("Could not save the current Skillex page:", error);
      }
      if (historyMode === "push") {
        history.pushState({ skillexRoute: routePath }, "", window.location.origin);
      } else if (historyMode === "replace") {
        history.replaceState({ skillexRoute: routePath }, "", window.location.origin);
      }
      await renderPage(html, target);
    } catch (error) {
      console.error("Skillex page navigation failed:", error);
      window.SkillexShowToast?.("This page could not be loaded. Please try again.", "error");
    }
  }

  window.SkillexNavigate = navigate;
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest("a[href]");
    if (!anchor || anchor.target && anchor.target !== "_self" || anchor.hasAttribute("download")) return;
    const target = new URL(anchor.href, window.location.href);
    if (target.origin !== window.location.origin || !target.pathname.endsWith(".html")) return;
    event.preventDefault();
    navigate(target.href);
  });

  window.addEventListener("popstate", (event) => {
    const directRoute = window.location.pathname !== "/" && window.location.pathname.endsWith(".html")
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : "/index.html";
    navigate(event.state?.skillexRoute || directRoute, "none");
  });

  renderQuickNavigation();
  if (!isDirectPage && window.SKILLEX_ROUTE_URL.pathname !== "/"
    && window.SKILLEX_ROUTE_URL.pathname !== "/index.html") {
    navigate(window.SKILLEX_ROUTE_URL, "replace");
  }
})();
