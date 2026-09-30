const config = window.APP_CONFIG ?? {};
const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
const $ = (selector) => document.querySelector(selector);
const state = { client: null, user: null, cards: [], view: "today", allOrder: [], allIndex: 0, revealed: false, lastReviewedId: null };

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
  if (!state.user) return;
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

async function loadCards() {
  if (!state.user) return;
  const userId = state.user.id;
  const rows = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await state.client.from("cards")
      .select("id,phrase,meaning,created_on,created_at,next_review_at,review_step")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(start, start + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) break;
  }
  if (state.user?.id !== userId) return;
  state.cards = rows;
  render();
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
    const query = id
      ? state.client.from("cards").update({ phrase, meaning }).eq("id", id).eq("user_id", state.user.id)
      : state.client.from("cards").insert({ user_id: state.user.id, phrase, meaning, created_on: seoulDate() });
    const { error } = await query;
    if (error) throw error;
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
    const { error } = await state.client.from("cards").delete().eq("id", id).eq("user_id", state.user.id);
    if (error) throw error;
    message("표현을 삭제했어요.");
    await loadCards();
  } catch (error) {
    message(`삭제하지 못했어요. ${error.message}`, true);
  }
}

async function reviewCard(kind) {
  const card = dueCards()[0];
  if (!card) return;
  const steps = [1, 3, 7, 14, 30];
  const nextStep = kind === "familiar" ? Math.min(card.review_step + 1, steps.length) : 0;
  const next = new Date();
  if (kind === "familiar") next.setDate(next.getDate() + steps[nextStep - 1]);
  if (kind === "again") next.setMinutes(next.getMinutes() + 10);
  const nextReviewAt = next.toISOString();
  for (const button of document.querySelectorAll(".review-actions button")) button.disabled = true;
  try {
    const { error } = await state.client.from("cards")
      .update({ review_step: nextStep, next_review_at: nextReviewAt })
      .eq("id", card.id).eq("user_id", state.user.id);
    if (error) throw error;
    card.review_step = nextStep;
    card.next_review_at = nextReviewAt;
    state.lastReviewedId = card.id;
    state.revealed = false;
    render();
  } catch (error) {
    message(`복습 결과를 저장하지 못했어요. ${error.message}`, true);
    render();
  }
}

async function handleSession(session) {
  const user = session?.user ?? null;
  if (state.user?.id === user?.id) return;
  state.user = user;
  state.cards = [];
  state.allOrder = [];
  state.allIndex = 0;
  state.lastReviewedId = null;
  if (!user) { showOnly("auth-view"); return; }
  showOnly("app-view");
  try { await loadCards(); }
  catch (error) { message(`단어장을 불러오지 못했어요. ${error.message}`, true); }
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
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    state.client = createClient(config.supabaseUrl, config.supabasePublishableKey);
    state.view = location.hash.slice(1) || "today";
    state.client.auth.onAuthStateChange((_event, session) => setTimeout(() => handleSession(session), 0));
    const { data, error } = await state.client.auth.getSession();
    if (error) throw error;
    await handleSession(data.session);
    $("#login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = $("#login-form button");
      button.disabled = true;
      $("#auth-message").textContent = "";
      const email = $("#email").value.trim();
      try {
        const { error } = await state.client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        $("#auth-message").textContent = "이메일을 확인해 주세요. 로그인 링크를 보냈어요.";
        $("#auth-message").classList.remove("error");
      } catch (error) {
        $("#auth-message").textContent = `로그인 링크를 보내지 못했어요. ${error.message}`;
        $("#auth-message").classList.add("error");
      } finally {
        button.disabled = false;
      }
    });
    $("#sign-out").addEventListener("click", async () => {
      const { error } = await state.client.auth.signOut();
      if (error) message(`로그아웃하지 못했어요. ${error.message}`, true);
    });
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden && state.user) {
        try { await loadCards(); }
        catch (error) { message(`최신 단어장을 불러오지 못했어요. ${error.message}`, true); }
      }
    });
    setInterval(() => { if (state.user) render(); }, 60_000);
  } catch (error) {
    showOnly("auth-view");
    $("#auth-message").textContent = `연결에 실패했어요. ${error.message}`;
    $("#auth-message").classList.add("error");
  }
}
