/* ==========================================================================
   apps/learn.js — «ШКОЛА PYTHON» (перенос LearnWindowView.cs):
   слева уроки, справа теория и мини-тест с автопроверкой.
   ========================================================================== */
(function (root) {
  "use strict";

  var CH = root.CH = root.CH || {};
  var UI = CH.UI;
  var el = CH.Dom.el;

  function learnApp(game) {
    return {
      title: "ШКОЛА PYTHON",
      accent: "#ff2d78",
      width: 900,
      height: 620,
      build: function (body, win) {
        var lesson = null;
        var answers = {};
        var listSig = "";

        var lessonItems = el("div", { cls: "items scroll", style: { padding: "2px" } });
        var listBox = el("div", { cls: "file-tree" },
          el("div", { cls: "head", text: "ШКОЛА PYTHON" }), lessonItems);
        listBox.style.flexBasis = "214px";

        var right = el("div", { cls: "scroll grow", style: { padding: "2px 4px 2px 0" } });
        var layout = el("div", { cls: "files-layout" }, listBox, right);
        layout.style.height = "100%";
        body.appendChild(layout);

        function refreshList() {
          var sig = game.completedLessons.join(",") + "|" + (lesson ? lesson.id : 0);
          if (sig === listSig) return;
          listSig = sig;

          CH.Dom.clear(lessonItems);
          game.Data.lessons.forEach(function (l) {
            var done = game.isLessonCompleted(l.id);
            var active = lesson && lesson.id === l.id;
            var item = UI.button({
              text: (done ? "✓" : l.id) + "  " + l.title + "\n" + l.duration + " · +" + l.xp + " XP",
              accent: done ? "#00ff9d" : "#ff2d78",
              kind: "ghost",
              cls: "lesson-item" + (done ? " done" : "") + (active ? " active" : ""),
              onClick: function () { select(l.id); }
            });
            lessonItems.appendChild(item);
          });
        }

        function select(id) {
          lesson = game.Data.getLesson(id);
          answers = {};
          listSig = "";
          refreshList();
          rebuild();
        }

        function correctCount() {
          var n = 0;
          lesson.quiz.forEach(function (q, i) {
            if (answers[i] === q.answer) n++;
          });
          return n;
        }

        function rebuild() {
          CH.Dom.clear(right);
          if (!lesson) return;

          var box = el("div", { cls: "col", style: { gap: "10px" } });
          box.appendChild(el("div", { cls: "b", style: { "font-size": "17px" }, text: lesson.title }));
          box.appendChild(el("div", { style: { color: "#ff2d78", "font-size": "11px" }, text: lesson.subtitle }));

          lesson.content.forEach(function (block) {
            box.appendChild(el("div", { cls: "lesson-block" },
              el("h4", { text: block.heading }),
              el("div", { style: { color: "#b9c7dd", "font-size": "12px", "white-space": "pre-wrap" }, text: block.text })
            ));
          });

          box.appendChild(buildQuiz());
          right.appendChild(box);
        }

        function buildQuiz() {
          var done = game.isLessonCompleted(lesson.id);
          var correct = correctCount();
          var total = lesson.quiz.length;
          var allAnswered = Object.keys(answers).length >= total;
          var passed = total > 0 && correct === total;

          var quiz = el("div", { cls: "quiz" },
            el("h4", { text: "✎ ПРОВЕРКА ЗНАНИЙ (" + correct + "/" + total + ")" })
          );

          lesson.quiz.forEach(function (q, qi) {
            quiz.appendChild(el("div", { cls: "q", text: (qi + 1) + ". " + q.q }));
            var opts = el("div", { cls: "opts" });
            q.options.forEach(function (opt, oi) {
              var picked = answers[qi] === oi;
              var isRight = oi === q.answer;
              var cls = picked && isRight ? " right" : (picked && !isRight ? " wrong" : "");
              var accent = picked && isRight ? "#00ff9d" : (picked && !isRight ? "#ff2d78" : "#8fa3bd");
              if (picked && isRight) cls = " right";
              var b = UI.button({
                text: opt,
                accent: accent,
                kind: picked ? "solid" : "outline",
                cls: "opt" + cls,
                height: 28,
                disabled: done,
                onClick: function () {
                  answers[qi] = oi;
                  rebuild();
                }
              });
              opts.appendChild(b);
            });
            quiz.appendChild(opts);
            quiz.appendChild(el("div", { style: { height: "8px" } }));
          });

          if (done) {
            quiz.appendChild(el("div", { cls: "b", style: { color: "#00ff9d", "font-size": "12px" }, text: "✓ Урок пройден! +" + lesson.xp + " XP получено" }));
          } else {
            var label = "ОТВЕТЬ НА ВСЕ ВОПРОСЫ";
            if (allAnswered && !passed) label = "ЕСТЬ ОШИБКИ — ПОПРОБУЙ ЕЩЁ";
            else if (allAnswered && passed) label = "ЗАБРАТЬ +" + lesson.xp + " XP";
            quiz.appendChild(UI.button({
              text: label, accent: "#ffe600", kind: "solid", height: 32,
              style: { width: "380px", "max-width": "100%" },
              disabled: !(allAnswered && passed),
              onClick: function () {
                game.completeLesson(lesson.id);
                listSig = "";
                refreshList();
                rebuild();
              }
            }));
          }
          return quiz;
        }

        var onState = function () { refreshList(); };
        game.on("state", onState);
        win.onClose(function () { game.off("state", onState); });

        select(game.Data.lessons.length ? game.Data.lessons[0].id : 1);
      }
    };
  }

  CH.Apps = CH.Apps || {};
  CH.Apps.learn = learnApp;
})(typeof globalThis !== "undefined" ? globalThis : this);
