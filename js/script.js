(function () {
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const themeToggle = document.querySelector(".theme-toggle");
const body = document.body;
const backend = window.SkillexBackend;
let lessonViewStart = null;
let toastDismissTimer;
let toastRemovalTimer;
const STORAGE_KEYS = {
  theme: "skillswap-theme",
  users: "skillswap-users",
  currentUser: "skillswap-current-user",
  savedSkills: "skillswap-saved-skills",
  progress: "skillswap-progress",
  recentSkills: "skillswap-recent-skills",
  savedLessons: "skillswap-saved-lessons",
  timeSpent: "skillswap-time-spent",
  swapRequests: "skillswap-swap-requests",
  swapNotifications: "skillex-swap-notifications",
  communities: "skillswap-communities",
  discussions: "skillswap-discussions",
};

function navigateTo(url, historyMode = "push") {
  if (typeof window.SkillexNavigate === "function") {
    window.SkillexNavigate(url, historyMode);
  } else {
    window.location.href = url;
  }
}

function showBackendStatus(message) {
  let status = document.querySelector("[data-backend-status]");
  if (!status) {
    status = document.createElement("p");
    status.className = "backend-status";
    status.dataset.backendStatus = "true";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    document.querySelector("main")?.prepend(status);
  }
  status.textContent = message;
}

function showToast(message, type = "info", duration = 5200) {
  let toast = document.querySelector(".app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    document.body.append(toast);
  }

  window.clearTimeout(toastDismissTimer);
  window.clearTimeout(toastRemovalTimer);
  toast.className = `app-toast app-toast--${type}`;
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  toastDismissTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toastRemovalTimer = window.setTimeout(() => toast.remove(), 320);
  }, duration);
}

window.SkillexShowToast = showToast;

function showPendingToast() {
  try {
    const pendingToast = sessionStorage.getItem("skillex-pending-toast");
    if (!pendingToast) return;
    sessionStorage.removeItem("skillex-pending-toast");
    const { message, type } = JSON.parse(pendingToast);
    if (message) showToast(message, type);
  } catch (error) {
    console.error("Could not restore Skillex notification:", error);
  }
}

function savePendingToast(message, type) {
  sessionStorage.setItem("skillex-pending-toast", JSON.stringify({ message, type }));
}

function reportBackendError(error, operation) {
  console.error(`Skillex ${operation} failed:`, error);
  showBackendStatus(`We couldn't ${operation}. ${error.message || "Please try again."}`);
}

function persistForCurrentUser(task, operation) {
  const user = getCurrentUser();
  if (!backend?.isConfigured || !user?.id) return;
  Promise.resolve().then(() => task(user)).catch((error) => reportBackendError(error, operation));
}

