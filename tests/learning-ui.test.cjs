const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "js", "modules", "learning-ui.js"), "utf8");

test("lesson renderer keeps HTML examples and code in text contexts", () => {
  const lessonView = {
    innerHTML: "",
    querySelectorAll: () => [],
    querySelector: () => null
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
    isLessonBookmarked: () => false,
    escapeHTML(value) {
      const element = document.createElement("div");
      element.textContent = String(value || "");
      return element.innerHTML;
    }
  });

  renderer.renderLessonContent({ id: "html-css" }, lesson.title);

  assert.match(lessonView.innerHTML, /&lt;img src="image\.jpg"/);
  assert.match(lessonView.innerHTML, /&lt;h1&gt;Example&lt;\/h1&gt;/);
  assert.match(lessonView.innerHTML, /&lt;\/textarea&gt;&lt;img src=x/);
  assert.doesNotMatch(lessonView.innerHTML, /<img src="image\.jpg"/);
});
