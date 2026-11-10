(function (root) {
  function createLessonRenderer({ getSkillById, getSkillLessonEntries, getSkillCurriculumSections, getSkillProgress, saveSkillProgress, isLessonBookmarked, toggleLessonBookmark, addTimeSpent, renderSkillDetailPage, escapeHTML, defaultCodeFor }) {
    let lessonViewStart = null;

    function renderLessonContent(skill, lessonTitle) {
      const lessonView = document.getElementById('lesson-view');
      if (!lessonView) return;

      const lessonEntries = getSkillLessonEntries(skill);
      const lessonEntry = lessonEntries.find((l) => l.title === lessonTitle) || lessonEntries[0] || { title: lessonTitle, description: '' };
      lessonViewStart = Date.now();

      const bookmarked = isLessonBookmarked(skill.id, lessonTitle);

      lessonView.innerHTML = `
        <article class="lesson-view-card">
          <h3>${escapeHTML(lessonEntry.title)}</h3>
          <p class="lesson-desc">${escapeHTML(lessonEntry.description || '')}</p>
          <div class="lesson-actions">
            <button class="btn" id="mark-complete-btn">Mark as completed</button>
            <button class="btn btn-secondary" id="bookmark-lesson-btn">${bookmarked ? 'Bookmarked' : 'Save lesson'}</button>
          </div>
          <section class="lesson-structure">
            <h4>Introduction</h4>
            <p>${escapeHTML(lessonEntry.introduction || lessonEntry.description || '')}</p>
            <h4>Why this topic matters</h4>
            <p>${escapeHTML(lessonEntry.why || '')}</p>
            <h4>Simple explanation</h4>
            <p>${escapeHTML(lessonEntry.simpleExplanation || lessonEntry.explanation || '')}</p>
            <h4>Real-life analogy</h4>
            <p>${escapeHTML(lessonEntry.analogy || '')}</p>
            <h4>Visual explanation</h4>
            <pre class="visual-code">${escapeHTML(lessonEntry.visual || '')}</pre>
            <h4>Lesson content</h4>
            <p>${escapeHTML(lessonEntry.explanation || '')}</p>
            <h4>Examples</h4>
            <p>${escapeHTML(lessonEntry.examples || '')}</p>
            <h4>Step-by-step breakdown</h4>
            <ol>${(lessonEntry.steps || []).map((step) => `<li>${escapeHTML(step)}</li>`).join('')}</ol>
            ${ (lessonEntry.code || lessonEntry.interactive) ? `
              <h4>Interactive demonstration</h4>
            ${lessonEntry.code ? `<textarea id="code-editor" class="code-editor" rows="8">${escapeHTML(lessonEntry.code || defaultCodeFor(skill.id, lessonEntry.title))}</textarea>
              <div class="code-controls"><button class="btn btn-sm" id="run-code">Run</button></div>
            <div class="code-preview"><iframe id="preview-frame"></iframe></div>` : `<div class="interactive">${escapeHTML(lessonEntry.interactive || '')}</div>` }
            ` : '' }
            <h4>Common mistakes</h4>
            <ul>${(lessonEntry.commonMistakes || []).map((m) => `<li>${escapeHTML(m)}</li>`).join('')}</ul>
            <h4>Easy ways to remember</h4>
            <p>${escapeHTML(lessonEntry.memoryAid || '')}</p>
            <h4>Practice exercises</h4>
            <ol>${(lessonEntry.exercises || []).map((e) => `<li>${escapeHTML(e)}</li>`).join('')}</ol>
            <h4>Quiz</h4>
            <div class="quiz-block">
            <p><strong>Q:</strong> ${escapeHTML(lessonEntry.quiz?.q || 'What is the main idea of this lesson?')}</p>
            ${lessonEntry.quiz ? lessonEntry.quiz.options.map((opt, i) => `<button class="quiz-opt btn btn-sm" data-answer="${i}">${escapeHTML(opt)}</button>`).join('') : '<p>No quiz for this lesson.</p>'}
              <p class="quiz-feedback" aria-live="polite"></p>
            </div>
            <h4>Mini project</h4>
            <p>${escapeHTML(lessonEntry.miniProject || '')}</p>
            <h4>Summary notes</h4>
            <p>${escapeHTML(lessonEntry.summary || '')}</p>
            <h4>Revision points</h4>
            <p>${escapeHTML(lessonEntry.revision || '')}</p>
            <h4>Next lesson recommendation</h4>
            <p><a href="#" class="next-lesson-link">${escapeHTML(lessonEntry.nextLesson || '')}</a></p>
          </section>
        </article>
      `;

      document.getElementById('run-code')?.addEventListener('click', () => {
        const codeEl = document.getElementById('code-editor');
        if (!codeEl) return;
        const frame = document.getElementById('preview-frame');
        if (frame && frame.contentWindow) {
          frame.srcdoc = codeEl.value;
        }
      });

      document.getElementById('bookmark-lesson-btn')?.addEventListener('click', () => {
        const added = toggleLessonBookmark(skill.id, lessonTitle);
        document.getElementById('bookmark-lesson-btn').textContent = added ? 'Bookmarked' : 'Save lesson';
      });

      document.getElementById('mark-complete-btn')?.addEventListener('click', () => {
        const updated = getSkillProgress(skill.id);
        const completedLessons = updated.completedLessons || [];
        if (!completedLessons.includes(lessonTitle)) completedLessons.push(lessonTitle);
        if (lessonViewStart) {
          const secs = Math.round((Date.now() - lessonViewStart) / 1000);
          addTimeSpent(skill.id, secs);
          lessonViewStart = null;
        }
        const next = (skill.curriculum ? Object.values(skill.curriculum).flat() : skill.lessonDetails || []).map((l) => l.title).filter(Boolean);
        const nextLesson = next[next.indexOf(lessonTitle) + 1];
        saveSkillProgress(skill.id, { completedLessons, activeLesson: nextLesson || lessonTitle });
        renderSkillDetailPage();
        renderLessonContent(skill, nextLesson || lessonTitle);
      });

      lessonView.querySelectorAll('.quiz-opt').forEach((btn) => {
        btn.addEventListener('click', () => {
          const selected = Number(btn.dataset.answer);
          const correct = lessonEntry.quiz?.answer;
          lessonView.querySelectorAll('.quiz-opt').forEach((option) => option.classList.remove('selected', 'is-correct', 'is-wrong'));
          btn.classList.add('selected', selected === correct ? 'is-correct' : 'is-wrong');
          const feedback = lessonView.querySelector('.quiz-feedback');
          if (feedback) feedback.textContent = selected === correct ? 'Correct — great job.' : 'Not quite. Re-read the explanation and try the practice task before answering again.';
          const progress = getSkillProgress(skill.id);
          const quizScores = { ...(progress.quizScores || {}), [lessonTitle]: selected === correct };
          saveSkillProgress(skill.id, { quizScores });
        });
      });

      const nextLink = lessonView.querySelector('.next-lesson-link');
      if (nextLink) {
        nextLink.addEventListener('click', (e) => {
          e.preventDefault();
          if (lessonEntry.nextLesson) renderLessonContent(skill, lessonEntry.nextLesson);
        });
      }
    }

    return { renderLessonContent };
  }

  root.SkillSwapLearningUI = {
    createLessonRenderer
  };
})(window);