const skillCatalog = [
  {
    id: "html-css",
    title: "HTML & CSS",
    description: "Build reliable, modern web layouts and ship polished pages that work across devices.",
    category: "Development",
    level: "Beginner",
    time: "4 weeks",
    intro: "Learn the foundations of the web through a complete course that starts with semantic HTML, moves into CSS styling, and finishes with a responsive project you can publish.",
    roadmap: [
      "Week 1: Understand HTML structure, elements, and page semantics.",
      "Week 2: Style pages using CSS selectors, colors, typography, and spacing.",
      "Week 3: Build responsive layouts with flexbox, grid, and media queries.",
      "Week 4: Finish a polished landing page and refine it with accessibility and best practices."
    ],
    outcome: "Create a responsive portfolio landing page for a real client project.",
    objectives: ["Build semantic page layouts", "Create polished styling", "Make pages responsive"],
    modules: ["Introduction to HTML", "HTML Syntax", "Headings and Paragraphs", "Lists and Links", "Images and Media", "Introduction to CSS", "Colors and Backgrounds", "Typography", "The Box Model", "Flexbox", "CSS Grid", "Responsive Design", "Mini Project", "Final Project"],
    lessons: ["Introduction to HTML", "HTML Syntax", "Headings and Paragraphs", "Lists and Links", "Images and Media", "Introduction to CSS", "Colors and Backgrounds", "Typography", "The Box Model", "Flexbox", "CSS Grid", "Responsive Design", "Mini Project", "Final Project"],
    curriculum: {
      beginner: [
        { title: "Introduction to HTML", description: "Understand how semantic tags create structure, readability, and accessibility for the web." },
        { title: "HTML Syntax", description: "Practice tags, attributes, nesting, and document structure with clear examples." },
        { title: "Headings and Paragraphs", description: "Learn how to organize page content into a strong reading experience." },
        { title: "Lists and Links", description: "Create navigation and content lists that feel clear and user-friendly." },
        { title: "Images and Media", description: "Add visuals and media in a way that supports your message and layout." }
      ],
      intermediate: [
        { title: "Introduction to CSS", description: "Add style with selectors, declarations, and a consistent design system." },
        { title: "Colors and Backgrounds", description: "Use color and background choices to build mood, contrast, and polish." },
        { title: "Typography", description: "Improve readability with well-chosen fonts, spacing, and hierarchy." },
        { title: "The Box Model", description: "Control spacing, borders, and layout behavior with confidence." },
        { title: "Flexbox and Grid", description: "Arrange content into modern layouts that adapt across screen sizes." }
      ],
      advanced: [
        { title: "Responsive Design", description: "Ensure your page offers a smooth experience on mobile, tablet, and desktop." },
        { title: "Forms and Inputs", description: "Build accessible forms that look polished and work reliably." },
        { title: "Semantic HTML", description: "Use meaningful markup that helps browsers, search engines, and assistive tools." },
        { title: "Mini Project", description: "Create a landing page with a hero, benefits section, and clear calls to action." },
        { title: "Final Project", description: "Ship a complete portfolio-style webpage using the full course roadmap." }
      ]
    },
    lessonDetails: [
      {
        title: "Introduction to HTML",
        description: "Understand how semantic tags create structure, readability, and accessibility for the web.",
        introduction: "This lesson introduces what HTML is and how it forms the skeleton of every webpage.",
        why: "HTML is the language browsers use to display content. Learning it lets you create meaningful, accessible web pages.",
        simpleExplanation: "HTML uses tags like <html>, <head>, and <body> to organize content; tags wrap content to give it meaning.",
        analogy: "Think of HTML as the frame of a house — it gives the rooms and walls where furniture (content) will go.",
        visual: "A simple page structure: \n<!doctype html>\n<html>\n  <head>...</head>\n  <body>...</body>\n</html>",
        explanation: "HTML stands for HyperText Markup Language. Elements are written with angled brackets like <tag>content</tag>. Attributes add extra information to elements, e.g., <img src=\"image.jpg\" alt=\"...\">.",
        examples: "Example: <h1>Welcome</h1> creates a top-level heading. <p>This is a paragraph.</p> creates body text.",
        interactive: "Try creating a small HTML file with a heading, a paragraph, and an image. Use the live preview to see changes instantly.",
        commonMistakes: ["Forgetting to close tags", "Using <div> for everything instead of semantic elements", "Missing alt on images"],
        memoryAid: "Remember: Tags wrap content — start tag, content, end tag. Headings use h1..h6.",
        exercises: [
          "Create a new HTML file and add a title and one paragraph.",
          "Add an image with an appropriate alt attribute.",
          "Create a list of three favorite websites using <ul> and <li>.",
        ],
        quiz: {
          q: "What does HTML primarily define on a webpage?",
          options: ["Styling and colors", "Structure and content", "Server-side routes", "Database schema"],
          answer: 1
        },
        miniProject: "Build a single-file simple info page about yourself: a heading, a profile paragraph, and a small list of interests.",
        summary: "HTML provides the structure of a webpage through elements and attributes. Semantic tags improve accessibility.",
        revision: "Key tags: html, head, body, h1-h6, p, a, img, ul/ol/li. Always include alt for images.",
        nextLesson: "HTML Syntax"
      },
      {
        title: "HTML Syntax",
        description: "Practice tags, attributes, nesting, and document structure with clear examples.",
        introduction: "Learn the precise syntax rules that make HTML valid and reliable across browsers.",
        why: "Correct syntax ensures browsers render your content consistently and helps screen readers and search engines.",
        simpleExplanation: "Elements use a start tag (<tag>), content, and an end tag (</tag>); some elements are self-closing like <img>.",
        analogy: "Think of tags as containers — some hold content, others are single objects like images.",
        visual: "<div>\n  <p>Paragraph inside a div</p>\n</div>",
        explanation: "Nesting must be correct: open a tag, add content, and close in reverse order. Attributes are key-value pairs inside the start tag.",
        examples: "<a href=\"https://example.com\">Link</a> sets an href attribute. <img src=\"x.jpg\" alt=\"...\"> shows an image.",
        interactive: "Edit an example page to add links and images; test broken markup to see rendering differences and fix them.",
        commonMistakes: ["Incorrectly nested tags", "Unescaped characters in text (< & >)", "Missing quotes around attribute values in some situations"],
        memoryAid: "Keep nesting tidy: close what you open in reverse order (like stacking plates).",
        exercises: [
          "Fix a broken HTML snippet with mismatched tags.",
          "Add two links that open in a new tab using target='_blank'.",
          "Create an image gallery using three <img> tags inside a <div>."
        ],
        quiz: {
          q: "Which is a self-closing element?",
          options: ["<p>", "<img>", "<div>", "<section>"],
          answer: 1
        },
        miniProject: "Create a small profile card using proper nesting: an image, a heading, and a short bio.",
        summary: "HTML syntax relies on correct tag structure, attributes, and proper nesting to build reliable pages.",
        revision: "Always validate nesting and use semantic elements when possible.",
        nextLesson: "Headings and Paragraphs"
      },
      {
        title: "Headings and Paragraphs",
        description: "Learn how to organize page content into a strong reading experience.",
        introduction: "Headings create a visible structure and outline for readers and machines; paragraphs hold readable text.",
        why: "Proper headings improve accessibility, search engine understanding, and document flow.",
        simpleExplanation: "Use <h1> for the main title, then <h2>..<h6> for subheadings. Use <p> for paragraphs of text.",
        analogy: "Headings are chapter titles in a book; paragraphs are the sentences and paragraphs inside that chapter.",
        visual: "<h1>Main title</h1>\n<h2>Section title</h2>\n<p>Supporting text here.</p>",
        explanation: "Avoid skipping heading levels for visual reasons alone; keep semantic order. Paragraphs can contain inline elements like <strong> and <a>.",
        examples: "Good: <h1>Site</h1><h2>About</h2><p>Contact info.</p> — Bad: using <div> styled as headings.",
        interactive: "Refactor a messy HTML file by replacing styled divs with real heading tags and paragraphs; compare accessibility with a screen reader tool.",
        commonMistakes: ["Using headings purely for visual size", "Skipping h1 or using multiple h1s incorrectly", "Putting block elements inside <p> tags"],
        memoryAid: "One main title (<h1>), then descending levels like an outline.",
        exercises: [
          "Create a document outline with one h1, two h2s, and two paragraphs under each.",
          "Convert three divs used as headings into semantic heading tags.",
          "Wrap provided text into appropriate <p> tags and add emphasis where needed."
        ],
        quiz: {
          q: "Which tag should be used for the main page title?",
          options: ["<h2>", "<h1>", "<p>", "<div>"],
          answer: 1
        },
        miniProject: "Take a plain HTML article and mark it up with headings and paragraphs to create a clear structure.",
        summary: "Headings and paragraphs are the backbone of readable content; use semantic tags for structure and accessibility.",
        revision: "Remember the heading hierarchy and keep paragraphs for flow; avoid block elements inside <p>.",
        nextLesson: "Lists and Links"
      },
      {
        title: "Lists and Links",
        description: "Create navigation and content lists that feel clear and user-friendly.",
        introduction: "Lists organize related items and links connect pages together, forming the backbone of website navigation.",
        why: "Almost every navigation menu, article, and footer relies on lists and links, so getting them right affects usability everywhere.",
        simpleExplanation: "Use <ul> for unordered lists, <ol> for numbered lists, <li> for each item, and <a href=\"...\"> for links.",
        analogy: "A list is like a grocery list on paper; a link is like a signpost pointing somewhere else.",
        visual: "<nav>\n  <ul>\n    <li><a href=\"index.html\">Home</a></li>\n    <li><a href=\"browse.html\">Browse</a></li>\n  </ul>\n</nav>",
        explanation: "The href attribute sets the destination of a link (a page, a section with #id, or an external site). Nest <a> around text or elements to make them clickable. Use <ol> when order matters (steps, rankings) and <ul> when it doesn't.",
        examples: "<a href=\"https://developer.mozilla.org\" target=\"_blank\" rel=\"noopener\">MDN Docs</a> opens in a new tab safely with rel=\"noopener\".",
        interactive: "Build a simple nav bar with three links, then a numbered list of steps for a recipe or tutorial.",
        commonMistakes: ["Forgetting rel=\"noopener\" with target=\"_blank\"", "Using <li> outside a <ul>/<ol>", "Linking with # and forgetting to set a real href"],
        memoryAid: "Lists group, links connect — ul/ol wrap li, a wraps clickable content.",
        exercises: ["Build a 4-item navigation menu using ul/li/a.", "Create a numbered list of 5 steps for any process.", "Add an internal link that jumps to a section using an id and #anchor."],
        quiz: { q: "Which tag creates a numbered list?", options: ["<ul>", "<ol>", "<li>", "<nav>"], answer: 1 },
        miniProject: "Build a simple site footer with a link list to Home, Browse, and Contact pages.",
        summary: "Lists structure related content and links connect pages, forming the core of site navigation.",
        revision: "Practice building nav menus until ul/li/a nesting feels automatic.",
        nextLesson: "Images and Media"
      },
      {
        title: "Images and Media",
        description: "Add visuals and media in a way that supports your message and layout.",
        introduction: "Images, video, and audio bring pages to life, but they need to be added correctly to stay fast and accessible.",
        why: "Unoptimized or mislabeled media slows pages down and locks out users relying on screen readers.",
        simpleExplanation: "Use <img src=\"...\" alt=\"...\"> for images, <video> for video, and always describe what the media shows.",
        analogy: "Alt text is like a caption you'd read aloud to someone who can't see the picture.",
        visual: "<img src=\"team.jpg\" alt=\"Four students working on laptops in a study room\" width=\"600\" height=\"400\" loading=\"lazy\">",
        explanation: "Set width/height so the browser reserves space and the page doesn't jump while loading. Use loading=\"lazy\" for images below the fold. For purely decorative images, use alt=\"\" so screen readers skip them.",
        examples: "<video controls src=\"demo.mp4\"></video> adds a video with built-in play controls.",
        interactive: "Add three images to a page with meaningful alt text, then test how it reads with a screen reader or browser accessibility tool.",
        commonMistakes: ["Leaving alt attributes empty on meaningful images", "Using huge unoptimized image files", "Forgetting width/height causing layout shift"],
        memoryAid: "Every image tells someone what it shows — write the alt text like a caption.",
        exercises: ["Add an image with descriptive alt text.", "Embed a video with controls.", "Compress an oversized image before using it."],
        quiz: { q: "What does the alt attribute do?", options: ["Sets image width", "Describes the image for accessibility", "Changes the file format", "Adds a border"], answer: 1 },
        miniProject: "Build a small gallery section with three images, proper alt text, and captions using <figure> and <figcaption>.",
        summary: "Media should be optimized, sized, and described so pages stay fast and accessible.",
        revision: "Always ask: does this image need alt text, and is the file size reasonable?",
        nextLesson: "Introduction to CSS"
      },
      {
        title: "Introduction to CSS",
        description: "Add style with selectors, declarations, and a consistent design system.",
        introduction: "CSS gives your HTML structure a visual identity and controls how each page feels.",
        why: "Without CSS, pages are harder to read and less engaging for visitors.",
        simpleExplanation: "CSS uses selectors to target elements and declarations to change their appearance.",
        analogy: "Think of CSS as choosing the clothing, lighting, and decoration for a room.",
        visual: "h1 { color: purple; font-size: 24px; }",
        explanation: "Selectors target elements, and properties like color, font-size, background, and margin change the way they appear.",
        examples: "p { line-height: 1.6; color: #333; }",
        interactive: "Create a small style sheet that changes a heading color and paragraph spacing.",
        commonMistakes: ["Forgetting the semicolon", "Targeting the wrong element", "Writing conflicting styles"],
        memoryAid: "Remember selector { property: value; }.",
        exercises: ["Style a heading blue", "Change paragraph spacing", "Add a background color to a card"],
        quiz: { q: "What is the basic structure of a CSS rule?", options: ["selector { property: value; }", "selector = value", "property -> selector", "value: selector"], answer: 0 },
        miniProject: "Create a profile card with a heading, short paragraph, and background color.",
        summary: "CSS uses selectors and declarations to style HTML content clearly and consistently.",
        revision: "Practice writing small rules and inspect the result inside the browser.",
        nextLesson: "Colors and Backgrounds"
      },
      {
        title: "Colors and Backgrounds",
        description: "Use color and background choices to build mood, contrast, and polish.",
        introduction: "Color shapes the tone and readability of a page.",
        why: "Good color choices guide attention and make content easier to scan.",
        simpleExplanation: "Colors can be set by names, hex values, RGB, or HSL.",
        analogy: "Like selecting the right clothes and lighting for a presentation, color sets the mood.",
        visual: "body { background: #f8fafc; color: #111827; }",
        explanation: "Use contrast carefully so headings and text remain legible while background colors support the interface.",
        examples: "button { background: #6d28d9; color: white; }",
        interactive: "Create a hero section with a soft background and a bold call-to-action button.",
        commonMistakes: ["Using colors with poor contrast", "Over-complicating the palette", "Forgetting readability on mobile"],
        memoryAid: "Pair light backgrounds with dark text and keep accents purposeful.",
        exercises: ["Set a page background", "Create a dark button", "Choose a text color with strong contrast"],
        quiz: { q: "Which property changes the background color of an element?", options: ["text-color", "background-color", "border", "font-size"], answer: 1 },
        miniProject: "Design a landing page hero with a balanced color palette.",
        summary: "Color and background choices improve readability and create visual hierarchy.",
        revision: "Review contrast and the emotional effect of each color.",
        nextLesson: "Typography"
      },
      {
        title: "Typography",
        description: "Improve readability with well-chosen fonts, spacing, and hierarchy.",
        introduction: "Typography controls how text looks and reads — font choice, size, spacing, and weight all affect comprehension.",
        why: "Most of the web is text; strong typography makes the difference between a page people read and one they skim past.",
        simpleExplanation: "Set font-family, font-size, line-height, and font-weight to control how text looks and feels.",
        analogy: "Typography is like tone of voice in writing — the same words feel different depending on how they're presented.",
        visual: "body {\n  font-family: 'Poppins', sans-serif;\n  font-size: 16px;\n  line-height: 1.6;\n}\nh1 { font-weight: 700; font-size: 2.5rem; }",
        explanation: "Use rem units for scalable sizing, keep line-height around 1.5-1.7 for body text, and limit yourself to 1-2 font families per page for consistency.",
        examples: "@import url('https://fonts.googleapis.com/css2?family=Poppins&display=swap'); loads a web font before using it in font-family.",
        interactive: "Take a wall of plain text and improve it with better font-size, line-height, and heading hierarchy.",
        commonMistakes: ["Lines of text that are too long to read comfortably", "Too many font families on one page", "Line-height set too tight, making paragraphs feel cramped"],
        memoryAid: "Bigger for headings, comfortable spacing for body text, keep fonts to a minimum.",
        exercises: ["Set a readable font-size and line-height for a paragraph.", "Create a heading scale (h1 through h3) with clear size differences.", "Limit a page to two font families and justify the choice."],
        quiz: { q: "Which CSS property most affects how easy paragraphs are to read?", options: ["color", "line-height", "text-decoration", "cursor"], answer: 1 },
        miniProject: "Restyle a plain article with a proper type scale, comfortable line-height, and a Google Font.",
        summary: "Good typography — size, spacing, and font choice — is one of the highest-leverage design decisions you can make.",
        revision: "Review any page for line length, line-height, and heading hierarchy before shipping it.",
        nextLesson: "The Box Model"
      },
      {
        title: "The Box Model",
        description: "Control spacing, borders, and layout behavior with confidence.",
        introduction: "Every HTML element is a box made of content, padding, border, and margin — understanding this explains most layout bugs.",
        why: "Spacing issues (things too close together, too far apart, or overflowing) almost always trace back to box model confusion.",
        simpleExplanation: "Content sits inside padding, padding sits inside the border, and margin is the space outside the border to other elements.",
        analogy: "Think of a framed photo: the photo is content, the mat around it is padding, the frame is the border, and the space to the next frame on the wall is margin.",
        visual: ".card {\n  padding: 1rem;\n  border: 1px solid #ddd;\n  margin: 1rem 0;\n  box-sizing: border-box;\n}",
        explanation: "By default, width/height only apply to content, so padding and border add on top and can cause unexpected overflow. Setting box-sizing: border-box makes width/height include padding and border, which is far more predictable.",
        examples: "* { box-sizing: border-box; } at the top of a stylesheet applies predictable sizing to everything.",
        interactive: "Add padding and a border to a box with a fixed width and watch it overflow, then fix it with box-sizing: border-box.",
        commonMistakes: ["Forgetting box-sizing: border-box and getting unexpected overflow", "Confusing margin (outside) with padding (inside)", "Using margin when padding was needed, or vice versa"],
        memoryAid: "Content, padding, border, margin — inside out, like layers of an onion.",
        exercises: ["Build a card with padding and a border, then add box-sizing: border-box.", "Create two boxes side by side and control the gap using margin.", "Fix an overflowing box caused by ignoring box-sizing."],
        quiz: { q: "What does box-sizing: border-box include in the element's width?", options: ["Only content", "Content and padding and border", "Only margin", "Nothing, it's visual only"], answer: 1 },
        miniProject: "Build three stacked cards with consistent padding, border, and spacing using the box model correctly.",
        summary: "The box model — content, padding, border, margin — governs spacing for every element on the page.",
        revision: "Start every stylesheet with a border-box reset to avoid sizing surprises.",
        nextLesson: "Flexbox and Grid"
      },
      {
        title: "Flexbox and Grid",
        description: "Arrange content into modern layouts that adapt across screen sizes.",
        introduction: "Flexbox and CSS Grid are the two modern layout systems that replaced old float-based hacks.",
        why: "Nearly every real layout — nav bars, cards, page grids — is built with flexbox or grid today.",
        simpleExplanation: "Flexbox arranges items in a single row or column; Grid arranges items in rows and columns at the same time.",
        analogy: "Flexbox is like lining people up in a queue; Grid is like seating them in a table with rows and columns.",
        visual: ".row { display: flex; gap: 1rem; align-items: center; }\n.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }",
        explanation: "Use flexbox for one-dimensional layouts (a nav bar, a row of buttons) with justify-content and align-items to control positioning. Use grid for two-dimensional layouts (a photo gallery, a dashboard) with grid-template-columns to define the structure.",
        examples: "display: flex; justify-content: space-between; spreads items to the edges, common for header nav bars.",
        interactive: "Build the same three-card layout twice — once with flexbox, once with grid — and compare how each one behaves when the window resizes.",
        commonMistakes: ["Reaching for grid when flexbox (simpler) would do", "Forgetting gap and using margins on every child instead", "Not setting flex-wrap, causing items to overflow on small screens"],
        memoryAid: "One line, one direction → flexbox. Rows and columns together → grid.",
        exercises: ["Build a nav bar with flexbox using justify-content: space-between.", "Build a 3-column card grid using CSS Grid.", "Add flex-wrap so a flex row stacks on narrow screens."],
        quiz: { q: "Which layout system is best for a simple row of nav links?", options: ["Flexbox", "Grid", "Floats", "Tables"], answer: 0 },
        miniProject: "Recreate a pricing page with three plan cards laid out using CSS Grid, each card's contents arranged with flexbox.",
        summary: "Flexbox handles one-dimensional layout, Grid handles two-dimensional layout — most pages use both together.",
        revision: "Ask yourself: one direction or a full grid? That decides flexbox vs grid.",
        nextLesson: "Responsive Design"
      },
      {
        title: "Responsive Design",
        description: "Ensure your page offers a smooth experience on mobile, tablet, and desktop.",
        introduction: "Responsive design means a single page adapts cleanly to any screen size instead of breaking on mobile.",
        why: "Most visitors browse on a phone first, so a page that only works on desktop loses the majority of its audience.",
        simpleExplanation: "Use flexible units (%, rem, fr) and @media queries to change layout at different screen widths.",
        analogy: "Think of water taking the shape of whatever container it's poured into — a responsive layout reflows to fit the screen.",
        visual: "@media (max-width: 600px) {\n  .hero-grid { grid-template-columns: 1fr; }\n}",
        explanation: "Start by designing for mobile first, then add complexity for larger screens with min-width media queries. Always include <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> in the head, or mobile browsers will render the page zoomed out.",
        examples: "grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); creates a grid that automatically reflows without any media query.",
        interactive: "Resize the browser window on an existing layout and note exactly where it breaks, then add a media query to fix it.",
        commonMistakes: ["Forgetting the viewport meta tag", "Designing desktop-first and bolting mobile on as an afterthought", "Using fixed pixel widths that don't shrink"],
        memoryAid: "Design small screen first, then widen — not the other way around.",
        exercises: ["Add a media query that stacks a two-column layout on screens under 600px.", "Replace a fixed-width container with a responsive max-width and percentage width.", "Test a page at 375px, 768px, and 1440px widths."],
        quiz: { q: "What does the viewport meta tag control?", options: ["Page title", "How the page scales on mobile browsers", "Font size only", "Image compression"], answer: 1 },
        miniProject: "Take an existing desktop layout and add breakpoints so it looks polished at 375px, 768px, and 1200px.",
        summary: "Responsive design uses flexible units and media queries so one page works well at every screen size.",
        revision: "Always test your work on real breakpoints, not just by shrinking the browser a little.",
        nextLesson: "Forms and Inputs"
      },
      {
        title: "Forms and Inputs",
        description: "Build accessible forms that look polished and work reliably.",
        introduction: "Forms are how users send you information — signups, contact messages, search — so they need to be clear and accessible.",
        why: "A confusing or inaccessible form is the single biggest reason people abandon a page before converting.",
        simpleExplanation: "Wrap inputs in a <form>, label every field with <label>, and use the right input type for the data.",
        analogy: "A form is a conversation — each label is a clear question, and each input is where the answer goes.",
        visual: "<form>\n  <label for=\"email\">Email</label>\n  <input type=\"email\" id=\"email\" name=\"email\" required>\n  <button type=\"submit\">Send</button>\n</form>",
        explanation: "Always connect <label for=\"id\"> to an input's id — this lets clicking the label focus the input and helps screen readers. Use type=\"email\", type=\"tel\", etc. so mobile keyboards adapt, and use required for basic built-in validation.",
        examples: "<textarea name=\"message\" rows=\"5\" required></textarea> is the right element for a multi-line message field.",
        interactive: "Build a small contact form with name, email, and message fields, each properly labeled, and test tabbing through it with the keyboard only.",
        commonMistakes: ["Using placeholder text instead of a real <label>", "Missing the name attribute so the field doesn't submit", "Not marking required fields, so users don't know what's missing"],
        memoryAid: "Every input needs a label, and the right type attribute.",
        exercises: ["Build a login form with labeled email and password fields.", "Add a required checkbox for agreeing to terms.", "Style a submit button that shows an obvious hover state."],
        quiz: { q: "What connects a <label> to its input?", options: ["Matching name attribute", "for on the label matching id on the input", "Being inside the same div", "Nothing needed"], answer: 1 },
        miniProject: "Build a full contact form (name, email, subject, message) with labels, required fields, and a styled submit button.",
        summary: "Good forms pair every input with a real label and the correct input type, making them usable for everyone.",
        revision: "Before shipping a form, tab through it with only the keyboard to check it makes sense.",
        nextLesson: "Semantic HTML"
      },
      {
        title: "Semantic HTML",
        description: "Use meaningful markup that helps browsers, search engines, and assistive tools.",
        introduction: "Semantic HTML uses tags that describe what content actually is, not just how it looks.",
        why: "Search engines rank semantic pages better, and screen reader users rely on real landmarks like <nav> and <main> to navigate quickly.",
        simpleExplanation: "Use <header>, <nav>, <main>, <article>, <section>, and <footer> instead of generic <div> for everything.",
        analogy: "A semantic page is like a labeled filing cabinet instead of one big unlabeled box — everyone can find what they need faster.",
        visual: "<body>\n  <header>...</header>\n  <nav>...</nav>\n  <main>\n    <article>...</article>\n  </main>\n  <footer>...</footer>\n</body>",
        explanation: "Reach for a semantic tag first; only use <div> or <span> when no semantic element fits. <button> should be used for actions and <a> for navigation — never a styled <div> pretending to be clickable, since it breaks keyboard and screen reader support.",
        examples: "<button onclick=\"submitForm()\">Submit</button> is keyboard-accessible by default; a <div onclick=\"...\"> is not, unless you add extra work to fix it.",
        interactive: "Take a page built entirely from <div>s and refactor it into header, nav, main, and footer.",
        commonMistakes: ["Using <div> for buttons and links", "Wrapping the whole page in one giant <div> instead of landmarks", "Using <section> without a heading inside it"],
        memoryAid: "If there's already a tag for it, don't reach for <div>.",
        exercises: ["Refactor a div-only layout into semantic landmarks.", "Replace a clickable div with a real <button>.", "Add one <article> for a blog post with a heading inside it."],
        quiz: { q: "Which element should wrap the primary content of a page?", options: ["<div>", "<main>", "<span>", "<b>"], answer: 1 },
        miniProject: "Refactor an existing page (like your Mini Project from this course) to use fully semantic landmarks throughout.",
        summary: "Semantic HTML improves accessibility and search ranking by describing content meaningfully, not just visually.",
        revision: "Before using <div>, ask: is there already a tag that means this?",
        nextLesson: "Mini Project"
      },
      {
        title: "Mini Project",
        description: "Create a landing page with a hero, benefits section, and clear calls to action.",
        introduction: "This project pulls together everything from the course so far into one real landing page.",
        why: "Building a full page — not just isolated exercises — is what actually cements HTML and CSS skills.",
        simpleExplanation: "You'll build a hero section, a benefits/features section, and a call-to-action, all responsive and semantic.",
        analogy: "Think of this like a dress rehearsal before the final show — everything you've learned, performed together.",
        visual: "<header>...</header>\n<main>\n  <section class=\"hero\">...</section>\n  <section class=\"features\">...</section>\n  <section class=\"cta\">...</section>\n</main>\n<footer>...</footer>",
        explanation: "Set up your files first: index.html, and a css/style.css. Start with mobile layout, add flexbox/grid for the features section, and use real semantic tags throughout. Recommended tools: VS Code as your editor, and the free 'Live Server' VS Code extension so the page auto-refreshes as you save.",
        examples: "A hero needs a heading, a short supporting paragraph, and one clear button (e.g. \"Get Started\") — avoid competing calls to action.",
        interactive: "Sketch your layout on paper first (hero, 3 features, CTA), then build it section by section, checking mobile width as you go.",
        commonMistakes: ["Starting with desktop layout and retrofitting mobile", "Too many competing buttons instead of one clear action", "Skipping alt text and labels under time pressure"],
        memoryAid: "Structure first (semantic HTML), then style (CSS), then respond (media queries).",
        exercises: ["Build the hero section with a heading, subtext, and one CTA button.", "Build a 3-item features section using flexbox or grid.", "Make the whole page responsive down to 375px."],
        quiz: { q: "What should you build first when starting a new landing page?", options: ["The animations", "Mobile layout and semantic structure", "The favicon", "The footer"], answer: 1 },
        miniProject: "Complete a full one-page landing site: hero, features, and CTA, fully responsive and semantic.",
        summary: "This project combines structure, styling, and responsiveness into one complete, real page.",
        revision: "Review your finished page against the whole course: is it semantic, styled with intention, and responsive?",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Ship a complete portfolio-style webpage using the full course roadmap.",
        introduction: "This is your capstone: a complete, polished, portfolio-ready page you can actually publish and share.",
        why: "A finished, live project is the strongest proof of your skills — stronger than any certificate.",
        simpleExplanation: "Build a multi-section personal portfolio page and publish it for free so it has a real URL.",
        analogy: "This is the difference between practicing scales and playing a full song for an audience.",
        visual: "index.html + css/style.css + optional js/script.js, deployed to a free static host.",
        explanation: "Include an intro/hero, an about or skills section, a projects or work section, and a contact section with a real mailto: link or contact form. To publish for free: create a GitHub account, push your project to a repository, and enable GitHub Pages in the repo settings — or drag-and-drop the folder into Netlify Drop for an instant live link.",
        examples: "A strong portfolio hero includes your name, a one-line description of what you do, and a photo or simple illustration.",
        interactive: "Once built, share your live link and ask two people to try it on their phone — note anything that feels confusing or broken.",
        commonMistakes: ["Publishing without testing on a real phone", "Forgetting a working contact method", "No clear next step for a visitor (like a resume link or contact button)"],
        memoryAid: "Build it, test it on mobile, then ship it — a project isn't done until it's live.",
        exercises: ["Write your portfolio content (bio, 3 project blurbs) before touching CSS.", "Build and style all sections responsively.", "Deploy the finished page with GitHub Pages or Netlify."],
        quiz: { q: "What's a free way to publish a static HTML site?", options: ["It's impossible without a paid server", "GitHub Pages or Netlify", "Only through a domain registrar", "Email attachment"], answer: 1 },
        miniProject: "Publish your finished portfolio page to a live URL and share it in your Skillex profile.",
        summary: "A published, working portfolio page is the real-world outcome of this course — not just a local file.",
        revision: "Revisit this project every few months and update it as your skills grow.",
        nextLesson: ""
      },
    ],
    realLife: ["Build a one-page website for a freelance client", "Use the layout in a startup landing page", "Turn your notes into a portfolio site"],
    practice: ["Create a landing page with hero, features, and CTA", "Rebuild a wireframe from a screenshot", "Measure your layout on mobile and tablet"],
    projects: ["Launch a landing page for a product or event", "Create a personal portfolio page", "Build a reusable component library for your projects"]
  },
  {
    id: "javascript",
    title: "JavaScript",
    description: "Add real interactions to web apps so interfaces feel responsive and production-ready.",
    category: "Development",
    level: "Intermediate",
    time: "6 weeks",
    intro: "Move from static pages to interactive applications by learning how JavaScript manages data, events, and user flows in real time.",
    roadmap: [
      "Week 1: Learn variables, data types, operators, and conditional logic.",
      "Week 2: Practice functions, arrays, objects, and loops with small exercises.",
      "Week 3: Connect your code to the DOM and respond to real user events.",
      "Week 4: Use modern JavaScript features and fetch data from APIs.",
      "Week 5: Add persistence and build a polished mini project.",
      "Week 6: Finish a complete interactive app with a final project."
    ],
    outcome: "Create a working dashboard with filters, tabs, and progress updates.",
    objectives: ["Write clean functions", "Manipulate the DOM", "Handle events"],
    modules: ["Variables", "Data Types", "Operators", "Functions", "Arrays", "Objects", "Loops", "Conditions", "DOM Manipulation", "Events", "ES6 Features", "Fetch API", "Async JavaScript", "Local Storage", "Mini Projects", "Final Project"],
    lessons: ["Variables", "Data Types", "Operators", "Functions", "Arrays", "Objects", "Loops", "Conditions", "DOM Manipulation", "Events", "ES6 Features", "Fetch API", "Async JavaScript", "Local Storage", "Mini Projects", "Final Project"],
    curriculum: {
      beginner: [
        { title: "Variables", description: "Store data with confidence and write maintainable code." },
        { title: "Data Types", description: "Understand strings, numbers, booleans, and null values in everyday apps." },
        { title: "Operators", description: "Use arithmetic, comparison, and logical operators to make decisions." },
        { title: "Functions", description: "Reuse behavior across buttons, forms, and UI states." },
        { title: "Arrays and Objects", description: "Organize related information for projects, users, and tasks." }
      ],
      intermediate: [
        { title: "Loops and Conditions", description: "Repeat work without writing duplicate code and respond to data changes." },
        { title: "DOM Manipulation", description: "Update content and styles dynamically based on user actions." },
        { title: "Events", description: "Connect clicks, submissions, and keyboard inputs to useful behavior." },
        { title: "ES6 Features", description: "Adopt modern syntax such as template literals, destructuring, and arrow functions." },
        { title: "Fetch API", description: "Bring dynamic data into your interface from real services." }
      ],
      advanced: [
        { title: "Async JavaScript", description: "Handle waiting states and asynchronous tasks with confidence." },
        { title: "Local Storage", description: "Persist user progress, settings, and saved content in the browser." },
        { title: "Mini Projects", description: "Build small apps such as a task list, quiz, or filterable catalog." },
        { title: "Final Project", description: "Create a polished interactive dashboard that ties the course together." }
      ]
    },
    lessonDetails: [
      {
        title: "Variables",
        description: "Store data with confidence and write maintainable code.",
        introduction: "Variables hold information that your program can use and update.",
        why: "Without variables, code cannot remember user input, counts, or values.",
        simpleExplanation: "A variable is a named box where you store information.",
        analogy: "Think of a variable as a labeled container in a toolbox.",
        visual: "let score = 10;\nscore = score + 1;",
        explanation: "Use let, const, or var to declare variables. Prefer let and const for clarity.",
        examples: "const name = 'Ada'; let age = 20;",
        interactive: "Create a variable for your favorite hobby and display it on the page.",
        commonMistakes: ["Reassigning const values", "Using unclear names", "Forgetting semicolons is not fatal but can reduce readability"],
        memoryAid: "Name variables clearly and keep them meaningful.",
        exercises: ["Create variables for your name and favorite color.", "Update a counter variable in a small script."],
        quiz: { q: "Which keyword should be used when the value should not change?", options: ["let", "const", "var", "if"], answer: 1 },
        miniProject: "Build a tiny profile card that displays a name and favorite language from variables.",
        summary: "Variables store data that your code can use and update.",
        revision: "Use clear names and choose let/const based on whether the value changes.",
        nextLesson: "Data Types"
      },
      {
        title: "Data Types",
        description: "Understand strings, numbers, booleans, and null values in everyday apps.",
        introduction: "Data comes in different forms, and JavaScript needs to recognize each one.",
        why: "You need the right data type to perform the right operations safely.",
        simpleExplanation: "A string is text, a number is numeric, and a boolean is true or false.",
        analogy: "Different boxes are used for different items — one for books, one for tools, one for fruit.",
        visual: "const title = 'Hello';\nconst age = 25;\nconst isReady = true;",
        explanation: "JavaScript has primitive types such as string, number, boolean, undefined, and null.",
        examples: "console.log(typeof 'Skillex');",
        interactive: "Write a short script that prints different values and their types.",
        commonMistakes: ["Confusing strings and numbers", "Forgetting that true/false are booleans"],
        memoryAid: "Use typeof to inspect data types while you learn.",
        exercises: ["Create one string, one number, and one boolean.", "Print each type to the console."],
        quiz: { q: "What type is true?", options: ["string", "number", "boolean", "object"], answer: 2 },
        miniProject: "Create a small script that reports the type of several values.",
        summary: "JavaScript uses different data types to represent information correctly.",
        revision: "Use typeof to understand values and avoid type errors.",
        nextLesson: "Operators"
      },
      {
        title: "Operators",
        description: "Use arithmetic, comparison, and logical operators to make decisions.",
        introduction: "Operators help your code make calculations and comparisons.",
        why: "They power logic for totals, checks, and conditions.",
        simpleExplanation: "Use +, -, *, / for math and ===, <, > to compare values.",
        analogy: "Operators are like the tools used to measure and compare things quickly.",
        visual: "let total = 3 + 2;\nlet ready = total > 4;",
        explanation: "JavaScript supports arithmetic, comparison, and logical operators such as && and ||.",
        examples: "const isAdult = age >= 18;",
        interactive: "Build a small script that evaluates whether two values satisfy a condition.",
        commonMistakes: ["Using = instead of == or ===", "Forgetting operator precedence"],
        memoryAid: "Read expressions slowly and test them in the console.",
        exercises: ["Calculate a total with arithmetic operators", "Compare two numbers"],
        quiz: { q: "Which operator checks whether two values are equal?", options: ["=", "==", "===", "+"], answer: 2 },
        miniProject: "Create a small score calculator for a game or quiz.",
        summary: "Operators let code calculate values and make comparisons.",
        revision: "Practice simple calculations and comparisons until they feel natural.",
        nextLesson: "Functions"
      },
      {
        title: "Functions",
        description: "Reuse behavior across buttons, forms, and UI states.",
        introduction: "Functions package a block of code so you can run it again anywhere, with different inputs, instead of copy-pasting.",
        why: "Real apps reuse the same logic dozens of times (validating a form, formatting a price) — functions are how you avoid repeating yourself.",
        simpleExplanation: "A function takes inputs (parameters), does something, and can return a result.",
        analogy: "A function is like a recipe: give it ingredients (parameters), follow the steps, and get a dish (return value) out.",
        visual: "function greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet('Ada'));",
        explanation: "Use function name() {} for named functions, or arrow functions like const add = (a, b) => a + b; for short ones. A function only runs when called — defining it does nothing by itself. Setup tip: open your browser DevTools (F12 or right-click → Inspect → Console) to test small functions instantly without a full page reload.",
        examples: "const double = (n) => n * 2; console.log(double(5)); // 10",
        interactive: "Write a function that takes a price and a discount percentage and returns the final price, then test it with three different inputs.",
        commonMistakes: ["Forgetting to call the function (missing parentheses)", "Forgetting return, so the function gives back undefined", "Confusing parameters with the arguments passed in"],
        memoryAid: "Define once, call many times — a function is a reusable recipe.",
        exercises: ["Write a function that adds two numbers.", "Write a function that returns whether a number is even.", "Write a function that greets a user by name using a template literal."],
        quiz: { q: "What keyword returns a value from a function?", options: ["give", "return", "output", "send"], answer: 1 },
        miniProject: "Build a small tip calculator: a function that takes a bill total and tip percentage and returns the total with tip.",
        summary: "Functions bundle reusable logic that takes inputs and can return outputs, keeping code organized and DRY.",
        revision: "Whenever you copy-paste a block of code, that's usually a sign it should become a function.",
        nextLesson: "Arrays and Objects"
      },
      {
        title: "Arrays and Objects",
        description: "Organize related information for projects, users, and tasks.",
        introduction: "Arrays hold ordered lists of values, and objects hold named properties — together they represent almost any real-world data.",
        why: "A list of skills, a user's profile, a swap request — all of this data is modeled with arrays and objects in every real app.",
        simpleExplanation: "An array is a list in square brackets [1, 2, 3]; an object is key-value pairs in curly braces { name: 'Ada' }.",
        analogy: "An array is like a numbered shelf of items; an object is like a labeled filing folder where each document has a name.",
        visual: "const skills = ['HTML', 'CSS', 'JS'];\nconst user = { name: 'Ada', level: 'Beginner' };\nconsole.log(skills[0], user.name);",
        explanation: "Access array items by index (array[0] is the first item) and object properties by dot notation (object.property) or brackets (object['property']). Arrays have built-in methods like .push(), .map(), and .filter() that objects don't.",
        examples: "const swaps = [{ skill: 'Python', status: 'pending' }, { skill: 'Design', status: 'done' }]; is an array of objects — a very common pattern.",
        interactive: "Build an array of 3 user objects (name, skill) and loop through it to print each one's name and skill.",
        commonMistakes: ["Confusing array index (0-based) with a count", "Trying to access a property that doesn't exist and getting undefined", "Mutating an array accidentally when you meant to copy it"],
        memoryAid: "Square brackets for lists, curly braces for labeled data — arrays index by number, objects index by name.",
        exercises: ["Create an array of 5 favorite movies and print the third one.", "Create an object representing yourself with name, age, and hobby.", "Create an array of objects representing 3 skills, each with a title and level."],
        quiz: { q: "How do you access the first item of an array called items?", options: ["items.first", "items[0]", "items(1)", "items.get(0)"], answer: 1 },
        miniProject: "Model a small skill catalog as an array of objects, and write code that prints each skill's title and level.",
        summary: "Arrays organize ordered lists; objects organize named data — most real data combines both.",
        revision: "Practice reading nested data like array-of-objects until it feels natural.",
        nextLesson: "Loops and Conditions"
      },
      {
        title: "Loops and Conditions",
        description: "Repeat work without writing duplicate code and respond to data changes.",
        introduction: "Loops repeat an action over a list, and conditions let your code branch based on data.",
        why: "Rendering a list of skill cards, checking if a form is valid — both rely on loops and conditions constantly.",
        simpleExplanation: "Use for or .forEach()/.map() to repeat over items, and if/else to branch on a condition.",
        analogy: "A loop is like going down a checklist item by item; a condition is a fork in the road based on what you find.",
        visual: "for (const skill of skills) {\n  console.log(skill);\n}\nif (skills.length === 0) {\n  console.log('No skills yet');\n}",
        explanation: "for...of is the cleanest way to loop over array values. Array methods like .map() (transform each item into a new array) and .filter() (keep only matching items) are used constantly when building UI from data.",
        examples: "const beginnerSkills = skills.filter(s => s.level === 'Beginner'); returns only beginner-level skills.",
        interactive: "Given an array of skill objects, use .filter() to find all 'Design' category skills, then loop over the result and print their titles.",
        commonMistakes: ["Off-by-one errors in manual for loops", "Using == instead of === in conditions", "Forgetting that .map() returns a new array instead of changing the original"],
        memoryAid: "Loop to repeat, condition to decide — .filter() keeps, .map() transforms.",
        exercises: ["Loop over an array and print only even numbers.", "Use .filter() to get all skills above a certain level.", "Use .map() to turn an array of names into an array of greeting strings."],
        quiz: { q: "Which array method returns a new array with only matching items?", options: [".map()", ".filter()", ".forEach()", ".push()"], answer: 1 },
        miniProject: "Given an array of skill objects, build a small script that filters by category and prints a formatted list.",
        summary: "Loops repeat work over collections, and conditions let your code make decisions based on data.",
        revision: "Reach for .filter()/.map() before a manual for loop when working with arrays — it's usually cleaner.",
        nextLesson: "DOM Manipulation"
      },
      {
        title: "DOM Manipulation",
        description: "Update content and styles dynamically based on user actions.",
        introduction: "The DOM (Document Object Model) is the live, in-memory version of your HTML that JavaScript can read and change.",
        why: "This is how JavaScript actually changes what's on screen — adding a card, showing an error, updating a counter.",
        simpleExplanation: "Use document.querySelector() to find an element, then change its .textContent, .innerHTML, or .style.",
        analogy: "The DOM is like a live stage set — JavaScript can walk on stage and rearrange the furniture while the show is running.",
        visual: "const title = document.querySelector('h1');\ntitle.textContent = 'Welcome back!';\ntitle.style.color = 'purple';",
        explanation: "querySelector('.class') or ('#id') finds one element; querySelectorAll() finds all matches. Use .textContent for plain text (safe) and .innerHTML only when you need to insert HTML (be careful, since it can introduce security issues with untrusted input).",
        examples: "document.querySelector('#skills-grid').innerHTML = skills.map(s => `<div>${s.title}</div>`).join(''); renders a list of cards from data.",
        interactive: "Select a heading on a test page and change its text and color from the console.",
        commonMistakes: ["Running the script before the DOM has loaded, so querySelector returns null", "Using innerHTML with unescaped user input", "Selecting the wrong element with an overly broad selector"],
        memoryAid: "Find it with querySelector, then change it — text, style, or attributes.",
        exercises: ["Select a paragraph and change its text.", "Select a button and change its background color on the fly.", "Build a small list of items into the page using innerHTML from an array."],
        quiz: { q: "Which method finds a single element by CSS selector?", options: ["document.find()", "document.querySelector()", "document.getAll()", "document.select()"], answer: 1 },
        miniProject: "Build a simple counter: a number on the page and two buttons (+/-) that update it via DOM manipulation.",
        summary: "The DOM lets JavaScript read and change what's actually shown on the page in real time.",
        revision: "Always check: does the element exist before you try to change it? Put scripts at the end of the body, or use defer.",
        nextLesson: "Events"
      },
      {
        title: "Events",
        description: "Connect clicks, submissions, and keyboard inputs to useful behavior.",
        introduction: "Events are how your code reacts to what a user does — clicking, typing, submitting a form.",
        why: "Every interactive feature (a button, a search box, a form) is built on event listeners.",
        simpleExplanation: "Use element.addEventListener('click', function) to run code when something happens.",
        analogy: "An event listener is like a doorbell — nothing happens until someone presses the button, then your response runs.",
        visual: "const button = document.querySelector('#save-btn');\nbutton.addEventListener('click', () => {\n  console.log('Saved!');\n});",
        explanation: "Common events: 'click' for buttons, 'submit' for forms (remember to call event.preventDefault() to stop the page reloading), and 'input' for live typing feedback. The event object passed to your handler often has useful info like event.target.",
        examples: "form.addEventListener('submit', (e) => { e.preventDefault(); console.log('Form data captured'); });",
        interactive: "Add a click listener to a button that toggles a 'dark-mode' class on the body.",
        commonMistakes: ["Forgetting preventDefault() on a form submit, causing an unwanted page reload", "Attaching the listener before the element exists in the DOM", "Confusing 'click' with 'change' for inputs"],
        memoryAid: "addEventListener(event, whatToDo) — nothing runs until the event fires.",
        exercises: ["Add a click listener that shows an alert.", "Add a submit listener to a form that prevents the default reload and logs the input value.", "Add an input listener that shows live character count as someone types."],
        quiz: { q: "What stops a form from reloading the page on submit?", options: ["event.stop()", "event.preventDefault()", "return false only", "Nothing can stop it"], answer: 1 },
        miniProject: "Build a small live search box: as the user types, filter and re-render a list of items below it.",
        summary: "Event listeners connect user actions (clicks, typing, submitting) to your JavaScript logic.",
        revision: "Remember event.preventDefault() for forms, and always check the element exists before attaching a listener.",
        nextLesson: "ES6 Features"
      },
      {
        title: "ES6 Features",
        description: "Adopt modern syntax such as template literals, destructuring, and arrow functions.",
        introduction: "ES6 (2015) introduced cleaner syntax that's now the standard way modern JavaScript is written.",
        why: "Almost every modern codebase and tutorial uses these features — knowing them is essential for reading real-world code.",
        simpleExplanation: "Template literals build strings with ${}, destructuring pulls values out of objects/arrays quickly, and arrow functions are a shorter function syntax.",
        analogy: "Think of ES6 features as shortcuts a fluent speaker uses instead of long, formal sentences — same meaning, faster to write and read.",
        visual: "const { name, level } = user;\nconst greeting = `Hi ${name}, you're at ${level} level!`;\nconst square = n => n * n;",
        explanation: "Template literals (backticks) let you embed variables directly in strings instead of concatenating with +. Destructuring const { a, b } = obj; pulls named properties into variables in one line. The spread operator (...array) copies or merges arrays and objects.",
        examples: "const updatedUser = { ...user, level: 'Advanced' }; creates a new object with one property changed, without mutating the original.",
        interactive: "Rewrite an old-style string concatenation as a template literal, and destructure two properties out of an object in one line.",
        commonMistakes: ["Mixing quotes and template literals inconsistently", "Forgetting the ... spread when copying objects, causing accidental mutation", "Destructuring a property name that doesn't exist and getting undefined"],
        memoryAid: "Backticks for strings with variables, curly braces to destructure, ... to spread/copy.",
        exercises: ["Convert a concatenated string to a template literal.", "Destructure name and email from a user object.", "Use spread to merge two small objects into one."],
        quiz: { q: "What symbol wraps a template literal string?", options: ["Double quotes", "Single quotes", "Backticks", "Parentheses"], answer: 2 },
        miniProject: "Refactor an earlier exercise (like the profile card) to use template literals and destructuring throughout.",
        summary: "ES6 features like template literals, destructuring, and spread make modern JavaScript shorter and easier to read.",
        revision: "Whenever you see string concatenation with +, consider converting it to a template literal.",
        nextLesson: "Fetch API"
      },
      {
        title: "Fetch API",
        description: "Bring dynamic data into your interface from real services.",
        introduction: "The fetch() function lets JavaScript request data from a server or API over the network.",
        why: "Real apps load live data — weather, prices, user records — from APIs instead of hardcoding it.",
        simpleExplanation: "fetch(url) sends a request and returns a promise that resolves to a response you can turn into JSON.",
        analogy: "fetch is like sending a letter to a server and waiting for a reply envelope with the answer inside.",
        visual: "fetch('https://api.example.com/skills')\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));",
        explanation: "fetch() is asynchronous — it doesn't block the rest of your code while waiting. Always handle errors with .catch() or try/catch, since networks fail. A free public API like https://jsonplaceholder.typicode.com is great for practicing without needing your own backend.",
        examples: "const res = await fetch('/api/users'); const users = await res.json(); is the modern async/await style of the same request.",
        interactive: "Fetch data from https://jsonplaceholder.typicode.com/users and render the first 5 names into a list on the page.",
        commonMistakes: ["Forgetting to call .json() to parse the response body", "Not handling errors when the network fails or the URL is wrong", "Trying to use the data before the fetch has resolved"],
        memoryAid: "fetch, then .json(), then use the data — and always catch errors.",
        exercises: ["Fetch a list of posts from a public API and log the titles.", "Handle a fetch error by showing a friendly message on the page.", "Render fetched data into HTML cards on the page."],
        quiz: { q: "What does fetch() return?", options: ["The data immediately", "A promise", "A string", "Nothing"], answer: 1 },
        miniProject: "Build a small 'random user' viewer that fetches from a public API and displays a new profile each time a button is clicked.",
        summary: "fetch() brings real, live data into your app from external services using promises.",
        revision: "Practice the fetch → .json() → use-data pattern until it's automatic, and always plan for errors.",
        nextLesson: "Async JavaScript"
      },
      {
        title: "Async JavaScript",
        description: "Handle waiting states and asynchronous tasks with confidence.",
        introduction: "Asynchronous code lets JavaScript keep running while it waits for something slow, like a network request or a timer.",
        why: "Without async handling, a slow request would freeze the entire page until it finished.",
        simpleExplanation: "async/await lets you write asynchronous code that reads top-to-bottom like normal code, instead of nested callbacks.",
        analogy: "It's like ordering food at a counter and getting a buzzer — you don't stand frozen at the counter, you go sit down and the buzzer tells you when it's ready.",
        visual: "async function loadSkills() {\n  const res = await fetch('/api/skills');\n  const data = await res.json();\n  return data;\n}",
        explanation: "Mark a function async to use await inside it. await pauses that function (not the whole page) until the promise resolves. Wrap awaited calls in try/catch to handle errors cleanly.",
        examples: "try {\n  const data = await loadSkills();\n} catch (err) {\n  console.error('Failed to load', err);\n}",
        interactive: "Convert a .then()-chain fetch call into an async/await function with a try/catch block.",
        commonMistakes: ["Forgetting the async keyword on a function that uses await", "Not handling rejected promises, causing silent failures", "Awaiting inside a regular (non-async) function, which throws an error"],
        memoryAid: "async marks the function, await pauses just that function until the promise settles.",
        exercises: ["Write an async function that fetches and returns JSON data.", "Add a try/catch around an await call and log a friendly error.", "Show a 'Loading...' message while an async fetch is in progress."],
        quiz: { q: "What keyword pauses execution until a promise resolves?", options: ["pause", "await", "stop", "hold"], answer: 1 },
        miniProject: "Build a loading state: show 'Loading...' text, fetch data asynchronously, then replace it with the real content (or an error message).",
        summary: "async/await makes asynchronous code readable and lets pages stay responsive while waiting on slow tasks.",
        revision: "Always pair await with try/catch so failures are handled gracefully, not silently.",
        nextLesson: "Local Storage"
      },
      {
        title: "Local Storage",
        description: "Persist user progress, settings, and saved content in the browser.",
        introduction: "localStorage lets your app save small pieces of data in the browser so it's still there after a page refresh.",
        why: "This is how features like saved theme preference, saved progress, or a shopping cart survive a page reload without a backend.",
        simpleExplanation: "Use localStorage.setItem(key, value) to save and localStorage.getItem(key) to read, storing everything as strings.",
        analogy: "localStorage is like a sticky note the browser keeps on your desk — it's still there next time you sit down, but only on that computer.",
        visual: "localStorage.setItem('theme', 'dark');\nconst theme = localStorage.getItem('theme');",
        explanation: "localStorage only stores strings, so use JSON.stringify() to save objects/arrays and JSON.parse() to read them back. Data persists until explicitly cleared — it is per-browser, not shared across devices or synced to a server.",
        examples: "localStorage.setItem('savedSkills', JSON.stringify(['html-css', 'python']));\nconst saved = JSON.parse(localStorage.getItem('savedSkills') || '[]');",
        interactive: "Save a small settings object (like theme + font size) to localStorage, then reload the page and read it back.",
        commonMistakes: ["Forgetting JSON.stringify/parse and getting '[object Object]'", "Assuming localStorage syncs across devices (it doesn't)", "Not handling the case where the key doesn't exist yet"],
        memoryAid: "Stringify to save, parse to read — localStorage only speaks strings.",
        exercises: ["Save your name to localStorage and greet yourself with it on page load.", "Save an array of favorite items as JSON.", "Add a 'clear data' button that calls localStorage.clear()."],
        quiz: { q: "What must you do before saving an object to localStorage?", options: ["Nothing, objects save directly", "JSON.stringify() it", "Convert it to a number", "Encrypt it"], answer: 1 },
        miniProject: "Build a small notes app that saves and loads a list of notes from localStorage, surviving page refresh.",
        summary: "localStorage persists small amounts of data in the browser across page reloads, using JSON to store complex data.",
        revision: "Remember: it's per-browser only, string-only, and needs JSON.stringify/parse for anything beyond plain text.",
        nextLesson: "Mini Projects"
      },
      {
        title: "Mini Projects",
        description: "Build small apps such as a task list, quiz, or filterable catalog.",
        introduction: "This lesson combines DOM manipulation, events, and storage into complete, small working apps.",
        why: "Small finished projects are what actually prove you can use JavaScript, more than isolated exercises.",
        simpleExplanation: "Pick one small app (to-do list, quiz, or filterable catalog) and build it end-to-end.",
        analogy: "This is like a chef finally cooking a full dish, not just practicing individual knife cuts.",
        visual: "State (array) -> render(state) to the DOM -> event listener updates state -> render() again",
        explanation: "A good pattern for small apps: keep your data in one array (the 'state'), write one render() function that redraws the UI from that array, and call render() again every time the state changes. This keeps the UI and data in sync without confusion.",
        examples: "function render() {\n  list.innerHTML = tasks.map(t => `<li>${t.text}</li>`).join('');\n}\nfunction addTask(text) {\n  tasks.push({ text });\n  render();\n}",
        interactive: "Build a to-do list: add a task via a form, render the list, and let users delete a task by clicking it.",
        commonMistakes: ["Updating the DOM directly instead of updating state and re-rendering", "Forgetting to persist state to localStorage between reloads", "Not clearing the input field after adding an item"],
        memoryAid: "Change the data, then re-render — don't hand-edit the DOM piece by piece.",
        exercises: ["Build a task list with add and delete.", "Build a 3-question quiz that shows a final score.", "Build a filterable list of items with a search input."],
        quiz: { q: "What's a reliable pattern for keeping UI and data in sync?", options: ["Edit the DOM directly for every change", "Keep data in one place and re-render from it", "Reload the page after every change", "Avoid using variables"], answer: 1 },
        miniProject: "Choose one: a to-do list, a quiz app, or a filterable product catalog — build it fully with add/edit/delete and localStorage persistence.",
        summary: "Small complete projects combine everything from this course — state, rendering, events, and storage.",
        revision: "Before the final project, make sure you're comfortable with the state → render → event loop pattern.",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Create a polished interactive dashboard that ties the course together.",
        introduction: "This capstone project combines fetching data, rendering it, handling events, and persisting state into one polished dashboard.",
        why: "A working, deployed dashboard is strong, concrete proof of real JavaScript ability for a portfolio.",
        simpleExplanation: "Build a dashboard that loads data (from an API or a local array), lets users filter/sort it, and saves preferences with localStorage.",
        analogy: "This is the full concert after weeks of practicing individual pieces.",
        visual: "fetch data -> render cards -> filter/sort controls -> save preference to localStorage -> re-render on reload",
        explanation: "Structure the project with clear sections: a data layer (fetch or local array), a state object (current filters/sort), a render() function, and event listeners that update state and re-render. Deploy the finished project for free with GitHub Pages or Netlify Drop so it's a real, shareable link.",
        examples: "A skill-tracking dashboard: fetch a list of skills, let users filter by category, sort by progress, and remember the last filter used via localStorage.",
        interactive: "Plan your dashboard's data and 3 core features on paper before writing any code, then build one feature at a time.",
        commonMistakes: ["Trying to build every feature at once instead of one at a time", "Skipping error handling on the fetch calls", "Not testing on mobile before calling it done"],
        memoryAid: "Plan the data and features first, build one feature fully before starting the next.",
        exercises: ["Build the data-loading and rendering layer first.", "Add one interactive filter or sort control.", "Persist the user's last-used filter with localStorage."],
        quiz: { q: "What's a good first step before coding a final project?", options: ["Write all the CSS first", "Plan the data and core features", "Deploy immediately", "Skip planning and start coding"], answer: 1 },
        miniProject: "Ship a complete, deployed interactive dashboard with real data, filtering, and persisted preferences.",
        summary: "The final project proves end-to-end JavaScript skill: fetching, rendering, interactivity, and persistence, deployed live.",
        revision: "Revisit this project as a portfolio piece and keep improving it as you learn more.",
        nextLesson: ""
      },
    ],
    realLife: ["Power interactive dashboards and forms", "Add live filtering to product pages", "Create reusable UI components"],
    practice: ["Build a searchable course catalog", "Add a dark mode toggle", "Create a progress tracker for lessons"],
    projects: ["Build a dynamic to-do app", "Create a searchable product catalog", "Design an interactive dashboard for your own data"]
  },
  {
    id: "python",
    title: "Python",
    description: "Use Python to solve practical problems and automate repetitive work with confidence.",
    category: "Development",
    level: "Beginner",
    time: "5 weeks",
    intro: "Learn programming by solving real tasks with Python, from writing your first script to automating everyday workflows.",
    roadmap: [
      "Week 1: Set up Python and learn the syntax behind simple scripts.",
      "Week 2: Practice conditionals, loops, and functions to solve common problems.",
      "Week 3: Read and write files while building practical automation exercises.",
      "Week 4: Create reusable tools and improve your problem-solving process.",
      "Week 5: Complete a mini automation project and a final capstone."
    ],
    outcome: "Automate a simple workflow such as data cleanup or daily reporting.",
    objectives: ["Write beginner scripts", "Solve problems with logic", "Automate tasks"],
    modules: ["Getting Started", "Conditionals", "Loops", "Functions", "Files", "Projects"],
    lessons: ["Getting Started", "Conditionals", "Loops", "Functions", "Files", "Projects"],
    curriculum: {
      beginner: [
        { title: "Getting Started", description: "Set up your environment and write your first working script." },
        { title: "Conditionals", description: "Create logic that responds to different inputs and scenarios." },
        { title: "Loops", description: "Repeat work without rewriting code manually." }
      ],
      intermediate: [
        { title: "Functions", description: "Organize your work into reusable building blocks." },
        { title: "Files", description: "Read and write data for automation and reporting tasks." },
        { title: "Error Handling", description: "Make your scripts more reliable by handling problems gracefully." }
      ],
      advanced: [
        { title: "Mini Project", description: "Build a practical automation task such as renaming files or cleaning a CSV." },
        { title: "Final Project", description: "Create a small app or workflow that saves time in a realistic setting." }
      ]
    },
    lessonDetails: [
      {
        title: "Getting Started",
        description: "Set up your environment and write your first working script.",
        introduction: "Python is one of the easiest languages to learn because its syntax is readable and practical.",
        why: "Python helps you automate tasks, analyze data, and build tools without unnecessary complexity.",
        simpleExplanation: "Python uses indentation to define blocks of code, so readable structure matters.",
        analogy: "Think of Python as writing instructions in a clear, step-by-step notebook.",
        visual: "print('Hello')\nname = 'Mina'\nprint(name)",
        explanation: "A Python script runs line by line. Use print() to display output and variables to hold values.",
        examples: "name = 'Alice'\nprint('Hello', name)",
        interactive: "Create a small script that greets a user using a variable.",
        commonMistakes: ["Incorrect indentation", "Confusing assignment with equality", "Using unclear variable names"],
        memoryAid: "Keep indentation consistent and read code slowly.",
        exercises: ["Print your name", "Store a number and print it", "Create a greeting message"],
        quiz: { q: "What function prints output in Python?", options: ["echo()", "print()", "show()", "write()"], answer: 1 },
        miniProject: "Build a one-page Python script that welcomes a learner and shows their goals.",
        summary: "Python begins with simple scripts and clear syntax.",
        revision: "Practice printing, storing values, and writing short scripts every day.",
        nextLesson: "Conditionals"
      },
      {
        title: "Conditionals",
        description: "Create logic that responds to different inputs and scenarios.",
        introduction: "Conditionals let your program make choices.",
        why: "Real applications react differently depending on input, date, or user action.",
        simpleExplanation: "If a condition is true, do one thing; otherwise, do something else.",
        analogy: "Like a decision tree: if the weather is sunny, go outside; otherwise, stay in.",
        visual: "if age >= 18:\n    print('Adult')\nelse:\n    print('Minor')",
        explanation: "Use if, elif, and else to build decision logic.",
        examples: "if score >= 50: print('Pass')",
        interactive: "Write a script that checks whether a user is old enough to vote.",
        commonMistakes: ["Forgetting the colon", "Indenting incorrectly", "Using = instead of =="],
        memoryAid: "Remember: == checks equality, = assigns a value.",
        exercises: ["Check if a number is positive", "Create a pass/fail decision based on score"],
        quiz: { q: "Which operator checks equality in Python?", options: ["=", "==", "=>", "!="], answer: 1 },
        miniProject: "Build a simple quiz checker that evaluates answers and gives feedback.",
        summary: "Conditionals allow programs to make choices based on data.",
        revision: "Practice if/elif/else until the structure feels natural.",
        nextLesson: "Loops"
      },
      {
        title: "Loops",
        description: "Repeat work without rewriting code manually.",
        introduction: "Loops let Python repeat an action over a list of items or a set number of times.",
        why: "Automation is fundamentally about doing the same thing to many items — renaming 100 files, checking 500 rows — loops make that possible.",
        simpleExplanation: "Use for item in list: to repeat over each item, or while condition: to repeat until something changes.",
        analogy: "A for loop is like going through a stack of mail one envelope at a time until the stack is empty.",
        visual: "names = ['Ada', 'Grace', 'Alan']\nfor name in names:\n    print(f'Hello, {name}')",
        explanation: "for loops are best when you know what you're iterating over (a list, a range). while loops repeat until a condition becomes false — useful when you don't know the exact number of repetitions in advance.",
        examples: "for i in range(5):\n    print(i)  # prints 0 through 4",
        interactive: "Write a loop that prints the numbers 1 through 10, then modify it to print only even numbers.",
        commonMistakes: ["Creating an infinite while loop by forgetting to update the condition", "Off-by-one errors with range()", "Modifying a list while looping over it"],
        memoryAid: "for = 'for each item', while = 'while this is still true'.",
        exercises: ["Print numbers 1-10 with a for loop.", "Use a while loop to count down from 5 to 1.", "Loop over a list of names and print a greeting for each."],
        quiz: { q: "Which loop is best when you already know the list of items to go through?", options: ["while", "for", "if", "def"], answer: 1 },
        miniProject: "Write a script that loops through a list of filenames and prints which ones end in '.csv'.",
        summary: "Loops repeat actions over lists or until a condition changes, forming the core of most automation scripts.",
        revision: "Practice both for and while loops until you know instinctively which one fits a task.",
        nextLesson: "Functions"
      },
      {
        title: "Functions",
        description: "Organize your work into reusable building blocks.",
        introduction: "Functions let you name and reuse a block of logic instead of repeating it everywhere.",
        why: "As scripts grow, functions keep code organized, testable, and much easier to fix when something breaks.",
        simpleExplanation: "Use def name(parameters): to define a function, and return to send back a result.",
        analogy: "A function is a labeled recipe card — write it once, use it whenever you need that dish.",
        visual: "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('Mina'))",
        explanation: "Parameters are the inputs a function expects; arguments are the actual values passed in when calling it. A function without return gives back None by default. Setup tip: install Python from python.org, and use VS Code with the official Python extension for autocomplete and easy running.",
        examples: "def total_price(price, tax_rate):\n    return price + (price * tax_rate)\nprint(total_price(20, 0.08))",
        interactive: "Write a function that takes a list of numbers and returns their average.",
        commonMistakes: ["Forgetting return, so the function silently gives back None", "Using the same name for a parameter and an outside variable, causing confusion", "Not giving functions a clear, descriptive name"],
        memoryAid: "def to define, return to give something back — a function isn't useful until it's called.",
        exercises: ["Write a function that checks if a number is even.", "Write a function that returns the largest of three numbers.", "Write a function that takes a name and returns a formatted greeting."],
        quiz: { q: "What keyword defines a function in Python?", options: ["function", "def", "func", "define"], answer: 1 },
        miniProject: "Build a small script with functions for calculating a rectangle's area and perimeter, and print both.",
        summary: "Functions organize logic into named, reusable, testable pieces — essential as scripts grow.",
        revision: "Whenever a block of code repeats, turn it into a function with a clear name.",
        nextLesson: "Files"
      },
      {
        title: "Files",
        description: "Read and write data for automation and reporting tasks.",
        introduction: "Reading and writing files lets your scripts work with real data — text files, CSVs, logs — not just data typed by hand.",
        why: "Almost every automation task starts by reading some existing file and ends by writing a new or updated one.",
        simpleExplanation: "Use open(filename, mode) with 'r' to read or 'w' to write, ideally inside a with block so the file closes automatically.",
        analogy: "Opening a file is like opening a notebook — read what's inside, or write new pages, then close it when you're done.",
        visual: "with open('notes.txt', 'r') as f:\n    content = f.read()\n    print(content)",
        explanation: "The with statement automatically closes the file even if an error happens partway through, which is safer than manually calling .close(). For structured data like spreadsheets, Python's built-in csv module reads and writes CSV files directly.",
        examples: "import csv\nwith open('data.csv') as f:\n    reader = csv.DictReader(f)\n    for row in reader:\n        print(row['name'])",
        interactive: "Create a small text file, write a few lines to it with Python, then read it back and print the contents.",
        commonMistakes: ["Opening a file without 'with', forgetting to close it", "Using mode 'w' on a file you meant to only read, which erases its contents", "Forgetting the file path is relative to where the script runs"],
        memoryAid: "with open(...) as f: — it opens, and closes itself automatically.",
        exercises: ["Write three lines to a new text file.", "Read a text file and count how many lines it has.", "Read a CSV file and print one column from every row."],
        quiz: { q: "Which file mode is used to write to a file (overwriting it)?", options: ["'r'", "'w'", "'x'", "'read'"], answer: 1 },
        miniProject: "Write a script that reads a list of names from a text file and writes a new file with a greeting for each name.",
        summary: "Python's open()/with pattern lets scripts safely read and write real files, including structured data like CSVs.",
        revision: "Always use with open(...) as f: — it's the safe default for file work.",
        nextLesson: "Error Handling"
      },
      {
        title: "Error Handling",
        description: "Make your scripts more reliable by handling problems gracefully.",
        introduction: "Error handling lets your script respond to problems (a missing file, bad input) instead of crashing.",
        why: "Real-world data is messy — a reliable automation script needs to survive unexpected input without stopping entirely.",
        simpleExplanation: "Wrap risky code in try: and handle problems in except: instead of letting the whole script crash.",
        analogy: "try/except is like a safety net under a tightrope walker — if something goes wrong, you catch it instead of falling all the way.",
        visual: "try:\n    value = int(input('Enter a number: '))\nexcept ValueError:\n    print('That was not a valid number.')",
        explanation: "Catch specific exceptions (like ValueError or FileNotFoundError) rather than a bare except, so you don't accidentally hide real bugs. You can also use finally: to run cleanup code whether or not an error occurred.",
        examples: "try:\n    with open('data.csv') as f:\n        pass\nexcept FileNotFoundError:\n    print('data.csv was not found — check the path.')",
        interactive: "Write a script that asks for a number and safely handles the case where the user types letters instead.",
        commonMistakes: ["Using a bare except: that silently hides all errors, including real bugs", "Not telling the user what actually went wrong", "Wrapping way too much code in one try block, making it hard to know what failed"],
        memoryAid: "try the risky part, except the specific problem, don't hide errors silently.",
        exercises: ["Handle a ValueError when converting user input to a number.", "Handle a FileNotFoundError when opening a missing file.", "Add a finally block that always prints 'Done' regardless of errors."],
        quiz: { q: "What's wrong with a bare `except:` with no error type?", options: ["Nothing, it's best practice", "It can hide real bugs by catching everything", "It's faster than specific exceptions", "It only works in Python 2"], answer: 1 },
        miniProject: "Add error handling to your file-reading script from the previous lesson so it doesn't crash on a missing file.",
        summary: "try/except lets scripts handle predictable problems gracefully instead of crashing entirely.",
        revision: "Catch specific exceptions, always tell the user what went wrong, and never silently swallow errors.",
        nextLesson: "Mini Project"
      },
      {
        title: "Mini Project",
        description: "Build a practical automation task such as renaming files or cleaning a CSV.",
        introduction: "This project combines loops, functions, file handling, and error handling into one real automation script.",
        why: "A working automation script — not just isolated exercises — is what proves you can apply Python to real problems.",
        simpleExplanation: "Pick a real repetitive task (renaming files, cleaning a messy CSV, summarizing data) and automate it fully.",
        analogy: "This is where the individual tools you've learned become an actual toolbox you can use on a real job.",
        visual: "read input file -> loop and clean/transform each row -> handle errors -> write output file",
        explanation: "Good structure: one function to read the data, one to clean/transform each item, and one to write the results, wrapped in error handling. Test on a small sample file first before running on real data.",
        examples: "A CSV cleaner might strip whitespace, fix inconsistent casing, and remove duplicate rows before writing a cleaned copy.",
        interactive: "Pick a messy CSV or folder of files you actually have, and write a script that cleans or organizes it.",
        commonMistakes: ["Running the script on real data before testing it on a small sample", "Overwriting the original file instead of writing to a new one", "Not handling rows with missing or malformed data"],
        memoryAid: "Test small, write to a new file, handle the messy rows — don't touch the original data directly.",
        exercises: ["Write a script that renames a batch of files by adding a prefix.", "Write a script that removes duplicate rows from a CSV.", "Write a script that summarizes a CSV column (total, average, count)."],
        quiz: { q: "Why should you test an automation script on a sample before running it on real data?", options: ["No reason, it's unnecessary", "To catch bugs before they affect real files", "Scripts run faster on samples", "Python requires it"], answer: 1 },
        miniProject: "Build and run a real automation script (file renamer, CSV cleaner, or data summarizer) on your own data.",
        summary: "This project turns individual Python skills into one practical, working automation tool.",
        revision: "Always test on a copy or sample of your data before running an automation script for real.",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Create a small app or workflow that saves time in a realistic setting.",
        introduction: "This capstone project is a complete, polished Python tool solving a real problem from start to finish.",
        why: "A finished, working tool — even a small one — is much stronger proof of skill than any exercise list.",
        simpleExplanation: "Design, build, and document a small Python tool that automates a real task you or someone else actually has.",
        analogy: "This is the difference between practice drills and actually running the play in a real game.",
        visual: "Define the problem -> plan the steps -> write functions -> test with real data -> document how to run it",
        explanation: "Start by writing exactly what the tool should do in one sentence. Break that into 3-5 functions. Add a README.md explaining what it does and how to run it (python your_script.py) — this documentation habit matters as much as the code for anyone reusing your work.",
        examples: "Ideas: a daily task reminder that reads a to-do list and prints what's due, a file organizer that sorts downloads into folders by type, or a report generator that summarizes a week of data into one file.",
        interactive: "Write a one-sentence problem statement for your tool, then break it into the 3-5 functions you'll need before writing any code.",
        commonMistakes: ["Starting to code before clearly defining the problem", "Skipping the README, making the tool hard for anyone (including future you) to reuse", "Not testing edge cases like empty files or missing input"],
        memoryAid: "Define the problem in one sentence first — everything else follows from that.",
        exercises: ["Write your project's problem statement and function breakdown.", "Build and test each function individually.", "Write a short README explaining what the tool does and how to run it."],
        quiz: { q: "What should you write before coding a final project?", options: ["The tests only", "A clear one-sentence problem statement", "Nothing, just start coding", "The README last, if at all"], answer: 1 },
        miniProject: "Finish and document a complete Python automation tool solving a real problem, with a README explaining how to run it.",
        summary: "The final project proves practical Python skill: defining a real problem and shipping a working, documented tool.",
        revision: "Keep this project as a portfolio piece and improve it as you learn more Python.",
        nextLesson: ""
      },
    ],
    realLife: ["Automate spreadsheet cleanup", "Generate reports from raw files", "Create quick tools for daily tasks"],
    practice: ["Write a script to rename files", "Summarize data from a CSV", "Create a simple task reminder bot"],
    projects: ["Build a file organizer script", "Create a report generator", "Automate a daily checklist"]
  },
  {
    id: "ai-automation",
    title: "AI Automation",
    description: "Learn how to use AI tools to automate repetitive work, generate content, and improve business workflows.",
    category: "Development",
    level: "Intermediate",
    time: "4 weeks",
    intro: "Use AI as a practical co-pilot for tasks such as drafting, organizing, summarizing, and automating recurring processes.",
    roadmap: [
      "Week 1: Understand where AI automation fits into daily tasks and workflows.",
      "Week 2: Learn how to create effective prompts, templates, and repeatable processes.",
      "Week 3: Apply AI to reporting, content creation, and task automation.",
      "Week 4: Build a practical workflow using AI tools and evaluate the results."
    ],
    outcome: "Create a simple AI-powered workflow that saves time on repetitive tasks.",
    objectives: ["Identify automation opportunities", "Apply AI to everyday tasks", "Build repeatable workflows"],
    modules: ["What is AI Automation", "Prompt Design", "Workflow Mapping", "Content Generation", "Task Automation", "Mini Project", "Final Project"],
    lessons: ["What is AI Automation", "Prompt Design", "Workflow Mapping", "Content Generation", "Task Automation", "Mini Project", "Final Project"],
    curriculum: {
      beginner: [
        { title: "What is AI Automation", description: "See how AI can support productivity in real-world routines." },
        { title: "Prompt Design", description: "Learn to give AI clear instructions to produce useful results." },
        { title: "Workflow Mapping", description: "Identify tasks that can be improved with automation." }
      ],
      intermediate: [
        { title: "Content Generation", description: "Use AI to draft emails, summaries, and useful text quickly." },
        { title: "Task Automation", description: "Automate repetitive steps with templates, rules, and AI workflows." },
        { title: "Evaluation", description: "Review outputs for accuracy, clarity, and usefulness." }
      ],
      advanced: [
        { title: "Mini Project", description: "Create an AI-assisted workflow for a common workplace task." },
        { title: "Final Project", description: "Build a practical automation system and present your process." }
      ]
    },
    lessonDetails: [
      {
        title: "What is AI Automation",
        description: "See how AI can support productivity in real-world routines.",
        introduction: "AI automation uses intelligent tools to reduce repetitive work and improve consistency.",
        why: "It saves time, reduces human error, and helps teams focus on higher-value work.",
        simpleExplanation: "An AI workflow can take an input, process it, and return a useful output.",
        analogy: "Think of it as a smart assistant that handles repeated tasks while you handle decisions.",
        visual: "Input -> AI Assistant -> Draft / Summary / Action",
        explanation: "AI automation is useful for summarizing, drafting, categorizing, translating, and creating repeatable workflows.",
        examples: "You can use AI to turn meeting notes into action items.",
        interactive: "Create a simple workflow for turning a rough note into a polished email.",
        commonMistakes: ["Giving vague prompts", "Trusting AI outputs without review", "Automating the wrong process"],
        memoryAid: "Start with one repetitive task and design a simple prompt around it.",
        exercises: ["List one repetitive task you do weekly", "Write a prompt that improves that task"],
        quiz: { q: "Which is a good use case for AI automation?", options: ["Generating a summary from notes", "Deleting files randomly", "Ignoring deadlines", "Breaking your code"], answer: 0 },
        miniProject: "Create a workflow for turning raw notes into an email and task list.",
        summary: "AI automation helps teams move faster by turning repeated work into guided systems.",
        revision: "Use AI where repetitive work is predictable and repetitive.",
        nextLesson: "Prompt Design"
      },
      {
        title: "Prompt Design",
        description: "Learn to give AI clear instructions to produce useful results.",
        introduction: "Prompt design for automation is about writing instructions that produce consistent, reusable results every time, not just a good one-off answer.",
        why: "An automation workflow only works if the prompt behaves reliably on many different inputs, not just the one you tested.",
        simpleExplanation: "State the task, the input format, and the exact output format you expect, every time.",
        analogy: "A good automation prompt is like a form with blanks to fill in — consistent structure, different data each time.",
        visual: "Task: Summarize this support ticket\nInput: raw customer message\nOutput: 1-sentence summary + urgency (Low/Medium/High)",
        explanation: "For automation, lock down the output format explicitly (e.g. 'Respond only in this format: Summary: ... Urgency: ...') so downstream steps can rely on it consistently, whether it's a human reading it or another script parsing it.",
        examples: "Summarize the following email in one sentence, then rate urgency as Low, Medium, or High. Respond only in that exact format.",
        interactive: "Write a prompt that takes any customer message and always outputs a summary and urgency rating in the same format.",
        commonMistakes: ["Not specifying the output format, so results vary each time", "Testing on only one example input", "Writing a prompt that's too open-ended for repeatable use"],
        memoryAid: "For automation: lock the format, test with several different inputs, not just one.",
        exercises: ["Write a repeatable prompt for summarizing any short text.", "Test your prompt on 3 very different inputs and check the output stays consistent.", "Add a strict output format requirement to a prompt you already wrote."],
        quiz: { q: "Why is a fixed output format important for automation prompts?", options: ["It looks nicer", "So downstream steps can reliably use the result", "It's required by law", "It makes AI faster"], answer: 1 },
        miniProject: "Design a prompt that classifies any short message into a category (Question, Complaint, Praise) with a consistent format, and test it on 5 different messages.",
        summary: "Automation-ready prompts specify task, input, and a locked output format so results stay consistent across many inputs.",
        revision: "Always test a prompt on several different real examples, not just the one that worked first.",
        nextLesson: "Workflow Mapping"
      },
      {
        title: "Workflow Mapping",
        description: "Identify tasks that can be improved with automation.",
        introduction: "Workflow mapping means writing out every step of a repetitive task so you can see exactly where AI can help.",
        why: "Automating the wrong step wastes effort — mapping first shows you where the real bottleneck is.",
        simpleExplanation: "List every step of a task in order, then mark which steps are repetitive, rule-based, or time-consuming.",
        analogy: "It's like drawing a map before a road trip — you need to see the whole route before deciding where a shortcut helps.",
        visual: "1. Receive email -> 2. Read and classify -> 3. Draft reply -> 4. Send\n(steps 2 and 3 are good automation candidates)",
        explanation: "Good automation candidates are repetitive, follow clear rules, and don't require deep judgment. Steps that need real relationship context or high-stakes decisions are usually better left to a human, possibly with an AI draft for review.",
        examples: "Weekly report writing: gathering the numbers is repetitive (automate), but deciding what the numbers mean strategically still needs a human.",
        interactive: "Map out a task you do weekly, step by step, and mark each step as 'automate', 'AI-assist', or 'keep manual'.",
        commonMistakes: ["Automating a step that actually needs human judgment", "Skipping the mapping step and automating the first thing that comes to mind", "Not accounting for exceptions and edge cases in the workflow"],
        memoryAid: "Map first, automate second — the map shows you where automation actually helps.",
        exercises: ["Map a 5-step process you repeat regularly.", "Label each step as automate, AI-assist, or manual.", "Pick the single best automation candidate from your map."],
        quiz: { q: "What kind of task step is usually the best automation candidate?", options: ["One requiring deep judgment", "A repetitive, rule-based step", "A one-time task", "A task nobody does"], answer: 1 },
        miniProject: "Map a real recurring task from your own life or work, and identify the single best step to automate first.",
        summary: "Mapping a workflow step by step reveals exactly where automation adds value, instead of guessing.",
        revision: "Before automating anything, write the full process out first — the best target is often not the obvious one.",
        nextLesson: "Content Generation"
      },
      {
        title: "Content Generation",
        description: "Use AI to draft emails, summaries, and useful text quickly.",
        introduction: "AI can draft first versions of emails, summaries, and reports quickly, leaving you to review and refine rather than start from a blank page.",
        why: "Starting from a draft is almost always faster than starting from nothing, even when you end up rewriting parts of it.",
        simpleExplanation: "Give the AI the key facts and desired tone, and let it produce a first draft you can edit.",
        analogy: "It's like having a junior assistant hand you a rough draft — useful as a starting point, but you still review and sign off on it.",
        visual: "Facts + tone + format -> AI draft -> human review and edit -> final version",
        explanation: "Always treat AI-generated content as a draft, not a final answer — check facts, tone, and accuracy before sending anything externally. Being specific about tone (formal, friendly, concise) dramatically improves the first draft's usefulness.",
        examples: "Draft a friendly, 3-sentence email to a customer confirming their order was shipped, including a tracking link placeholder.",
        interactive: "Draft an email using AI, then edit it as if you were sending it to a real client — note what you changed and why.",
        commonMistakes: ["Sending AI-generated content without review", "Not specifying tone, leading to generic-sounding drafts", "Trusting facts or figures the AI included without checking them"],
        memoryAid: "AI drafts, you decide — always review before it goes out the door.",
        exercises: ["Generate a draft email for a common work situation.", "Generate a one-paragraph summary of a long document.", "Edit an AI draft to match your own voice."],
        quiz: { q: "What should you always do with AI-generated content before using it externally?", options: ["Send it immediately", "Review it for accuracy and tone", "Delete it", "Nothing, it's always correct"], answer: 1 },
        miniProject: "Use AI to draft three different pieces of content (an email, a summary, a social post) on the same topic, then edit each into a finished version.",
        summary: "AI speeds up content creation by producing solid first drafts — human review still ensures accuracy and voice.",
        revision: "Never skip the review step, especially for anything sent externally or containing factual claims.",
        nextLesson: "Task Automation"
      },
      {
        title: "Task Automation",
        description: "Automate repetitive steps with templates, rules, and AI workflows.",
        introduction: "Task automation combines templates, simple rules, and AI so a repetitive process runs with minimal manual work.",
        why: "A single reusable template or workflow can save hours every week across a whole team, not just once.",
        simpleExplanation: "Build a reusable template or step-by-step process that plugs new information in each time without rebuilding it from scratch.",
        analogy: "It's like setting up a form letter — fill in the blanks once, and the structure works every time after that.",
        visual: "New input -> apply saved template/prompt -> review -> done (repeat weekly)",
        explanation: "Save your best-performing prompts as reusable templates with clear placeholders (e.g. [CUSTOMER NAME], [ISSUE]). Many AI chat tools let you save prompts or create custom instructions so you don't rewrite the same setup every time.",
        examples: "A weekly status report template: '[PROJECT NAME] this week: completed [X], blocked on [Y], next up [Z]. Turn this into 3 polished sentences.'",
        interactive: "Turn a task you repeat weekly into a fill-in-the-blank template you could reuse every time.",
        commonMistakes: ["Rebuilding the same prompt from scratch every time instead of saving a template", "Templates that are too rigid for real variation in the input", "Not updating the template after finding a better version"],
        memoryAid: "Build it once as a template, reuse it every time, improve it when it breaks.",
        exercises: ["Turn one of your earlier prompts into a reusable template with placeholders.", "Use the template on 3 different real inputs.", "Refine the template based on what didn't work well."],
        quiz: { q: "What makes a prompt reusable as an automation template?", options: ["Being extremely long", "Clear placeholders for the parts that change", "Using only one word", "Being written in all caps"], answer: 1 },
        miniProject: "Build one reusable automation template for a task you do often, and document how to use it.",
        summary: "Turning a working prompt into a template with placeholders makes automation genuinely reusable, not one-off.",
        revision: "Revisit your templates occasionally and improve them as you learn what works.",
        nextLesson: "Evaluation"
      },
      {
        title: "Evaluation",
        description: "Review outputs for accuracy, clarity, and usefulness.",
        introduction: "Evaluation is checking whether an AI-generated output is actually correct, clear, and useful before you rely on it.",
        why: "AI can produce confident-sounding answers that are wrong (a phenomenon called hallucination) — evaluation is what catches that before it causes a problem.",
        simpleExplanation: "Check outputs against three questions: is it accurate, is it clear, and is it actually usable as-is?",
        analogy: "Evaluating AI output is like proofreading a junior colleague's work before it goes out under your name.",
        visual: "Output -> check facts -> check clarity -> check usefulness -> approve or revise",
        explanation: "For factual claims, verify against a real source rather than trusting the AI's confidence. For workflows with real consequences (sending money, publishing publicly), always keep a human review step, no matter how reliable the automation has been so far.",
        examples: "If an AI-generated report claims a statistic, that statistic should be checked against the original data before publishing.",
        interactive: "Take an AI-generated summary and fact-check one claim in it against the original source.",
        commonMistakes: ["Trusting confident-sounding output without checking it", "Skipping evaluation once a workflow 'seems to work'", "No human review step for high-stakes automated actions"],
        memoryAid: "Confident doesn't mean correct — always verify facts against a real source.",
        exercises: ["Fact-check one claim in an AI-generated summary.", "Create a short checklist for evaluating outputs (accuracy, clarity, usefulness).", "Identify one automation step in your workflow that still needs a human review gate."],
        quiz: { q: "Why is evaluation important even for a workflow that 'usually works'?", options: ["It isn't important", "AI can still produce confidently wrong answers", "It slows things down for no reason", "Only for creative tasks"], answer: 1 },
        miniProject: "Write a short evaluation checklist for your automation workflow, and apply it to 3 outputs to see how it performs.",
        summary: "Evaluation catches errors that confident-sounding AI output can hide, keeping automation trustworthy.",
        revision: "Keep a human review gate on any automated step with real consequences.",
        nextLesson: "Mini Project"
      },
      {
        title: "Mini Project",
        description: "Create an AI-assisted workflow for a common workplace task.",
        introduction: "This project combines prompt design, workflow mapping, and evaluation into one real, working AI-assisted process.",
        why: "A working end-to-end workflow, not just a single good prompt, is what actually saves time in practice.",
        simpleExplanation: "Pick one real repetitive task, build a reusable prompt/template for it, and add an evaluation step.",
        analogy: "This is where the individual pieces — mapping, prompting, evaluating — come together into one working assembly line.",
        visual: "Map the task -> build the template -> run it on real inputs -> evaluate outputs -> refine",
        explanation: "Choose a task you genuinely repeat (weekly reports, email replies, meeting notes). Build the reusable prompt template, run it on 3-5 real examples, and note where it needs a human touch versus where it works reliably on its own.",
        examples: "A meeting-notes-to-action-items workflow: paste raw notes in, get a formatted list of owners and deadlines out, then quickly check it against what was actually discussed.",
        interactive: "Pick a real repetitive task from your own week and design the full workflow for it, start to finish.",
        commonMistakes: ["Picking a task that's too complex or judgment-heavy for a first project", "Skipping the evaluation step", "Not testing on enough varied real examples"],
        memoryAid: "Map it, template it, test it on real examples, evaluate it — in that order.",
        exercises: ["Choose and map a real repetitive task.", "Build the reusable prompt template for it.", "Run and evaluate it on at least 3 real examples."],
        quiz: { q: "What's a good first automation project to pick?", options: ["The most complex judgment-heavy task you have", "A genuinely repetitive task you already do often", "A task you've never done before", "A one-time task"], answer: 1 },
        miniProject: "Build and test a complete AI-assisted workflow for one real repetitive task, including an evaluation step.",
        summary: "This project proves the full loop: mapping a task, automating it with a template, and evaluating the results.",
        revision: "Keep refining the template based on real results, not just how it looked the first time.",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Build a practical automation system and present your process.",
        introduction: "This capstone project is a complete, documented AI automation system you could actually hand to someone else to use.",
        why: "Being able to explain and document your automation is what makes it genuinely useful to a team, not just to you.",
        simpleExplanation: "Finish your workflow, document each step, and present it clearly enough that someone else could run it without you.",
        analogy: "This is the difference between a personal trick you use and a real system a whole team can rely on.",
        visual: "Workflow diagram -> templates used -> example run -> results and time saved -> how to use it",
        explanation: "Write a short one-page document: what the task was, the workflow you built, an example before/after, and instructions for someone else to use it. Estimating the time saved (even roughly) makes the case for the automation concrete.",
        examples: "'This workflow turns raw support tickets into categorized summaries in under a minute, saving roughly 20 minutes per day compared to manual triage.'",
        interactive: "Write the one-page summary of your workflow as if you were presenting it to a manager or teammate.",
        commonMistakes: ["No clear documentation, so only you can use the workflow", "Not showing a concrete before/after example", "Overstating results without a real comparison"],
        memoryAid: "If someone else can't follow your instructions and run it, it's not finished yet.",
        exercises: ["Write a one-page summary of your finished workflow.", "Include a real before/after example.", "Estimate the time saved by the automation."],
        quiz: { q: "What makes an automation project genuinely reusable by others?", options: ["Keeping it entirely in your head", "Clear documentation and instructions", "Making it as complex as possible", "Not sharing any examples"], answer: 1 },
        miniProject: "Finish and document a complete AI automation workflow with a before/after example and instructions for others to use it.",
        summary: "The final project proves the whole skill: designing, building, evaluating, and documenting a real automation system.",
        revision: "Keep this project as a real example you can show — a documented, working automation is a strong portfolio piece.",
        nextLesson: ""
      },
    ],
    realLife: ["Automate routine business communication", "Draft content faster", "Organize recurring tasks with fewer manual steps"],
    practice: ["Create a workflow for meeting notes", "Generate reusable email templates", "Summarize long documents with AI"],
    projects: ["Build a content review workflow", "Automate a study planner", "Create an AI assistant for small tasks"]
  },
  {
    id: "ai-prompt-engineering",
    title: "AI Prompt Engineering",
    description: "Master the art of crafting prompts that produce better answers, clearer outputs, and more reliable AI results.",
    category: "Development",
    level: "Beginner",
    time: "3 weeks",
    intro: "Learn how to structure prompts so AI gives you useful, precise, and high-quality responses for work, study, or creativity.",
    roadmap: [
      "Week 1: Learn the basic structure of good prompts.",
      "Week 2: Practice context, examples, and clarity in prompt writing.",
      "Week 3: Improve outputs with refinement, iteration, and role-based prompting."
    ],
    outcome: "Write prompts that consistently produce stronger and more useful AI responses.",
    objectives: ["Write clear prompts", "Refine AI output", "Use prompting patterns effectively"],
    modules: ["Prompt Basics", "Context and Constraints", "Examples and Roles", "Refinement", "Mini Project", "Final Project"],
    lessons: ["Prompt Basics", "Context and Constraints", "Examples and Roles", "Refinement", "Mini Project", "Final Project"],
    curriculum: {
      beginner: [
        { title: "Prompt Basics", description: "Understand the core parts of a useful prompt." },
        { title: "Context and Constraints", description: "Add details that guide the AI toward better results." },
        { title: "Examples and Roles", description: "Use examples and role instructions to shape output quality." }
      ],
      intermediate: [
        { title: "Refinement", description: "Improve weak answers by iterating and adjusting the prompt." },
        { title: "Prompt Templates", description: "Create repeatable prompt patterns for common tasks." }
      ],
      advanced: [
        { title: "Mini Project", description: "Design prompts for writing, brainstorming, and research tasks." },
        { title: "Final Project", description: "Create a complete prompt toolkit for work, learning, or creative projects." }
      ]
    },
    lessonDetails: [
      {
        title: "Prompt Basics",
        description: "Understand the core parts of a useful prompt.",
        introduction: "A strong prompt gives the AI a clear goal, context, and expected output.",
        why: "Good prompts save time and improve answer quality.",
        simpleExplanation: "A prompt is like a clear instruction you give to a helper.",
        analogy: "Think of prompting as giving directions to a new assistant.",
        visual: "Task: Summarize this article\nContext: audience is a beginner\nOutput: 3 bullet points",
        explanation: "Every strong prompt usually includes a task, context, and format request.",
        examples: "Write a short email to a new student explaining a class schedule.",
        interactive: "Try writing three prompts for the same task and compare the results.",
        commonMistakes: ["Being too vague", "Asking for too much at once", "Forgetting the audience"],
        memoryAid: "Use the formula: task + context + output format.",
        exercises: ["Write a prompt to summarize a lesson", "Write a prompt to explain a concept to a child"],
        quiz: { q: "Which is the best prompt structure?", options: ["A question only", "Task + context + output", "Random keywords", "A long paragraph with no goal"], answer: 1 },
        miniProject: "Create a prompt template for summarizing class notes.",
        summary: "Prompt engineering begins with clarity, context, and a clear output requirement.",
        revision: "Keep prompts focused and specific for better results.",
        nextLesson: "Context and Constraints"
      },
      {
        title: "Context and Constraints",
        description: "Add details that guide the AI toward better results.",
        introduction: "Context tells the AI who the audience is and what matters.",
        why: "Constraints help shape the quality and usefulness of the answer.",
        simpleExplanation: "You can ask for a certain tone, length, or audience level.",
        analogy: "Like giving a teacher the grade level and learning goal before teaching a lesson.",
        visual: "Audience: beginner\nLength: 150 words\nTone: friendly",
        explanation: "Adding constraints makes the output more focused and usable.",
        examples: "Write a 100-word summary for a high school student in simple English.",
        interactive: "Revise one weak prompt by adding audience and length constraints.",
        commonMistakes: ["Overloading the prompt", "Using conflicting constraints", "Ignoring the audience"],
        memoryAid: "Add context before asking for the final answer.",
        exercises: ["Write a prompt for a 5-year-old", "Write a prompt for a professional email"],
        quiz: { q: "What does context help the AI understand?", options: ["Only the punctuation", "The audience and goal", "The font size", "The browser version"], answer: 1 },
        miniProject: "Design three prompt versions for the same task aimed at beginner, intermediate, and advanced users.",
        summary: "Context and constraints make prompts practical and reliable.",
        revision: "Adjust tone, audience, and length to improve output quality.",
        nextLesson: "Examples and Roles"
      },
      {
        title: "Examples and Roles",
        description: "Use examples and role instructions to shape output quality.",
        introduction: "Giving AI a role to play and an example of the output you want dramatically improves the quality and consistency of its answers.",
        why: "Showing rather than just describing removes ambiguity — the AI can match your example instead of guessing at your intent.",
        simpleExplanation: "Tell the AI who to act as ('Act as a patient tutor') and show one example of the exact output you want.",
        analogy: "It's like showing a new hire one perfect sample of a report instead of just describing it in words.",
        visual: "Role: You are a patient tutor.\nExample:\nQ: What is gravity?\nA: Gravity is the force that pulls objects toward each other...\nNow answer: What is friction?",
        explanation: "Role prompting ('act as a...') sets tone and expertise level. Giving one or two examples (called 'few-shot' prompting) is one of the most reliable ways to lock in a specific format or style.",
        examples: "Act as a supportive coding mentor. Explain errors simply, like this example: [example]. Now explain this error: [new error]",
        interactive: "Write the same prompt twice — once with no example, once with one example — and compare how much more consistent the second result is.",
        commonMistakes: ["Giving a role but no example, leaving too much to interpretation", "Using an example that doesn't match the format you actually want", "Making the role description too vague ('be helpful')"],
        memoryAid: "Tell it who to be, then show it exactly what good looks like.",
        exercises: ["Write a role-based prompt for explaining a concept simply.", "Add one example to a prompt and compare the output to the version without it.", "Write a prompt using two examples to lock in a specific list format."],
        quiz: { q: "What is it called when you give the AI an example of the desired output?", options: ["Zero-shot prompting", "Few-shot prompting", "Role prompting only", "Chain prompting"], answer: 1 },
        miniProject: "Write a role + example prompt for a task you do often (explaining something, writing a message) and test it on 3 different inputs.",
        summary: "Combining a clear role with a concrete example is one of the most reliable ways to get consistent, high-quality AI output.",
        revision: "When output quality is inconsistent, the fix is often adding one good example, not writing more instructions.",
        nextLesson: "Refinement"
      },
      {
        title: "Refinement",
        description: "Improve weak answers by iterating and adjusting the prompt.",
        introduction: "The first answer is rarely the best one — refinement is the skill of iterating on a prompt until the output actually fits.",
        why: "Treating prompting as a conversation, not a single request, gets dramatically better results than trying to write the perfect prompt on the first try.",
        simpleExplanation: "Look at what's wrong with the answer, then tell the AI specifically what to change, rather than starting over.",
        analogy: "It's like giving feedback to a writer draft by draft, instead of expecting a perfect essay on the first attempt.",
        visual: "Prompt v1 -> weak answer -> 'make it more concise and add a real example' -> better answer",
        explanation: "Be specific about what's wrong ('too long', 'too generic', 'wrong tone') rather than just saying 'try again'. You can also ask the AI to critique its own answer first, then improve it based on that critique.",
        examples: "'This is too generic — make it specific to a small bakery business, and cut it to 3 sentences.'",
        interactive: "Take a weak AI answer and refine it through two rounds of specific feedback until it's genuinely useful.",
        commonMistakes: ["Saying only 'try again' without specifying what's wrong", "Giving up after one weak answer instead of refining", "Refining too many things at once instead of one clear change at a time"],
        memoryAid: "Name exactly what's wrong, then ask for exactly that fix.",
        exercises: ["Take a generic AI answer and refine it to be more specific.", "Ask the AI to critique its own answer, then improve it.", "Refine a prompt through 3 rounds toward a clearly better result."],
        quiz: { q: "What's the most effective way to refine a weak AI answer?", options: ["Say 'try again' with no detail", "Give specific feedback about what to change", "Start over with an unrelated prompt", "Accept the first answer"], answer: 1 },
        miniProject: "Take one of your earlier prompts, get a first answer, and refine it through at least two rounds of specific feedback.",
        summary: "Refinement — specific, iterative feedback — usually produces far better results than trying to perfect a prompt upfront.",
        revision: "Treat every first answer as a draft, not a final result.",
        nextLesson: "Prompt Templates"
      },
      {
        title: "Prompt Templates",
        description: "Create repeatable prompt patterns for common tasks.",
        introduction: "A prompt template is a reusable pattern with blanks you fill in, so you don't rebuild a good prompt from scratch every time.",
        why: "Once you find a prompt structure that works well, saving it as a template saves time and keeps quality consistent.",
        simpleExplanation: "Write your prompt with clear placeholders like [TOPIC] or [AUDIENCE] that you swap out each time you use it.",
        analogy: "It's like a fill-in-the-blank form letter — the structure stays the same, only the details change.",
        visual: "Explain [TOPIC] to a [AUDIENCE] in [NUMBER] sentences, using a real-world analogy.",
        explanation: "Good templates for recurring tasks (explaining a concept, drafting a message, summarizing a document) save real time. Keep a running list of your best templates — most AI chat tools also let you save reusable custom instructions.",
        examples: "Summarize the following [DOCUMENT TYPE] in [NUMBER] bullet points for a [AUDIENCE] audience: [PASTE TEXT]",
        interactive: "Turn one of your favorite prompts from this course into a template with placeholders, and use it on two different topics.",
        commonMistakes: ["Templates too rigid to handle any variation", "Not testing the template on more than one example", "Forgetting to update a template once you find a better version"],
        memoryAid: "Find a prompt that works, turn it into a fill-in-the-blank template, reuse it.",
        exercises: ["Turn a working prompt into a template with 2-3 placeholders.", "Use your template on two different topics and compare results.", "Save your 3 best templates somewhere you'll actually reuse them."],
        quiz: { q: "What makes a prompt into a reusable template?", options: ["Making it longer", "Adding clear placeholders for the parts that change", "Removing all context", "Using only questions"], answer: 1 },
        miniProject: "Build a small personal library of 3 prompt templates for tasks you do often, each tested on at least two real examples.",
        summary: "Templates turn a one-off good prompt into a reusable tool you can rely on repeatedly.",
        revision: "Revisit and improve your templates over time as you find better phrasing.",
        nextLesson: "Mini Project"
      },
      {
        title: "Mini Project",
        description: "Design prompts for writing, brainstorming, and research tasks.",
        introduction: "This project applies everything so far — structure, context, roles, examples, and refinement — across three different task types.",
        why: "Practicing across writing, brainstorming, and research shows you how the same core skills adapt to different goals.",
        simpleExplanation: "Design and refine one strong prompt each for a writing task, a brainstorming task, and a research/summary task.",
        analogy: "This is like practicing three different recipes with the same core cooking techniques.",
        visual: "Writing prompt -> Brainstorming prompt -> Research/summary prompt, each refined through at least one round of feedback",
        explanation: "For writing, focus on tone and format. For brainstorming, ask for a wide range of options and constraints to keep them useful (e.g. 'give me 10 ideas, each under 10 words'). For research/summary, ask for sourced or clearly labeled information and be skeptical of unverified claims.",
        examples: "Brainstorm prompt: 'Give me 10 blog post title ideas for a beginner cooking blog, each under 8 words, no clickbait.'",
        interactive: "Write and refine one prompt for each of the three task types, testing each on a real topic you care about.",
        commonMistakes: ["Using the same prompt structure for every task type without adapting it", "Not adding constraints to brainstorming prompts, getting generic ideas", "Trusting research/summary answers without checking key facts"],
        memoryAid: "Writing needs tone, brainstorming needs constraints, research needs verification.",
        exercises: ["Design and test a writing prompt.", "Design and test a brainstorming prompt with clear constraints.", "Design and test a research/summary prompt, then verify one claim from the output."],
        quiz: { q: "What helps keep brainstorming output useful instead of generic?", options: ["No constraints at all", "Clear constraints like count and length", "Asking for only one idea", "Avoiding examples"], answer: 1 },
        miniProject: "Produce three finished, refined prompts — one for writing, one for brainstorming, one for research — each tested and improved through at least one refinement round.",
        summary: "This project shows how the same core prompting skills adapt across different real task types.",
        revision: "Keep your best prompt from each category as a starting template for future work.",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Create a complete prompt toolkit for work, learning, or creative projects.",
        introduction: "This capstone project is a personal library of your best, tested prompt templates for the tasks you actually do regularly.",
        why: "A ready-made toolkit means you'll actually use good prompting habits going forward, instead of starting from scratch every time.",
        simpleExplanation: "Collect 5-8 of your best prompt templates from this course into one organized document you'll actually reuse.",
        analogy: "This is like building your own personal cookbook of recipes that consistently turn out well.",
        visual: "Toolkit sections: Writing / Brainstorming / Research / Explaining concepts — each with a tested template and a real example",
        explanation: "For each template, include what it's for, the template text with placeholders, and one real example of it working well. Organize it however you'll actually find and use it later — by task type is usually clearest.",
        examples: "A toolkit entry: 'Explaining a concept simply — template: [see above] — example use: explaining photosynthesis to a 10-year-old — result: [paste the good output].'",
        interactive: "Assemble your toolkit document now, pulling in your best templates from earlier lessons in this course.",
        commonMistakes: ["Including untested templates instead of ones you've verified work well", "No organization, making the toolkit hard to actually use later", "Stopping at 1-2 templates instead of building a genuinely useful set"],
        memoryAid: "Only include templates you've actually tested and trust — quality over quantity.",
        exercises: ["Select your 5-8 best templates from the course.", "Document each with its purpose, template text, and a working example.", "Organize the toolkit by task type so it's easy to reuse."],
        quiz: { q: "What should each entry in your prompt toolkit include?", options: ["Just the template text", "Purpose, template, and a working example", "Nothing, just a title", "A random quote"], answer: 1 },
        miniProject: "Finish a documented, organized prompt toolkit with 5-8 tested templates you can genuinely reuse going forward.",
        summary: "The final project turns everything you learned into a real, reusable personal toolkit — not just course exercises.",
        revision: "Keep adding to this toolkit any time you find a prompt that works really well.",
        nextLesson: ""
      },
    ],
    realLife: ["Write better work prompts", "Generate more useful study summaries", "Create stronger content ideas with AI"],
    practice: ["Prompt for a newsletter", "Create a product description prompt", "Build prompts for lesson planning"],
    projects: ["Make a prompt library", "Create role-based prompts", "Design prompting templates for recurring tasks"]
  },
  {
    id: "uiux",
    title: "UI/UX Design",
    description: "Shape better digital experiences with research-backed decisions and elegant product flows.",
    category: "Design",
    level: "Intermediate",
    time: "4 weeks",
    intro: "Learn how to research users, structure product journeys, and turn ideas into clear, human-centered experiences.",
    roadmap: [
      "Week 1: Study user needs, behaviors, and the basics of good interface design.",
      "Week 2: Create wireframes and map the flow of a complete experience.",
      "Week 3: Improve clarity with layout, hierarchy, and accessibility choices.",
      "Week 4: Prototype a polished experience and present it with rationale."
    ],
    outcome: "Prototype a user journey for a mobile app or website feature.",
    objectives: ["Map user journeys", "Design interfaces", "Create prototypes"],
    modules: ["Design Principles", "User Research", "Wireframes", "Visual Hierarchy", "Prototyping", "Accessibility", "Mini Project", "Final Project"],
    lessons: ["Design Principles", "User Research", "Wireframes", "Visual Hierarchy", "Prototyping", "Accessibility", "Mini Project", "Final Project"],
    curriculum: {
      beginner: [
        { title: "Design Principles", description: "Learn clarity, consistency, and feedback in product interfaces." },
        { title: "User Research", description: "Gather insight from users and translate it into design choices." },
        { title: "Wireframes", description: "Map the structure of a product before adding visual polish." }
      ],
      intermediate: [
        { title: "Visual Hierarchy", description: "Guide attention to the most important actions and content." },
        { title: "Prototyping", description: "Turn ideas into clickable experiences for testing and feedback." },
        { title: "Accessibility", description: "Ensure your design works for varied users and devices." }
      ],
      advanced: [
        { title: "Mini Project", description: "Design a simple onboarding flow for a mobile app or website." },
        { title: "Final Project", description: "Present a complete redesign concept for a real product experience." }
      ]
    },
    lessonDetails: [
      {
        title: "Design Principles",
        description: "Learn clarity, consistency, and feedback in product interfaces.",
        introduction: "Great design begins with clear goals and a user-centered mindset.",
        why: "People trust and use products more when interfaces feel simple and predictable.",
        simpleExplanation: "Design principles help create interfaces that are easy to understand and use.",
        analogy: "Think of design as arranging a room so people can find what they need without confusion.",
        visual: "Clear layout -> clear hierarchy -> clear action",
        explanation: "Common principles include contrast, alignment, repetition, proximity, and accessibility.",
        examples: "A button should stand out and clearly signal what happens next.",
        interactive: "Redesign a messy form so the important actions are easier to find.",
        commonMistakes: ["Too much clutter", "Inconsistent spacing", "Weak visual hierarchy"],
        memoryAid: "Make it obvious what matters most.",
        exercises: ["Create a simple page hierarchy", "Improve a landing page layout"],
        quiz: { q: "What does visual hierarchy help users do?", options: ["Ignore the page", "Notice important elements first", "Make text smaller", "Add more colors"], answer: 1 },
        miniProject: "Redesign a sign-up form with clearer spacing and a stronger call to action.",
        summary: "Design principles create a foundation for clarity, trust, and usability.",
        revision: "Review contrast, alignment, and consistency in every design you make.",
        nextLesson: "User Research"
      },
      {
        title: "User Research",
        description: "Gather insight from users and translate it into design choices.",
        introduction: "User research helps you understand what people need before you design solutions.",
        why: "Design decisions are stronger when they are based on real user behavior and feedback.",
        simpleExplanation: "You can learn by observing users, interviewing them, and reviewing feedback.",
        analogy: "Like a doctor asking questions before prescribing treatment.",
        visual: "Research -> insight -> design decision",
        explanation: "Research can include interviews, observations, surveys, and usability notes.",
        examples: "Ask users what steps feel confusing in a checkout flow.",
        interactive: "Create a short interview guide for a product you want to improve.",
        commonMistakes: ["Assuming without evidence", "Asking leading questions", "Ignoring feedback"],
        memoryAid: "Observe the people you are designing for.",
        exercises: ["Write three interview questions", "Summarize one pain point from a mock interview"],
        quiz: { q: "Why do designers research users?", options: ["To avoid feedback", "To make better decisions", "To make things harder", "To skip testing"], answer: 1 },
        miniProject: "Create a research summary based on a fictional user interview.",
        summary: "User research turns assumptions into evidence-based design decisions.",
        revision: "Always look for patterns in user behavior and feedback.",
        nextLesson: "Wireframes"
      },
      {
        title: "Wireframes",
        description: "Map the structure of a product before adding visual polish.",
        introduction: "A wireframe is a simple, low-detail sketch of a screen's layout — no colors or final fonts, just structure.",
        why: "Wireframing lets you test and change layout decisions in minutes instead of hours, before investing in visual polish.",
        simpleExplanation: "Use boxes, lines, and placeholder text to represent where content and buttons will go.",
        analogy: "A wireframe is like an architect's floor plan — it shows the layout before anyone picks paint colors.",
        visual: "[Header]\n[Hero image] [Headline text] [CTA button]\n[Card] [Card] [Card]\n[Footer]",
        explanation: "Keep wireframes deliberately plain (grayscale boxes and Xs for images) so feedback stays focused on layout and flow, not colors or fonts. Recommended free tool: Figma (figma.com) has a large library of wireframe kits and runs in the browser.",
        examples: "A low-fidelity wireframe of a login screen: a box for the logo, two rectangles labeled 'email' and 'password', and a button labeled 'Log In'.",
        interactive: "Sketch a wireframe (on paper or in Figma) for a mobile app's home screen using only boxes and labels.",
        commonMistakes: ["Adding colors and fonts too early, distracting from layout feedback", "Skipping wireframes and jumping straight to high-fidelity design", "Making wireframes too detailed to change quickly"],
        memoryAid: "Boxes and labels first — save colors and fonts for later.",
        exercises: ["Wireframe a simple login screen.", "Wireframe a product listing page with 3 items.", "Get feedback on a wireframe from someone before adding any visual style."],
        quiz: { q: "What's the main purpose of a wireframe?", options: ["Show final colors", "Test structure and layout quickly", "Replace the final design", "Show off animations"], answer: 1 },
        miniProject: "Wireframe a 3-screen flow (e.g. browse, detail, checkout) using only boxes, labels, and placeholder text.",
        summary: "Wireframes let you test layout and flow cheaply before committing to visual design.",
        revision: "Resist the urge to add color and polish until the structure has been tested and approved.",
        nextLesson: "Visual Hierarchy"
      },
      {
        title: "Visual Hierarchy",
        description: "Guide attention to the most important actions and content.",
        introduction: "Visual hierarchy is the deliberate use of size, color, and spacing to control what a user notices first, second, and last.",
        why: "If everything on screen looks equally important, users don't know where to look or what to do next.",
        simpleExplanation: "Make the most important thing biggest, boldest, or highest-contrast, and let secondary items recede.",
        analogy: "Think of a newspaper front page — the headline is huge, the byline is small, and your eye knows exactly where to start.",
        visual: "Primary button: bold, high-contrast color\nSecondary link: smaller, muted color",
        explanation: "Size, weight, color contrast, and whitespace are your main tools. A page should generally have exactly one clear primary action — competing 'primary-looking' buttons confuse users about what to do.",
        examples: "On a signup form, 'Create Account' should visually stand out far more than a muted 'Already have an account? Log in' link.",
        interactive: "Take a screen with 3 buttons that all look equally important and redesign it so there's one clear primary action.",
        commonMistakes: ["Multiple competing 'primary' buttons on one screen", "Using color alone to signal importance (fails for colorblind users)", "Uniform text sizing that gives everything equal visual weight"],
        memoryAid: "One primary action per screen — everything else should visually take a step back.",
        exercises: ["Redesign a screen with 3 equal-weight buttons into one clear hierarchy.", "Use size and weight (not just color) to show importance.", "Identify the single primary action on 3 apps you use and note how they signal it."],
        quiz: { q: "Why shouldn't color be the only way you signal importance?", options: ["Color is always best", "It fails for colorblind users if it's the only signal", "Color slows down loading", "It's against design rules"], answer: 1 },
        miniProject: "Redesign a cluttered screen (real or hypothetical) so there's one unmistakable primary action, using size, weight, and contrast.",
        summary: "Visual hierarchy directs attention deliberately using size, contrast, and spacing — not by accident.",
        revision: "For every screen, ask: what's the one thing I want someone to do here, and does it look like it?",
        nextLesson: "Prototyping"
      },
      {
        title: "Prototyping",
        description: "Turn ideas into clickable experiences for testing and feedback.",
        introduction: "A prototype connects wireframes or screens together so people can click through and experience the flow, not just look at static images.",
        why: "Watching someone actually try to use a flow reveals confusing steps that static mockups never show you.",
        simpleExplanation: "Link screens together so tapping a button navigates to the next screen, simulating the real app.",
        analogy: "A prototype is like a movie set — it looks and feels real enough to walk through, even though it's not fully built.",
        visual: "Screen A [Login button] --click--> Screen B [Home screen]",
        explanation: "Figma's built-in prototyping mode lets you connect frames with click interactions for free, without writing any code. Start with your riskiest or most important flow (like checkout or onboarding) rather than prototyping the whole app.",
        examples: "A signup prototype: Screen 1 (email/password) -> click 'Next' -> Screen 2 (confirmation) -> click 'Done' -> Screen 3 (home).",
        interactive: "Connect 3 of your wireframed screens into a clickable prototype in Figma, then click through it yourself as if you were a new user.",
        commonMistakes: ["Prototyping the entire app before testing the core flow", "Forgetting to link a button, creating a dead end", "Not testing the prototype on someone else before calling it done"],
        memoryAid: "Prototype the riskiest flow first, and always test it on someone other than yourself.",
        exercises: ["Connect 3 screens into a clickable flow.", "Click through your own prototype and note anything confusing.", "Ask one other person to try it and record their feedback."],
        quiz: { q: "What should you prototype first?", options: ["Every screen in the whole app", "The riskiest or most important flow", "Only the settings page", "Nothing, sketches are enough"], answer: 1 },
        miniProject: "Build a clickable prototype of a 3-4 screen flow and get feedback from at least one real person trying it.",
        summary: "Prototyping turns static screens into a testable experience, surfacing confusing flows before real development starts.",
        revision: "Always test a prototype on someone who hasn't seen it before — you already know how it's 'supposed' to work.",
        nextLesson: "Accessibility"
      },
      {
        title: "Accessibility",
        description: "Ensure your design works for varied users and devices.",
        introduction: "Accessible design ensures a product works for people with visual, motor, hearing, or cognitive differences — not as an afterthought, but by default.",
        why: "Roughly 1 in 6 people have some form of disability, and many accessibility fixes (like good contrast) improve the experience for everyone.",
        simpleExplanation: "Use enough color contrast, readable text sizes, clear labels, and make sure everything works with a keyboard alone.",
        analogy: "Accessible design is like a building with both stairs and a ramp — more people can get where they need to go.",
        visual: "Text contrast ratio 4.5:1 minimum for body text (WCAG AA standard)",
        explanation: "Use a free tool like the WebAIM Contrast Checker to verify text/background color combos meet accessibility standards. Never rely on color alone to convey meaning (e.g. red/green only for errors) — pair it with an icon or text label too.",
        examples: "An error message should say 'Email is required' with a red border and an icon, not just turn the field's border red.",
        interactive: "Check the color contrast of a design you're working on using a free contrast checker tool, and fix any that fail.",
        commonMistakes: ["Low-contrast text that's technically readable but straining", "Relying on color alone to show errors or status", "Tiny tap targets that are hard to hit on mobile"],
        memoryAid: "Check contrast, don't rely on color alone, and keep tap targets big enough for a thumb.",
        exercises: ["Run a contrast check on an existing design and fix any failures.", "Redesign an error state to use an icon and text, not just red color.", "Check that all buttons are at least 44x44px for comfortable tapping."],
        quiz: { q: "Why shouldn't color alone convey important information?", options: ["Color is always fine alone", "Some users can't distinguish certain colors", "It's slower to render", "It's a legal requirement only in some countries"], answer: 1 },
        miniProject: "Audit one of your earlier project screens for contrast, tap target size, and color-only signals, then fix what fails.",
        summary: "Accessible design — good contrast, clear labels, keyboard support — makes products usable by far more people, and often improves the experience for everyone.",
        revision: "Make an accessibility check (contrast, labels, tap targets) part of your normal design review, not a separate extra step.",
        nextLesson: "Mini Project"
      },
      {
        title: "Mini Project",
        description: "Design a simple onboarding flow for a mobile app or website.",
        introduction: "This project combines wireframing, visual hierarchy, prototyping, and accessibility into one real onboarding flow.",
        why: "Onboarding is one of the highest-stakes flows in any product — if it confuses people, they leave before ever using the real product.",
        simpleExplanation: "Design a 3-4 screen onboarding flow that welcomes a new user and gets them to their first useful action.",
        analogy: "Onboarding is like a good host greeting guests at a party — quick, clear, and pointing them toward where the fun actually starts.",
        visual: "Welcome screen -> quick value explanation -> account setup -> first action (e.g. 'create your first task')",
        explanation: "Good onboarding is short — most users abandon a flow with too many steps. Each screen should have one clear primary action, and the whole flow should end with the user doing something meaningful, not just landing on an empty home screen.",
        examples: "A skill-sharing app's onboarding: Screen 1 welcomes them, Screen 2 asks what they want to learn, Screen 3 shows a matching mentor, done.",
        interactive: "Sketch your onboarding flow's screens and the one primary action on each, before building anything in Figma.",
        commonMistakes: ["Making onboarding too long (5+ screens)", "No clear single action on each screen", "Ending onboarding on an empty screen with nothing to do"],
        memoryAid: "Short, one clear action per screen, end somewhere useful — not empty.",
        exercises: ["Sketch a 3-4 screen onboarding flow.", "Build wireframes for each screen.", "Turn it into a clickable prototype and test it with one person."],
        quiz: { q: "What's a common mistake in onboarding design?", options: ["Keeping it short", "Making it too long with too many steps", "Having one clear action per screen", "Ending with a useful first action"], answer: 1 },
        miniProject: "Design, wireframe, and prototype a complete 3-4 screen onboarding flow, tested with at least one real person.",
        summary: "This project applies core UI/UX skills to one of the highest-impact flows in any real product.",
        revision: "Time yourself clicking through your own onboarding — if it feels slow to you, it'll feel slower to a new user.",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Present a complete redesign concept for a real product experience.",
        introduction: "This capstone project is a full redesign of a real app or website flow, presented the way a designer would to a real team.",
        why: "Presenting your reasoning, not just your screens, is what separates a portfolio piece from a real design case study.",
        simpleExplanation: "Pick a real product with a flow you find confusing, research the problem, and redesign it with a clear before/after.",
        analogy: "This is like a renovation show — showing the 'before', explaining the problems, then revealing the improved 'after'.",
        visual: "Problem statement -> research notes -> wireframes -> hi-fi screens -> prototype -> before/after comparison",
        explanation: "Structure your presentation like a case study: what was the problem, what did you learn from research, what did you design, and why. Recommended tool: Figma for the full design, and its 'Present' mode to walk through it as a clickable case study.",
        examples: "'The checkout flow on [product] had 3 competing buttons and unclear error messages. I redesigned it with a single primary action and inline validation, reducing steps from 5 to 3.'",
        interactive: "Choose a real app flow you find confusing and write a one-paragraph problem statement before designing anything.",
        commonMistakes: ["Redesigning without explaining what problem it solves", "Skipping research and jumping straight to visuals", "No before/after comparison to show the improvement"],
        memoryAid: "Problem, research, design, before/after — that's the shape of a real case study.",
        exercises: ["Write a clear problem statement for a real flow you want to redesign.", "Wireframe and design the improved flow.", "Build a before/after comparison and a short case study writeup."],
        quiz: { q: "What makes a redesign feel like a real case study, not just pretty screens?", options: ["More colors", "Explaining the problem and reasoning, not just the visuals", "Skipping research to save time", "Longer animations"], answer: 1 },
        miniProject: "Finish a complete redesign case study for a real product flow, including problem statement, research notes, wireframes, final screens, and a before/after comparison.",
        summary: "The final project proves the full design process: identifying a real problem and solving it with reasoning, not just visuals.",
        revision: "Keep this as a portfolio case study, and practice presenting the reasoning out loud, not just showing the screens.",
        nextLesson: ""
      },
    ],
    realLife: ["Improve onboarding for an app", "Design better checkout flows", "Create product mockups for stakeholders"],
    practice: ["Sketch a task flow for a delivery app", "Redesign a sign-up experience", "Review one product and explain its friction points"],
    projects: ["Redesign a sign-up flow", "Prototype a learning dashboard", "Improve a checkout experience"]
  },
  {
    id: "graphic-design",
    title: "Graphic Design",
    description: "Learn how layout, color, and typography create memorable visual stories for brands and products.",
    category: "Design",
    level: "Beginner",
    time: "3 weeks",
    intro: "Build strong visual communication skills by learning composition, color theory, typography, and brand storytelling.",
    roadmap: [
      "Week 1: Explore color harmony, contrast, and visual balance.",
      "Week 2: Practice typography, layout, and composition for clear messaging.",
      "Week 3: Apply the concepts to a brand package or social post set."
    ],
    outcome: "Create a simple brand poster or social media campaign kit.",
    objectives: ["Use color thoughtfully", "Create strong layouts", "Tell stories visually"],
    modules: ["Color Theory", "Typography", "Composition", "Branding", "Mini Project", "Final Project"],
    lessons: ["Color Theory", "Typography", "Composition", "Branding", "Mini Project", "Final Project"],
    curriculum: {
      beginner: [
        { title: "Color Theory", description: "Choose palettes that support mood and brand perception." },
        { title: "Typography", description: "Pair typefaces that feel modern and readable." },
        { title: "Composition", description: "Arrange elements so the eye moves with purpose." }
      ],
      intermediate: [
        { title: "Branding", description: "Apply design choices to a consistent visual identity." },
        { title: "Layout Systems", description: "Create clean grids and balance visual hierarchy across a page." }
      ],
      advanced: [
        { title: "Mini Project", description: "Design a social media carousel or one-page flyer." },
        { title: "Final Project", description: "Create a complete brand kit or poster campaign." }
      ]
    },
    lessonDetails: [
      {
        title: "Color Theory",
        description: "Choose palettes that support mood and brand perception.",
        introduction: "Color theory helps designers create balance, contrast, and emotional impact.",
        why: "Colors influence mood and help communicate meaning quickly.",
        simpleExplanation: "Warm colors feel energetic while cool colors feel calm and trustworthy.",
        analogy: "Like choosing the right lighting for a mood or event.",
        visual: "Primary colors -> secondary colors -> harmony",
        explanation: "Use complementary, analogous, and monochromatic palettes carefully to create cohesion.",
        examples: "A health app might use blue and green to suggest calmness and trust.",
        interactive: "Build a small palette and explain how each color supports the message.",
        commonMistakes: ["Too many saturated colors", "Poor contrast", "Ignoring cultural meaning"],
        memoryAid: "Use a small palette and keep it intentional.",
        exercises: ["Create a warm palette", "Create a cool palette", "Explain which one matches a brand"],
        quiz: { q: "What do complementary colors do?", options: ["Make everything dull", "Create strong contrast", "Reduce readability", "Hide the message"], answer: 1 },
        miniProject: "Create a branded color palette for a student project or startup.",
        summary: "Color theory helps designers build clarity and emotional resonance.",
        revision: "Study palettes until you can explain the mood they create.",
        nextLesson: "Typography"
      },
      {
        title: "Typography",
        description: "Pair typefaces that feel modern and readable.",
        introduction: "Typography in graphic design is about choosing and pairing fonts that set the right tone and stay easy to read.",
        why: "Font choice alone can make a design feel playful, luxurious, corporate, or trustworthy before a viewer reads a single word.",
        simpleExplanation: "Pair one display font for headlines with one clean, readable font for body text.",
        analogy: "Typography is like choosing the voice actor for a character — the words matter, but the voice sets the tone.",
        visual: "Heading: bold serif or display font\nBody: simple, highly readable sans-serif",
        explanation: "A safe, reliable pairing is one expressive font for headlines and one neutral, readable font for body text — using more than 2-3 fonts on one design usually feels chaotic. Free resource: Google Fonts (fonts.google.com) has thousands of free, well-made font pairings and pairing suggestions built in.",
        examples: "A poster might pair 'Playfair Display' (elegant serif headline) with 'Inter' (clean sans-serif body text) for contrast without clashing.",
        interactive: "Pick two fonts from Google Fonts — one headline, one body — and mock up a simple poster title and paragraph with them.",
        commonMistakes: ["Using more than 2-3 fonts in one design", "Pairing two similar fonts that create visual tension instead of contrast", "Choosing a trendy display font for long body text, hurting readability"],
        memoryAid: "One expressive font for headlines, one quiet font for body text — contrast, not competition.",
        exercises: ["Find and pair a headline and body font from Google Fonts.", "Mock up a title and paragraph using your chosen pairing.", "Critique a design you admire — identify its font pairing."],
        quiz: { q: "What's a safe rule of thumb for font pairing?", options: ["Use as many fonts as possible", "One expressive headline font + one readable body font", "Only use one font ever", "Match fonts by price"], answer: 1 },
        miniProject: "Design a simple poster or title card using a deliberate 2-font pairing, explaining why you chose it.",
        summary: "Good typography pairs a distinctive headline font with a highly readable body font, using restraint.",
        revision: "When a design feels chaotic, check the font count first — it's often the culprit.",
        nextLesson: "Composition"
      },
      {
        title: "Composition",
        description: "Arrange elements so the eye moves with purpose.",
        introduction: "Composition is how elements are arranged on a page so the viewer's eye moves through it in a deliberate order.",
        why: "Good composition determines whether a design feels balanced and guides attention, or feels random and hard to follow.",
        simpleExplanation: "Use alignment, spacing, and grouping so related items feel connected and the most important item stands out.",
        analogy: "Composition is like arranging furniture in a room — everything has a place that makes the space feel intentional, not cluttered.",
        visual: "Aligned grid: logo top-left, headline center, CTA bottom-right, consistent margins throughout",
        explanation: "The rule of thirds (dividing a canvas into a 3x3 grid) is a strong starting point for placing focal points off-center. Consistent alignment and generous whitespace do more for a design's polish than most people expect.",
        examples: "A flyer with the headline placed at one of the rule-of-thirds intersections feels more dynamic than one dead-centered.",
        interactive: "Take a cluttered design (real or imagined) and redesign it using a simple grid and more whitespace.",
        commonMistakes: ["Centering everything by default, which can feel static", "Inconsistent spacing between elements", "Too many focal points competing for attention"],
        memoryAid: "Align things deliberately, give them room to breathe, and pick one clear focal point.",
        exercises: ["Redesign a cluttered layout using a 3x3 grid.", "Practice placing a focal point off-center using the rule of thirds.", "Add consistent margins to an existing design."],
        quiz: { q: "What does the rule of thirds help with?", options: ["Choosing colors", "Placing focal points for a dynamic composition", "Picking fonts", "File compression"], answer: 1 },
        miniProject: "Design a simple flyer or social post using the rule of thirds and consistent alignment.",
        summary: "Composition — alignment, spacing, and focal points — gives a design intentional structure instead of clutter.",
        revision: "Before finalizing a design, check for consistent alignment and one clear focal point.",
        nextLesson: "Branding"
      },
      {
        title: "Branding",
        description: "Apply design choices to a consistent visual identity.",
        introduction: "Branding is applying consistent colors, fonts, and style across everything a business puts out, so it's instantly recognizable.",
        why: "Consistency builds trust and recognition — a brand that looks different every time feels less credible.",
        simpleExplanation: "Define a small, fixed set of colors, fonts, and a logo, then apply them the same way everywhere.",
        analogy: "A brand identity is like a person's signature style — recognizable even without seeing their name.",
        visual: "Logo + 2-3 brand colors + 2 approved fonts + a consistent tone -> applied to social posts, flyers, and web",
        explanation: "Document your brand choices in a simple one-page style sheet: primary/secondary colors with hex codes, approved fonts, and logo usage rules (minimum size, clear space). This keeps every future design consistent, even for someone else using it.",
        examples: "A small bakery's brand kit: warm cream background (#FDF6EC), one accent color (#D9622B), a rounded logo mark, and 'Fraunces' + 'Inter' as its two fonts.",
        interactive: "Create a simple one-page brand style sheet for a fictional small business, with hex codes and font names.",
        commonMistakes: ["Changing colors or fonts inconsistently across different materials", "No documented style sheet, making it hard to stay consistent over time", "Too many colors in the palette (more than 3-4 core colors)"],
        memoryAid: "Pick a small, fixed set of choices once, then reuse them everywhere — consistency is the whole point.",
        exercises: ["Create a brand style sheet for a fictional business (colors, fonts, logo rules).", "Apply that style sheet to a social media post design.", "Apply the same style sheet to a flyer design and check for consistency."],
        quiz: { q: "Why does brand consistency matter?", options: ["It doesn't matter", "It builds recognition and trust over time", "It saves file storage", "It's only for large companies"], answer: 1 },
        miniProject: "Create a small brand kit (logo concept, 3 colors with hex codes, 2 fonts) and apply it consistently across a social post and a flyer.",
        summary: "Branding is the consistent, deliberate reuse of a small set of visual choices across everything a business produces.",
        revision: "Write your brand choices down in a simple style sheet — memory alone won't keep things consistent over time.",
        nextLesson: "Mini Project"
      },
      { title: "Layout Systems", description: "Create clean grids and balance visual hierarchy across a page." },
      {
        title: "Mini Project",
        description: "Design a social media carousel or one-page flyer.",
        introduction: "This project combines typography, composition, and branding into one real, publishable design piece.",
        why: "A finished, real design piece — not just isolated exercises — is what proves you can actually apply these skills together.",
        simpleExplanation: "Design either a multi-slide social media carousel or a one-page flyer using a consistent style throughout.",
        analogy: "This is where individual design lessons come together into one finished, presentable piece — like a chef plating a full dish.",
        visual: "Slide/section 1: hook headline -> Slide 2-3: supporting content -> Final slide: clear call to action, all sharing the same fonts/colors",
        explanation: "Recommended free tool: Canva (canva.com) has ready-made carousel and flyer templates you can customize with your own fonts and colors — a fast way to apply what you've learned without starting from a blank canvas. Keep every slide/section visually consistent using the same 2-3 colors and 2 fonts throughout.",
        examples: "A 5-slide carousel: hook slide, 3 content slides with one key point each, and a final 'follow for more' slide, all sharing a consistent color and font system.",
        interactive: "Sketch out your carousel's slide-by-slide content before opening any design tool.",
        commonMistakes: ["Inconsistent styling from slide to slide", "Too much text per slide, hurting readability", "No clear call to action on the final slide"],
        memoryAid: "Plan the content first, then design it consistently across every slide or section.",
        exercises: ["Plan the content for a 4-5 slide carousel or flyer.", "Design each slide/section with consistent fonts and colors.", "Add a clear final call to action."],
        quiz: { q: "What keeps a multi-slide carousel feeling cohesive?", options: ["A different font on every slide", "Consistent colors and fonts across all slides", "As much text as possible", "No plan before designing"], answer: 1 },
        miniProject: "Design and finish a complete social media carousel (4-5 slides) or one-page flyer with consistent styling throughout.",
        summary: "This project applies typography, composition, and branding together into one finished, real design piece.",
        revision: "Review your finished piece slide by slide (or section by section) and check every one shares the same visual system.",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Create a complete brand kit or poster campaign.",
        introduction: "This capstone project is a complete, cohesive design deliverable — a full brand kit or a multi-piece poster campaign.",
        why: "A polished, cohesive multi-piece body of work is what a real portfolio needs, not just single unrelated designs.",
        simpleExplanation: "Build either a complete brand kit (logo, colors, fonts, usage rules, applied to 3+ pieces) or a poster campaign (3+ posters sharing one visual system).",
        analogy: "This is the difference between one nice outfit and a whole coordinated wardrobe that all works together.",
        visual: "Brand kit: logo + palette + fonts + rules -> applied to business card, social post, and flyer, all clearly matching",
        explanation: "Pick a real or fictional business/event you care about so the project feels grounded. Document your choices (colors with hex codes, font names, logo rules) in a one-page style sheet, then apply that system consistently across at least 3 different pieces.",
        examples: "A poster campaign for a fictional music festival: 3 posters (headliner announcement, ticket sale, lineup reveal) sharing the same color palette, fonts, and layout grid.",
        interactive: "Choose your project's concept and write a one-paragraph brief describing who it's for and what feeling it should create.",
        commonMistakes: ["Designing pieces that don't visually match each other", "Skipping the documented style sheet", "Choosing too broad a scope to finish well"],
        memoryAid: "Same colors, same fonts, same rules across every piece — that consistency is what makes it a 'kit' or 'campaign', not just separate designs.",
        exercises: ["Write your project brief and choose brand kit vs poster campaign.", "Build and document your core style sheet.", "Apply the system consistently across 3+ finished pieces."],
        quiz: { q: "What separates a 'brand kit' from a few unrelated designs?", options: ["Nothing, they're the same", "A consistent, documented visual system applied across all pieces", "Using more colors in each piece", "Having only one design total"], answer: 1 },
        miniProject: "Finish a complete, cohesive brand kit or poster campaign (3+ pieces) built on one documented visual system.",
        summary: "The final project proves you can build and consistently apply a full visual system, not just single standalone designs.",
        revision: "Keep this as a portfolio piece, and practice explaining the reasoning behind your color and font choices.",
        nextLesson: ""
      },
    ],
    realLife: ["Design social media graphics", "Create slide decks for presentations", "Support a small business brand"],
    practice: ["Create a one-page flyer", "Design a social post set", "Rewrite a visual brand system"],
    projects: ["Create a social campaign", "Design a poster series", "Develop a simple brand identity"]
  },
  {
    id: "photography",
    title: "Photography",
    description: "Develop a professional eye for light, framing, and storytelling through real-world shooting exercises.",
    category: "Photography",
    level: "Beginner",
    time: "3 weeks",
    intro: "Explore the art and craft of photography through composition, lighting, editing, and storytelling exercises.",
    roadmap: [
      "Week 1: Practice framing, balance, and composition in everyday scenes.",
      "Week 2: Learn how light shapes mood, texture, and detail.",
      "Week 3: Edit your photos with intention and assemble a simple photo story."
    ],
    outcome: "Capture a mini photo story for a portfolio or social campaign.",
    objectives: ["Frame compelling shots", "Use light creatively", "Edit with intention"],
    modules: ["Composition", "Lighting", "Editing", "Storytelling", "Mini Project", "Final Project"],
    lessons: ["Composition", "Lighting", "Editing", "Storytelling", "Mini Project", "Final Project"],
    curriculum: {
      beginner: [
        { title: "Composition", description: "Learn how leading lines, balance, and framing shape attention." },
        { title: "Lighting", description: "Work with natural light to create mood and depth." },
        { title: "Editing", description: "Refine photos with color, crop, and contrast adjustments." }
      ],
      intermediate: [
        { title: "Storytelling", description: "Turn a set of photos into a clear narrative or theme." },
        { title: "Camera Settings", description: "Adjust settings to make your photos more intentional and sharp." }
      ],
      advanced: [
        { title: "Mini Project", description: "Shoot a short series around one theme, such as texture or motion." },
        { title: "Final Project", description: "Create a coherent photo story for a portfolio or social post." }
      ]
    },
    lessonDetails: [
      {
        title: "Composition",
        description: "Learn how leading lines, balance, and framing shape attention.",
        introduction: "Composition is how a photo is arranged so the eye knows where to go.",
        why: "A strong composition makes images feel intentional and memorable.",
        simpleExplanation: "Use balance, framing, and space to guide attention.",
        analogy: "Like arranging objects on a stage so the most important thing is seen first.",
        visual: "Subject in center -> subject off-center with space",
        explanation: "Good composition often uses rule-of-thirds, leading lines, or a clear focal point.",
        examples: "A portrait with the subject slightly off-center often feels more natural than a centered shot.",
        interactive: "Take two photos of the same object with different composition and compare them.",
        commonMistakes: ["Cluttered backgrounds", "Random framing", "Ignoring the subject"],
        memoryAid: "Keep the subject clear and the background supporting.",
        exercises: ["Shoot one photo using rule-of-thirds", "Shoot one photo using leading lines"],
        quiz: { q: "What is composition in photography?", options: ["How the image is arranged", "How the camera is cleaned", "The file format", "The battery level"], answer: 0 },
        miniProject: "Shoot a short series around one everyday object using different composition choices.",
        summary: "Composition helps viewers understand and enjoy an image.",
        revision: "Practice framing the same subject in multiple ways.",
        nextLesson: "Lighting"
      },
      {
        title: "Lighting",
        description: "Work with natural light to create mood and depth.",
        introduction: "Light shapes everything in a photo — its mood, texture, and depth — often more than the subject itself.",
        why: "The exact same subject can look flat and dull or dramatic and compelling purely based on the lighting.",
        simpleExplanation: "Soft, diffused light (like an overcast sky) is flattering and even; hard, direct light creates strong shadows and contrast.",
        analogy: "Light is like a spotlight in a theater — where it points and how harsh it is decides what the audience feels.",
        visual: "Golden hour (soft, warm, low-angle) vs. harsh midday sun (hard shadows, high contrast)",
        explanation: "Golden hour — the hour after sunrise and before sunset — gives soft, warm, flattering light and is a favorite for portraits. Backlighting (light behind the subject) creates silhouettes or a glowing rim-light effect, and can add real drama.",
        examples: "Shooting a portrait during golden hour with the sun slightly behind the subject creates a warm rim of light around their hair and shoulders.",
        interactive: "Photograph the same object in harsh midday light and again in softer light (shade or overcast) and compare the mood.",
        commonMistakes: ["Shooting portraits in harsh, direct overhead sun, creating unflattering shadows", "Ignoring where the light source is relative to the subject", "Not using shade or a diffuser to soften harsh light"],
        memoryAid: "Soft light flatters, hard light creates drama — golden hour is the easiest 'good light' to find.",
        exercises: ["Shoot the same subject in two different lighting conditions.", "Shoot a photo using backlighting for a silhouette or rim-light effect.", "Find and use shade to soften harsh midday light."],
        quiz: { q: "What does 'golden hour' refer to?", options: ["Midday sun", "The hour after sunrise/before sunset", "Any time it's cloudy", "Studio lighting only"], answer: 1 },
        miniProject: "Shoot a short series of the same subject at three different times of day, comparing how the light changes the mood.",
        summary: "Light — its softness, direction, and time of day — is one of the strongest tools for shaping a photo's mood.",
        revision: "Before shooting, notice where the light is coming from and how hard or soft it is.",
        nextLesson: "Editing"
      },
      {
        title: "Editing",
        description: "Refine photos with color, crop, and contrast adjustments.",
        introduction: "Editing refines a photo after the shot — adjusting crop, exposure, color, and contrast to bring out its best version.",
        why: "Even great shots usually benefit from small adjustments; editing is a normal, expected part of the photography process, not 'cheating'.",
        simpleExplanation: "Adjust exposure (brightness), contrast, and crop first — those changes have the biggest visual impact.",
        analogy: "Editing is like polishing a rough gem — the shot is the raw material, editing brings out its best form.",
        visual: "Raw shot -> crop for composition -> adjust exposure/contrast -> adjust color -> final export",
        explanation: "Free, capable editing tools: Snapseed (mobile, free) and Lightroom's free mobile app both offer real exposure, crop, and color controls. Make small, deliberate adjustments — over-editing (oversaturated colors, extreme contrast) usually looks worse than a light touch.",
        examples: "Cropping to remove a distracting background element and slightly boosting contrast can turn a flat photo into a striking one.",
        interactive: "Take one photo you already have and edit it in Snapseed or Lightroom mobile: crop, adjust exposure, adjust color.",
        commonMistakes: ["Over-editing with extreme saturation or contrast", "Not cropping to improve composition after the fact", "Editing on an uncalibrated screen and then viewing it looking very different elsewhere"],
        memoryAid: "Crop and exposure first — those two changes matter more than any filter.",
        exercises: ["Edit a photo's crop to improve its composition.", "Adjust exposure and contrast on a flat-looking photo.", "Edit the same photo two ways — subtle vs. heavy — and compare."],
        quiz: { q: "What two edits usually have the biggest impact on a photo?", options: ["Filters and stickers", "Crop and exposure", "File format and size", "Adding text"], answer: 1 },
        miniProject: "Edit a set of 5 photos consistently (same style of crop, exposure, and color adjustments) so they feel like a cohesive set.",
        summary: "Thoughtful editing — crop, exposure, contrast, color — refines a photo without needing to look 'overdone'.",
        revision: "When in doubt, edit less — a light, deliberate touch usually beats heavy filters.",
        nextLesson: "Storytelling"
      },
      {
        title: "Storytelling",
        description: "Turn a set of photos into a clear narrative or theme.",
        introduction: "Photo storytelling is arranging a set of images so together they tell a clearer story than any single photo alone.",
        why: "A cohesive photo series is far more memorable and shareable than a random collection of unrelated shots.",
        simpleExplanation: "Choose one theme or narrative arc, then select and order photos that build that story from start to finish.",
        analogy: "A photo series is like a short film made of stills — each frame is a beat in the same story.",
        visual: "Wide establishing shot -> medium detail shots -> one strong closing image",
        explanation: "A classic structure: start with a wide 'establishing' shot that sets the scene, follow with detail/medium shots that build interest, and end with a strong closing image. Editing out photos that don't serve the theme is just as important as the shots you keep.",
        examples: "A 'morning routine' series: wide shot of the kitchen, a detail shot of coffee being poured, a shot of hands writing in a journal, ending on a shot walking out the door.",
        interactive: "Pick 5-6 existing photos you have and arrange them into a sequence that tells one small story.",
        commonMistakes: ["Including photos that don't relate to the theme just because they're technically good", "No clear beginning or ending to the sequence", "Too many similar shots without variety in framing (all wide, or all close-up)"],
        memoryAid: "Wide to set the scene, detail to build interest, one strong shot to close it.",
        exercises: ["Choose a theme and shoot 5-6 photos around it.", "Arrange them in a sequence with a clear beginning and end.", "Cut any photo that doesn't serve the story, even if it's a good shot on its own."],
        quiz: { q: "What's a common mistake in building a photo story?", options: ["Having a clear theme", "Including unrelated photos just because they're good", "Varying the shot types", "Having a strong closing image"], answer: 1 },
        miniProject: "Shoot and sequence a 5-6 photo story around one theme, with a clear beginning, middle, and closing image.",
        summary: "Photo storytelling is about theme, sequence, and restraint — cutting shots that don't serve the narrative.",
        revision: "When arranging a series, ask whether each photo earns its place in the story, not just whether it's a good shot.",
        nextLesson: "Camera Settings"
      },
      {
        title: "Camera Settings",
        description: "Adjust settings to make your photos more intentional and sharp.",
        introduction: "Understanding aperture, shutter speed, and ISO — the exposure triangle — lets you shoot intentionally instead of relying on full auto.",
        why: "Manual control lets you decide exactly what's sharp, how much light comes in, and whether motion is frozen or blurred.",
        simpleExplanation: "Aperture controls background blur, shutter speed controls motion blur, and ISO controls brightness in low light.",
        analogy: "Aperture is like a pupil widening in the dark, shutter speed is how long the shutter 'blinks', and ISO is like turning up a room's light sensitivity.",
        visual: "Aperture f/1.8 (blurry background) vs f/11 (everything sharp)\nShutter 1/1000s (frozen motion) vs 1/10s (motion blur)",
        explanation: "A low f-number (like f/1.8) gives a shallow depth of field — great for portraits with a blurry background. Fast shutter speeds (1/500s+) freeze motion; slow ones (1/30s or slower) create intentional blur. Higher ISO brightens low-light shots but adds visible grain, so it's a tradeoff.",
        examples: "Shooting a portrait at f/2.0 blurs the background nicely; shooting a sports action shot needs a fast shutter like 1/1000s to freeze motion.",
        interactive: "If your camera or phone has manual/pro mode, try shooting the same subject at a wide aperture and a narrow one and compare the background blur.",
        commonMistakes: ["Using auto mode exclusively and never learning what the settings actually do", "Using a slow shutter speed handheld, causing accidental blur", "Cranking ISO too high in low light, adding excessive grain"],
        memoryAid: "Aperture = blur, shutter = motion, ISO = brightness (with a grain tradeoff).",
        exercises: ["Shoot a portrait with a wide aperture for background blur.", "Shoot a moving subject with a fast shutter speed to freeze it.", "Shoot the same low-light scene at two different ISO levels and compare grain."],
        quiz: { q: "What does a low f-number (like f/1.8) create?", options: ["Everything in sharp focus", "A shallow depth of field with background blur", "Faster shutter speed automatically", "No effect on the image"], answer: 1 },
        miniProject: "Shoot a small set of photos deliberately using different aperture and shutter combinations, and write one sentence on the effect each had.",
        summary: "Aperture, shutter speed, and ISO together give you intentional control over blur, motion, and brightness.",
        revision: "Practice switching to manual or pro mode occasionally, even briefly, to build intuition for these controls.",
        nextLesson: "Mini Project"
      },
      {
        title: "Mini Project",
        description: "Shoot a short series around one theme, such as texture or motion.",
        introduction: "This project combines lighting, editing, storytelling, and camera settings into one real, cohesive photo series.",
        why: "A finished, edited series proves you can apply these skills together, not just execute individual techniques in isolation.",
        simpleExplanation: "Pick one theme (texture, motion, morning light, a single color) and shoot and edit 5-8 photos exploring it.",
        analogy: "This is where individual technique practice becomes a real, presentable body of work — like a short film after learning individual camera moves.",
        visual: "Theme -> shoot 8-10 raw photos -> select the best 5-8 -> edit consistently -> sequence into a series",
        explanation: "Shoot more than you need (8-10+ shots) so you have real options when selecting. Edit the chosen photos with a consistent style (similar tone, contrast) so the set feels cohesive, and sequence them with intention using what you learned about storytelling.",
        examples: "A 'texture' series might include close-ups of tree bark, cracked pavement, and woven fabric, all edited with similar warm, high-contrast tones.",
        interactive: "Choose your theme now and go shoot at least 8-10 photos exploring it before selecting your final set.",
        commonMistakes: ["Not shooting enough raw material to have real options when selecting", "Inconsistent editing style across the final set", "No real theme, just a random assortment of decent photos"],
        memoryAid: "Shoot more than you need, edit consistently, choose a real theme, not just 'good photos'.",
        exercises: ["Choose a theme and shoot 8-10 raw photos.", "Select and edit your best 5-8 with a consistent style.", "Sequence the final set with a clear beginning and ending."],
        quiz: { q: "Why shoot more photos than you think you'll need?", options: ["To fill up storage", "To have real options when selecting the best set", "It's required by the camera", "It doesn't matter"], answer: 1 },
        miniProject: "Shoot, select, and edit a cohesive 5-8 photo series around one clear theme.",
        summary: "This project turns individual photography skills into one real, cohesive, edited series.",
        revision: "Review your final set together, side by side — do they feel like they belong to the same series?",
        nextLesson: "Final Project"
      },
      {
        title: "Final Project",
        description: "Create a coherent photo story for a portfolio or social post.",
        introduction: "This capstone project is a polished, complete photo story ready to share in a portfolio or as a social media post.",
        why: "A finished, shareable photo story is the strongest real proof of photography skill — stronger than any single great shot.",
        simpleExplanation: "Plan, shoot, edit, and sequence a complete photo story (6-10 images) around a theme you genuinely care about.",
        analogy: "This is the difference between practicing scales and performing a finished piece for an audience.",
        visual: "Concept -> shot list -> shoot -> select best shots -> edit consistently -> sequence -> publish",
        explanation: "Start with a short concept and a rough shot list (what shots you'll need: wide, detail, closing) before shooting. After editing and sequencing, publish it somewhere real — Instagram, a personal portfolio site, or even a simple PDF — so it exists as a finished, shareable piece.",
        examples: "A 'my neighborhood in the morning' story: wide street shot, a coffee shop detail, people commuting, ending on a quiet closing image — published as an Instagram carousel.",
        interactive: "Write your project's concept and a rough shot list of 6-8 shots before you start shooting.",
        commonMistakes: ["Shooting without any plan or shot list", "Never actually publishing the finished piece anywhere", "Including technically good shots that don't fit the story's theme"],
        memoryAid: "Plan the shot list, shoot with intention, edit consistently, and actually publish it somewhere.",
        exercises: ["Write your concept and shot list.", "Shoot, select, and edit your final 6-10 images.", "Publish the finished story somewhere real (social media or a portfolio page)."],
        quiz: { q: "What's a good first step before shooting a final photo story?", options: ["Start shooting immediately with no plan", "Write a concept and rough shot list", "Buy new equipment", "Skip editing entirely"], answer: 1 },
        miniProject: "Plan, shoot, edit, and publish a complete 6-10 photo story around one real theme.",
        summary: "The final project proves the full process: planning, shooting, editing, and publishing a real, finished photo story.",
        revision: "Keep this project as a portfolio piece, and revisit the shot-list habit for future series.",
        nextLesson: ""
      },
    ],
    realLife: ["Capture event photos", "Create a portfolio gallery", "Shoot social content for a brand"],
    practice: ["Photograph a morning commute", "Create a photo series about texture", "Edit one photo into three different moods"],
    projects: ["Build a photo essay", "Create a travel gallery", "Shoot a mini brand campaign"]
  },
];

