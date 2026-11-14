(function (root) {
  function createLessonRenderer({
    getSkillLessonEntries,
    getSkillProgress,
    saveSkillProgress,
    isLessonBookmarked,
    toggleLessonBookmark,
    addTimeSpent,
    renderSkillDetailPage,
    showCourseOverview,
    escapeHTML,
    defaultCodeFor
  }) {
    let lessonViewStart = null;
    let activeLessonTitle = "";
    let activeStageIndex = 0;

    function renderLessonContent(skill, lessonTitle) {
      const lessonView = document.getElementById("lesson-view");
      if (!lessonView) return;

      const lessonEntries = getSkillLessonEntries(skill);
      const lessonIndex = lessonEntries.findIndex((entry) => entry.title === lessonTitle);
      const lessonEntry = lessonEntries[lessonIndex] || lessonEntries[0] || { title: lessonTitle, description: "" };
      if (activeLessonTitle !== lessonEntry.title) {
        activeLessonTitle = lessonEntry.title;
        activeStageIndex = 0;
        lessonViewStart = Date.now();
      }

      const progress = getSkillProgress(skill.id);
      const completedLessons = progress.completedLessons || [];
      const completedCount = lessonEntries.filter((entry) => completedLessons.includes(entry.title)).length;
      const courseProgress = lessonEntries.length ? Math.round((completedCount / lessonEntries.length) * 100) : 0;
      const bookmarked = isLessonBookmarked(skill.id, lessonEntry.title);
      const introduction = lessonEntry.introduction || lessonEntry.description;
      const explanation = lessonEntry.simpleExplanation || lessonEntry.explanation;
      const stages = [
        {
          label: "Learn",
          content: `
            ${introduction ? `<p>${escapeHTML(introduction)}</p>` : ""}
            ${explanation ? `<section class="lesson-content-block"><h3>Key idea</h3><p>${escapeHTML(explanation)}</p></section>` : ""}
            ${lessonEntry.why ? `<details class="lesson-extra"><summary>Why this matters</summary><p>${escapeHTML(lessonEntry.why)}</p></details>` : ""}
          `
        },
        {
          label: "Explore",
          content: `
            ${lessonEntry.analogy ? `<aside class="lesson-callout"><strong>Think of it this way</strong><p>${escapeHTML(lessonEntry.analogy)}</p></aside>` : ""}
            ${lessonEntry.visual ? `<section class="lesson-content-block"><h3>Visual example</h3><pre class="visual-code">${escapeHTML(lessonEntry.visual)}</pre></section>` : ""}
            ${lessonEntry.examples ? `<section class="lesson-content-block"><h3>Example</h3><p>${escapeHTML(lessonEntry.examples)}</p></section>` : ""}
            ${lessonEntry.code ? `<section class="lesson-content-block"><h3>Try the demo</h3><label class="lesson-code-label" for="code-editor">Edit the example, then run it.</label><textarea id="code-editor" class="code-editor" rows="8">${escapeHTML(lessonEntry.code || defaultCodeFor(skill.id, lessonEntry.title))}</textarea><div class="code-controls"><button class="btn btn-sm" id="run-code" type="button">Run example</button></div><div class="code-preview"><iframe id="preview-frame" title="Interactive code preview" sandbox="allow-scripts"></iframe></div></section>` : ""}
            ${lessonEntry.interactive ? `<section class="lesson-content-block"><h3>Try it</h3><div class="interactive">${escapeHTML(lessonEntry.interactive)}</div></section>` : ""}
          `
        },
        {
          label: "Practice",
          content: `
            ${lessonEntry.steps?.length ? `<section class="lesson-content-block"><h3>Follow these steps</h3><ol class="lesson-task-list">${lessonEntry.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ol></section>` : ""}
            ${lessonEntry.exercises?.length ? `<section class="lesson-content-block"><h3>Put it into practice</h3><ol class="lesson-task-list">${lessonEntry.exercises.map((exercise) => `<li>${escapeHTML(exercise)}</li>`).join("")}</ol></section>` : ""}
            ${lessonEntry.miniProject ? `<aside class="lesson-callout lesson-callout--project"><strong>Mini project</strong><p>${escapeHTML(lessonEntry.miniProject)}</p></aside>` : ""}
            ${lessonEntry.commonMistakes?.length ? `<details class="lesson-extra"><summary>Common mistakes to watch for</summary><ul>${lessonEntry.commonMistakes.map((mistake) => `<li>${escapeHTML(mistake)}</li>`).join("")}</ul></details>` : ""}
          `
        },
        {
          label: "Check",
          content: lessonEntry.quiz
            ? `<section class="lesson-content-block lesson-knowledge-check"><h3>Quick knowledge check</h3><p>${escapeHTML(lessonEntry.quiz.q || "What is the main idea of this lesson?")}</p><div class="quiz-options">${lessonEntry.quiz.options.map((option, index) => `<button class="quiz-opt btn btn-secondary" type="button" data-answer="${index}">${escapeHTML(option)}</button>`).join("")}</div><p class="quiz-feedback" aria-live="polite"></p></section>`
            : `<section class="lesson-content-block"><h3>Quick reflection</h3><p>In your own words, what is one useful idea you learned in this lesson?</p></section>`
        },
        {
          label: "Finish",
          content: `
            ${lessonEntry.summary ? `<section class="lesson-content-block"><h3>Key takeaway</h3><p>${escapeHTML(lessonEntry.summary)}</p></section>` : ""}
            ${lessonEntry.memoryAid ? `<aside class="lesson-callout"><strong>Remember</strong><p>${escapeHTML(lessonEntry.memoryAid)}</p></aside>` : ""}
            ${lessonEntry.revision ? `<details class="lesson-extra" open><summary>Review points</summary><p>${escapeHTML(lessonEntry.revision)}</p></details>` : ""}
            ${!lessonEntry.summary && !lessonEntry.memoryAid && !lessonEntry.revision ? "<p>Take a moment to review the idea and note one thing you want to remember.</p>" : ""}
          `
        }
      ].filter((stage) => stage.label === "Learn" || stage.label === "Check" || stage.content.trim());

      activeStageIndex = Math.min(activeStageIndex, stages.length - 1);
      const stage = stages[activeStageIndex];
      const completed = completedLessons.includes(lessonEntry.title);
      const previousLesson = lessonEntries[lessonIndex - 1];
      const nextLesson = lessonEntries[lessonIndex + 1];
      const stageProgress = Math.round(((activeStageIndex + 1) / stages.length) * 100);

      lessonView.innerHTML = `
        <article class="lesson-focus-card">
          <div class="lesson-focus-top">
            <button class="lesson-outline-link" type="button" data-course-outline>← Course outline</button>
            <div class="lesson-focus-actions">
              <span class="lesson-sequence">Lesson ${lessonIndex + 1} of ${lessonEntries.length}</span>
              <button class="lesson-save-button" id="bookmark-lesson-btn" type="button" aria-pressed="${bookmarked}">${bookmarked ? "Saved" : "Save lesson"}</button>
            </div>
          </div>
          <div class="lesson-course-progress">
            <div class="lesson-progress-copy"><span>Course progress</span><strong>${courseProgress}% · ${completedCount} of ${lessonEntries.length} lessons</strong></div>
            <div class="progress-bar" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${courseProgress}"><span style="width:${courseProgress}%"></span></div>
          </div>
          <header class="lesson-focus-heading">
            <p class="eyebrow">${escapeHTML(skill.title)} · ${stage.label} ${activeStageIndex + 1} of ${stages.length}</p>
            <h1>${escapeHTML(lessonEntry.title)}</h1>
            <p class="lesson-desc">${escapeHTML(lessonEntry.description || "")}</p>
          </header>
          <div class="lesson-stage-progress">
            <div class="lesson-progress-copy"><span>Lesson progress</span><strong>${stageProgress}%</strong></div>
            <div class="progress-bar" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stageProgress}"><span style="width:${stageProgress}%"></span></div>
          </div>
          <nav class="lesson-stage-nav" aria-label="Lesson steps">
            ${stages.map((item, index) => `<button type="button" class="lesson-stage ${index === activeStageIndex ? "is-current" : ""} ${index < activeStageIndex ? "is-past" : ""}" data-stage="${index}" aria-current="${index === activeStageIndex ? "step" : "false"}"><span>${index < activeStageIndex ? "✓" : index + 1}</span>${item.label}</button>`).join("")}
          </nav>
          <section class="lesson-stage-content" aria-live="polite" aria-label="${stage.label} lesson step">
            ${stage.content || "<p>Review the lesson idea, then continue when you are ready.</p>"}
          </section>
          <details class="lesson-notes">
            <summary>My notes</summary>
            <label class="visually-hidden" for="lesson-notes-box">Notes for this course</label>
            <textarea id="lesson-notes-box" rows="4" placeholder="Capture a thought or question...">${escapeHTML(progress.notes || "")}</textarea>
            <span class="lesson-note-status" aria-live="polite">Notes save automatically.</span>
          </details>
          <footer class="lesson-step-footer">
            <button class="btn btn-secondary lesson-previous-step" type="button" ${activeStageIndex === 0 ? "disabled" : ""}>Previous step</button>
            ${activeStageIndex < stages.length - 1
              ? `<button class="btn lesson-next-step" type="button">Continue to ${stages[activeStageIndex + 1].label} <span aria-hidden="true">→</span></button>`
              : `<button class="btn lesson-complete-step" type="button">${completed ? nextLesson ? "Continue to next lesson" : "Lesson completed" : "Complete lesson"} <span aria-hidden="true">✓</span></button>`
            }
          </footer>
          <nav class="lesson-neighbor-nav" aria-label="Other lessons">
            ${previousLesson ? `<button class="lesson-neighbor-button" type="button" data-neighbor-lesson="${escapeHTML(previousLesson.title)}">← <span>Previous lesson</span><strong>${escapeHTML(previousLesson.title)}</strong></button>` : "<span></span>"}
            ${nextLesson ? `<button class="lesson-neighbor-button lesson-neighbor-button--next" type="button" data-neighbor-lesson="${escapeHTML(nextLesson.title)}"><span>Next lesson</span><strong>${escapeHTML(nextLesson.title)} →</strong></button>` : "<span></span>"}
          </nav>
        </article>
      `;

      function goToStage(index) {
        activeStageIndex = Math.max(0, Math.min(index, stages.length - 1));
        renderLessonContent(skill, lessonEntry.title);
        lessonView.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      lessonView.querySelector("[data-course-outline]")?.addEventListener("click", showCourseOverview);
      lessonView.querySelectorAll("[data-stage]").forEach((button) => {
        button.addEventListener("click", () => goToStage(Number(button.dataset.stage)));
      });
      lessonView.querySelector(".lesson-previous-step")?.addEventListener("click", () => goToStage(activeStageIndex - 1));
      lessonView.querySelector(".lesson-next-step")?.addEventListener("click", () => goToStage(activeStageIndex + 1));
      lessonView.querySelectorAll("[data-neighbor-lesson]").forEach((button) => {
        button.addEventListener("click", () => {
          saveSkillProgress(skill.id, { activeLesson: button.dataset.neighborLesson });
          renderSkillDetailPage();
        });
      });

      lessonView.querySelector("#lesson-notes-box")?.addEventListener("input", (event) => {
        saveSkillProgress(skill.id, { notes: event.target.value });
        const status = lessonView.querySelector(".lesson-note-status");
        if (status) status.textContent = "Saved";
      });

      lessonView.querySelector("#run-code")?.addEventListener("click", () => {
        const code = lessonView.querySelector("#code-editor")?.value;
        const frame = lessonView.querySelector("#preview-frame");
        if (frame && code !== undefined) frame.srcdoc = code;
      });

      lessonView.querySelector("#bookmark-lesson-btn")?.addEventListener("click", (event) => {
        const added = toggleLessonBookmark(skill.id, lessonEntry.title);
        event.currentTarget.textContent = added ? "Saved" : "Save lesson";
        event.currentTarget.setAttribute("aria-pressed", String(added));
      });

      lessonView.querySelectorAll(".quiz-opt").forEach((button) => {
        button.addEventListener("click", () => {
          const selected = Number(button.dataset.answer);
          const correct = lessonEntry.quiz?.answer;
          lessonView.querySelectorAll(".quiz-opt").forEach((option) => option.classList.remove("selected", "is-correct", "is-wrong"));
          button.classList.add(selected === correct ? "is-correct" : "is-wrong");
          const feedback = lessonView.querySelector(".quiz-feedback");
          if (feedback) feedback.textContent = selected === correct ? "Correct — great job." : "Not quite. Review the example, then try again.";
          saveSkillProgress(skill.id, {
            quizScores: { ...(getSkillProgress(skill.id).quizScores || {}), [lessonEntry.title]: selected === correct }
          });
        });
      });

      lessonView.querySelector(".lesson-complete-step")?.addEventListener("click", () => {
        if (!completed) {
          const updated = getSkillProgress(skill.id);
          const nextCompleted = [...(updated.completedLessons || []), lessonEntry.title];
          if (lessonViewStart) {
            addTimeSpent(skill.id, Math.max(1, Math.round((Date.now() - lessonViewStart) / 1000)));
            lessonViewStart = null;
          }
          saveSkillProgress(skill.id, { completedLessons: nextCompleted, activeLesson: nextLesson?.title || lessonEntry.title });
          renderSkillDetailPage();
          if (!nextLesson) showCourseOverview();
          return;
        }
        if (nextLesson) {
          saveSkillProgress(skill.id, { activeLesson: nextLesson.title });
          renderSkillDetailPage();
        }
        else showCourseOverview();
      });
    }

    return { renderLessonContent };
  }

  root.SkillSwapLearningUI = {
    createLessonRenderer
  };
})(window);
