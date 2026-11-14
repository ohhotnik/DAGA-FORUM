import "./style.css";
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "firebase/auth";
import {
  ref, push, set, onValue, query, orderByChild, limitToLast,
  serverTimestamp
} from "firebase/database";

const app = document.querySelector("#app");
const categories = [
  ["news", "Новости проекта", "Обновления, события и важные объявления"],
  ["complaints", "Жалобы", "Сообщите о проблеме по правилам проекта"],
  ["suggestions", "Предложения", "Идеи по улучшению KARATEL TEST"],
  ["questions", "Вопросы и помощь", "Помощь игрокам и ответы сообщества"],
  ["reports", "Жалобы на игроков", "Обращения к администрации проекта"]
];
let currentUser = null;
let allTopics = {};
let activeCategory = "all";
let unsubscribeTopics = null;

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));

function categoryName(id) {
  return categories.find(c => c[0] === id)?.[1] || "Общее";
}
function dateText(timestamp) {
  if (!timestamp) return "Только что";
  return new Intl.DateTimeFormat("ru-RU", {
    day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit"
  }).format(new Date(timestamp));
}
function notify(message, isError = false) {
  const node = document.querySelector("#notice");
  if (!node) return;
  node.textContent = message;
  node.className = `notice show ${isError ? "error" : ""}`;
  setTimeout(() => node.classList.remove("show"), 3500);
}
function render() {
  const topicEntries = Object.entries(allTopics)
    .map(([id, topic]) => ({ id, ...topic }))
    .filter(topic => activeCategory === "all" || topic.category === activeCategory)
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="KARATEL TEST">
        <span class="brand-mark">K</span>
        <span><b>KARATEL</b><small>TEST FORUM</small></span>
      </a>
      <nav><a href="#forum">Форум</a><a href="#about">О проекте</a></nav>
      <div class="account">
        ${currentUser
          ? `<span class="user-name">${escapeHtml(currentUser.displayName || currentUser.email)}</span>
             <button class="btn btn-outline" id="logoutBtn">Выйти</button>`
          : `<button class="btn btn-outline" id="loginOpen">Войти</button>
             <button class="btn btn-primary" id="registerOpen">Регистрация</button>`}
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span class="live-dot"></span> ИГРОВОЕ СООБЩЕСТВО</div>
          <h1>ФОРУМ <span>KARATEL</span><br/>TEST</h1>
          <p>Общайся, задавай вопросы и предлагай идеи. Здесь начинается жизнь нашего игрового сообщества.</p>
          <a class="btn btn-primary hero-btn" href="#forum">Перейти к разделам <span>↗</span></a>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="art-ring"></div><div class="art-k">K</div><div class="art-caption">COMMUNITY<br/>EST. 2026</div>
        </div>
      </section>

      <section class="stats">
        <div><b>${Object.keys(allTopics).length}</b><span>ОБСУЖДЕНИЙ</span></div>
        <div><b>${Object.keys(allTopics).reduce((n,id) => n + Object.keys(allTopics[id].comments || {}).length, 0)}</b><span>ОТВЕТОВ</span></div>
        <div><b>${currentUser ? "ОНЛАЙН" : "WELCOME"}</b><span>СТАТУС</span></div>
      </section>

      <section class="forum-layout" id="forum">
        <aside class="sidebar">
          <div class="section-heading"><span class="orange-line"></span> РАЗДЕЛЫ ФОРУМА</div>
          <button class="category ${activeCategory === "all" ? "selected" : ""}" data-category="all">
            <span class="cat-icon">▦</span><span><b>Все обсуждения</b><small>Общая лента форума</small></span>
          </button>
          ${categories.map(c => `
            <button class="category ${activeCategory === c[0] ? "selected" : ""}" data-category="${c[0]}">
              <span class="cat-icon">${({news:"✦",complaints:"⚑",suggestions:"✎",questions:"?",reports:"!"})[c[0]]}</span>
              <span><b>${c[1]}</b><small>${c[2]}</small></span>
            </button>`).join("")}
          <div class="sidebar-note"><b>Нужна помощь?</b><p>Создай тему в разделе «Вопросы и помощь».</p></div>
        </aside>

        <section class="topics-panel">
          <div class="panel-head">
            <div><div class="section-heading"><span class="orange-line"></span> СООБЩЕСТВО</div>
              <h2>${activeCategory === "all" ? "Последние обсуждения" : categoryName(activeCategory)}</h2>
            </div>
            <button class="btn btn-primary" id="newTopicBtn">＋ Создать тему</button>
          </div>
          <div class="topic-list">
            ${topicEntries.length ? topicEntries.map(topic => `
              <article class="topic-card">
                <div class="topic-symbol">${categoryName(topic.category).slice(0,1)}</div>
                <div class="topic-main">
                  <div class="topic-meta"><span class="tag">${escapeHtml(categoryName(topic.category))}</span><span>${dateText(topic.createdAt)}</span></div>
                  <button class="topic-title" data-open-topic="${topic.id}">${escapeHtml(topic.title)}</button>
                  <p>${escapeHtml((topic.body || "").slice(0,150))}${(topic.body || "").length > 150 ? "…" : ""}</p>
                  <div class="topic-author">Автор: <b>${escapeHtml(topic.authorName || "Игрок")}</b></div>
                </div>
                <div class="topic-count"><b>${Object.keys(topic.comments || {}).length}</b><small>ответов</small></div>
              </article>`).join("") : `<div class="empty"><div>✦</div><b>Пока нет обсуждений</b><p>Стань первым — создай новую тему!</p></div>`}
          </div>
        </section>
      </section>

      <section class="about" id="about"><span class="orange-line"></span><h2>ОДНО СООБЩЕСТВО — МНОГО ВОЗМОЖНОСТЕЙ</h2><p>KARATEL TEST — форум игрового проекта. Соблюдай правила общения и уважай других участников.</p></section>
    </main>
    <footer><span>© 2026 KARATEL TEST</span><span>НЕОФИЦИАЛЬНЫЙ ФАН-ПРОЕКТ</span></footer>
    <div id="notice" class="notice"></div>
    <div id="modal-root"></div>
  `;

  document.querySelectorAll("[data-category]").forEach(btn => btn.addEventListener("click", () => {
    activeCategory = btn.dataset.category; render();
  }));
  document.querySelectorAll("[data-open-topic]").forEach(btn => btn.addEventListener("click", () => openTopic(btn.dataset.openTopic)));
  document.querySelector("#newTopicBtn").addEventListener("click", openNewTopic);
  document.querySelector("#loginOpen")?.addEventListener("click", () => openAuth("login"));
  document.querySelector("#registerOpen")?.addEventListener("click", () => openAuth("register"));
  document.querySelector("#logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth); notify("Вы вышли из аккаунта.");
  });
}

function showModal(content) {
  const root = document.querySelector("#modal-root");
  root.innerHTML = `<div class="modal-backdrop" id="backdrop"><div class="modal">${content}</div></div>`;
  root.querySelector("#backdrop").addEventListener("click", e => {
    if (e.target.id === "backdrop") root.innerHTML = "";
  });
  root.querySelector("[data-close]")?.addEventListener("click", () => root.innerHTML = "");
}
function openAuth(mode) {
  const register = mode === "register";
  showModal(`
    <button class="modal-close" data-close>×</button>
    <div class="section-heading"><span class="orange-line"></span> АККАУНТ</div>
    <h2>${register ? "Регистрация" : "Вход на форум"}</h2>
    <form id="authForm" class="form">
      ${register ? `<label>Игровое имя<input name="name" required minlength="3" maxlength="24" placeholder="Например, Player_01"></label>` : ""}
      <label>Email<input name="email" type="email" required placeholder="name@example.com"></label>
      <label>Пароль<input name="password" type="password" required minlength="6" placeholder="Минимум 6 символов"></label>
      <button class="btn btn-primary full" type="submit">${register ? "Создать аккаунт" : "Войти"}</button>
    </form>
    <p class="switch-auth">${register ? "Уже есть аккаунт?" : "Нет аккаунта?"} <button id="switchAuth">${register ? "Войти" : "Зарегистрироваться"}</button></p>
  `);
  document.querySelector("#switchAuth").addEventListener("click", () => openAuth(register ? "login" : "register"));
  document.querySelector("#authForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email").trim();
    const password = form.get("password");
    const name = form.get("name")?.trim();
    try {
      if (register) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await set(ref(db, `users/${credential.user.uid}`), {
          displayName: name, email, createdAt: Date.now()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      document.querySelector("#modal-root").innerHTML = "";
      notify(register ? "Аккаунт создан. Добро пожаловать!" : "Вы успешно вошли!");
    } catch (error) {
      notify(authError(error.code), true);
    }
  });
}
function authError(code) {
  const messages = {
    "auth/email-already-in-use":"Этот email уже зарегистрирован.",
    "auth/invalid-email":"Проверь email.",
    "auth/weak-password":"Пароль слишком простой.",
    "auth/invalid-credential":"Неверный email или пароль.",
    "auth/too-many-requests":"Слишком много попыток. Попробуй позже.",
    "auth/network-request-failed":"Проверь подключение к интернету."
  };
  return messages[code] || "Не удалось выполнить действие. Проверь настройки Firebase.";
}
function openNewTopic() {
  if (!currentUser) return openAuth("login");
  showModal(`
    <button class="modal-close" data-close>×</button>
    <div class="section-heading"><span class="orange-line"></span> НОВАЯ ПУБЛИКАЦИЯ</div>
    <h2>Создать тему</h2>
    <form id="topicForm" class="form">
      <label>Раздел<select name="category">${categories.map(c => `<option value="${c[0]}">${c[1]}</option>`).join("")}</select></label>
      <label>Заголовок<input name="title" required minlength="4" maxlength="100" placeholder="О чём хочешь рассказать?"></label>
      <label>Текст публикации<textarea name="body" required minlength="5" maxlength="5000" rows="6" placeholder="Напиши подробности..."></textarea></label>
      <button class="btn btn-primary full" type="submit">Опубликовать тему</button>
    </form>
  `);
  document.querySelector("#topicForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const topicRef = push(ref(db, "topics"));
    try {
      await set(topicRef, {
        category: form.get("category"),
        title: form.get("title").trim(),
        body: form.get("body").trim(),
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email,
        createdAt: Date.now()
      });
      document.querySelector("#modal-root").innerHTML = "";
      activeCategory = "all";
      notify("Тема опубликована!");
    } catch {
      notify("Не удалось опубликовать. Проверь правила Firebase.", true);
    }
  });
}
function openTopic(id) {
  const topic = allTopics[id];
  if (!topic) return;
  const comments = Object.entries(topic.comments || {}).map(([commentId,c]) => ({id:commentId,...c}))
    .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));
  showModal(`
    <button class="modal-close" data-close>×</button>
    <span class="tag">${escapeHtml(categoryName(topic.category))}</span>
    <h2>${escapeHtml(topic.title)}</h2>
    <div class="topic-meta">Автор: ${escapeHtml(topic.authorName || "Игрок")} · ${dateText(topic.createdAt)}</div>
    <p class="topic-body">${escapeHtml(topic.body).replace(/\n/g,"<br>")}</p>
    <div class="section-heading comments-heading"><span class="orange-line"></span> ОТВЕТЫ (${comments.length})</div>
    <div class="comments">${comments.map(c => `<div class="comment"><b>${escapeHtml(c.authorName || "Игрок")}</b><small>${dateText(c.createdAt)}</small><p>${escapeHtml(c.body)}</p></div>`).join("") || "<p class='muted'>Пока никто не ответил.</p>"}</div>
    ${currentUser ? `<form id="commentForm" class="form"><label>Твой ответ<textarea name="body" required maxlength="1500" rows="3" placeholder="Напиши ответ..."></textarea></label><button class="btn btn-primary full">Отправить ответ</button></form>` : `<p class="muted">Войди в аккаунт, чтобы ответить.</p><button class="btn btn-primary" id="commentLogin">Войти</button>`}
  `);
  document.querySelector("#commentLogin")?.addEventListener("click", () => openAuth("login"));
  document.querySelector("#commentForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const body = new FormData(e.currentTarget).get("body").trim();
    try {
      await set(push(ref(db, `topics/${id}/comments`)), {
        body, authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email,
        createdAt: Date.now()
      });
      openTopic(id);
      notify("Ответ добавлен!");
    } catch {
      notify("Не удалось отправить ответ. Проверь правила Firebase.", true);
    }
  });
}

onAuthStateChanged(auth, user => { currentUser = user; render(); });
const topicsQuery = query(ref(db, "topics"), orderByChild("createdAt"), limitToLast(100));
unsubscribeTopics = onValue(topicsQuery, snapshot => {
  allTopics = snapshot.val() || {};
  render();
}, error => {
  render();
  notify("Ошибка загрузки форума: " + error.message, true);
});