const skillEngine = window.SkillSwapLearningData?.createSkillCatalogEngine(skillCatalog, STORAGE_KEYS);
const {
  buildSkillLearningPath: engineBuildSkillLearningPath,
  getSkillLessonEntries: engineGetSkillLessonEntries,
  getSkillCurriculumSections: engineGetSkillCurriculumSections,
  normalizeSkill: engineNormalizeSkill,
  getSkillById: engineGetSkillById
} = skillEngine || {};

let lessonRenderer = null;
let lessonParamApplied = false;

// Every listed topic is a learnable course.  The richer hand-written courses above
// remain intact; these course blueprints complete the community catalogue.
function createCourse(id, title, category, level, description, outcome) {
  const topics = ["Foundations", "Core tools", "Practice workflow", "Feedback and improvement", "Portfolio project", "Final showcase"];
  const lessons = topics.map((topic, index) => ({
    title: `${topic}: ${title}`,
    description: `${index + 1}. Build practical ${title} confidence through a focused, guided lesson.`,
    introduction: `In this lesson you will learn the essential ${title} habits used in real projects.`,
    why: `A clear ${title} process helps you deliver useful work, communicate your choices, and improve quickly.`,
    simpleExplanation: `Learn one small concept, apply it immediately, review the result, and repeat with feedback.`,
    analogy: `${title} improves like a sport: short deliberate practice sessions build reliable skills.`,
    visual: `Learn → practise → get feedback → refine → share`,
    explanation: `Work through the examples, then make the exercise your own. Keep notes on what worked, what was difficult, and what you will improve next time.`,
    examples: `Start with a small ${title} task, document your choices, then compare the first draft with a refined version.`,
    interactive: `Complete the exercise below, save your evidence, and bring one question to a peer swap session.`,
    commonMistakes: ["Trying to learn everything at once", "Skipping practice", "Not asking for specific feedback"],
    memoryAid: "Small practice, honest feedback, steady improvement.",
    exercises: [`Complete a 20-minute ${title} drill`, "Write down one thing you improved", "Ask a peer for one actionable suggestion"],
    quiz: { q: `What is the best way to improve your ${title} skill?`, options: ["Practise, review, and iterate", "Only watch tutorials", "Wait for a perfect idea", "Avoid feedback"], answer: 0 },
    miniProject: `Create a small ${title} project that solves a real student problem and share it for feedback.`,
    summary: `You have a repeatable process for learning and applying ${title}.`,
    revision: "Review your work, explain one choice, and choose your next improvement.",
    nextLesson: index < topics.length - 1 ? `${topics[index + 1]}: ${title}` : ""
  }));
  return {
    id, title, category, level, time: "3 weeks", description, intro: `A complete, practice-led ${title} course for students who want skills they can use and share.`, outcome,
    objectives: ["Learn the core workflow", "Practise with feedback", "Finish a shareable project"],
    lessons: lessons.map((lesson) => lesson.title), modules: lessons.map((lesson) => lesson.title),
    curriculum: { beginner: lessons.slice(0, 2), intermediate: lessons.slice(2, 4), advanced: lessons.slice(4) },
    lessonDetails: lessons, roadmap: ["Week 1: Learn the foundations and core tools.", "Week 2: Practise with feedback and improve your workflow.", "Week 3: Build, present, and reflect on a final project."],
    practice: lessons.slice(0, 3).map((lesson) => lesson.miniProject), projects: [`Complete a ${title} mini project`, `Prepare a ${title} portfolio piece`, "Present your work in a peer feedback session"]
  };
}

