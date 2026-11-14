(() => {
  const pageTypes = {
    "about.html": "about",
    "browse.html": "browse",
    "communities.html": "communities",
    "complete-profile.html": "complete-profile",
    "contact.html": "contact",
    "dashboard.html": "dashboard",
    "forgot-password.html": "forgot-password",
    "index.html": "home",
    "login.html": "login",
    "privacy.html": "privacy",
    "profile.html": "profile",
    "reset-password.html": "reset-password",
    "saved-skills.html": "saved-skills",
    "settings.html": "settings",
    "signup.html": "signup",
    "skill.html": "skill",
    "swap.html": "swap",
    "terms.html": "terms"
  };
  const card = (lines = 3) => `
    <article class="page-skeleton__card" aria-hidden="true">
      <i class="page-skeleton__block page-skeleton__block--icon"></i>
      <i class="page-skeleton__block page-skeleton__block--line page-skeleton__block--title"></i>
      ${Array.from({ length: lines }, () => '<i class="page-skeleton__block page-skeleton__block--line"></i>').join("")}
    </article>
  `;
  const cardGrid = (count = 3) => `
    <div class="page-skeleton__grid" aria-hidden="true">
      ${Array.from({ length: count }, () => card()).join("")}
    </div>
  `;
  const pageContent = (page) => {
    const heading = `
      <div class="page-skeleton__heading" aria-hidden="true">
        <i class="page-skeleton__block page-skeleton__block--line page-skeleton__block--eyebrow"></i>
        <i class="page-skeleton__block page-skeleton__block--line page-skeleton__block--heading"></i>
        <i class="page-skeleton__block page-skeleton__block--line page-skeleton__block--copy"></i>
      </div>
    `;

    if (page === "index.html") {
      return `
        <section class="page-skeleton__hero" aria-hidden="true">
          <div class="page-skeleton__hero-copy">${heading}
            <div class="page-skeleton__actions"><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i></div>
            <div class="page-skeleton__chips"><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i></div>
          </div>
          <div class="page-skeleton__hero-card">
            <i class="page-skeleton__block page-skeleton__block--chip"></i>
            <i class="page-skeleton__block page-skeleton__block--line page-skeleton__block--title"></i>
            <div class="page-skeleton__hero-stats"><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i></div>
            <div class="page-skeleton__hero-list"><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i></div>
          </div>
        </section>
        ${cardGrid(3)}
      `;
    }

    if (["login.html", "signup.html", "complete-profile.html", "forgot-password.html", "reset-password.html"].includes(page)) {
      const fieldCounts = {
        "login.html": 2,
        "signup.html": 3,
        "complete-profile.html": 3,
        "forgot-password.html": 1,
        "reset-password.html": 2
      };
      return `<section class="page-skeleton__auth" aria-hidden="true">${heading}<div class="page-skeleton__form">
        ${Array.from({ length: fieldCounts[page] }, () => '<i class="page-skeleton__block page-skeleton__block--field"></i>').join("")}
        ${page === "signup.html" ? '<i class="page-skeleton__block page-skeleton__block--consent"></i><i class="page-skeleton__block page-skeleton__block--consent"></i>' : ""}
        <i class="page-skeleton__block page-skeleton__block--button"></i>
      </div></section>`;
    }

    if (page === "browse.html") {
      return `${heading}<div class="page-skeleton__search" aria-hidden="true">
        <i class="page-skeleton__block page-skeleton__block--field"></i><i class="page-skeleton__block page-skeleton__block--button"></i>
        <div class="page-skeleton__chips"><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i></div>
      </div>${cardGrid(6)}`;
    }

    if (["about.html", "privacy.html", "terms.html"].includes(page)) {
      return `<article class="page-skeleton__article page-skeleton__article--${page.replace(".html", "")}" aria-hidden="true">
        <i class="page-skeleton__block page-skeleton__block--back"></i>${heading}
        ${Array.from({ length: page === "about.html" ? 4 : 7 }, () => '<i class="page-skeleton__block page-skeleton__block--line page-skeleton__block--paragraph"></i>').join("")}
        ${page === "about.html" ? cardGrid(2) : ""}
      </article>`;
    }

    if (page === "contact.html") {
      return `${heading}<div class="page-skeleton__split" aria-hidden="true">
        <article class="page-skeleton__card">${card(3)}</article>
        <article class="page-skeleton__card page-skeleton__form">${Array.from({ length: 4 }, () => '<i class="page-skeleton__block page-skeleton__block--field"></i>').join("")}<i class="page-skeleton__block page-skeleton__block--button"></i></article>
      </div>`;
    }

    if (page === "dashboard.html") {
      return `${heading}<div class="page-skeleton__metrics" aria-hidden="true">${Array.from({ length: 4 }, () => card(1)).join("")}</div>
        <section class="page-skeleton__progress" aria-hidden="true">${card(2)}${card(2)}</section>`;
    }

    if (page === "profile.html") {
      return `<section class="page-skeleton__profile" aria-hidden="true">
        <i class="page-skeleton__block page-skeleton__block--avatar"></i>
        <div>${heading}<i class="page-skeleton__block page-skeleton__block--button"></i></div>
      </section><div class="page-skeleton__split">${card(4)}${card(3)}</div>`;
    }

    if (page === "settings.html") {
      return `${heading}<div class="page-skeleton__settings" aria-hidden="true">
        <article class="page-skeleton__card">${card(3)}<i class="page-skeleton__block page-skeleton__block--field"></i></article>
        <article class="page-skeleton__card">${card(2)}<i class="page-skeleton__block page-skeleton__block--button"></i></article>
        <article class="page-skeleton__card">${card(2)}</article>
      </div>`;
    }

    if (page === "communities.html") {
      return `${heading}<div class="page-skeleton__chips" aria-hidden="true">${Array.from({ length: 4 }, () => '<i class="page-skeleton__block"></i>').join("")}</div>${cardGrid(4)}`;
    }

    if (page === "swap.html") {
      return `${heading}<div class="page-skeleton__exchange" aria-hidden="true">
        <article class="page-skeleton__card">${card(3)}<i class="page-skeleton__block page-skeleton__block--field"></i><i class="page-skeleton__block page-skeleton__block--button"></i></article>
        <section>${card(3)}${card(3)}</section>
      </div>`;
    }

    if (page === "saved-skills.html") {
      return `${heading}<div class="page-skeleton__saved" aria-hidden="true">${Array.from({ length: 4 }, () => card(2)).join("")}</div>`;
    }

    if (page === "skill.html") {
      return `${heading}<div class="page-skeleton__course" aria-hidden="true">
        <article class="page-skeleton__card">${card(4)}<div class="page-skeleton__chips"><i class="page-skeleton__block"></i><i class="page-skeleton__block"></i></div><i class="page-skeleton__block page-skeleton__block--button"></i></article>
        <section class="page-skeleton__course-lessons"><article class="page-skeleton__card">${card(5)}</article><article class="page-skeleton__card">${card(5)}</article></section>
      </div>`;
    }

    return `${heading}${cardGrid(3)}`;
  };

  function getCurrentPage() {
    const pathname = window.location.pathname;
    if (pathname.endsWith(".html")) return pathname.split("/").pop();

    try {
      const savedRoute = sessionStorage.getItem("skillex-current-route");
      if (savedRoute) {
        const savedPage = new URL(savedRoute, window.location.origin).pathname.split("/").pop();
        if (pageTypes[savedPage]) return savedPage;
      }
    } catch (error) {
      console.error("Could not read the initial Skillex page:", error);
    }

    const params = new URLSearchParams(window.location.search);
    new URLSearchParams(window.location.hash.slice(1)).forEach((value, key) => params.set(key, value));
    if (params.get("type") === "invite") return "complete-profile.html";
    if (params.get("type") === "recovery") return "reset-password.html";
    return "index.html";
  }

  const skeleton = document.createElement("div");
  skeleton.className = "page-skeleton";
  skeleton.dataset.visible = "true";
  skeleton.setAttribute("role", "status");
  skeleton.setAttribute("aria-live", "polite");
  skeleton.setAttribute("aria-label", "Loading page");

  skeleton.innerHTML = `
    <div class="page-skeleton__top" aria-hidden="true">
      <div class="page-skeleton__brand"><i class="page-skeleton__block page-skeleton__block--logo"></i><i class="page-skeleton__block page-skeleton__block--brand-name"></i></div>
      <i class="page-skeleton__block page-skeleton__block--action"></i>
    </div>
    <div class="page-skeleton__nav" aria-hidden="true">
      ${Array.from({ length: 5 }, () => '<i class="page-skeleton__block page-skeleton__block--nav-item"></i>').join("")}
    </div>
    <main class="page-skeleton__main"></main>
  `;
  document.body.append(skeleton);

  function show(path = window.location.pathname) {
    const filename = path.split("/").pop() || "index.html";
    const type = pageTypes[filename] || "home";
    skeleton.dataset.page = pageTypes[filename] || "home";
    skeleton.querySelector(".page-skeleton__main").innerHTML = pageContent(filename);
    skeleton.dataset.visible = "true";
    skeleton.setAttribute("aria-hidden", "false");
    skeleton.setAttribute("aria-label", `Loading ${filename.replace(".html", "").replaceAll("-", " ")} page`);
    document.body.setAttribute("aria-busy", "true");
    document.body.dataset.pageLoading = "true";
  }

  function hide() {
    skeleton.dataset.visible = "false";
    skeleton.setAttribute("aria-hidden", "true");
    document.body.setAttribute("aria-busy", "false");
    delete document.body.dataset.pageLoading;
    document.body.classList.remove("page-entering");
    void document.body.offsetWidth;
    document.body.classList.add("page-entering");
    window.setTimeout(() => document.body.classList.remove("page-entering"), 600);
  }

  window.SkillexPageSkeleton = { element: skeleton, show, hide };
  show(getCurrentPage());
})();
