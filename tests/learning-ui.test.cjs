const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "js", "modules", "learning-ui.js"), "utf8");

test("lesson renderer keeps HTML examples and code in text contexts", () => {
  const lessonView = {
    innerHTML: "",
    querySelectorAll(selector) {
      if (selector !== "[data-stage]") return [];
      return Array.from({ length: 5 }, (_, index) => ({
        dataset: { stage: String(index) },
        addEventListener: (type, handler) => {
          if (type === "click") this.stageHandlers[index] = handler;
        }
      }));
    },
    stageHandlers: {},
    querySelector: () => null,
    scrollIntoView: () => {}
  };
  const document = {
    createElement() {
      let text = "";
      return {
        set textContent(value) {
          text = String(value);
        },
        get innerHTML() {
          return text
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
        }
      };
    },
    getElementById(id) {
      return id === "lesson-view" ? lessonView : null;
    }
  };
  const window = {};
  vm.runInNewContext(source, { window, document }, { filename: "learning-ui.js" });

  const lesson = {
    title: "HTML examples",
    description: "Markup examples",
    explanation: 'Use <img src="image.jpg" alt="Example">',
    visual: "<h1>Example</h1>",
    code: "</textarea><img src=x>",
    steps: ["Create a <p> paragraph"],
    commonMistakes: ["Forget <alt> text"],
    exercises: ["Add a <section>"],
    quiz: { q: "Which tag is <p>?", options: ["<p>", "<div>"], answer: 0 }
  };
  const renderer = window.SkillSwapLearningUI.createLessonRenderer({
    getSkillLessonEntries: () => [lesson],
    getSkillProgress: () => ({ completedLessons: [], quizScores: {} }),
    saveSkillProgress: () => {},
    isLessonBookmarked: () => false,
    toggleLessonBookmark: () => true,
    addTimeSpent: () => {},
    renderSkillDetailPage: () => {},
    showCourseOverview: () => {},
    escapeHTML(value) {
      const element = document.createElement("div");
      element.textContent = String(value || "");
      return element.innerHTML;
    },
    defaultCodeFor: () => ""
  });

  renderer.renderLessonContent({ id: "html-css" }, lesson.title);
  assert.match(lessonView.innerHTML, /Lesson 1 of 1/);
  assert.match(lessonView.innerHTML, /Lesson progress/);
  assert.match(lessonView.innerHTML, /class="lesson-stage-content"/);
  assert.match(lessonView.innerHTML, /&lt;img src="image\.jpg"/);
  assert.doesNotMatch(lessonView.innerHTML, /&lt;h1&gt;Example|&lt;\/textarea&gt;&lt;img src=x/);

  lessonView.stageHandlers[1]();

  assert.match(lessonView.innerHTML, /&lt;h1&gt;Example&lt;\/h1&gt;/);
  assert.match(lessonView.innerHTML, /&lt;\/textarea&gt;&lt;img src=x/);
  assert.doesNotMatch(lessonView.innerHTML, /<img src="image\.jpg"/);
  assert.match(lessonView.innerHTML, /aria-label="Explore lesson step"/);
});

test("lesson renderer omits empty content sections instead of showing blank headings", () => {
  const lessonView = {
    innerHTML: "",
    querySelectorAll: () => [],
    querySelector: () => null
  };
  const document = {
    getElementById: (id) => id === "lesson-view" ? lessonView : null
  };
  const window = {};
  vm.runInNewContext(source, { window, document }, { filename: "learning-ui.js" });
  const renderer = window.SkillSwapLearningUI.createLessonRenderer({
    getSkillLessonEntries: () => [{ title: "Foundations", description: "Start with one useful idea." }],
    getSkillProgress: () => ({ completedLessons: [] }),
    saveSkillProgress: () => {},
    isLessonBookmarked: () => false,
    toggleLessonBookmark: () => false,
    addTimeSpent: () => {},
    renderSkillDetailPage: () => {},
    showCourseOverview: () => {},
    escapeHTML: (value) => String(value || ""),
    defaultCodeFor: () => ""
  });

  renderer.renderLessonContent({ id: "design" }, "Foundations");

  assert.match(lessonView.innerHTML, /Start with one useful idea/);
  assert.doesNotMatch(lessonView.innerHTML, /Why it matters|Visual example|Common mistakes|Mini project/);
});

test("mobile lesson layout hides the browser scrollbar without disabling scrolling", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "skill.html"), "utf8");
  const styles = fs.readFileSync(path.join(root, "css", "style.css"), "utf8");
  const overviewStart = html.indexOf('id="course-overview"');
  const lessonViewStart = html.indexOf('id="lesson-view"');

  assert.ok(overviewStart >= 0);
  assert.ok(lessonViewStart > overviewStart);
  assert.match(html.slice(overviewStart, lessonViewStart), /id="lesson-list"/);
  assert.match(html.slice(lessonViewStart), /class="lesson-view"[^>]*hidden/);
  assert.match(styles, /@media \(max-width: 760px\) \{[\s\S]*?html \{[\s\S]*?scrollbar-width: none/);
  assert.match(styles, /html::-webkit-scrollbar,\s*body::-webkit-scrollbar\s*\{\s*display: none;/);
});

test("skill detail switches to one column before curriculum level labels overflow", () => {
  const styles = fs.readFileSync(path.join(__dirname, "..", "css", "style.css"), "utf8");

  assert.match(styles, /@media \(max-width: 1100px\) \{\s*\.skill-detail-grid \{\s*grid-template-columns: minmax\(0, 1fr\);/);
});