[
  ["mathematics", "Mathematics", "Academic", "Beginner", "Strengthen problem solving with clear methods and peer explanation.", "Solve and explain a set of university-level practice problems."],
  ["public-speaking", "Public Speaking", "Communication", "Beginner", "Build confidence, structure, and presence for presentations.", "Deliver a clear five-minute presentation with peer feedback."],
  ["video-editing", "Video Editing", "Creative", "Beginner", "Plan, cut, refine, and publish compelling short videos.", "Edit a polished one-minute video story."]
  ,["html", "HTML", "Development", "Beginner", "Learn the semantic structure that makes every web page readable and accessible.", "Publish a complete multi-section HTML profile page."],
  ["css", "CSS", "Development", "Beginner", "Style pages with modern layouts, responsive design, and purposeful motion.", "Create a responsive, polished web interface."],
  ,["kotlin", "Kotlin", "Development", "Beginner", "Learn Kotlin syntax, object-oriented thinking, and Android-ready foundations.", "Build a small Kotlin console application."],
  ["mobile-app-development", "Mobile App Development", "Development", "Intermediate", "Design and build mobile experiences that solve a real user need.", "Prototype and present a working mobile app concept."],
  ["entrepreneurship", "Entrepreneurship", "Business", "Beginner", "Validate ideas, understand customers, and plan a small sustainable venture.", "Create and pitch a one-page student startup plan."],
  ["communication-skills", "Communication Skills", "Communication", "Beginner", "Communicate clearly in conversations, writing, and collaborative work.", "Deliver a concise, confident professional message and presentation."]
].forEach((course) => skillCatalog.push(createCourse(...course)));

