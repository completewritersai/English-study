const config = window.APP_CONFIG ?? {};
const configured = /^[\w.-]+\/[\w.-]+$/.test(config.dataRepo ?? "");
const $ = (selector) => document.querySelector(selector);
const state = { token: null, cards: [], view: "today", allOrder: [], allIndex: 0, revealed: false, lastReviewedId: null };

function showOnly(id) {
  for (const view of ["setup-view", "auth-view", "app-view"]) {
    $(`#${view}`).classList.toggle("hidden", view !== id);
  }
  $("#sign-out").classList.toggle("hidden", id !== "app-view");
}

function message(text, error = false) {
  const element = $("#app-message");
  element.textContent = text;
  element.classList.toggle("error", error);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function dueCards() {
  const now = Date.now();
  return state.cards
    .filter((card) => new Date(card.next_review_at).getTime() <= now)
    .sort((a, b) => {
      if (a.id === state.lastReviewedId) return 1;
      if (b.id === state.lastReviewedId) return -1;
      return new Date(a.next_review_at) - new Date(b.next_review_at);
    });
}

function emptyState(title, description, addButton = false) {
  return `<div class="empty-state"><h3>${title}</h3><p>${description}</p>${addButton ? '<button class="secondary-button" data-action="add" type="button">첫 표현 추가하기</button>' : ""}</div>`;
}

function flashcard(card, kind) {
  if (!card) return "";
  const date = formatDate(card.created_on);
  return `<article class="flashcard" aria-label="${kind === "today" ? "오늘의 복습" : "전체 단어장"} 카드">
    <div class="flashcard-head"><span>${escapeHtml(date)}에 추가</span><span>${kind === "today" ? "영어를 보고 뜻을 떠올려 보세요" : "전체 단어장"}</span></div>
    <h3>${escapeHtml(card.phrase)}</h3>
    ${state.revealed
      ? `<p class="meaning">${escapeHtml(card.meaning)}</p>`
      : '<button class="meaning-button" data-action="reveal" type="button">한국어 뜻 보기 ↓</button>'}
  </article>`;
}

function render() {
  if (!state.token) return;
  $("#total-count").textContent = state.cards.length;
  $("#due-count").textContent = dueCards().length;
  for (const tab of document.querySelectorAll(".tab")) {
    tab.classList.toggle("active", tab.dataset.view === state.view);
  }
  for (const name of ["today", "all", "dates"]) {
    $(`#${name}-view`).classList.toggle("hidden", name !== state.view);
  }
  if (state.view === "today") renderToday();
  if (state.view === "all") renderAll();
  if (state.view === "dates") renderDates();
}

function renderToday() {
  const due = dueCards();
  if (state.cards.length === 0) {
    $("#today-card-area").innerHTML = emptyState("첫 표현을 적어 볼까요?", "자주 듣거나 말하고 싶은 영어 표현 하나면 충분해요.", true);
    return;
  }
  if (due.length === 0) {
    $("#today-card-area").innerHTML = emptyState("오늘 볼 카드를 모두 봤어요", "전체 단어장에서는 언제든 모든 표현을 다시 볼 수 있어요.");
    return;
  }
  $("#today-card-area").innerHTML = `${flashcard(due[0], "today")}
    <div class="review-actions">
      <button class="again-button" data-action="again" type="button">다시 보기</button>
      <button class="familiar-button" data-action="familiar" type="button">익숙해요</button>
    </div>`;
}

function syncAllOrder() {
  const existing = new Set(state.cards.map((card) => card.id));
  state.allOrder = state.allOrder.filter((id) => existing.has(id));
  for (const card of state.cards) {
    if (!state.allOrder.includes(card.id)) state.allOrder.push(card.id);
  }
  state.allIndex = Math.min(state.allIndex, Math.max(0, state.allOrder.length - 1));
}

function renderAll() {
  syncAllOrder();
  const length = state.allOrder.length;
  $("#all-position").textContent = length ? `${state.allIndex + 1} / ${length}` : "0 / 0";
  $("#previous-button").disabled = length < 2;
  $("#next-button").disabled = length < 2;
  $("#shuffle-button").disabled = length < 2;
  if (!length) {
    $("#all-card-area").innerHTML = emptyState("아직 저장된 표현이 없어요", "표현과 한국어 뜻을 직접 적어 단어장을 시작해 보세요.", true);
    return;
  }
  const card = state.cards.find((item) => item.id === state.allOrder[state.allIndex]);
  $("#all-card-area").innerHTML = `${flashcard(card, "all")}
    <div class="card-tools">
      <button class="text-button" data-action="edit" data-id="${card.id}" type="button">수정</button>
      <button class="text-button" data-action="delete" data-id="${card.id}" type="button">삭제</button>
    </div>`;
}

function renderDates() {
  if (state.cards.length === 0) {
    $("#date-list").innerHTML = emptyState("아직 기록이 없어요", "하루에 하나씩 쌓아 보세요.", true);
    return;
  }
  const groups = new Map();
  for (const card of state.cards) {
    if (!groups.has(card.created_on)) groups.set(card.created_on, []);
    groups.get(card.created_on).push(card);
  }
  $("#date-list").innerHTML = [...groups.entries()].map(([date, cards]) => `
    <section class="date-group" aria-label="${escapeHtml(formatDate(date))}">
      <h3 class="date-title">${escapeHtml(formatDate(date))} · ${cards.length}개</h3>
      <div class="date-items">${cards.map((card) => `
        <div class="date-item">
          <div><strong>${escapeHtml(card.phrase)}</strong><span>${escapeHtml(card.meaning)}</span></div>
          <div class="date-item-actions">
            <button class="text-button" data-action="edit" data-id="${card.id}" type="button">수정</button>
            <button class="text-button" data-action="delete" data-id="${card.id}" type="button">삭제</button>
          </div>
        </div>`).join("")}</div>
    </section>`).join("");
}

function setView(view) {
  if (!["today", "all", "dates"].includes(view)) view = "today";
  state.view = view;
  state.revealed = false;
  history.replaceState(null, "", `#${view}`);
  render();
}

function openDialog(card = null) {
  $("#card-form").reset();
  $("#card-id").value = card?.id ?? "";
  $("#phrase").value = card?.phrase ?? "";
  $("#meaning").value = card?.meaning ?? "";
  $("#dialog-title").textContent = card ? "표현 수정" : "표현 추가";
  $("#card-dialog").showModal();
  $("#phrase").focus();
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${state.token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403
      ? "GitHub 토큰과 저장소 권한을 확인해 주세요."
      : response.status === 404 ? "비공개 데이터 저장소를 찾지 못했어요."
      : "GitHub에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    error.status = response.status;
    throw error;
  }
  return data;
}

const contentPath = (path) => `/repos/${config.dataRepo}/contents/${path}`;
const monthPath = (date) => `data/${date.slice(0, 7)}.json`;

function decodeContent(encoded) {
  const binary = atob(encoded.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function encodeContent(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2) + "\n");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function readMonth(path) {
  try {
    const file = await githubRequest(contentPath(path));
    const document = JSON.parse(decodeContent(file.content));
    if (!Array.isArray(document.cards)) throw new Error("단어장 파일 형식이 올바르지 않아요.");
    const cards = document.cards.filter((card) => card
      && typeof card.id === "string" && typeof card.phrase === "string"
      && typeof card.meaning === "string" && /^\d{4}-\d{2}-\d{2}$/.test(card.created_on)
      && !Number.isNaN(Date.parse(card.created_at))
      && !Number.isNaN(Date.parse(card.next_review_at))
      && Number.isInteger(card.review_step) && card.review_step >= 0);
    if (cards.length !== document.cards.length) throw new Error("단어장 파일에 잘못된 카드가 있어요.");
    return { cards, sha: file.sha };
  } catch (error) {
    if (error.status === 404) return { cards: [], sha: null };
    throw error;
  }
}

async function loadCards() {
  if (!state.token) return;
  const token = state.token;
  let files;
  try { files = await githubRequest(contentPath("data")); }
  catch (error) {
    if (error.status !== 404) throw error;
    files = [];
  }
  if (!Array.isArray(files)) throw new Error("단어장 폴더 형식이 올바르지 않아요.");
  const monthFiles = files.filter((file) => /^\d{4}-\d{2}\.json$/.test(file.name));
  const months = await Promise.all(monthFiles.map((file) => readMonth(file.path)));
  if (state.token !== token) return;
  state.cards = months.flatMap((month) => month.cards)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  render();
}

async function changeMonth(path, action) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const file = await readMonth(path);
    const nextCards = action(file.cards.map((card) => ({ ...card })));
    const body = {
      message: `Update expression notebook ${path}`,
      content: encodeContent({ version: 1, cards: nextCards }),
      ...(file.sha ? { sha: file.sha } : {}),
    };
    try {
      await githubRequest(contentPath(path), { method: "PUT", body: JSON.stringify(body) });
      return;
    } catch (error) {
      if (error.status !== 409 || attempt === 2) throw error;
    }
  }
}

