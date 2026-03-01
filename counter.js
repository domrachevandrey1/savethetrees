// ── 1. КОНФИГУРАЦИЯ FIREBASE ─────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCd4FdpGR3ZVJKR809DECXZXlik9nO-NC4",
  authDomain: "savethetrees-f2535.firebaseapp.com",
  projectId: "savethetrees-f2535",
  databaseURL: "https://savethetrees-f2535-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "savethetrees-f2535.firebasestorage.app",
  messagingSenderId: "1092319069738",
  appId: "1:1092319069738:web:b4318dd4c6fd1806562553",
  measurementId: "G-LJ4WBK0G1V"
};

// ── 2. ИНИЦИАЛИЗАЦИЯ ─────────────────────────────────────────
firebase.initializeApp(firebaseConfig);
const db         = firebase.database();
const counterRef = db.ref("trees_total");

// ── 3. СЧЁТЧИК ───────────────────────────────────────────────

function formatNumber(n) {
  return Math.floor(n).toLocaleString("ru-RU");
}

function animateCounter(from, to, duration = 1200) {
  const box = document.querySelector(".counter-box");
  if (!box) return;
  const startTime = performance.now();
  function step(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const value    = from + (to - from) * eased;
    box.textContent = formatNumber(value);
    if (progress < 1) requestAnimationFrame(step);
    else box.textContent = formatNumber(to);
  }
  requestAnimationFrame(step);
}

let previousValue = 0;
counterRef.on("value", (snapshot) => {
  const total = snapshot.val() ?? 0;
  animateCounter(previousValue, total);
  previousValue = total;
});

window.addTrees = function(count) {
  counterRef.transaction((current) => (current ?? 0) + count);
};

// ── 4. ДОСКА ПОЧЁТА ──────────────────────────────────────────

// Данные донатеров — добавляй сюда новых вручную
const donors = [
  {
    name:    "--------",
    comment: "Спасибо за поддержку!",
    trees:   -,
    date:    new Date("2026-02-16T19:45:12"),
    avatar:  "Group 6 (6).png"
  },
];

let currentSort = "new";

// Форматирует дату красиво
function formatDate(date) {
  return date.toLocaleString("ru-RU", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// Создаёт HTML одной карточки
function createCard(donor) {
  return `
    <div class="leader-card">
      <div class="card-left">
        <div class="avatar-box">
          <img src="${donor.avatar}" alt="Аватар">
        </div>
        <div class="info">
          <h3>${donor.name}</h3>
          <p>${donor.comment}</p>
        </div>
      </div>
      <div class="card-right">
        <div class="tree-badge">${donor.trees} деревьев</div>
        <div class="date">${formatDate(donor.date)}</div>
      </div>
    </div>
  `;
}

// Отрисовывает список карточек
function renderLeaderboard(sort) {
  const list = document.querySelector(".leader-list");
  if (!list) return;

  const sorted = [...donors].sort((a, b) => {
    if (sort === "new") return b.date - a.date;   // сначала новые
    if (sort === "top") return b.trees - a.trees; // сначала топ
    return 0;
  });

  list.innerHTML = sorted.map(createCard).join("");
}

// Поиск по имени и комментарию
function filterDonors(query) {
  const list = document.querySelector(".leader-list");
  if (!list) return;

  const q = query.toLowerCase().trim();

  const filtered = q
    ? donors.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.comment.toLowerCase().includes(q)
      )
    : [...donors];

  const sorted = filtered.sort((a, b) =>
    currentSort === "top" ? b.trees - a.trees : b.date - a.date
  );

  list.innerHTML = sorted.length
    ? sorted.map(createCard).join("")
    : "<p style='text-align:center;color:#999;padding:30px'>Ничего не найдено</p>";
}

// ── 5. ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ DOM ──────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Первая отрисовка карточек
  renderLeaderboard(currentSort);

  // Кнопки "Новые" / "Топ"
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.textContent.trim() === "Топ" ? "top" : "new";
      renderLeaderboard(currentSort);
    });
  });

  // Поиск
  const searchInput = document.querySelector(".search-box input");
  searchInput?.addEventListener("input", (e) => {
    filterDonors(e.target.value);
  });

  // Подсветка выбранной кнопки деревьев
  const treeOptions = document.querySelectorAll(".tree-option");
  treeOptions.forEach(btn => {
    btn.addEventListener("click", () => {
      treeOptions.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

});