// Turn every course module into a complete in-platform lesson. The data below gives
// each skill its own vocabulary, method, practice, and final deliverable rather
// than sending learners to another platform.
const skillTeachingGuides = {
  "HTML & CSS": { core: "semantic structure, layout, and responsive styling", do: "build one section of a responsive student portfolio", check: "Does every image have useful alternative text and does the layout still work at 360px?", project: "a responsive portfolio landing page" },
  "HTML": { core: "semantic structure, meaningful elements, and accessible content", do: "write a small HTML page using a heading, paragraph, list, link, and image", check: "Can you point to the opening tag, content, and closing tag for each element?", project: "a multi-section HTML profile page" },
  "CSS": { core: "selectors, layout, responsive rules, and visual hierarchy", do: "style a small card and change one property at a time", check: "Does the page remain readable, usable, and balanced on a narrow screen?", project: "a responsive student dashboard interface" },
  "JavaScript": { core: "values, functions, events, and the DOM", do: "write one small function, connect it to a button, and inspect the result", check: "Can you explain what changes when the user clicks and where the data is stored?", project: "an interactive study tracker" },
  "Python": { core: "variables, control flow, functions, and data collections", do: "solve a small input-to-output problem before looking at a solution", check: "Can you trace the value of each variable line by line?", project: "a command-line study planner" },
  "UI/UX Design": { core: "user needs, flows, hierarchy, and usability", do: "sketch a low-fidelity screen for one real student task", check: "Can a first-time user identify the main action in five seconds?", project: "a tested mobile-app onboarding flow" },
  "Graphic Design": { core: "contrast, hierarchy, alignment, and visual consistency", do: "create three layout variations using the same words and assets", check: "Can a viewer find the headline, key message, and action in that order?", project: "a small campus-event brand kit" },
  "Photography": { core: "light, exposure, composition, and visual storytelling", do: "photograph one subject from three angles and compare the strongest frame", check: "Is the subject clear, the background helpful, and the exposure intentional?", project: "a five-image photo story" },
  "AI Automation": { core: "mapping repetitive work, input-output rules, and human review", do: "draw a simple workflow with trigger, action, and review step", check: "What can go wrong and where does a human approve the output?", project: "a safe student-workflow automation plan" },
  "AI Prompt Engineering": { core: "clear instructions, context, constraints, and evaluation", do: "rewrite a vague prompt with a role, goal, context, format, and quality check", check: "Could another person reproduce a useful answer from your prompt?", project: "a tested prompt library for study tasks" },
  "Mathematics": { core: "definitions, worked examples, patterns, and checking", do: "solve one problem on paper, writing a reason beside each transformation", check: "Can you substitute your answer back into the original problem?", project: "a step-by-step problem-solving guide" },
  "Public Speaking": { core: "purpose, audience, structure, delivery, and rehearsal", do: "record a one-minute talk using hook, point, example, and close", check: "Can a listener state your single main message after hearing it once?", project: "a timed five-minute persuasive talk" },
  "Video Editing": { core: "story, selection, pacing, audio, and export", do: "make a 20-second sequence with a clear beginning, middle, and end", check: "Does every cut help the viewer understand or feel something?", project: "a one-minute student story" },
  "Kotlin": { core: "types, functions, null safety, and object-oriented design", do: "write a tiny function, call it with two inputs, and predict the output", check: "What type does each expression produce and where can null appear?", project: "a Kotlin console study helper" },
  "Mobile App Development": { core: "user flows, screens, state, and accessible interaction", do: "map one task from opening the app to a successful outcome", check: "Can the task be completed with a clear label, feedback, and recovery path?", project: "a clickable student-service app prototype" },
  "Entrepreneurship": { core: "customer problems, value propositions, experiments, and simple economics", do: "interview one potential user without pitching your solution first", check: "What evidence shows the problem is important enough to solve?", project: "a one-page student venture experiment" },
  "Communication Skills": { core: "audience, purpose, structure, listening, and clear action", do: "rewrite one long message so the purpose and requested action appear first", check: "Can the receiver repeat the next step without asking a question?", project: "a professional message and short briefing" }
};