async function saveCard(event) {
  event.preventDefault();
  const phrase = $("#phrase").value.trim();
  const meaning = $("#meaning").value.trim();
  const id = $("#card-id").value;
  if (!phrase || !meaning) return;
  const button = $("#card-form button[type=submit]");
  button.disabled = true;
  try {
    const original = id ? state.cards.find((card) => card.id === id) : null;
    if (id && !original) throw new Error("수정할 표현을 찾지 못했어요.");
    const card = original ?? {
      id: crypto.randomUUID(), phrase, meaning, created_on: seoulDate(),
      created_at: new Date().toISOString(), next_review_at: new Date().toISOString(), review_step: 0,
    };
    await changeMonth(monthPath(card.created_on), (cards) => {
      if (!id) return cards.some((item) => item.id === card.id) ? cards : [...cards, card];
      const index = cards.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("다른 기기에서 삭제된 표현이에요. 새로고침해 주세요.");
      cards[index] = { ...cards[index], phrase, meaning };
      return cards;
    });
    $("#card-dialog").close();
    message(id ? "표현을 수정했어요." : "새 표현을 저장했어요.");
    await loadCards();
  } catch (error) {
    message(`저장하지 못했어요. ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
}

async function deleteCard(id) {
  if (!confirm("이 표현을 삭제할까요?")) return;
  try {
    const card = state.cards.find((item) => item.id === id);
    if (!card) throw new Error("삭제할 표현을 찾지 못했어요.");
    await changeMonth(monthPath(card.created_on), (cards) => cards.filter((item) => item.id !== id));
    message("표현을 삭제했어요.");
    await loadCards();
  } catch (error) {
    message(`삭제하지 못했어요. ${error.message}`, true);
  }
}

async function reviewCard(kind) {
  const card = dueCards()[0];
  if (!card) return;
  for (const button of document.querySelectorAll(".review-actions button")) button.disabled = true;
  try {
    await changeMonth(monthPath(card.created_on), (cards) => {
      const current = cards.find((item) => item.id === card.id);
      if (!current) throw new Error("다른 기기에서 삭제된 표현이에요. 새로고침해 주세요.");
      const steps = [1, 3, 7, 14, 30];
      const nextStep = kind === "familiar" ? Math.min(current.review_step + 1, steps.length) : 0;
      const next = new Date();
      if (kind === "familiar") next.setDate(next.getDate() + steps[nextStep - 1]);
      if (kind === "again") next.setMinutes(next.getMinutes() + 10);
      current.review_step = nextStep;
      current.next_review_at = next.toISOString();
      return cards;
    });
    state.lastReviewedId = card.id;
    state.revealed = false;
    await loadCards();
  } catch (error) {
    message(`복습 결과를 저장하지 못했어요. ${error.message}`, true);
    render();
  }
}

async function connect(token, remember) {
  state.token = token;
  try {
    const repo = await githubRequest(`/repos/${config.dataRepo}`);
    if (!repo.private) throw new Error("단어장 데이터 저장소는 비공개로 만들어 주세요.");
    await loadCards();
    if (remember) {
      localStorage.setItem("expression-book-token", token);
      sessionStorage.removeItem("expression-book-token");
    } else {
      sessionStorage.setItem("expression-book-token", token);
      localStorage.removeItem("expression-book-token");
    }
    showOnly("app-view");
    $("#auth-message").textContent = "";
    $("#auth-message").classList.remove("error");
  } catch (error) {
    state.token = null;
    throw error;
  }
}

document.addEventListener("click", async (event) => {
  const tab = event.target.closest(".tab");
  if (tab) { setView(tab.dataset.view); return; }
  const action = event.target.closest("[data-action]");
  if (action) {
    if (action.dataset.action === "add") openDialog();
    if (action.dataset.action === "reveal") { state.revealed = true; render(); }
    if (action.dataset.action === "edit") openDialog(state.cards.find((card) => card.id === action.dataset.id));
    if (action.dataset.action === "delete") await deleteCard(action.dataset.id);
    if (["again", "familiar"].includes(action.dataset.action)) await reviewCard(action.dataset.action);
  }
});

$("#card-form").addEventListener("submit", saveCard);
$("#close-dialog").addEventListener("click", () => $("#card-dialog").close());
$("#previous-button").addEventListener("click", () => { state.allIndex = (state.allIndex - 1 + state.allOrder.length) % state.allOrder.length; state.revealed = false; render(); });
$("#next-button").addEventListener("click", () => { state.allIndex = (state.allIndex + 1) % state.allOrder.length; state.revealed = false; render(); });
$("#shuffle-button").addEventListener("click", () => {
  for (let i = state.allOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.allOrder[i], state.allOrder[j]] = [state.allOrder[j], state.allOrder[i]];
  }
  state.allIndex = 0;
  state.revealed = false;
  render();
});

if (!configured) {
  showOnly("setup-view");
} else {
  state.view = location.hash.slice(1) || "today";
  showOnly("auth-view");
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#login-form button");
    button.disabled = true;
    $("#auth-message").textContent = "";
    try {
      await connect($("#token").value.trim(), $("#remember-token").checked);
      $("#token").value = "";
    } catch (error) {
      $("#auth-message").textContent = `연결하지 못했어요. ${error.message}`;
      $("#auth-message").classList.add("error");
    } finally {
      button.disabled = false;
    }
  });
  $("#sign-out").addEventListener("click", () => {
    state.token = null;
    state.cards = [];
    state.allOrder = [];
    localStorage.removeItem("expression-book-token");
    sessionStorage.removeItem("expression-book-token");
    showOnly("auth-view");
  });
  document.addEventListener("visibilitychange", async () => {
    if (!document.hidden && state.token) {
      try { await loadCards(); }
      catch (error) { message(`최신 단어장을 불러오지 못했어요. ${error.message}`, true); }
    }
  });
  setInterval(() => { if (state.token) render(); }, 60_000);
  const savedToken = localStorage.getItem("expression-book-token") || sessionStorage.getItem("expression-book-token");
  if (savedToken) {
    connect(savedToken, Boolean(localStorage.getItem("expression-book-token"))).catch((error) => {
      localStorage.removeItem("expression-book-token");
      sessionStorage.removeItem("expression-book-token");
      $("#auth-message").textContent = `다시 연결해 주세요. ${error.message}`;
      $("#auth-message").classList.add("error");
    });
  }
}
