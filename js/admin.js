(() => {
  const config = window.SKILLEX_SUPABASE_CONFIG;
  const supabase = config && window.supabase?.createClient
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;
  const state = {
    session: null,
    requests: [],
    members: [],
    memberPage: 1,
    moderationPosts: [],
    announcements: [],
    pages: [],
    pageFields: []
  };
  const byId = (id) => document.getElementById(id);

  function applyAdminTheme(preference, persist = false) {
    const root = document.documentElement;
    const useDark = preference === "dark"
      || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", useDark);
    document.body.classList.toggle("dark", useDark);
    root.setAttribute("data-theme", useDark ? "dark" : "light");
    root.setAttribute("data-theme-preference", preference);
    root.style.colorScheme = useDark ? "dark" : "light";
    if (persist) {
      try {
        localStorage.setItem("skillswap-theme", preference);
      } catch (error) {
        console.error("Could not save the dashboard theme preference:", error);
      }
    }
    const toggle = document.querySelector(".theme-toggle");
    if (toggle) {
      const icon = toggle.querySelector(".theme-toggle__icon");
      if (icon) icon.textContent = useDark ? "🌙" : "☀️";
      toggle.setAttribute("aria-label", useDark ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function initializeAdminTheme() {
    const root = document.documentElement;
    const preference = root.dataset.themePreference || "system";
    applyAdminTheme(preference);
    const toggle = document.querySelector(".theme-toggle");
    toggle?.addEventListener("click", () => {
      applyAdminTheme(root.classList.contains("dark") ? "light" : "dark", true);
    });
    const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    systemThemeQuery?.addEventListener?.("change", () => {
      if (root.dataset.themePreference === "system") applyAdminTheme("system");
    });
  }

  function setText(element, message) {
    if (element) element.textContent = message;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setSignedInUI(isSignedIn) {
    byId("admin-auth").hidden = isSignedIn;
    byId("admin-denied").hidden = true;
    byId("admin-workspace").hidden = !isSignedIn;
    byId("admin-owner-label").hidden = !isSignedIn;
    byId("admin-sign-out").hidden = !isSignedIn;
    setText(byId("admin-owner-label"), state.session?.user?.email || "");
  }

  function showDenied(message) {
    byId("admin-auth").hidden = true;
    byId("admin-workspace").hidden = true;
    byId("admin-denied").hidden = false;
    setText(byId("admin-denied-message"), message);
  }

  async function getSession() {
    if (!supabase) throw new Error("Supabase sign-in is unavailable. Check the public app configuration.");
    const result = await supabase.auth.getSession();
    if (result.error) throw result.error;
    state.session = result.data.session;
    return state.session;
  }

  async function request(resource, method = "GET", body, query = {}) {
    const session = await getSession();
    if (!session?.access_token) throw new Error("Sign in with the owner account to continue.");
    const url = new URL("/.netlify/functions/admin", window.location.origin);
    if (resource) url.searchParams.set("resource", resource);
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const response = await fetch(url.href, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      console.error("Owner dashboard returned a non-JSON response:", response.status);
      const isLocalStaticPreview = response.status === 404
        && ["localhost", "127.0.0.1"].includes(window.location.hostname);
      throw new Error(isLocalStaticPreview
        ? "Dashboard Functions are unavailable in this static preview. Use Netlify Dev with the required server configuration."
        : "The owner dashboard returned an invalid response.");
    }
    let result;
    try {
      result = await response.json();
    } catch (error) {
      console.error("Owner dashboard returned an invalid response:", error);
      throw new Error("The owner dashboard returned an invalid response.");
    }
    if (response.status === 403) {
      showDenied(result.error || "This account is not authorized to use the owner dashboard.");
      throw new Error(result.error || "Owner access is required.");
    }
    if (!response.ok) throw new Error(result.error || "The owner dashboard could not complete this action.");
    return result;
  }

  function showPanelError(container, error) {
    container.replaceChildren(element("p", "admin-empty-state", error.message || "This section could not be loaded."));
  }

  function renderMetrics(metrics) {
    const container = byId("admin-metrics");
    const values = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [
      key,
      Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0
    ]));
    const cards = [
      {
        label: "Access requests",
        value: values.totalRequests,
        detail: `${values.pendingRequests.toLocaleString()} awaiting review`,
        tone: "requests"
      },
      {
        label: "Members",
        value: values.members,
        detail: "Registered learner accounts",
        tone: "members"
      },
      {
        label: "Published discussions",
        value: values.publishedPosts,
        detail: `${values.hiddenPosts.toLocaleString()} hidden for review`,
        tone: "community"
      },
      {
        label: "Live site pages",
        value: `${values.publishedPages} / ${values.sitePages}`,
        detail: `${values.publishedAnnouncements} published announcements`,
        tone: "content"
      }
    ];
    container.replaceChildren(...cards.map((item) => {
      const card = element("article", `admin-stat-card admin-stat-card--${item.tone}`);
      const heading = element("div", "admin-stat-card__heading");
      heading.append(element("span", "admin-stat-card__label", item.label));
      heading.append(element("span", "admin-stat-card__dot", ""));
      card.append(heading);
      card.append(element("strong", "admin-stat-card__value",
        typeof item.value === "number" ? item.value.toLocaleString() : item.value));
      card.append(element("span", "admin-stat-card__detail", item.detail));
      return card;
    }));
    renderRequestInsights(values);
    renderCommunityInsights(values);
    renderContentInsights(values);
    setText(byId("admin-metrics-updated"), `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
  }

  function metricPercent(value, total) {
    return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  }

  function progressRing(value, total, label, tone) {
    const percent = metricPercent(value, total);
    const ring = element("div", `admin-ring admin-ring--${tone}`);
    ring.style.setProperty("--progress", `${percent}%`);
    ring.setAttribute("role", "img");
    ring.setAttribute("aria-label", `${label}: ${value} of ${total} (${percent}%)`);
    ring.append(element("strong", "admin-ring__value", `${percent}%`));
    ring.append(element("span", "admin-ring__label", label));
    return ring;
  }

  function progressRow(label, value, total, tone) {
    const percent = metricPercent(value, total);
    const row = element("div", "admin-progress-row");
    const heading = element("div", "admin-progress-row__heading");
    heading.append(element("span", "admin-progress-row__label", label));
    heading.append(element("span", "admin-progress-row__value", `${value.toLocaleString()} / ${total.toLocaleString()}`));
    const track = element("div", "admin-progress-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", label);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(percent));
    const fill = element("span", `admin-progress-fill admin-progress-fill--${tone}`);
    fill.style.width = `${percent}%`;
    track.append(fill);
    row.append(heading, track);
    return row;
  }

  function renderInsight(container, value, total, ringLabel, ringTone, rows) {
    const layout = element("div", "admin-insight-layout");
    layout.append(progressRing(value, total, ringLabel, ringTone));
    const progressList = element("div", "admin-progress-list");
    rows.forEach(([label, count, denominator, tone]) => {
      progressList.append(progressRow(label, count, denominator, tone));
    });
    layout.append(progressList);
    container.replaceChildren(layout);
  }

  function renderRequestInsights(metrics) {
    renderInsight(byId("admin-request-insights"),
      metrics.completedRequests,
      metrics.totalRequests,
      "Completed",
      "primary",
      [
        ["Verifying", metrics.pendingRequests, metrics.totalRequests, "amber"],
        ["Approved", metrics.approvedRequests, metrics.totalRequests, "blue"],
        ["Invited", metrics.invitedRequests, metrics.totalRequests, "violet"],
        ["Completed", metrics.completedRequests, metrics.totalRequests, "green"],
        ["Declined", metrics.declinedRequests, metrics.totalRequests, "muted"]
      ]);
  }

  function renderCommunityInsights(metrics) {
    renderInsight(byId("admin-community-insights"),
      metrics.publishedPosts,
      metrics.communityPosts,
      "Visible posts",
      "green",
      [
        ["Published", metrics.publishedPosts, metrics.communityPosts, "green"],
        ["Hidden", metrics.hiddenPosts, metrics.communityPosts, "amber"],
        ["Removed", metrics.removedPosts, metrics.communityPosts, "muted"]
      ]);
  }

  function renderContentInsights(metrics) {
    renderInsight(byId("admin-content-insights"),
      metrics.publishedPages,
      metrics.sitePages,
      "Live pages",
      "violet",
      [
        ["Pages published", metrics.publishedPages, metrics.sitePages, "violet"],
        ["Announcements live", metrics.publishedAnnouncements, metrics.announcements, "green"],
        ["Announcement drafts", metrics.draftAnnouncements, metrics.announcements, "amber"]
      ]);
  }

  function requestCard(requestItem) {
    const card = element("article", "admin-record");
    const heading = element("div", "admin-record__heading");
    const headingText = element("div");
    headingText.append(element("h3", "", requestItem.name));
    headingText.append(element("p", "admin-record__meta", requestItem.email));
    heading.append(headingText);
    heading.append(element("span", `admin-status admin-status--${requestItem.status}`, requestItem.status));
    card.append(heading);
    const submitted = requestItem.created_at ? new Date(requestItem.created_at).toLocaleString() : "Date unavailable";
    card.append(element("p", "admin-record__meta", `Submitted ${submitted}`));
    if (requestItem.interests) card.append(element("p", "admin-record__body", requestItem.interests));
    const actions = element("div", "admin-actions");
    if (requestItem.status === "pending") {
      actions.append(actionButton("approve-request", requestItem.id, "Approve"));
      actions.append(actionButton("decline-request", requestItem.id, "Decline", "btn-danger"));
    } else if (requestItem.status === "approved") {
      actions.append(actionButton("invite-request", requestItem.id, "Send Supabase invitation"));
      actions.append(actionButton("decline-request", requestItem.id, "Decline", "btn-danger"));
    }
    if (actions.childElementCount) card.append(actions);
    return card;
  }

  function actionButton(action, id, label, style = "btn-secondary") {
    const button = element("button", `btn btn-small ${style}`, label);
    button.type = "button";
    button.dataset.adminAction = action;
    button.dataset.recordId = id;
    return button;
  }

  function renderRequests() {
    const container = byId("admin-requests");
    const filter = byId("admin-request-filter").value;
    const requests = filter === "all" ? state.requests : state.requests.filter((item) => item.status === filter);
    container.replaceChildren(...(requests.length
      ? requests.map(requestCard)
      : [element("p", "admin-empty-state", "No requests match this filter.")]));
  }

  function renderMembers() {
    const container = byId("admin-members");
    const search = byId("admin-member-search").value.trim().toLowerCase();
    const filtered = state.members.filter((member) =>
      `${member.name} ${member.email}`.toLowerCase().includes(search));
    container.replaceChildren(...(filtered.length ? filtered.map((member) => {
      const card = element("article", "admin-record");
      const heading = element("div", "admin-record__heading");
      const identity = element("div");
      identity.append(element("h3", "", member.name || "Skillex member"));
      identity.append(element("p", "admin-record__meta", member.email));
      heading.append(identity);
      heading.append(element("span", `admin-status ${member.bannedUntil ? "admin-status--declined" : "admin-status--completed"}`,
        member.bannedUntil ? "Suspended" : "Active"));
      card.append(heading);
      if (member.bio) card.append(element("p", "admin-record__body", member.bio));
      const joined = member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "Date unavailable";
      card.append(element("p", "admin-record__meta", `Joined ${joined}${member.emailConfirmed ? "" : " · Email not confirmed"}`));
      card.append(actionButton("set-member-access", member.id, member.bannedUntil ? "Restore access" : "Suspend member"));
      return card;
    }) : [element("p", "admin-empty-state", search ? "No members match that search." : "No members found.")]));
  }

  function renderModeration() {
    const container = byId("admin-moderation");
    container.replaceChildren(...(state.moderationPosts.length ? state.moderationPosts.map((post) => {
      const card = element("article", "admin-record");
      const heading = element("div", "admin-record__heading");
      heading.append(element("h3", "", post.author));
      heading.append(element("span", `admin-status admin-status--${post.status}`, post.status));
      card.append(heading);
      card.append(element("p", "admin-record__meta", post.skill_id));
      card.append(element("p", "admin-record__body", post.body));
      const actions = element("div", "admin-actions");
      if (post.status !== "published") actions.append(actionButton("moderate-publish", post.id, "Publish"));
      if (post.status !== "hidden") actions.append(actionButton("moderate-hide", post.id, "Hide", "btn-secondary"));
      actions.append(actionButton("moderate-remove", post.id, "Remove", "btn-danger"));
      card.append(actions);
      return card;
    }) : [element("p", "admin-empty-state", "There are no discussion posts to review.")]));
  }

  function announcementCard(item) {
    const card = element("article", "admin-record");
    const heading = element("div", "admin-record__heading");
    heading.append(element("h3", "", item.title));
    heading.append(element("span", `admin-status ${item.status === "published" ? "admin-status--completed" : ""}`, item.status));
    card.append(heading);
    card.append(element("p", "admin-record__body", item.body));
    const actions = element("div", "admin-actions");
    const edit = element("button", "btn btn-secondary btn-small", "Edit");
    edit.type = "button";
    edit.dataset.announcementEdit = item.id;
    actions.append(edit);
    const remove = actionButton("delete-announcement", item.id, "Delete", "btn-danger");
    actions.append(remove);
    card.append(actions);
    return card;
  }

  function renderAnnouncements() {
    const container = byId("admin-announcements");
    container.replaceChildren(...(state.announcements.length
      ? state.announcements.map(announcementCard)
      : [element("p", "admin-empty-state", "No announcements yet.")]));
  }

  function renderPages() {
    const container = byId("admin-pages");
    container.replaceChildren(...(state.pages.length ? state.pages.map((page) => {
      const card = element("article", "admin-record");
      const heading = element("div", "admin-record__heading");
      heading.append(element("h3", "", page.title));
      const hasPublishedContent = Boolean(page.published_at);
      const orderContent = (content) => JSON.stringify(Object.keys(content || {}).sort().map((key) => [key, content[key]]));
      const hasNewerDraft = page.updated_at && page.published_at && Date.parse(page.updated_at) > Date.parse(page.published_at);
      const hasUnpublishedChanges = hasPublishedContent
        && (hasNewerDraft || orderContent(page.draft_content) !== orderContent(page.content));
      const status = !hasPublishedContent
        ? "Draft only"
        : hasUnpublishedChanges ? "Unpublished edits" : "Published";
      const statusClass = hasUnpublishedChanges ? "admin-status--pending" : hasPublishedContent ? "admin-status--completed" : "";
      heading.append(element("span", `admin-status ${statusClass}`, status));
      card.append(heading);
      const updated = page.updated_at && Number.isFinite(Date.parse(page.updated_at))
        ? new Date(page.updated_at).toLocaleDateString()
        : "Date unavailable";
      card.append(element("p", "admin-record__meta", `${page.page_key} · Updated ${updated}`));
      const edit = element("button", "btn btn-secondary btn-small", "Edit page");
      edit.type = "button";
      edit.dataset.pageEdit = page.page_key;
      card.append(edit);
      return card;
    }) : [element("p", "admin-empty-state", "No page drafts exist yet. Choose a page above to start editing.")]));
  }

  async function loadPageEditor(pageKey = byId("admin-page-form").elements.namedItem("pageKey").value) {
    const container = byId("admin-page-fields");
    const titleInput = byId("admin-page-form").elements.namedItem("title");
    const page = state.pages.find((item) => item.page_key === pageKey);
    byId("admin-page-preview").href = new URL(`/${pageKey}.html`, window.location.origin).href;
    const response = await fetch(new URL(`/${pageKey}.html`, window.location.origin));
    if (!response.ok) throw new Error("The selected page template could not be loaded.");
    const html = await response.text();
    const template = new DOMParser().parseFromString(html, "text/html");
    state.pageFields = [...template.querySelectorAll("[data-cms-key]")].map((target) => ({
      key: target.dataset.cmsKey,
      label: target.dataset.cmsLabel || target.dataset.cmsKey,
      defaultValue: target.textContent.trim(),
      multiline: target.dataset.cmsMultiline === "true" || target.tagName === "P"
    }));
    titleInput.value = page?.title || template.title || pageKey;
    const values = page?.draft_content || page?.content || {};
    if (!state.pageFields.length) {
      container.replaceChildren(element("p", "admin-empty-state", "This page has no editable text fields yet."));
      return;
    }
    const groups = new Map();
    const groupLabels = {
      hero: "Page introduction",
      request: "Request access",
      explore: "Explore skills",
      highlight: "Key highlights",
      popular: "Popular skills",
      skill: "Skill cards",
      steps: "How it works",
      step: "Learning steps",
      benefits: "Benefits",
      benefit: "Benefit cards",
      cta: "Call to action",
      policy: "Policy details",
      information: "Information section",
      use: "How information is used",
      services: "Services",
      storage: "Storage",
      choices: "Data choices",
      eligibility: "Eligibility",
      updates: "Policy updates"
    };
    state.pageFields.forEach((field) => {
      const groupKey = field.key.split("-")[0];
      let group = groups.get(groupKey);
      if (!group) {
        group = document.createElement("details");
        group.className = "admin-cms-section";
        const summary = element("summary", "", groupLabels[groupKey]
          || groupKey.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (letter) => letter.toUpperCase()));
        group.append(summary);
        groups.set(groupKey, group);
      }
      const label = element("label", "admin-cms-field", field.label);
      const input = field.multiline ? document.createElement("textarea") : document.createElement("input");
      input.name = field.key;
      input.dataset.cmsField = field.key;
      input.value = typeof values[field.key] === "string" ? values[field.key] : field.defaultValue;
      if (field.multiline) input.rows = 3;
      label.append(input);
      group.append(label);
    });
    const sections = [...groups.values()];
    if (sections.length) sections[0].open = true;
    container.replaceChildren(...sections);
  }

  function collectPageContent() {
    return Object.fromEntries([...byId("admin-page-fields").querySelectorAll("[data-cms-field]")]
      .map((field) => [field.dataset.cmsField, field.value]));
  }

  async function loadResource(resource, render, container) {
    try {
      const data = await request(resource);
      render(data);
    } catch (error) {
      showPanelError(container, error);
    }
  }

  async function loadMembers(page = 1) {
    const container = byId("admin-members");
    try {
      const result = await request("members", "GET", undefined, { page });
      state.memberPage = page;
      state.members = page === 1 ? result.members : [...state.members, ...result.members];
      byId("admin-members-next").hidden = !result.hasMore;
      renderMembers();
    } catch (error) {
      showPanelError(container, error);
    }
  }

  async function loadWorkspace() {
    setSignedInUI(true);
    setText(byId("admin-global-status"), "Loading owner dashboard…");
    const overviewContainer = byId("admin-metrics");
    await loadResource("overview", (result) => renderMetrics(result.metrics), overviewContainer);
    await Promise.all([
      loadResource("requests", (result) => { state.requests = result.requests; renderRequests(); }, byId("admin-requests")),
      loadMembers(1),
      loadResource("moderation", (result) => { state.moderationPosts = result.posts; renderModeration(); }, byId("admin-moderation")),
      loadResource("announcements", (result) => { state.announcements = result.announcements; renderAnnouncements(); }, byId("admin-announcements")),
      loadResource("pages", (result) => { state.pages = result.pages; renderPages(); }, byId("admin-pages"))
    ]);
    try {
      await loadPageEditor();
    } catch (error) {
      showPanelError(byId("admin-page-fields"), error);
    }
    setText(byId("admin-global-status"), "");
  }

  async function runAction(button, body, successMessage) {
    button.disabled = true;
    setText(byId("admin-global-status"), "Saving…");
    try {
      await request(null, "POST", body);
      setText(byId("admin-global-status"), successMessage);
      await loadWorkspace();
      setText(byId("admin-global-status"), successMessage);
      return true;
    } catch (error) {
      setText(byId("admin-global-status"), error.message);
      return false;
    } finally {
      button.disabled = false;
    }
  }

  function activateTab(tabName) {
    document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
      if (tab.dataset.adminTab === tabName) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.adminPanel !== tabName;
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setText(byId("admin-auth-status"), "Signing in…");
    try {
      if (!supabase) throw new Error("Supabase sign-in is unavailable. Check the public app configuration.");
      const values = new FormData(form);
      const result = await supabase.auth.signInWithPassword({
        email: values.get("email").toString().trim(),
        password: values.get("password").toString()
      });
      if (result.error) throw result.error;
      state.session = result.data.session;
      await loadWorkspace();
    } catch (error) {
      setText(byId("admin-auth-status"), error.message || "Sign in failed.");
    } finally {
      submit.disabled = false;
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    state.session = null;
    byId("admin-workspace").hidden = true;
    byId("admin-denied").hidden = true;
    byId("admin-auth").hidden = false;
    byId("admin-owner-label").hidden = true;
    byId("admin-sign-out").hidden = true;
  }

  function initializeActions() {
    document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab.dataset.adminTab));
    });
    document.querySelectorAll("[data-admin-open-tab]").forEach((button) => {
      button.addEventListener("click", () => activateTab(button.dataset.adminOpenTab));
    });
    byId("admin-login-form").addEventListener("submit", handleLogin);
    byId("admin-refresh").addEventListener("click", loadWorkspace);
    byId("admin-sign-out").addEventListener("click", signOut);
    byId("admin-denied-sign-out").addEventListener("click", signOut);
    byId("admin-request-filter").addEventListener("change", renderRequests);
    byId("admin-member-search").addEventListener("input", renderMembers);
    byId("admin-members-next").addEventListener("click", () => loadMembers(state.memberPage + 1));
    document.body.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-admin-action]");
      if (button) {
        const action = button.dataset.adminAction;
        const id = button.dataset.recordId;
        if (action === "delete-announcement" && !window.confirm("Delete this announcement?")) return;
        const actionBody = {
          "approve-request": { action: "approve-request", requestId: id },
          "decline-request": { action: "decline-request", requestId: id },
          "invite-request": { action: "invite-request", requestId: id },
          "set-member-access": {
            action: "set-member-access",
            userId: id,
            suspended: !button.closest(".admin-record").querySelector(".admin-status").textContent.includes("Suspended")
          },
          "moderate-publish": { action: "moderate-post", postId: id, status: "published" },
          "moderate-hide": { action: "moderate-post", postId: id, status: "hidden" },
          "moderate-remove": { action: "moderate-post", postId: id, status: "removed" },
          "delete-announcement": { action: "delete-announcement", id }
        }[action];
        if (actionBody) await runAction(button, actionBody, "Changes saved.");
        return;
      }

      const editAnnouncement = event.target.closest("[data-announcement-edit]");
      if (editAnnouncement) {
        const announcement = state.announcements.find((item) => item.id === editAnnouncement.dataset.announcementEdit);
        if (!announcement) return;
        const form = byId("admin-announcement-form");
        form.elements.namedItem("id").value = announcement.id;
        form.elements.namedItem("title").value = announcement.title;
        form.elements.namedItem("body").value = announcement.body;
        form.elements.namedItem("publish").checked = announcement.status === "published";
        activateTab("announcements");
      }

      const editPage = event.target.closest("[data-page-edit]");
      if (editPage) {
        const form = byId("admin-page-form");
        form.elements.namedItem("pageKey").value = editPage.dataset.pageEdit;
        await loadPageEditor(editPage.dataset.pageEdit);
        activateTab("pages");
      }
    });
    byId("admin-announcement-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form);
      const button = form.querySelector('button[type="submit"]');
      const saved = await runAction(button, {
        action: "save-announcement",
        id: values.get("id") || undefined,
        title: values.get("title"),
        body: values.get("body"),
        status: values.get("publish") === "on" ? "published" : "draft"
      }, "Announcement saved.");
      if (!saved) {
        setText(byId("admin-announcement-status"), byId("admin-global-status").textContent);
        return;
      }
      setText(byId("admin-announcement-status"), "Announcement saved.");
      form.reset();
    });
    byId("admin-announcement-reset").addEventListener("click", () => byId("admin-announcement-form").reset());
    byId("admin-page-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form);
      const button = form.querySelector('button[type="submit"]');
      try {
        const saved = await runAction(button, {
          action: "save-page",
          pageKey: values.get("pageKey"),
          title: values.get("title"),
          content: collectPageContent()
        }, "Page draft saved.");
        if (!saved) {
          setText(byId("admin-page-status"), byId("admin-global-status").textContent);
          return;
        }
        setText(byId("admin-page-status"), "Page draft saved.");
      } catch (error) {
        setText(byId("admin-page-status"), error.message);
      }
    });
    byId("admin-page-publish").addEventListener("click", async (event) => {
      const form = byId("admin-page-form");
      const values = new FormData(form);
      const published = await runAction(event.currentTarget, {
        action: "publish-page",
        pageKey: values.get("pageKey")
      }, "Page content published.");
      if (!published) {
        setText(byId("admin-page-status"), byId("admin-global-status").textContent);
        return;
      }
      setText(byId("admin-page-status"), "Page content published.");
    });
    byId("admin-page-form").elements.namedItem("pageKey").addEventListener("change", (event) => {
      loadPageEditor(event.currentTarget.value).catch((error) => showPanelError(byId("admin-page-fields"), error));
    });
  }

  async function initialize() {
    initializeAdminTheme();
    initializeActions();
    try {
      const session = await getSession();
      if (!session) {
        setSignedInUI(false);
        return;
      }
      await loadWorkspace();
    } catch (error) {
      setSignedInUI(false);
      setText(byId("admin-auth-status"), error.message || "The owner dashboard could not be initialized.");
    }
  }

  initialize();
})();