function enrichLesson(skill, lesson, index, allLessons) {
  const guide = skillTeachingGuides[skill.title] || { core: "foundations, deliberate practice, feedback, and reflection", do: "complete one small practice task", check: "Can you explain your result clearly?", project: `a practical ${skill.title} project` };
  const title = lesson.title || lesson;
  const nextTitle = allLessons[index + 1]?.title || allLessons[index + 1] || "";
  const browserCode = skill.id === "html-css" ? `<!doctype html>\n<html><head><style>body{font-family:system-ui;padding:24px}.card{max-width:360px;padding:20px;border-radius:16px;background:#ede9fe;color:#312e81}button{padding:10px 14px;border:0;border-radius:8px;background:#6d28d9;color:#fff}</style></head><body><main class="card"><h1>${title}</h1><p>Change this text, colour, or spacing, then press Run.</p><button>Practise</button></main></body></html>` : skill.id === "javascript" ? `<!doctype html>\n<html><body style="font-family:system-ui;padding:24px"><h1 id="count">0</h1><button id="add">Add one</button><script>let count=0;document.querySelector('#add').addEventListener('click',()=>{count+=1;document.querySelector('#count').textContent=count;});</script></body></html>` : "";
  const syntax = skill.id === "python" ? `# ${title}\nname = "Ada"\nprint(f"Hello, {name}")` : skill.id === "kotlin" ? `// ${title}\nfun greet(name: String): String {\n  return "Hello, $name"\n}\nprintln(greet("Ada"))` : "";
  return {
    ...lesson,
    title,
    description: lesson.description || `Learn ${title} through a clear explanation, guided practice, and a quick self-check.`,
    introduction: lesson.introduction || `${title} is one practical part of ${skill.title}. You will learn it by doing a small task, reviewing the result, and improving it once.`,
    why: lesson.why || `This matters because ${guide.core} are the building blocks of useful ${skill.title} work.`,
    simpleExplanation: lesson.simpleExplanation || `First understand the goal. Then make the smallest possible example. Change one thing at a time and observe the effect.`,
    analogy: lesson.analogy || `Treat this as a short training drill: isolate one movement, practise it slowly, then use it in a real situation.`,
    visual: lesson.visual || syntax || `Goal → small example → observe → improve → apply\nTopic: ${title}`,
    code: lesson.code || browserCode,
    explanation: lesson.explanation || `Work in three passes. Pass 1: identify the outcome and the key idea. Pass 2: follow the example and name each choice you make. Pass 3: change one part and explain how the result changes. This method makes learning active instead of passive.`,
    examples: lesson.examples || `Guided example: ${guide.do}. Keep the first version simple. Then create a second version that improves one choice—clarity, structure, contrast, correctness, or pacing.`,
    steps: lesson.steps || [`State the outcome of ${title} in your own words.`, guide.do, `Use this self-check: ${guide.check}`, "Make one improvement and record what changed."],
    interactive: lesson.interactive || `Try it now: ${guide.do}. When you finish, answer this self-check: ${guide.check}`,
    commonMistakes: lesson.commonMistakes?.length ? lesson.commonMistakes : ["Trying to make the first attempt perfect", "Changing several things before checking the result", "Skipping the self-check or feedback step"],
    memoryAid: lesson.memoryAid || "Learn it, do it, check it, improve it.",
    exercises: lesson.exercises?.length ? lesson.exercises : [`Explain ${title} in two plain sentences.`, guide.do, `Review your work: ${guide.check}`],
    quiz: lesson.quiz || { q: `What is the most effective next step after a first attempt at ${title}?`, options: ["Check the result and improve one specific thing", "Start a different topic immediately", "Memorize without practising", "Ignore feedback"], answer: 0 },
    miniProject: lesson.miniProject || `Apply this lesson to ${guide.project}. Save a first draft, make one improvement after feedback, and write down what changed.`,
    summary: lesson.summary || `${title} becomes easier when you practise one focused action, inspect the result, and improve deliberately.`,
    revision: lesson.revision || `Key idea: ${guide.core}. Before moving on, complete this check: ${guide.check}`,
    nextLesson: lesson.nextLesson || nextTitle
  };
}

const courseLessonPlans = {
  HTML: ["Introduction to HTML", "HTML Syntax", "Tags and Elements", "Headings and Paragraphs", "Lists", "Links and Images", "Tables", "Forms and Inputs", "Semantic HTML", "HTML Project"],
  CSS: ["CSS Syntax", "Selectors", "Colors and Typography", "Box Model", "Flexbox", "CSS Grid", "Positioning", "Responsive Design", "Animations", "CSS Mini Project"],
  JavaScript: ["Variables and Data Types", "Functions", "Arrays", "Objects", "Conditions and Loops", "DOM Selection", "Events", "Forms and Validation", "Local Storage", "JavaScript Project"],
  Mathematics: ["Problem-Solving Method", "Algebraic Expressions", "Equations", "Functions and Graphs", "Percentages and Ratios", "Geometry Basics", "Statistics", "Worked Problems", "Mixed Practice", "Mathematics Project"],
  "Public Speaking": ["Audience and Purpose", "Structure a Clear Talk", "Openings and Stories", "Voice and Pace", "Body Language", "Managing Nerves", "Visual Aids", "Practice and Feedback", "Sample Speech", "Final Presentation"],
  Photography: ["Camera Basics", "Exposure Triangle", "Composition", "Lighting", "Focus and Motion", "Portraits", "Editing Basics", "Visual Storytelling", "Photo Practice", "Photo Story Project"]
};

Object.entries(courseLessonPlans).forEach(([title, plan]) => {
  const skill = skillCatalog.find((entry) => entry.title === title);
  if (!skill) return;
  const lessons = plan.map((lessonTitle) => ({ title: lessonTitle, description: `A focused ${title} chapter with explanation, example, practice, and a self-check.` }));
  skill.curriculum = { beginner: lessons.slice(0, 4), intermediate: lessons.slice(4, 7), advanced: lessons.slice(7) };
  skill.roadmap = ["Stage 1: Learn the essential language and methods.", "Stage 2: Apply each idea through focused practice.", "Stage 3: Build a complete project, review it, and prepare to share it."];
});

skillCatalog.forEach((skill) => {
  const flatLessons = Object.values(skill.curriculum || {}).flat();
  const lessonSource = flatLessons.length ? flatLessons : (skill.lessonDetails || skill.lessons || []);
  const completedLessons = lessonSource.map((lesson, index) => enrichLesson(skill, lesson, index, lessonSource));
  skill.lessonDetails = completedLessons;
  skill.lessons = completedLessons.map((lesson) => lesson.title);
  skill.curriculum = { beginner: completedLessons.slice(0, Math.ceil(completedLessons.length / 3)), intermediate: completedLessons.slice(Math.ceil(completedLessons.length / 3), Math.ceil(completedLessons.length * 2 / 3)), advanced: completedLessons.slice(Math.ceil(completedLessons.length * 2 / 3)) };
});

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function buildSkillLearningPath(skill) {
  const title = skill.title || "this skill";
  const lessonTitles = [
    `Start with ${title}`,
    `Practice ${title}`,
    `Build a mini project with ${title}`,
    `Review and improve your work`
  ];

  const lessonDetails = lessonTitles.map((lessonTitle, index) => ({
    title: lessonTitle,
    description: index === 0
      ? `Learn the basics of ${title} in a simple, guided way.`
      : index === 1
        ? `Try a quick exercise so the idea feels practical.`
        : index === 2
          ? `Apply what you learned in a small project.`
          : `Reflect on your progress and prepare for the next step.`,
    introduction: `This shortcut lesson introduces the core idea behind ${title}.`,
    why: `Learning ${title} in small steps makes it easier to understand and remember.`,
    simpleExplanation: `Focus on one concept at a time and practice it until it feels natural.`,
    analogy: `Think of it as building a strong base before adding more advanced ideas.`,
    visual: `Learn -> Practice -> Build -> Improve`,
    explanation: `You can follow this guided path from the first idea to a mini project without needing a long manual.`,
    examples: `Try one small example connected to ${title} and write down what you learned.`,
    interactive: `Complete one short task and keep your notes nearby so you can revisit them later.`,
    commonMistakes: ["Trying to learn everything at once", "Skipping practice", "Forgetting to review your notes"],
    memoryAid: "Small steps every day help you build momentum faster.",
    exercises: ["Write a short summary", "Try one exercise", "Create one tiny result"],
    quiz: {
      q: `What is the best first step when learning ${title}?`,
      options: ["Skip the basics", "Learn the foundation", "Wait for motivation", "Ignore practice"],
      answer: 1
    },
    miniProject: `Create a tiny project around ${title} that you can finish in one session.`,
    summary: `A guided shortcut path helps you learn ${title} from the beginning to a practical finish.`,
    revision: "Review the main idea, practice once more, and keep going.",
    nextLesson: index < lessonTitles.length - 1 ? lessonTitles[index + 1] : ""
  }));

  return {
    curriculum: {
      beginner: lessonDetails.slice(0, 2),
      intermediate: lessonDetails.slice(2, 4)
    },
    lessonDetails,
    lessons: lessonDetails.map((lesson) => lesson.title)
  };
}

function getSkillLessonEntries(skill) {
  if (Array.isArray(skill?.lessonDetails) && skill.lessonDetails.length) return skill.lessonDetails;
  if (skill?.curriculum && typeof skill.curriculum === "object") {
    return Object.values(skill.curriculum).flat().filter(Boolean);
  }

  const generated = buildSkillLearningPath(skill);
  skill.lessonDetails = generated.lessonDetails;
  skill.curriculum = generated.curriculum;
  skill.lessons = generated.lessons;
  return generated.lessonDetails;
}

function getSkillCurriculumSections(skill) {
  const lessonEntries = getSkillLessonEntries(skill);
  if (skill.curriculum && typeof skill.curriculum === "object" && !Array.isArray(skill.curriculum)) {
    return Object.entries(skill.curriculum);
  }

  const generated = buildSkillLearningPath(skill);
  skill.curriculum = generated.curriculum;
  skill.lessons = generated.lessons;
  return Object.entries(generated.curriculum);
}

function normalizeSkill(skill) {
  if (!skill) return skill;
  if (!skill.lessonDetails || !skill.lessonDetails.length) {
    const generated = buildSkillLearningPath(skill);
    skill.lessonDetails = generated.lessonDetails;
    skill.curriculum = generated.curriculum;
    skill.lessons = generated.lessons;
  }
  return skill;
}

/**
 * FIXED: renderLessonContent() - Shows full lesson details for independent learning
 * Replace the existing renderLessonContent function in script.js with this one
 */
function renderLessonContent(skill, lessonTitle) {
  if (lessonRenderer && typeof lessonRenderer.renderLessonContent === "function") {
    return lessonRenderer.renderLessonContent(skill, lessonTitle);
  }

  const lessonView = document.getElementById('lesson-view');
  if (!lessonView) return;

  const lessonEntries = getSkillLessonEntries(skill);
  const lessonIndex = lessonEntries.findIndex((l) => l.title === lessonTitle);
  const lessonEntry = lessonEntries[lessonIndex] || lessonEntries[0] || { title: lessonTitle };

  // Build quiz options HTML safely
  let quizHTML = '';
  if (lessonEntry.quiz && lessonEntry.quiz.options) {
    quizHTML = `
      <div class="quiz-block">
        <p><strong>Quiz:</strong> ${lessonEntry.quiz.q || 'Test your understanding'}</p>
        <div class="quiz-options">
          ${(lessonEntry.quiz.options || []).map((opt, i) =>
            `<button class="btn btn-secondary quiz-opt" data-index="${i}">${opt}</button>`
          ).join('')}
        </div>
        <p class="quiz-feedback"></p>
      </div>
    `;
  }

  // Build steps HTML
  let stepsHTML = '';
  if (lessonEntry.steps && lessonEntry.steps.length) {
    stepsHTML = `
      <h4>Steps to Follow</h4>
      <ol>
        ${lessonEntry.steps.map(s => `<li>${s}</li>`).join('')}
      </ol>
    `;
  }

  // Build exercises HTML
  let exercisesHTML = '';
  if (lessonEntry.exercises && lessonEntry.exercises.length) {
    exercisesHTML = `
      <h4>Practice Exercises</h4>
      <ul>
        ${lessonEntry.exercises.map(e => `<li>${e}</li>`).join('')}
      </ul>
    `;
  }

  // Build common mistakes HTML
  let mistakesHTML = '';
  if (lessonEntry.commonMistakes && lessonEntry.commonMistakes.length) {
    mistakesHTML = `
      <h4>Common Mistakes to Avoid</h4>
      <ul>
        ${lessonEntry.commonMistakes.map(m => `<li>${m}</li>`).join('')}
      </ul>
    `;
  }

  // Previous/Next navigation
  const prevLesson = lessonIndex > 0 ? lessonEntries[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessonEntries.length - 1 ? lessonEntries[lessonIndex + 1] : null;

  // Progress tracking
  const progress = getSkillProgress(skill.id);
  const completedCount = progress.completedLessons?.length || 0;
  const totalCount = lessonEntries.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  lessonView.innerHTML = `
    <article class="lesson-view-card lesson-full-content">
      <!-- Header -->
      <div class="lesson-header">
        <span class="lesson-level-badge">${progressPercent}% Complete</span>
        <button class="btn btn-secondary btn-small bookmark-btn" data-lesson="${lessonTitle}" type="button">
          ${isLessonBookmarked(skill.id, lessonTitle) ? 'Saved' : 'Save Lesson'}
        </button>
      </div>

      <!-- Title & Description -->
      <h2>${lessonEntry.title}</h2>
      <p class="lesson-desc">${lessonEntry.description || ''}</p>

      <!-- Introduction -->
      ${lessonEntry.introduction ? `<div class="lesson-section"><h4>Introduction</h4><p>${lessonEntry.introduction}</p></div>` : ''}

      <!-- Why Learn This -->
      ${lessonEntry.why ? `<div class="lesson-section"><h4>Why This Matters</h4><p>${lessonEntry.why}</p></div>` : ''}

      <!-- Simple Explanation -->
      ${lessonEntry.simpleExplanation ? `<div class="lesson-section"><h4>Simple Explanation</h4><p>${lessonEntry.simpleExplanation}</p></div>` : ''}

      <!-- Analogy -->
      ${lessonEntry.analogy ? `<div class="lesson-section lesson-analogy"><h4>Think of it like this</h4><p>${lessonEntry.analogy}</p></div>` : ''}

      <!-- Visual/Code Example -->
      ${lessonEntry.visual ? `<div class="lesson-section"><h4>Visual Example</h4><pre class="visual-code">${lessonEntry.visual}</pre></div>` : ''}

      <!-- Detailed Explanation -->
      ${lessonEntry.explanation ? `<div class="lesson-section"><h4>How It Works</h4><p>${lessonEntry.explanation}</p></div>` : ''}

      <!-- Examples -->
      ${lessonEntry.examples ? `<div class="lesson-section"><h4>Examples</h4><p>${lessonEntry.examples}</p></div>` : ''}

      <!-- Steps -->
      ${stepsHTML}

      <!-- Exercises -->
      ${exercisesHTML}

      <!-- Common Mistakes -->
      ${mistakesHTML}

      <!-- Mini Project -->
      ${lessonEntry.miniProject ? `<div class="lesson-section lesson-project"><h4>Mini Project</h4><p>${lessonEntry.miniProject}</p></div>` : ''}

      <!-- Summary -->
      ${lessonEntry.summary ? `<div class="lesson-section lesson-summary"><h4>Summary</h4><p>${lessonEntry.summary}</p></div>` : ''}

      <!-- Memory Aid -->
      ${lessonEntry.memoryAid ? `<div class="lesson-section lesson-tip"><strong>Memory Tip:</strong> ${lessonEntry.memoryAid}</div>` : ''}

      <!-- Interactive -->
      ${lessonEntry.interactive ? `<div class="lesson-section lesson-interactive"><strong>Try it now:</strong> ${lessonEntry.interactive}</div>` : ''}

      <!-- Quiz -->
      ${quizHTML}

      <!-- Revision -->
      ${lessonEntry.revision ? `<div class="lesson-section lesson-revision"><strong>Quick Review:</strong> ${lessonEntry.revision}</div>` : ''}

      <!-- Navigation -->
      <div class="lesson-nav">
        ${prevLesson
          ? `<button class="btn btn-secondary prev-lesson-btn" data-lesson="${prevLesson.title}" type="button">← ${prevLesson.title}</button>`
          : `<span class="lesson-nav-placeholder"></span>`
        }
        ${nextLesson
          ? `<button class="btn next-lesson-btn" data-lesson="${nextLesson.title}" type="button">${nextLesson.title} →</button>`
          : `<span class="lesson-nav-placeholder"></span>`
        }
      </div>

      <!-- Mark Complete Button -->
      <div class="lesson-complete-section">
        <button class="btn complete-lesson-btn" data-lesson="${lessonTitle}" type="button">
          ${progress.completedLessons?.includes(lessonTitle) ? '✓ Completed' : 'Mark as Complete'}
        </button>
      </div>
    </article>
  `;

  // Attach event listeners

  // Quiz functionality
  lessonView.querySelectorAll('.quiz-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      const correct = lessonEntry.quiz?.answer;
      const feedback = lessonView.querySelector('.quiz-feedback');

      lessonView.querySelectorAll('.quiz-opt').forEach(b => {
        b.classList.remove('is-correct', 'is-wrong');
        b.disabled = true;
      });

      if (idx === correct) {
        btn.classList.add('is-correct');
        if (feedback) feedback.textContent = '✓ Correct! Well done.';
      } else {
        btn.classList.add('is-wrong');
        const correctBtn = lessonView.querySelector(`.quiz-opt[data-index="${correct}"]`);
        if (correctBtn) correctBtn.classList.add('is-correct');
        if (feedback) feedback.textContent = `✗ Not quite. The correct answer is highlighted above.`;
      }
    });
  });

  // Bookmark toggle
  lessonView.querySelector('.bookmark-btn')?.addEventListener('click', () => {
    const isSaved = toggleLessonBookmark(skill.id, lessonTitle);
    const bookmarkBtn = lessonView.querySelector('.bookmark-btn');
    if (bookmarkBtn) bookmarkBtn.textContent = isSaved ? 'Saved' : 'Save Lesson';
  });

  // Previous lesson
  lessonView.querySelector('.prev-lesson-btn')?.addEventListener('click', (e) => {
    const title = e.target.dataset.lesson;
    saveSkillProgress(skill.id, { activeLesson: title });
    renderLessonContent(skill, title);
    renderSkillDetailPage();
  });

  // Next lesson
  lessonView.querySelector('.next-lesson-btn')?.addEventListener('click', (e) => {
    const title = e.target.dataset.lesson;
    saveSkillProgress(skill.id, { activeLesson: title });
    renderLessonContent(skill, title);
    renderSkillDetailPage();
  });

  // Complete lesson
  lessonView.querySelector('.complete-lesson-btn')?.addEventListener('click', () => {
    const updated = getSkillProgress(skill.id);
    const completedLessons = updated.completedLessons || [];
    if (!completedLessons.includes(lessonTitle)) {
      completedLessons.push(lessonTitle);
    }
    saveSkillProgress(skill.id, { completedLessons });

    const completeBtn = lessonView.querySelector('.complete-lesson-btn');
    if (completeBtn) completeBtn.textContent = '✓ Completed';

    const levelBadge = lessonView.querySelector('.lesson-level-badge');
    if (levelBadge) {
      const newProgress = getSkillProgress(skill.id);
      const newCompleted = newProgress.completedLessons?.length || 0;
      levelBadge.textContent = Math.round((newCompleted / totalCount) * 100) + '% Complete';
    }
  });
}

function defaultCodeFor(skillId, lessonTitle) {
  if (skillId === 'html-css') return '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;padding:20px} .box{display:flex;gap:8px}</style></head><body><div class="box"><div>Home</div><div>About</div><div>Contact</div></div></body></html>';
  if (skillId === 'javascript') return '<!doctype html><html><body><script>document.body.innerHTML = "<h1>JS example</h1><p>Open the console to log values.</p>";console.log("Hello from JS");</script></body></html>';
  return '<!doctype html><html><body><p>No code example for this lesson.</p></body></html>';
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  return readStorage(STORAGE_KEYS.currentUser, null);
}

function saveCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    window.__SKILLEX_PROFILE_CACHE = null;
    window.__SKILLEX_USER_DATA_CACHE = null;
    return;
  }
  const { password, ...safeUser } = user;
  writeStorage(STORAGE_KEYS.currentUser, safeUser);
  window.__SKILLEX_PROFILE_CACHE = {
    userId: safeUser.id,
    profile: safeUser,
    expiresAt: Date.now() + 30000
  };
}

function getUsers() {
  return readStorage(STORAGE_KEYS.users, []);
}

function saveUsers(users) {
  writeStorage(STORAGE_KEYS.users, users);
}

function getSavedSkills() {
  return readStorage(STORAGE_KEYS.savedSkills, []);
}

function saveSavedSkills(skills) {
  writeStorage(STORAGE_KEYS.savedSkills, skills);
  persistForCurrentUser((user) => backend.replaceSavedSkills(user.id, skills), "save your skills");
}

function getSkillProgressMap() {
  return readStorage(STORAGE_KEYS.progress, {});
}

function saveSkillProgressMap(value) {
  writeStorage(STORAGE_KEYS.progress, value);
}

function getSkillProgress(skillId) {
  const progressMap = getSkillProgressMap();
  return progressMap[skillId] || { completedLessons: [], activeLesson: "", notes: "" };
}

function saveSkillProgress(skillId, updates) {
  const progressMap = getSkillProgressMap();
  const current = getSkillProgress(skillId);
  const timestamp = Date.now();
  progressMap[skillId] = { ...current, ...updates, lastUpdated: timestamp };
  saveSkillProgressMap(progressMap);
  persistForCurrentUser((user) => backend.saveProgress(user.id, skillId, progressMap[skillId]), "save your learning progress");
  return progressMap[skillId];
}

function formatDateKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLearningStreak() {
  const progressMap = getSkillProgressMap();
  const days = new Set();
  Object.values(progressMap).forEach((entry) => {
    if (entry.lastUpdated) days.add(formatDateKey(entry.lastUpdated));
  });
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const check = new Date(today);
    check.setDate(today.getDate() - i);
    const key = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`;
    if (days.has(key)) streak++; else break;
  }
  return streak;
}

function computeRecommendations() {
  const completed = Object.keys(getSkillProgressMap()).filter((skillId) => getSkillProgressPercent(skillId) === 100);
  const saved = getSavedSkills();
  const recs = [];
  completed.forEach((id) => {
    const base = getSkillById(id);
    if (!base) return;
    skillCatalog.forEach((s) => {
      if (s.id === id) return;
      if (saved.includes(s.id)) return;
      if (getSkillProgressPercent(s.id) === 100) return;
      if (s.category === base.category && !recs.includes(s.id)) recs.push(s.id);
    });
  });
  // fallback: popular picks
  if (!recs.length) {
    recs.push(...skillCatalog.slice(0, 5).map((s) => s.id));
  }
  return recs.slice(0, 6).map((id) => getSkillById(id)).filter(Boolean);
}

function generateCertificate(skillId) {
  const skill = getSkillById(skillId);
  const user = getCurrentUser() || { name: 'Guest Learner' };
  const date = new Date().toLocaleDateString();
  const html = `
    <html><head><title>Certificate</title>
    <style>body{font-family:Arial;text-align:center;padding:60px;background:#f7f7fb} .card{border:4px solid #6d28d9;padding:40px;border-radius:12px;background:white} h1{color:#6d28d9} p{color:#333}</style>
    </head><body><div class="card"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>${user.name}</h2><p>has successfully completed the</p><h3>${skill.title}</h3><p>on ${date}</p></div></body></html>`;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function getRecentlyViewed() {
  return readStorage(STORAGE_KEYS.recentSkills, []);
}

function saveRecentlyViewed(skills) {
  writeStorage(STORAGE_KEYS.recentSkills, skills);
}

function addRecentlyViewed(skillId) {
  const recent = getRecentlyViewed().filter((id) => id !== skillId);
  recent.unshift(skillId);
  saveRecentlyViewed(recent.slice(0, 4));
}

function getSavedLessons() {
  return readStorage(STORAGE_KEYS.savedLessons, []);
}

function saveSavedLessons(list) {
  writeStorage(STORAGE_KEYS.savedLessons, list);
  persistForCurrentUser((user) => backend.replaceSavedLessons(user.id, list), "save your lessons");
}

function toggleLessonBookmark(skillId, lessonTitle) {
  const key = `${skillId}::${lessonTitle}`;
  const saved = getSavedLessons();
  const idx = saved.indexOf(key);
  if (idx >= 0) {
    saved.splice(idx, 1);
  } else {
    saved.push(key);
  }
  saveSavedLessons(saved);
  return idx < 0;
}

function isLessonBookmarked(skillId, lessonTitle) {
  const key = `${skillId}::${lessonTitle}`;
  return getSavedLessons().includes(key);
}

function addTimeSpent(skillId, seconds) {
  const map = readStorage(STORAGE_KEYS.timeSpent, {});
  map[skillId] = (map[skillId] || 0) + seconds;
  writeStorage(STORAGE_KEYS.timeSpent, map);
  const user = getCurrentUser();
  if (user?.id) saveSkillProgress(skillId, { timeSpentSeconds: map[skillId] });
}

function getSkillById(skillId) {
  const skill = skillCatalog.find((entry) => entry.id === skillId) || null;
  return skill ? normalizeSkill(skill) : null;
}

function getSkillProgressPercent(skillId) {
  const skill = getSkillById(skillId);
  if (!skill) return 0;
  const progress = getSkillProgress(skillId);
  const completedCount = progress.completedLessons?.length || 0;
  return Math.round((completedCount / skill.lessons.length) * 100);
}

function updateSwapRequestBadge(requests) {
  const user = getCurrentUser();
  const swapLink = document.querySelector('.quick-nav__link[href="swap.html"]');
  if (!swapLink || !user?.id) return;

  const count = requests.filter((request) =>
    request.receiverId === user.id && request.status === "requested"
  ).length;
  let badge = swapLink.querySelector(".quick-nav__badge");
  if (count && !badge) {
    badge = document.createElement("span");
    badge.className = "quick-nav__badge";
    badge.setAttribute("aria-hidden", "true");
    swapLink.append(badge);
  }
  if (badge) {
    badge.textContent = count > 9 ? "9+" : String(count);
    if (!count) badge.remove();
  }
  if (count) swapLink.setAttribute("aria-label", `Swap, ${count} pending incoming request${count === 1 ? "" : "s"}`);
  else swapLink.removeAttribute("aria-label");
}

function getSwapRequestSnapshot(requests) {
  return Object.fromEntries(requests.map((request) => [request.id, {
    status: request.status,
    receiverId: request.receiverId,
    peerName: request.peerName
  }]));
}

function saveSwapNotificationSnapshot(requests, userId) {
  writeStorage(`${STORAGE_KEYS.swapNotifications}:${userId}`, getSwapRequestSnapshot(requests));
}

async function refreshSwapNotifications() {
  const user = getCurrentUser();
  if (!user?.id || !backend?.isConfigured) return;
  if (window.__SKILLEX_SWAP_NOTIFICATION_REFRESH) {
    await window.__SKILLEX_SWAP_NOTIFICATION_REFRESH;
    return;
  }

  const refresh = (async () => {
    try {
      const requests = await backend.loadSwapRequests(user.id, skillCatalog);
      writeStorage(STORAGE_KEYS.swapRequests, requests);
      if (window.__SKILLEX_USER_DATA_CACHE?.userId === user.id) {
        window.__SKILLEX_USER_DATA_CACHE.state.requests = requests;
      }
      updateSwapRequestBadge(requests);

      const storageKey = `${STORAGE_KEYS.swapNotifications}:${user.id}`;
      const previous = readStorage(storageKey, null);
      if (previous) {
        requests.forEach((request) => {
          const prior = previous[request.id];
          if (!prior && request.receiverId === user.id && request.status === "requested") {
            showToast(`New skill exchange request from ${request.peerName}.`, "info", 7000);
          } else if (prior && prior.status !== request.status) {
            const status = request.status === "accepted" ? "accepted"
              : request.status === "declined" ? "declined"
                : request.status === "completed" ? "marked complete" : "updated";
            showToast(`Your exchange request with ${request.peerName} was ${status}.`, "info", 7000);
          }
        });
      }
      saveSwapNotificationSnapshot(requests, user.id);
    } catch (error) {
      reportBackendError(error, "check exchange request notifications");
    }
  })();
  window.__SKILLEX_SWAP_NOTIFICATION_REFRESH = refresh;
  try {
    await refresh;
  } finally {
    window.__SKILLEX_SWAP_NOTIFICATION_REFRESH = null;
  }
}

function initializeSwapNotifications() {
  const user = getCurrentUser();
  if (!user?.id) {
    if (window.__SKILLEX_SWAP_NOTIFICATION_TIMER) {
      clearInterval(window.__SKILLEX_SWAP_NOTIFICATION_TIMER);
      window.__SKILLEX_SWAP_NOTIFICATION_TIMER = null;
    }
    if (window.__SKILLEX_SWAP_VISIBILITY_HANDLER) {
      document.removeEventListener("visibilitychange", window.__SKILLEX_SWAP_VISIBILITY_HANDLER);
      window.__SKILLEX_SWAP_VISIBILITY_HANDLER = null;
    }
    return;
  }
  const cachedRequests = readStorage(STORAGE_KEYS.swapRequests, []);
  updateSwapRequestBadge(cachedRequests);
  const storageKey = `${STORAGE_KEYS.swapNotifications}:${user.id}`;
  if (!readStorage(storageKey, null)) saveSwapNotificationSnapshot(cachedRequests, user.id);

  if (window.__SKILLEX_SWAP_NOTIFICATION_TIMER) {
    clearInterval(window.__SKILLEX_SWAP_NOTIFICATION_TIMER);
  }
  window.__SKILLEX_SWAP_NOTIFICATION_TIMER = setInterval(refreshSwapNotifications, 60000);
  if (window.__SKILLEX_SWAP_VISIBILITY_HANDLER) {
    document.removeEventListener("visibilitychange", window.__SKILLEX_SWAP_VISIBILITY_HANDLER);
  }
  window.__SKILLEX_SWAP_VISIBILITY_HANDLER = () => {
    if (document.visibilityState === "visible") refreshSwapNotifications();
  };
  document.addEventListener("visibilitychange", window.__SKILLEX_SWAP_VISIBILITY_HANDLER);
  refreshSwapNotifications();
}

function updateAuthLinks() {
  const currentUser = getCurrentUser();
  const isLoggedIn = !!currentUser;
  const navActions = document.querySelector(".nav-actions");

  if (navActions) {
    const navLinks = [...navActions.querySelectorAll("a[href]")];
    navLinks.forEach((link) => {
      const page = new URL(link.href, window.location.origin).pathname.split("/").pop();
      if (page === "signup.html") {
        link.remove();
      } else if (page === "login.html") {
        link.dataset.auth = "login";
      } else if (page === "dashboard.html") {
        link.dataset.auth = "dashboard";
      } else if (page === "settings.html") {
        link.dataset.auth = "settings";
      }
    });

    if (!navActions.querySelector('[data-auth="dashboard"]')) {
      const dashboardLink = document.createElement("a");
      dashboardLink.href = "dashboard.html";
      dashboardLink.className = "btn btn-sm";
      dashboardLink.dataset.auth = "dashboard";
      dashboardLink.textContent = "Dashboard";
      navActions.append(dashboardLink);
    }

    if (!navActions.querySelector('[data-auth="login"]')) {
      const loginLink = document.createElement("a");
      loginLink.href = "login.html";
      loginLink.className = "btn btn-sm";
      loginLink.dataset.auth = "login";
      loginLink.textContent = "Login";
      navActions.append(loginLink);
    }
  }

  const loginElements = document.querySelectorAll('[data-auth="login"]');
  const currentPage = window.SKILLEX_ROUTE_URL?.pathname.split("/").pop() || "";
  const dashboardElements = document.querySelectorAll('[data-auth="dashboard"]');
  const settingsElements = document.querySelectorAll('[data-auth="settings"]');
  const logoutElements = document.querySelectorAll('[data-auth="logout"]');
  const profileElements = document.querySelectorAll('[data-auth="profile"]');
  const authOnlyElements = document.querySelectorAll('[data-auth="auth-only"]');
  const guestOnlyElements = document.querySelectorAll('[data-auth="guest-only"]');

  loginElements.forEach((link) => {
    link.textContent = "Login";
    link.href = "login.html";
    link.style.display = isLoggedIn || currentPage === "login.html" ? "none" : "";
  });
  dashboardElements.forEach((link, index) => {
    link.textContent = "Dashboard";
    link.href = "dashboard.html";
    link.style.display = isLoggedIn && index === 0 ? "" : "none";
  });
  settingsElements.forEach((link, index) => {
    const label = link.querySelector("span");
    if (label) label.textContent = "Settings";
    else link.textContent = "Settings";
    link.href = "settings.html";
    const isQuickNavLink = Boolean(link.closest(".quick-nav__links"));
    if (isQuickNavLink) link.hidden = !isLoggedIn;
    link.style.display = isLoggedIn && (isQuickNavLink || index === 0) ? "" : "none";
  });
  logoutElements.forEach((link) => {
    link.style.display = isLoggedIn ? "" : "none";
  });
  profileElements.forEach((link) => {
    link.style.display = isLoggedIn ? "" : "none";
    if (isLoggedIn) link.textContent = currentUser.name || "Profile";
  });
  authOnlyElements.forEach((element) => {
    element.style.display = isLoggedIn ? "none" : "";
  });
  guestOnlyElements.forEach((element) => {
    element.style.display = isLoggedIn ? "none" : "";
  });

  // Update breadcrumb if it exists
  const breadcrumb = document.querySelector('.breadcrumb-user');
  if (breadcrumb) {
    breadcrumb.style.display = isLoggedIn ? '' : 'none';
    const breadcrumbText = breadcrumb.querySelector('.user-name');
    if (breadcrumbText && currentUser) {
      breadcrumbText.textContent = currentUser.name || 'User';
    }
  }

  // Update any "logged in as" text
  document.querySelectorAll('.logged-in-name').forEach(el => {
    if (isLoggedIn && currentUser) {
      el.textContent = currentUser.name || 'User';
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

function applyTheme() {
  const preference = getThemePreference();
  const isDark = resolveDarkTheme(preference);

  body.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme-preference", preference);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";

  if (themeToggle) {
    const icon = themeToggle.querySelector(".theme-toggle__icon");
    if (icon) {
      icon.textContent = isDark ? "🌙" : "☀️";
    }
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  }
  const preferenceControl = document.getElementById("theme-preference");
  if (preferenceControl) preferenceControl.value = preference;
}

function getThemePreference() {
  const preference = localStorage.getItem(STORAGE_KEYS.theme);
  return ["system", "light", "dark"].includes(preference) ? preference : "system";
}

function resolveDarkTheme(preference) {
  return preference === "dark"
    || (preference === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
}

function setThemePreference(preference) {
  if (!["system", "light", "dark"].includes(preference)) {
    throw new Error("Choose system, light, or dark appearance.");
  }
  localStorage.setItem(STORAGE_KEYS.theme, preference);
  applyTheme();
}

if (themeToggle) {
  applyTheme();

  themeToggle.addEventListener("click", () => {
    setThemePreference(resolveDarkTheme(getThemePreference()) ? "light" : "dark");
  });
}

window.SkillexApplyTheme = applyTheme;
const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
if (systemThemeQuery && !window.__SKILLEX_SYSTEM_THEME_LISTENER) {
  window.__SKILLEX_SYSTEM_THEME_LISTENER = true;
  systemThemeQuery.addEventListener("change", () => {
    if (getThemePreference() === "system") window.SkillexApplyTheme?.();
  });
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function ensureProtectedAccess() {
  const page = window.SKILLEX_ROUTE_URL?.pathname.split("/").pop() || window.location.pathname.split("/").pop();
  const protectedPages = ["dashboard.html", "profile.html", "saved-skills.html", "settings.html"];
  if (protectedPages.includes(page) && !getCurrentUser()) {
    navigateTo("login.html", "replace");
    return false;
  }
  if (page === "login.html" && getCurrentUser()) {
    navigateTo("dashboard.html", "replace");
    return false;
  }
  return true;
}

function attachBrowseInteractions() {
  const searchInput = document.querySelector(".skill-search");
  const browseGrid = document.querySelector(".browse-grid");
  const learningPanel = document.querySelector(".learning-panel__content");
  const filterTags = document.querySelectorAll(".filter-tag");
  const mentorPanel = document.querySelector(".mentor-panel");
  let activeFilter = "all";

  function renderPeerMatchPrompt() {
    if (!mentorPanel) return;
    mentorPanel.innerHTML = getCurrentUser()
      ? `<h3>Find peer matches</h3><p>Use your profile skills to connect with real Skillex members through Skill Swap.</p><a href="swap.html" class="btn btn-small">Open Skill Swap</a>`
      : `<h3>Find peer matches</h3><p>Sign in and add your skills to discover real Skillex members with shared interests.</p><a href="login.html" class="btn btn-small">Login to find peers</a>`;
  }

  function renderCatalogCards() {
    if (!browseGrid) return;

    browseGrid.innerHTML = skillCatalog.map((skill) => `
      <article class="skill-card" data-skill-id="${skill.id}" data-category="${skill.category}" data-title="${skill.title}">
        <div class="skill-card__top">
          <h3>${skill.title}</h3>
          <span class="pill">${skill.level}</span>
        </div>
        <p>${skill.description}</p>
        <div class="skill-card__actions">
          <button class="btn btn-small learn-btn" type="button">Start from beginning</button>
          <button class="btn btn-secondary btn-small save-btn" type="button">Save for later</button>
        </div>
      </article>
    `).join("");

    browseGrid.querySelectorAll(".skill-card").forEach((card) => {
      const skillId = card.dataset.skillId;
      const skill = getSkillById(skillId);
      const searchText = `${skill?.title || ""} ${skill?.category || ""} ${skill?.description || ""} ${(skill?.objectives || []).join(" ")} ${(skill?.lessons || []).join(" ")}`.toLowerCase();
      card.dataset.searchText = searchText;

      const learnButton = card.querySelector(".learn-btn");
      const saveButton = card.querySelector(".save-btn");

      learnButton?.addEventListener("click", () => {
        const firstLesson = skill?.lessons?.[0] || skill?.lessonDetails?.[0]?.title || "";
        addRecentlyViewed(skillId);
        navigateTo(`skill.html?skill=${skillId}${firstLesson ? `&lesson=${encodeURIComponent(firstLesson)}` : ""}`);
      });

      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        const firstLesson = skill?.lessons?.[0] || skill?.lessonDetails?.[0]?.title || "";
        addRecentlyViewed(skillId);
        navigateTo(`skill.html?skill=${skillId}${firstLesson ? `&lesson=${encodeURIComponent(firstLesson)}` : ""}`);
      });

      saveButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        const currentUser = getCurrentUser();

        if (!currentUser) {
          navigateTo("login.html");
          return;
        }

        const saved = getSavedSkills();
        if (!saved.includes(skillId)) {
          saved.push(skillId);
          saveSavedSkills(saved);
        }
        if (learningPanel) {
          const title = card.dataset.title || "Skill";
          learningPanel.innerHTML = `<h3>${title} saved</h3><p>You can revisit it anytime from your dashboard or saved skills page.</p>`;
        }
      });
    });

    applyFilters();
  }

  function applyFilters() {
    const skillCards = browseGrid ? browseGrid.querySelectorAll(".skill-card") : [];
    const searchValue = searchInput?.value.toLowerCase().trim() || "";

    skillCards.forEach((card) => {
      const category = card.dataset.category || "";
      const searchText = card.dataset.searchText || "";
      const matchesSearch = searchText.includes(searchValue);
      const matchesCategory = activeFilter === "all" || category === activeFilter;
      card.classList.toggle("is-hidden", !(matchesSearch && matchesCategory));
    });

    if (learningPanel) {
      if (!searchValue) {
        learningPanel.innerHTML = `<h3>Learning path</h3><p>Select a skill to see a short, actionable path for learning it.</p>`;
      } else {
        const matches = [];
        skillCatalog.forEach((s) => {
          const lessons = s.curriculum ? Object.values(s.curriculum).flat() : s.lessonDetails || s.lessons || [];
          lessons.forEach((l) => {
            const title = l.title || l;
            const text = `${s.title} ${title} ${s.category} ${s.description || ""}`.toLowerCase();
            if (text.includes(searchValue)) {
              matches.push({ skillId: s.id, skillTitle: s.title, lessonTitle: title });
            }
          });
        });

        if (matches.length) {
          learningPanel.innerHTML = `
            <h3>Quick results</h3>
            <div class="quick-results">
              ${matches.slice(0, 6).map((match) => `<div class="quick-item"><a href="skill.html?skill=${match.skillId}&lesson=${encodeURIComponent(match.lessonTitle)}">${match.skillTitle} — ${match.lessonTitle}</a></div>`).join("")}
            </div>
          `;
        } else {
          learningPanel.innerHTML = `<h3>No direct lesson matches</h3><p>Try broader keywords or browse by category.</p>`;
        }
      }
    }
  }

  searchInput?.addEventListener("input", applyFilters);

  filterTags.forEach((tag) => {
    tag.addEventListener("click", () => {
      activeFilter = tag.dataset.filter || "all";
      filterTags.forEach((item) => item.classList.toggle("active", item === tag));
      applyFilters();
    });
  });

  renderCatalogCards();
  renderPeerMatchPrompt();
}

function renderDashboard() {
  const profileContainer = document.getElementById("dashboard-profile");
  const savedList = document.getElementById("saved-skills-list");
  const completedList = document.getElementById("completed-lessons-list");
  const progressOverview = document.getElementById("progress-overview");
  const recentList = document.getElementById("recent-skills-list");
  const currentUser = getCurrentUser();

  if (!currentUser) return;

  if (profileContainer) {
    const goals = [currentUser.learnGoals, currentUser.teachGoals].filter(Boolean).join(" • ");
    profileContainer.innerHTML = `
      <h3>${currentUser.name}</h3>
      <p>${currentUser.bio || "Keep building your learning journey with Skillex."}</p>
      <p><strong>Email:</strong> ${currentUser.email}</p>
      <p><strong>Role:</strong> ${currentUser.role || "Learner"}</p>
      ${goals ? `<p><strong>Learning focus:</strong> ${goals}</p>` : ""}
      <p><strong>Joined:</strong> ${currentUser.joinedAt ? new Date(currentUser.joinedAt).toLocaleDateString() : "Recently"}</p>
    `;
  }

  // Stats: total time, streak, enrolled/completed
  const timeMap = readStorage(STORAGE_KEYS.timeSpent, {});
  const totalSeconds = Object.values(timeMap).reduce((s, v) => s + (v || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const streak = getLearningStreak();
  const recommendations = computeRecommendations();

  const statsEl = document.getElementById('dashboard-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-row">
        <div class="stat-block"><strong>${totalMinutes}</strong><div class="stat-label">minutes learned</div></div>
        <div class="stat-block"><strong>${streak}</strong><div class="stat-label">day streak</div></div>
        <div class="stat-block"><strong>${getSavedSkills().length}</strong><div class="stat-label">skills saved</div></div>
      </div>
      <div class="stat-row">
        <div class="stat-block"><strong>${recommendations.length}</strong><div class="stat-label">new recommendations</div></div>
        <div class="stat-block"><strong>${Object.keys(getSkillProgressMap()).length}</strong><div class="stat-label">skills in progress</div></div>
      </div>
    `;
  }

  if (savedList) {
    const savedSkills = getSavedSkills();
    if (savedSkills.length) {
      savedList.innerHTML = `
        <div class="badge-list">
          ${savedSkills
            .map((skillId) => {
              const skill = getSkillById(skillId);
              return `<div class="badge-item">${skill ? skill.title : skillId}</div>`;
            })
            .join("")}
        </div>
      `;
    } else {
      savedList.innerHTML = '<p>No saved skills yet. Browse and save your first topic.</p>';
    }
  }

  if (completedList) {
    const progressMap = getSkillProgressMap();
    const completedLessons = Object.values(progressMap).flatMap((entry) => entry.completedLessons || []);

    if (completedLessons.length) {
      completedList.innerHTML = `
        <div class="lesson-list">
          ${completedLessons.map((lesson) => `<div class="lesson-item"><span>${lesson}</span><span class="status-pill">Done</span></div>`).join("")}
        </div>
      `;
    } else {
      completedList.innerHTML = '<p>Complete your first lesson to build momentum.</p>';
    }
  }

  if (progressOverview) {
    const savedSkills = getSavedSkills();
    const progressMap = getSkillProgressMap();
    const completedLessons = Object.values(progressMap).flatMap((entry) => entry.completedLessons || []);
    const skillCount = Math.max(savedSkills.length || 1, 1);
    const percent = Math.min(100, Math.round((completedLessons.length / Math.max(skillCount * 3, 3)) * 100));

    progressOverview.innerHTML = `
      <div class="stat-list">
        <div class="stat-item"><strong>${savedSkills.length}</strong> skills enrolled</div>
        <div class="stat-item"><strong>${completedLessons.length}</strong> lessons completed</div>
        <div class="stat-item"><strong>${percent}%</strong> progress</div>
      </div>
      <div class="progress-bar"><span style="width:${percent}%"></span></div>
    `;
  }

  if (recentList) {
    const recent = getRecentlyViewed();
    if (recent.length) {
      recentList.innerHTML = `
        <div class="badge-list">
          ${recent
            .map((skillId) => {
              const skill = getSkillById(skillId);
              return `<div class="badge-item">${skill ? `<a href="skill.html?skill=${skill.id}">${skill.title}</a>` : skillId}</div>`;
            })
            .join("")}
        </div>
      `;
    } else {
      recentList.innerHTML = '<p>Open a skill to see it appear here.</p>';
    }
  }

  const recEl = document.getElementById('dashboard-recommendations');
  if (recEl) {
    recEl.innerHTML = recommendations.length
      ? `<div class="rec-list">${recommendations.map((s) => `<div class="rec-item"><a href="skill.html?skill=${s.id}">${s.title}</a>${getSkillProgressPercent(s.id) === 100 ? ' ✅' : ''}</div>`).join('')}</div>`
      : '<p>No recommendations yet.</p>';
  }
}

function renderSavedSkillsPage() {
  const container = document.getElementById("saved-skill-list");
  if (!container) return;

  const savedSkills = getSavedSkills();
  if (!savedSkills.length) {
    container.innerHTML = '<p class="auth-link">No saved skills yet. Visit the browse page and save a topic to build your list.</p>';
    return;
  }

  container.innerHTML = savedSkills
    .map((skillId) => {
      const skill = getSkillById(skillId);
      if (!skill) return "";
      return `
        <article class="skill-card">
          <h3>${skill.title}</h3>
          <p>${skill.description}</p>
          <p><strong>Level:</strong> ${skill.level}</p>
          <div class="skill-card__actions">
            <a href="skill.html?skill=${skill.id}" class="btn btn-small">Continue</a>
            <button class="btn btn-secondary btn-small" type="button" data-remove-skill="${skill.id}">Remove</button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll('[data-remove-skill]').forEach((button) => {
    button.addEventListener("click", () => {
      const skillId = button.getAttribute("data-remove-skill");
      const updated = getSavedSkills().filter((id) => id !== skillId);
      saveSavedSkills(updated);
      renderSavedSkillsPage();
    });
  });
}

function renderSkillDetailPage() {
  const detailContainer = document.getElementById("skill-detail");
  const lessonList = document.getElementById("lesson-list");
  const notesBox = document.getElementById("notes-box");
  const completeButton = document.getElementById("complete-lesson");
  const continueButton = document.getElementById("continue-learning");
  const params = new URLSearchParams(window.SKILLEX_ROUTE_URL?.search || window.location.search);
  const skillId = params.get("skill") || "html-css";
  const skill = getSkillById(skillId);

  if (!skill) {
    if (detailContainer) detailContainer.innerHTML = '<h2>Skill not found</h2>';
    return;
  }

  addRecentlyViewed(skill.id);

  const progress = getSkillProgress(skill.id);
  const progressPercent = getSkillProgressPercent(skill.id);
  const curriculumSections = getSkillCurriculumSections(skill);
  const courseLessons = curriculumSections.flatMap(([level, lessons]) =>
    lessons.map((lesson) => ({
      ...lesson,
      level: level.charAt(0).toUpperCase() + level.slice(1),
    }))
  );

  if (!progress.activeLesson && courseLessons.length) {
    saveSkillProgress(skill.id, { activeLesson: courseLessons[0].title });
  }

  if (detailContainer) {
    detailContainer.innerHTML = `
      <p class="eyebrow">${skill.category}</p>
      <h2>${skill.title}</h2>
      <p class="detail-intro">${skill.intro || skill.description}</p>
      <div class="detail-meta">
        <span class="meta-pill"><strong>Level:</strong> ${skill.level}</span>
        <span class="meta-pill"><strong>Estimated time:</strong> ${skill.time}</span>
      </div>
      <p><strong>Outcome:</strong> ${skill.outcome}</p>
      <p><strong>Current progress:</strong> ${progressPercent}%</p>
      <div class="progress-bar"><span style="width:${progressPercent}%"></span></div>
      <p class="active-lesson">Current lesson: <strong>${progress.activeLesson || courseLessons[0]?.title || skill.lessons[0]}</strong></p>
      <h3>Course roadmap</h3>
      <ol class="roadmap-list">${(skill.roadmap || []).map((step) => `<li>${step}</li>`).join("")}</ol>
      <h3>Learning path</h3>
      <div class="curriculum-grid">
        ${curriculumSections.map(([level, lessons]) => `
          <div class="curriculum-card">
            <div class="module-level">${level.charAt(0).toUpperCase() + level.slice(1)}</div>
            <ul>${lessons.map((lesson) => `<li>${lesson.title}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </div>
      <h3>Projects you will build</h3>
      <ul class="course-project-list">${(skill.projects || skill.practice || []).map((item) => `<li>${item}</li>`).join("")}</ul>
      <div class="detail-actions">
        <button class="btn" id="start-learning-btn" type="button">Learn with Skillex</button>
        <a class="btn btn-secondary" href="swap.html">Learn from students</a>
        <button class="btn btn-secondary" id="save-skill-btn" type="button">Save skill</button>
      </div>
      <div id="lesson-view" class="lesson-view" aria-live="polite"></div>
    `;

    document.getElementById("start-learning-btn")?.addEventListener("click", () => {
      const firstLesson = courseLessons[0]?.title || skill.lessons[0];
      saveSkillProgress(skill.id, { activeLesson: firstLesson });
      renderSkillDetailPage();
      renderLessonContent(skill, firstLesson);
    });

    document.getElementById("save-skill-btn")?.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigateTo("login.html");
        return;
      }
      const saved = getSavedSkills();
      if (!saved.includes(skill.id)) {
        saved.push(skill.id);
        saveSavedSkills(saved);
      }
      renderSkillDetailPage();
    });
  }

  // If a lesson query param is present, open that lesson immediately.
  // Only do this once (on first load) — otherwise every re-render (e.g.
  // after clicking Next Lesson) would re-read the same stale URL param
  // and snap the view back to it, undoing in-page navigation.
  const lessonParam = params.get('lesson');
  if (lessonParam && !lessonParamApplied) {
    lessonParamApplied = true;
    saveSkillProgress(skill.id, { activeLesson: lessonParam });
    renderLessonContent(skill, lessonParam);
  } else if (progress.activeLesson) {
    renderLessonContent(skill, progress.activeLesson);
  }

  if (lessonList) {
    const lessonEntries = courseLessons.length ? courseLessons : skill.lessonDetails || skill.lessons.map((lesson) => ({ title: lesson, description: "Continue building practical experience with this lesson." }));
    lessonList.innerHTML = lessonEntries
      .map((lesson) => {
        const lessonTitle = lesson.title;
        const isCompleted = progress.completedLessons?.includes(lessonTitle);
        const isActive = progress.activeLesson === lessonTitle;
        return `
          <div class="lesson-item ${isCompleted ? "is-complete" : ""}">
            <div>
              <button class="lesson-link" data-lesson="${lessonTitle}" type="button"><strong>${lessonTitle}</strong></button>
              <p>${lesson.description}</p>
              <span class="status-pill">${isCompleted ? "Done" : isActive ? "In progress" : lesson.level || "Next"}</span>
            </div>
            <button class="btn btn-small mark-lesson-btn" data-lesson="${lessonTitle}" type="button">${isCompleted ? "Done" : "Mark done"}</button>
          </div>
        `;
      })
      .join("");

    lessonList.querySelectorAll(".mark-lesson-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const lessonTitle = button.getAttribute("data-lesson");
        const updated = getSkillProgress(skill.id);
        const completedLessons = updated.completedLessons || [];
        if (!completedLessons.includes(lessonTitle)) {
          completedLessons.push(lessonTitle);
        }
        saveSkillProgress(skill.id, { completedLessons, activeLesson: lessonTitle });
        renderSkillDetailPage();
      });
    });
    lessonList.querySelectorAll('.lesson-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lessonTitle = btn.getAttribute('data-lesson');
        saveSkillProgress(skill.id, { activeLesson: lessonTitle });
        renderLessonContent(skill, lessonTitle);
        renderSkillDetailPage();
      });
    });
  }

  if (notesBox) {
    notesBox.value = progress.notes || "";
    notesBox.addEventListener("input", (event) => {
      saveSkillProgress(skill.id, { notes: event.target.value });
    });
  }

  completeButton?.addEventListener("click", () => {
    const activeLesson = progress.activeLesson || courseLessons[0]?.title || skill.lessons[0];
    const updated = getSkillProgress(skill.id);
    const completedLessons = updated.completedLessons || [];
    if (!completedLessons.includes(activeLesson)) {
      completedLessons.push(activeLesson);
    }
    const nextLesson = courseLessons[courseLessons.findIndex((entry) => entry.title === activeLesson) + 1]?.title;
    saveSkillProgress(skill.id, { completedLessons, activeLesson: nextLesson || activeLesson });
    renderSkillDetailPage();
  });

  continueButton?.addEventListener("click", () => {
    const lessonTitles = courseLessons.length ? courseLessons.map((entry) => entry.title) : skill.lessons;
    const currentIndex = lessonTitles.indexOf(progress.activeLesson || lessonTitles[0]);
    const nextLesson = lessonTitles[Math.min(currentIndex + 1, lessonTitles.length - 1)];
    saveSkillProgress(skill.id, { activeLesson: nextLesson });
    renderSkillDetailPage();
  });
}

lessonRenderer = window.SkillSwapLearningUI?.createLessonRenderer({
  getSkillById,
  getSkillLessonEntries,
  getSkillCurriculumSections,
  getSkillProgress,
  saveSkillProgress,
  isLessonBookmarked,
  toggleLessonBookmark,
  addTimeSpent,
  renderSkillDetailPage,
  escapeHTML,
  defaultCodeFor
});

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const email = formData.get("email")?.toString().trim() || "";
  const password = formData.get("password")?.toString() || "";
  const status = document.getElementById("login-status");
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const result = await backend.signIn(email, password);
    const profile = await backend.loadProfile(result.user, skillCatalog);
    saveCurrentUser(profile);
    await hydrateUserData(profile.id);
    savePendingToast("Welcome back. You are now signed in.", "success");
    navigateTo("dashboard.html");
  } catch (error) {
    const message = error?.message || "Unable to log in. Please check your details and try again.";
    if (status) status.textContent = message;
    showToast(message, "error");
  } finally {
    if (submit) submit.disabled = false;
  }
}

function getConfirmedPassword(formData) {
  const password = formData.get("newPassword")?.toString() || "";
  const confirmation = formData.get("confirmPassword")?.toString() || "";
  if (password.length < 8) throw new Error("Choose a password with at least 8 characters.");
  if (password.length > 128) throw new Error("Choose a password with no more than 128 characters.");
  if (password !== confirmation) throw new Error("The new passwords do not match.");
  return password;
}

function getPasswordResetRedirectUrl() {
  return new URL("/reset-password.html", window.location.origin).href;
}

async function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const email = new FormData(form).get("email")?.toString().trim() || "";
  const status = document.getElementById("forgot-password-status");
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    await backend.sendPasswordReset(email, getPasswordResetRedirectUrl());
    const message = "If an account exists for that email, a secure reset link is on its way. Check your inbox and spam folder.";
    if (status) status.textContent = message;
    showToast(message, "success", 7000);
    form.reset();
  } catch (error) {
    const message = error?.message || "We couldn't send a reset link. Please try again.";
    if (status) status.textContent = message;
    showToast(message, "error", 7000);
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const status = document.getElementById("reset-password-status");
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const session = await backend.getSession();
    if (!session) throw new Error("Open the latest password-reset email link first, or request a new one.");
    const password = getConfirmedPassword(new FormData(form));
    await backend.updatePassword(password);
    savePendingToast("Your password has been updated.", "success");
    navigateTo("dashboard.html");
  } catch (error) {
    const message = error?.message || "We couldn't update your password. Request a new reset link and try again.";
    if (status) status.textContent = message;
    showToast(message, "error", 7000);
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function handleInvitationCompleteSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const status = document.getElementById("complete-invitation-status");
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const session = await backend.getSession();
    const currentUser = getCurrentUser();
    if (!session || !currentUser) {
      throw new Error("Open the latest Skillex invitation link first, or request a new invitation.");
    }
    const name = formData.get("name")?.toString().trim() || "";
    if (!name) throw new Error("Enter the name you want shown on your profile.");
    const password = getConfirmedPassword(formData);
    const result = await backend.updateProfile(session.user, {
      name,
      email: session.user.email || currentUser.email,
      bio: currentUser.bio || "",
      learnGoals: currentUser.learnGoals || "",
      teachGoals: currentUser.teachGoals || ""
    }, skillCatalog);
    await backend.updatePassword(password);
    saveCurrentUser(result.profile);
    savePendingToast("Your Skillex account is ready.", "success");
    navigateTo("dashboard.html");
  } catch (error) {
    const message = error?.message || "We couldn't complete account setup. Please try the invitation link again.";
    if (status) status.textContent = message;
    showToast(message, "error", 7000);
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function handleSettingsPasswordSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const status = document.getElementById("password-change-status");
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const currentUser = getCurrentUser();
    const currentPassword = formData.get("currentPassword")?.toString() || "";
    if (!currentUser?.email) throw new Error("Log in again before changing your password.");
    if (!currentPassword) throw new Error("Enter your current password to continue.");
    const password = getConfirmedPassword(formData);
    await backend.signIn(currentUser.email, currentPassword);
    await backend.updatePassword(password);
    form.reset();
    if (status) status.textContent = "Your password has been changed.";
    showToast("Your password has been changed.", "success");
  } catch (error) {
    const message = error?.message || "We couldn't change your password. Check your current password and try again.";
    if (status) status.textContent = message;
    showToast(message, "error", 7000);
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function handleSettingsPasswordReset() {
  const status = document.getElementById("password-change-status");
  const button = document.getElementById("settings-reset-password");
  try {
    const currentUser = getCurrentUser();
    if (!currentUser?.email) throw new Error("Log in again before requesting a password reset.");
    if (button) button.disabled = true;
    await backend.sendPasswordReset(currentUser.email, getPasswordResetRedirectUrl());
    const message = "If your account email can receive mail, a secure password-reset link is on its way.";
    if (status) status.textContent = message;
    showToast(message, "success", 7000);
  } catch (error) {
    const message = error?.message || "We couldn't send a reset link. Please try again.";
    if (status) status.textContent = message;
    showToast(message, "error", 7000);
  } finally {
    if (button) button.disabled = false;
  }
}

function getFormDraftKey(form) {
  return `skillex-form-draft:${form.name || form.id}`;
}

function saveFormDraft(form) {
  const draft = {};
  [...form.elements].forEach((field) => {
    if (!field.name || field.name === "bot-field"
      || ["hidden", "password", "file", "submit", "button"].includes(field.type)) return;
    draft[field.name] = field.type === "checkbox" || field.type === "radio"
      ? { checked: field.checked, value: field.value }
      : { value: field.value };
  });
  try {
    sessionStorage.setItem(getFormDraftKey(form), JSON.stringify(draft));
  } catch (error) {
    console.error("Could not save Skillex form draft:", error);
    showBackendStatus("Your form is still available, but this browser could not save a draft while you visit another page.");
  }
}

function restoreFormDraft(form) {
  const key = getFormDraftKey(form);
  try {
    const saved = sessionStorage.getItem(key);
    if (!saved) return;
    const draft = JSON.parse(saved);
    [...form.elements].forEach((field) => {
      if (!field.name || !draft[field.name]) return;
      const value = draft[field.name];
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = value.checked === true && value.value === field.value;
      } else if (field.type !== "password" && field.type !== "file") {
        field.value = value.value ?? "";
      }
    });
  } catch (error) {
    console.error("Could not restore Skillex form draft:", error);
    showBackendStatus("We couldn't restore your saved form draft. Your form is still available to fill in again.");
  }
}

function clearFormDraft(form) {
  try {
    sessionStorage.removeItem(getFormDraftKey(form));
  } catch (error) {
    console.error("Could not clear the sent Skillex form draft:", error);
    showBackendStatus("Your form was sent, but this browser could not clear its saved draft.");
  }
}

function attachFormDrafts() {
  document.querySelectorAll("#access-request-form, .contact-form[name='contact']").forEach((form) => {
    if (form.dataset.draftAttached) return;
    form.dataset.draftAttached = "true";
    restoreFormDraft(form);
    form.addEventListener("input", () => saveFormDraft(form));
    form.addEventListener("change", () => saveFormDraft(form));
  });
}

async function submitNetlifyForm(form, status, successMessage) {
  if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
    throw new Error("Form delivery is available on the hosted Skillex site.");
  }
  const formData = new FormData(form);
  formData.set("form-name", form.name);
  const response = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString()
  });
  if (!response.ok) throw new Error("We couldn't send your message. Please try again using the form.");
  form.reset();
  clearFormDraft(form);
  if (status) status.textContent = successMessage;
  showToast(successMessage, "success", 7000);
}

async function handleAccessRequestSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const status = document.getElementById("access-request-status");
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    await submitNetlifyForm(
      form,
      status,
      "Your request was sent for review. The Skillex team will follow up if access is available."
    );
  } catch (error) {
    const message = error?.message || "Unable to send your access request. Please try again.";
    if (status) status.textContent = message;
    showToast(message, "error", 7000);
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const name = formData.get("name")?.toString().trim() || "";
  const email = formData.get("email")?.toString().trim() || "";
  const bio = formData.get("bio")?.toString().trim() || "";
  const status = document.getElementById("profile-status");
  const currentUser = getCurrentUser();

  if (!currentUser) {
    if (status) status.textContent = "Log in before editing your profile.";
    return;
  }
  if (!name || !email) {
    if (status) status.textContent = "Enter your name and a valid email address.";
    return;
  }
  const learnGoals = formData.get("learnGoals")?.toString().trim() || "";
  const teachGoals = formData.get("teachGoals")?.toString().trim() || "";
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const result = await backend.updateProfile(currentUser, {
      name,
      email,
      bio,
      learnGoals,
      teachGoals
    }, skillCatalog);
    saveCurrentUser(result.profile);
    if (status) {
      status.textContent = result.emailChangePending
        ? "Profile saved. Check your inbox to confirm the email address change."
        : "Your profile has been updated.";
    }
    showToast(result.emailChangePending
      ? "Profile saved. Confirm your new email address to finish the change."
      : "Your profile has been updated.", "success");
  } catch (error) {
    const message = error.message || "Unable to update your profile. Please try again.";
    if (status) status.textContent = message;
    showToast(message, "error");
  } finally {
    if (submit) submit.disabled = false;
  }
}

function attachAuthForms() {
  const loginForm = document.getElementById("login-form");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const resetPasswordForm = document.getElementById("reset-password-form");
  const completeInvitationForm = document.getElementById("complete-invitation-form");
  const accessRequestForm = document.getElementById("access-request-form");
  const profileForm = document.getElementById("profile-form");
  const settingsForm = document.getElementById("settings-form");
  const passwordChangeForm = document.getElementById("password-change-form");
  const logoutButton = document.getElementById("logout-btn");

  loginForm?.addEventListener("submit", handleLoginSubmit);
  forgotPasswordForm?.addEventListener("submit", handleForgotPasswordSubmit);
  resetPasswordForm?.addEventListener("submit", handleResetPasswordSubmit);
  completeInvitationForm?.addEventListener("submit", handleInvitationCompleteSubmit);
  accessRequestForm?.addEventListener("submit", handleAccessRequestSubmit);
  profileForm?.addEventListener("submit", handleProfileSubmit);
  passwordChangeForm?.addEventListener("submit", handleSettingsPasswordSubmit);
  document.getElementById("settings-reset-password")?.addEventListener("click", handleSettingsPasswordReset);
  settingsForm?.addEventListener("change", (event) => {
    if (event.target.id !== "theme-preference") return;
    try {
      setThemePreference(event.target.value);
      showToast("Appearance preference saved.", "success");
    } catch (error) {
      showToast(error.message || "Unable to update appearance.", "error");
    }
  });
  document.getElementById("export-data")?.addEventListener("click", exportUserData);
  document.getElementById("import-data")?.addEventListener("change", importUserData);
  logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await backend.signOut();
      saveCurrentUser(null);
      navigateTo("login.html");
    } catch (error) {
      reportBackendError(error, "log out");
      logoutButton.disabled = false;
    }
  });

  if (profileForm) {
    const currentUser = getCurrentUser();
    if (currentUser) {
      profileForm.querySelector('input[name="name"]').value = currentUser.name || "";
      profileForm.querySelector('input[name="email"]').value = currentUser.email || "";
      profileForm.querySelector('textarea[name="bio"]').value = currentUser.bio || "";
      profileForm.querySelector('input[name="learnGoals"]').value = currentUser.learnGoals || "";
      profileForm.querySelector('input[name="teachGoals"]').value = currentUser.teachGoals || "";
    }
  }

  if (completeInvitationForm) {
    const currentUser = getCurrentUser();
    const nameInput = completeInvitationForm.querySelector('input[name="name"]');
    const submit = completeInvitationForm.querySelector('button[type="submit"]');
    const status = document.getElementById("complete-invitation-status");
    if (currentUser) {
      if (nameInput) nameInput.value = currentUser.name || "";
    } else {
      if (status) status.textContent = "Open this page from a valid Skillex invitation link to continue.";
      if (submit) submit.disabled = true;
    }
  }
}

function exportUserData() {
  const user = getCurrentUser();
  if (!user?.id) {
    showToast("Log in to export your Skillex data.", "error");
    return;
  }
  const backup = {
    format: "skillex-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    ownerId: user.id,
    data: {
      theme: getThemePreference(),
      savedSkills: getSavedSkills(),
      progress: getSkillProgressMap(),
      savedLessons: getSavedLessons(),
      recentSkills: getRecentlyViewed(),
      timeSpent: readStorage(STORAGE_KEYS.timeSpent, {})
    }
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `skillex-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Your Skillex learning backup has been downloaded.", "success");
}

function validateUserBackup(backup, user) {
  if (backup?.format !== "skillex-backup" || backup.version !== 1 || backup.ownerId !== user.id) {
    throw new Error("This backup is invalid or belongs to a different Skillex account.");
  }
  const data = backup.data;
  const knownSkills = new Map(skillCatalog.map((skill) => [skill.id, new Set(skill.lessons)]));
  if (!data || !["system", "light", "dark"].includes(data.theme)) {
    throw new Error("The backup has invalid appearance settings.");
  }
  const isSkillList = (value) => Array.isArray(value)
    && value.every((id) => typeof id === "string" && knownSkills.has(id));
  if (!isSkillList(data.savedSkills) || !isSkillList(data.recentSkills) || !Array.isArray(data.savedLessons)) {
    throw new Error("The backup contains invalid saved-skill data.");
  }
  const savedLessons = [...new Set(data.savedLessons)];
  for (const key of savedLessons) {
    if (typeof key !== "string") throw new Error("The backup contains an invalid saved lesson.");
    const separator = key.indexOf("::");
    const skillId = key.slice(0, separator);
    const lessonTitle = key.slice(separator + 2);
    if (separator < 1 || !knownSkills.get(skillId)?.has(lessonTitle)) {
      throw new Error("The backup contains a lesson that is not in the Skillex catalog.");
    }
  }
  if (!data.progress || typeof data.progress !== "object" || Array.isArray(data.progress)) {
    throw new Error("The backup contains invalid learning progress.");
  }
  const progress = {};
  for (const [skillId, entry] of Object.entries(data.progress)) {
    const lessons = knownSkills.get(skillId);
    if (!lessons || !entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("The backup contains progress for an unknown skill.");
    }
    const completedLessons = entry.completedLessons || [];
    if (!Array.isArray(completedLessons) || !completedLessons.every((title) => lessons.has(title))) {
      throw new Error("The backup contains an invalid completed lesson.");
    }
    if (entry.activeLesson && !lessons.has(entry.activeLesson)) {
      throw new Error("The backup contains an invalid active lesson.");
    }
    if (typeof (entry.notes || "") !== "string" || (entry.notes || "").length > 20000) {
      throw new Error("The backup contains invalid lesson notes.");
    }
    const quizScores = entry.quizScores || {};
    if (!quizScores || typeof quizScores !== "object" || Array.isArray(quizScores)
      || Object.values(quizScores).some((score) => typeof score !== "boolean")) {
      throw new Error("The backup contains invalid quiz results.");
    }
    const timeSpentSeconds = entry.timeSpentSeconds || 0;
    if (!Number.isSafeInteger(timeSpentSeconds) || timeSpentSeconds < 0) {
      throw new Error("The backup contains an invalid learning-time value.");
    }
    progress[skillId] = {
      completedLessons: [...new Set(completedLessons)],
      activeLesson: entry.activeLesson || "",
      notes: entry.notes || "",
      quizScores,
      timeSpentSeconds,
      lastUpdated: Number.isFinite(entry.lastUpdated) ? entry.lastUpdated : Date.now()
    };
  }
  const timeSpent = data.timeSpent || {};
  if (!timeSpent || typeof timeSpent !== "object" || Array.isArray(timeSpent)
    || Object.entries(timeSpent).some(([id, seconds]) =>
      !knownSkills.has(id) || !Number.isSafeInteger(seconds) || seconds < 0
    )) {
    throw new Error("The backup contains invalid learning-time data.");
  }
  return {
    theme: data.theme,
    savedSkills: [...new Set(data.savedSkills)],
    progress,
    savedLessons,
    recentSkills: [...new Set(data.recentSkills)].slice(0, 4),
    timeSpent
  };
}

async function importUserData(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("Choose a backup file smaller than 2 MB.", "error");
    input.value = "";
    return;
  }
  const user = getCurrentUser();
  if (!user?.id) {
    showToast("Log in to import your Skillex data.", "error");
    input.value = "";
    return;
  }
  try {
    const backup = JSON.parse(await file.text());
    const data = validateUserBackup(backup, user);
    if (!window.confirm("Importing this backup replaces saved skills, lesson progress, notes, quiz results, and saved lessons for this account. Continue?")) {
      return;
    }
    await Promise.all([
      backend.replaceSavedSkills(user.id, data.savedSkills),
      backend.replaceSavedLessons(user.id, data.savedLessons),
      backend.replaceLearningProgress(user.id, data.progress)
    ]);
    writeStorage(STORAGE_KEYS.savedSkills, data.savedSkills);
    writeStorage(STORAGE_KEYS.progress, data.progress);
    writeStorage(STORAGE_KEYS.savedLessons, data.savedLessons);
    writeStorage(STORAGE_KEYS.recentSkills, data.recentSkills);
    writeStorage(STORAGE_KEYS.timeSpent, data.timeSpent);
    setThemePreference(data.theme);
    showToast("Your backup has been imported and synced to your account.", "success", 7000);
  } catch (error) {
    console.error("Skillex data import failed:", error);
    showToast(error.message || "We couldn't import this backup.", "error", 7000);
  } finally {
    input.value = "";
  }
}

function attachContactForm() {
  const contactForm = document.querySelector(".contact-form");
  const formStatus = document.querySelector(".form-status");

  if (contactForm && !contactForm.id) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = contactForm.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await submitNetlifyForm(
          contactForm,
          formStatus,
          "Your message was sent. We’ll reply to the email address you provided."
        );
      } catch (error) {
        const message = error?.message || "Unable to send your message. Please try again.";
        if (formStatus) formStatus.textContent = message;
        showToast(message, "error");
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }
}

function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value || "");
  return element.innerHTML;
}

function getSwapRequests() {
  return readStorage(STORAGE_KEYS.swapRequests, []);
}

function saveSwapRequests(requests) {
  writeStorage(STORAGE_KEYS.swapRequests, requests);
}

function attachSwapPage() {
  const form = document.getElementById("swap-form");
  if (!form) return;
  const learnSelect = document.getElementById("swap-learn");
  const teachSelect = document.getElementById("swap-teach");
  const status = document.getElementById("swap-status");
  const options = skillCatalog.map((skill) => `<option value="${escapeHTML(skill.title)}">${escapeHTML(skill.title)}</option>`).join("");
  learnSelect.innerHTML = `<option value="">Select a skill</option>${options}`;
  teachSelect.innerHTML = `<option value="">Select a skill</option>${options}`;
  const user = getCurrentUser();
  if (user) {
    const learnSuggestion = skillCatalog.find((skill) => (user.learnGoals || "").toLowerCase().includes(skill.title.toLowerCase()));
    const teachSuggestion = skillCatalog.find((skill) => (user.teachGoals || "").toLowerCase().includes(skill.title.toLowerCase()));
    if (learnSuggestion) learnSelect.value = learnSuggestion.title;
    if (teachSuggestion) teachSelect.value = teachSuggestion.title;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!learnSelect.value || !teachSelect.value) {
      status.textContent = "Choose a skill to learn and a skill to share.";
      return;
    }
    renderSwapMatches(learnSelect.value, teachSelect.value, new FormData(form).get("message"));
    status.textContent = "Matches with a shared skill are shown first, with two-way exchanges ranked highest.";
  });
  renderSwapRequests();
}

function renderSwapMatches(learnSkill, teachSkill, message) {
  const target = document.getElementById("swap-matches");
  if (!target) return;
  const currentUser = getCurrentUser();
  const learnSkillId = findSkillId(learnSkill);
  const teachSkillId = findSkillId(teachSkill);
  if (!currentUser?.id || !learnSkillId || !teachSkillId) {
    target.innerHTML = `<p class="status-pill">Sign in and select skills from the catalog to find a peer.</p>`;
    return;
  }
  target.innerHTML = `<p class="status-pill">Searching Skillex members…</p>`;
  backend.loadMatches(currentUser.id).then((entries) => {
    const matches = backend.rankMatches(entries, learnSkillId, teachSkillId);
    if (!matches.length) {
      target.innerHTML = `<p class="status-pill">No members share either selected skill yet. Add your skills to your profile and check again later.</p>`;
      return;
    }
    target.innerHTML = matches.map((peer) => `
      <article class="skill-card">
        <div class="skill-card__top"><h3>${escapeHTML(peer.name)}</h3></div>
        <p>${escapeHTML(peer.bio || "Skillex member")}</p>
        <p><strong>${peer.score === 3 ? "Strong exchange match" : peer.score === 2 ? "Skill exchange match" : "Shared skill match"}</strong></p>
        <p>Skills in common: ${peer.matchedSkills.map((id) => escapeHTML(getSkillById(id)?.title || id)).join(", ")}</p>
        <p>Skills offered: ${peer.teaches.map((id) => escapeHTML(getSkillById(id)?.title || id)).join(", ") || "Not specified"}</p>
        <p>Wants to learn: ${peer.learns.map((id) => escapeHTML(getSkillById(id)?.title || id)).join(", ") || "Not specified"}</p>
        <div class="skill-card__actions"><button class="btn btn-small send-swap-btn" data-peer="${escapeHTML(peer.id)}" data-learn="${escapeHTML(learnSkillId)}" data-teach="${escapeHTML(teachSkillId)}" type="button">Send swap request</button></div>
      </article>`).join("");
    target.querySelectorAll(".send-swap-btn").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const duplicate = getSwapRequests().some((request) =>
          request.receiverId === button.dataset.peer && ["requested", "accepted"].includes(request.status)
        );
        if (duplicate) {
          button.textContent = "Request already sent";
          return;
        }
        await backend.createSwapRequest({
          requesterId: currentUser.id,
          receiverId: button.dataset.peer,
          learnSkillId: button.dataset.learn,
          teachSkillId: button.dataset.teach,
          message
        });
        await hydrateUserData(currentUser.id);
        renderSwapRequests();
        button.textContent = "Request sent";
      } catch (error) {
        reportBackendError(error, "send your exchange request");
        button.disabled = false;
      }
    }));
  }).catch((error) => {
    reportBackendError(error, "search for members");
    target.innerHTML = `<p class="status-pill">We couldn't load member matches. Please try again.</p>`;
  });
}

function renderSwapRequests() {
  const target = document.getElementById("swap-requests");
  const user = getCurrentUser();
  if (!user?.id) {
    if (target) target.innerHTML = `<p class="status-pill">Log in to view your exchange requests.</p>`;
    renderSwapSummary();
    return;
  }
  const requests = getSwapRequests();
  updateSwapRequestBadge(requests);
  if (target) {
    target.innerHTML = requests.length ? requests.map((request) => {
      const requester = request.requesterId === user.id;
      const status = request.status;
      const actions = [
        !requester && status === "requested" ? ["accepted", "Accept"] : null,
        !requester && status === "requested" ? ["declined", "Decline"] : null,
        requester && ["requested", "accepted"].includes(status) ? ["cancelled", "Cancel"] : null,
        status === "accepted" ? ["completed", "Mark completed"] : null
      ].filter(Boolean);
      return `<article class="swap-request"><div class="swap-request__top"><div><h3>${escapeHTML(request.peerName)}</h3><p>You learn <strong>${escapeHTML(request.learnSkill)}</strong> · You teach <strong>${escapeHTML(request.teachSkill)}</strong></p></div><span class="status-pill">${escapeHTML(status)}</span></div>${request.message ? `<p>“${escapeHTML(request.message)}”</p>` : ""}<div class="swap-request__actions">${actions.map(([nextStatus, label]) => `<button class="btn btn-small swap-action" data-id="${escapeHTML(request.id)}" data-status="${nextStatus}">${label}</button>`).join("")}</div></article>`;
    }).join("") : `<p class="status-pill">No exchange requests yet. Use the form above to find a peer.</p>`;
    target.querySelectorAll(".swap-action").forEach((button) => button.addEventListener("click", () => updateSwapStatus(button.dataset.id, button.dataset.status)));
  }
  renderSwapSummary();
}

async function updateSwapStatus(id, status) {
  try {
    await backend.updateSwapStatus(id, status);
    const requests = getSwapRequests().map((request) => request.id === id ? { ...request, status } : request);
    saveSwapRequests(requests);
    if (getCurrentUser()?.id) saveSwapNotificationSnapshot(requests, getCurrentUser().id);
    renderSwapRequests();
  } catch (error) {
    reportBackendError(error, "update the exchange request");
  }
}

function renderSwapSummary() {
  const target = document.getElementById("dashboard-swaps");
  if (!target) return;
  const requests = getSwapRequests();
  target.innerHTML = requests.length ? `<div class="stat-list">${requests.slice(0, 4).map((request) => `<div class="stat-item"><strong>${escapeHTML(request.peerName)}</strong> — ${escapeHTML(request.learnSkill)} for ${escapeHTML(request.teachSkill)} <span class="status-pill">${escapeHTML(request.status)}</span></div>`).join("")}</div><p class="detail-actions"><a class="btn btn-small" href="swap.html">Manage swaps</a></p>` : `<p>No exchanges yet. <a href="swap.html">Find a student to swap skills with.</a></p>`;
}

function getJoinedCommunities() { return readStorage(STORAGE_KEYS.communities, []); }
function saveJoinedCommunities(list) { writeStorage(STORAGE_KEYS.communities, list); }
function getDiscussions() { return readStorage(STORAGE_KEYS.discussions, []); }
function saveDiscussions(list) { writeStorage(STORAGE_KEYS.discussions, list); }

const communityData = skillCatalog.map((skill) => ({
  id: skill.id,
  skill: skill.title,
  focus: skill.description
}));

function attachProfileImage() {
  const input = document.getElementById("profile-photo-input");
  const preview = document.getElementById("profile-photo-preview");
  const chooseButton = document.getElementById("choose-profile-photo");
  const uploadStatus = document.getElementById("profile-photo-status");
  if (!input || !preview) return;
  const user = getCurrentUser();
  const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='100%25' height='100%25' fill='%23176b56'/%3E%3Ctext x='50%25' y='58%25' text-anchor='middle' font-family='Arial' font-size='34' fill='white'%3EYou%3C/text%3E%3C/svg%3E";
  preview.src = user?.avatarUrl || fallback;
  chooseButton?.addEventListener("click", () => input.click());
  if (user?.avatarPath) {
    backend.getAvatarUrl(user.avatarPath).then((url) => {
      preview.src = url;
      saveCurrentUser({ ...getCurrentUser(), avatarUrl: url });
    }).catch((error) => reportBackendError(error, "load your profile photo"));
  }
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!user?.id) {
      showBackendStatus("Log in to update your profile photo.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showBackendStatus("Choose a PNG, JPEG, or WebP image.");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showBackendStatus("Choose an image smaller than 5 MB.");
      input.value = "";
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    if (uploadStatus) uploadStatus.textContent = "Uploading your profile photo…";
    input.disabled = true;
    if (chooseButton) chooseButton.disabled = true;
    try {
      const current = getCurrentUser();
      const avatarPath = await backend.uploadAvatar(current.id, file, current.avatarPath);
      const avatarUrl = await backend.getAvatarUrl(avatarPath);
      preview.src = avatarUrl;
      saveCurrentUser({ ...current, avatarPath, avatarUrl });
      if (uploadStatus) uploadStatus.textContent = "Profile photo updated.";
      showToast("Profile photo updated.", "success");
    } catch (error) {
      preview.src = getCurrentUser()?.avatarUrl || fallback;
      if (uploadStatus) uploadStatus.textContent = error.message || "Unable to upload this photo.";
      reportBackendError(error, "update your profile photo");
    } finally {
      URL.revokeObjectURL(previewUrl);
      input.disabled = false;
      if (chooseButton) chooseButton.disabled = false;
    }
  });
}

function renderCommunities() {
  const container = document.getElementById("community-list");
  if (!container) return;
  const search = document.getElementById("community-search");
  const user = getCurrentUser();
  let memberEntries = null;
  let memberLoadFailed = false;
  const render = () => {
    const term = search?.value.trim().toLowerCase() || "";
    const items = communityData.filter((item) => `${item.skill} ${item.focus}`.toLowerCase().includes(term));
    container.innerHTML = items.map((community) => {
      const members = memberEntries === null
        ? null
        : (() => {
          const memberIds = new Set(memberEntries
            .filter((entry) => entry.skill_id === community.id)
            .map((entry) => entry.user_id));
          const ownSkills = `${user?.learnGoals || ""},${user?.teachGoals || ""}`
            .split(/[,;\n]/)
            .map((skill) => findSkillId(skill));
          if (ownSkills.includes(community.id)) memberIds.add(user.id);
          return memberIds.size;
        })();
      const memberMessage = memberLoadFailed
        ? "Member information is unavailable right now."
        : members === null
          ? "Sign in to discover learners sharing this skill."
          : members === 0
            ? "No users yet. Start your own group by posting the first question."
            : `${members} member${members === 1 ? "" : "s"} share this skill.`;
      return `
        <article class="skill-card">
          <div class="skill-card__top"><h3>${escapeHTML(community.skill)} Community</h3></div>
          <p>${escapeHTML(community.focus)}</p>
          <p class="community-members" aria-live="polite">${memberMessage}</p>
          <div class="skill-card__actions">
            <button class="btn btn-small" data-start-community="${escapeHTML(community.skill)}" type="button">Start your own</button>
            <a class="btn btn-secondary btn-small" href="swap.html">Find learners</a>
          </div>
        </article>`;
    }).join("") || `<p class="status-pill">No communities match that search. Try another skill.</p>`;
  };

  search?.addEventListener("input", render);
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-start-community]");
    if (!button) return;
    const select = document.getElementById("discussion-skill");
    const postField = document.querySelector('#discussion-form textarea[name="post"]');
    if (select) select.value = button.dataset.startCommunity;
    document.getElementById("discussion-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    postField?.focus({ preventScroll: true });
  });
  render();
  render();
  if (!user?.id) return;
  backend.loadMatches(user.id).then((entries) => {
    memberEntries = entries;
    render();
  }).catch((error) => {
    reportBackendError(error, "load community members");
    memberLoadFailed = true;
    render();
  });
}

function attachDiscussionForm() {
  const form = document.getElementById("discussion-form");
  if (!form) return;
  const select = document.getElementById("discussion-skill");
  select.innerHTML = communityData.map((community) => `<option value="${escapeHTML(community.skill)}">${escapeHTML(community.skill)} Community</option>`).join("");
  const renderPosts = () => { const box = document.getElementById("discussion-list"); const posts = getDiscussions(); box.innerHTML = posts.length ? posts.map((post) => `<article class="swap-request"><strong>${escapeHTML(post.author)}</strong><span class="status-pill">${escapeHTML(post.skill)}</span><p>${escapeHTML(post.text)}</p></article>`).join("") : `<p class="status-pill">No posts yet. Start the discussion with a focused question.</p>`; };
  form.addEventListener("submit", (event) => { event.preventDefault(); const text = new FormData(form).get("post")?.toString().trim(); if (!text) return; const user = getCurrentUser(); const posts = getDiscussions(); posts.unshift({ author: user?.name || "Skillex learner", skill: select.value, text, createdAt: Date.now() }); saveDiscussions(posts.slice(0, 20)); form.reset(); document.getElementById("discussion-status").textContent = "Saved in this browser. This post is not shared with other members yet."; renderPosts(); });
  renderPosts();
}

function renderCommunityDashboard() {
  const communities = document.getElementById("dashboard-communities");
  if (communities) communities.innerHTML = `<p>Explore skill groups and start a discussion.</p><a class="btn btn-small" href="communities.html">Explore communities</a>`;
  const certificates = document.getElementById("dashboard-certificates");
  if (certificates) { const complete = skillCatalog.filter((skill) => getSkillProgressPercent(skill.id) === 100); certificates.innerHTML = complete.length ? `<p>${complete.length} course certificate${complete.length > 1 ? "s" : ""} earned.</p><div class="badge-list">${complete.map((skill) => `<div class="badge-item">${escapeHTML(skill.title)} — Certified</div>`).join("")}</div>` : `<p>Complete a course to unlock a certificate and begin your mentor path.</p><a class="btn btn-small" href="browse.html">Continue learning</a>`; }
}

function findSkillId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return skillCatalog.find((skill) =>
    skill.id.toLowerCase() === normalized || skill.title.toLowerCase() === normalized
  )?.id || "";
}

async function hydrateUserData(userId) {
  const cached = window.__SKILLEX_USER_DATA_CACHE;
  if (cached?.userId === userId && cached.expiresAt > Date.now()) return cached.state;

  const state = await backend.loadUserData(userId, skillCatalog);
  writeStorage(STORAGE_KEYS.savedSkills, state.saved);
  writeStorage(STORAGE_KEYS.progress, state.progress);
  writeStorage(STORAGE_KEYS.savedLessons, state.savedLessons);
  writeStorage(STORAGE_KEYS.swapRequests, state.requests);
  writeStorage(STORAGE_KEYS.timeSpent, Object.fromEntries(
    Object.entries(state.progress).map(([skillId, progress]) => [skillId, progress.timeSpentSeconds || 0])
  ));
  window.__SKILLEX_USER_DATA_CACHE = {
    userId,
    state,
    expiresAt: Date.now() + 15000
  };
  return state;
}

async function hydrateCourseCatalog() {
  const remoteSkills = await backend.loadCourses();
  const localSkills = new Map(skillCatalog.map((skill) => [skill.id, skill]));
  const merged = remoteSkills.map((entry) => {
    const skill = localSkills.get(entry.id);
    if (!skill) {
      throw new Error(`The local course data is missing for "${entry.title}" (${entry.id}).`);
    }
    const content = entry.course_content || {};
    Object.assign(skill, content, {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      description: entry.description
    });
    normalizeSkill(skill);
    return skill;
  });
  skillCatalog.splice(0, skillCatalog.length, ...merged);
}

function initializePage() {
  updateAuthLinks();
  if (!ensureProtectedAccess()) return;
  initializeSwapNotifications();
  attachFormDrafts();
  attachBrowseInteractions();
  renderDashboard();
  renderSavedSkillsPage();
  renderSkillDetailPage();
  attachAuthForms();
  attachContactForm();
  attachSwapPage();
  renderSwapSummary();
  attachProfileImage();
  renderCommunities();
  attachDiscussionForm();
  renderCommunityDashboard();
}

async function initializeApp() {
  showPendingToast();

  const legacyUsers = readStorage(STORAGE_KEYS.users, null);
  if (Array.isArray(legacyUsers)) {
    saveUsers(legacyUsers
      .filter((user) => user && typeof user === "object")
      .map(({ password, ...user }) => user));
  }
  const clearAuthCallbackUrl = () => {
    const routeUrl = window.SKILLEX_ROUTE_URL;
    const callbackParams = new URLSearchParams(routeUrl?.search || window.location.search);
    new URLSearchParams((routeUrl?.hash || window.location.hash).replace(/^#/, ""))
      .forEach((value, key) => callbackParams.set(key, value));
    if (["access_token", "refresh_token", "error", "error_description", "code"]
      .some((key) => callbackParams.has(key))) {
      history.replaceState(
        { skillexRoute: `${routeUrl?.pathname || window.location.pathname}${routeUrl?.search || ""}` },
        "",
        window.location.origin
      );
    }
  };
  try {
    const session = await backend.getSession();
    clearAuthCallbackUrl();
    if (!session) {
      saveCurrentUser(null);
    } else {
      const profile = await backend.loadProfile(session.user, skillCatalog);
      saveCurrentUser(profile);
    }
  } catch (error) {
    reportBackendError(error, "connect to Skillex");
    saveCurrentUser(null);
    clearAuthCallbackUrl();
  }

  if (!ensureProtectedAccess()) return;

  try {
    await hydrateCourseCatalog();
    if (getCurrentUser()?.id) await hydrateUserData(getCurrentUser().id);
  } catch (error) {
    reportBackendError(error, "load Skillex learning data");
  }
  initializePage();
}

initializeApp();
})();