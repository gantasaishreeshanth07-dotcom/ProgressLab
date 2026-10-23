const STORAGE_KEY = "progresslab-workouts-v1";
const XP_STORAGE_KEY = "progresslab-xp-v1";

const RANKS = [
  { name: "Rookie", xp: 0 },
  { name: "Grinder", xp: 250 },
  { name: "Iron Builder", xp: 600 },
  { name: "Athlete", xp: 1200 },
  { name: "Elite", xp: 2500 },
  { name: "Beast Mode", xp: 5000 },
  { name: "Legend", xp: 10000 }
];

function loadXP() {
  try {
    return Math.max(0, Number(localStorage.getItem(XP_STORAGE_KEY)) || 0);
  } catch {
    return 0;
  }
}

let totalXP = loadXP();

function saveXP() {
  localStorage.setItem(XP_STORAGE_KEY, String(totalXP));
}

function renderLevel() {
  const rankIndex = RANKS.reduce(
    (last, rank, index) => totalXP >= rank.xp ? index : last,
    0
  );

  const rank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1];

  $("player-rank").textContent = rank.name;
  $("player-xp").textContent = `${totalXP.toLocaleString()} XP earned`;
  $("player-level").textContent = `LVL ${rankIndex + 1}`;

  if (nextRank) {
    const progress = ((totalXP - rank.xp) / (nextRank.xp - rank.xp)) * 100;
    $("level-progress").style.width = `${Math.min(100, Math.max(0, progress))}%`;
    $("level-next").textContent = `${nextRank.xp - totalXP} XP to ${nextRank.name}`;
  } else {
    $("level-progress").style.width = "100%";
    $("level-next").textContent = "MAX RANK — LEGEND";
  }
}
const $ = (id) => document.getElementById(id);
const form = $("workout-form");
const dateInput = $("workout-date");
const exerciseInput = $("exercise");
const setsInput = $("sets");
const repsInput = $("reps");
const weightInput = $("weight");
const notesInput = $("notes");
const select = $("progress-exercise");
let workouts = loadWorkouts();

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}
dateInput.value = todayISO();

function loadWorkouts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveWorkouts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}
function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function dateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
}
function render() {
  const now = new Date();
  const start = new Date(now);
  const day = (now.getDay() + 6) % 7;
  start.setDate(now.getDate() - day);
  start.setHours(0,0,0,0);
  const thisWeek = workouts.filter(w => new Date(`${w.date}T12:00:00`) >= start).length;
  $("workout-count").textContent = workouts.length;
  $("week-count").textContent = thisWeek;
  $("exercise-count").textContent = new Set(workouts.map(w => w.exercise.toLowerCase())).size;

  const names = [...new Set(workouts.map(w => w.exercise))].sort((a,b)=>a.localeCompare(b));
  const previous = select.value;
  select.innerHTML = names.length
    ? names.map(name => `<option value="${safeText(name)}">${safeText(name)}</option>`).join("")
    : `<option value="">Log an exercise to begin</option>`;
  if (names.includes(previous)) select.value = previous;

  const sorted = [...workouts].sort((a,b)=>b.date.localeCompare(a.date) || b.createdAt-a.createdAt);
  $("history-list").innerHTML = sorted.length ? sorted.map(w => `
    <article class="history-item">
      <div>
        <div class="history-title">${safeText(w.exercise)}</div>
        <div class="history-meta">${dateLabel(w.date)} · ${w.sets} sets × ${w.reps} reps</div>
        ${w.notes ? `<div class="history-notes">${safeText(w.notes)}</div>` : ""}
      </div>
      <div class="history-right">
        <div class="history-weight">${w.weight} <small>kg</small></div>
        <button class="delete-btn" type="button" data-delete="${w.id}" aria-label="Delete ${safeText(w.exercise)} entry">Delete</button>
      </div>
    </article>`).join("") : `<div class="empty-history">No workouts yet. Your first entry will show up here.</div>`;
    renderChart();
  renderLevel();
  renderAchievements();
}
function renderChart() {
  const name = select.value;
  const entries = workouts.filter(w => w.exercise === name).sort((a,b)=>a.date.localeCompare(b.date) || a.createdAt-b.createdAt);
  const wrap = $("chart-wrap");
  if (!entries.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">↗</div><strong>Your progress starts here</strong><p>Log the same exercise over time to see your working weight trend.</p></div>`;
    return;
  }
  const byDate = new Map();
  entries.forEach(w => byDate.set(w.date, Math.max(byDate.get(w.date) ?? 0, Number(w.weight))));
  const points = [...byDate.entries()].map(([date,weight])=>({date,weight})).sort((a,b)=>a.date.localeCompare(b.date)).slice(-8);
  const max = Math.max(1,...points.map(p=>p.weight));
  const min = Math.min(0,...points.map(p=>p.weight));
  const range = max-min || 1;
  const width=500, height=220, left=38, right=14, top=20, bottom=38;
  const plotW=width-left-right, plotH=height-top-bottom;
  const x=i => points.length===1 ? left+plotW/2 : left+i*(plotW/(points.length-1));
  const y=v => top+(max-v)/range*plotH;
  const grid = [0,.5,1].map(frac => {
    const gy=top+plotH*frac, value=max-(max-min)*frac;
    return `<line x1="${left}" y1="${gy}" x2="${width-right}" y2="${gy}" stroke="#2b372e" stroke-dasharray="4 5"/><text x="${left-8}" y="${gy+4}" text-anchor="end" fill="#92a196" font-size="10">${value.toFixed(value%1?1:0)}</text>`;
  }).join("");
  const line=points.map((p,i)=>`${i===0?"M":"L"} ${x(i)} ${y(p.weight)}`).join(" ");
  const dots=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.weight)}" r="4" fill="#b9f56a" stroke="#172017" stroke-width="2"><title>${dateLabel(p.date)}: ${p.weight} kg</title></circle>`).join("");
  const labels=points.map((p,i)=>`<text x="${x(i)}" y="${height-12}" text-anchor="middle" fill="#92a196" font-size="10">${new Date(p.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</text>`).join("");
  wrap.innerHTML = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Logged weight trend for ${safeText(name)}">${grid}<path d="${line}" fill="none" stroke="#b9f56a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const exercise = exerciseInput.value.trim();
  const sets = Number(setsInput.value), reps = Number(repsInput.value), weight = Number(weightInput.value);
  if (!exercise || !dateInput.value || !Number.isFinite(sets) || !Number.isFinite(reps) || !Number.isFinite(weight) || sets<1 || reps<1 || weight<0) {
    $("form-message").textContent = "Please check the workout details and try again.";
    return;
  }
  workouts.push({id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()), date:dateInput.value, exercise, sets, reps, weight, notes:notesInput.value.trim(), createdAt:Date.now()});
  saveWorkouts();
  totalXP += 100;
  saveXP();
  select.value = exercise;
  render();
  $("form-message").textContent = "Workout saved. Keep building your history.";
  notesInput.value = "";
});
$("history-list").addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  workouts = workouts.filter(w => w.id !== button.dataset.delete);
  saveWorkouts();
  render();
});
select.addEventListener("change", renderChart);
$("export-btn").addEventListener("click", () => {
  if (!workouts.length) {
    $("form-message").textContent = "Log at least one workout before exporting.";
    return;
  }
  const header = ["Date","Exercise","Sets","Reps","Weight (kg)","Notes"];
  const rows = workouts.map(w => [w.date,w.exercise,w.sets,w.reps,w.weight,w.notes]);
  const csv = [header,...rows].map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "progresslab-workouts.csv"; a.click();
  URL.revokeObjectURL(url);
});
render();
function renderAchievements() {
  const uniqueExercises = new Set(
    workouts.map(w => w.exercise.trim().toLowerCase())
  ).size;

  const achievements = [
    {
      id: "badge-first-workout",
      unlocked: workouts.length >= 1
    },
    {
      id: "badge-ten-workouts",
      unlocked: workouts.length >= 10
    },
    {
      id: "badge-five-exercises",
      unlocked: uniqueExercises >= 5
    }
  ];

  achievements.forEach(badge => {
    const card = $(badge.id);
    if (!card) return;

    const status = card.querySelector(".achievement-status");
    status.textContent = badge.unlocked ? "Unlocked ✓" : "Locked";
    card.classList.toggle("unlocked", badge.unlocked);
  });
}


const SHOWDOWN_KEY = "progresslab-sunday-showdown-v1";

function setupSundayShowdown() {
  const checkbox = $("showdown-complete");
  const claimButton = $("showdown-claim");
  const message = $("showdown-message");

  if (!checkbox || !claimButton || !message) return;

  const now = new Date();
  const sunday = new Date(now);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(now.getDate() - now.getDay());

  const weekKey = sunday.toISOString().slice(0, 10);
  let claimedWeek = localStorage.getItem(SHOWDOWN_KEY);

  if (claimedWeek === weekKey) {
    checkbox.checked = true;
    checkbox.disabled = true;
    claimButton.disabled = true;
    claimButton.textContent = "XP Already Claimed";
    message.textContent = "You've already claimed this week's reward.";
    return;
  }

  claimButton.addEventListener("click", () => {
    if (!checkbox.checked) {
      message.textContent = "Tick the checkbox after completing the challenge.";
      return;
    }

    claimedWeek = localStorage.getItem(SHOWDOWN_KEY);
    if (claimedWeek === weekKey) {
      message.textContent = "This week's reward has already been claimed.";
      return;
    }

    totalXP += 50;
    saveXP();
    localStorage.setItem(SHOWDOWN_KEY, weekKey);

    checkbox.disabled = true;
    claimButton.disabled = true;
    claimButton.textContent = "XP Claimed ✓";
    message.textContent = "+50 XP earned! Keep showing up.";
    renderLevel();
  });
}

setupSundayShowdown();


// ProgressLab Workout Planner
const PLANNER_KEY = "progresslab-plans-v1";

function loadPlans() {
  try {
    return JSON.parse(localStorage.getItem(PLANNER_KEY) || "[]");
  } catch {
    return [];
  }
}

let workoutPlans = loadPlans();

function renderPlans() {
  const list = document.getElementById("planner-list");
  if (!list) return;

  list.innerHTML = "";

  workoutPlans.forEach((plan, index) => {
    const card = document.createElement("article");
    card.className = "history-item";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = plan.name;

    const muscle = document.createElement("p");
    muscle.textContent = plan.muscle;

    const exercises = document.createElement("p");
    exercises.style.whiteSpace = "pre-line";
    exercises.textContent = plan.exercises;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-btn";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      workoutPlans.splice(index, 1);
      localStorage.setItem(PLANNER_KEY, JSON.stringify(workoutPlans));
      renderPlans();
    });

    details.append(title, muscle, exercises);
    const complete = document.createElement("button");
complete.type = "button";
complete.className = "button";
complete.textContent = plan.completed ? "Completed ✓" : "Complete Workout";
complete.disabled = Boolean(plan.completed);

complete.addEventListener("click", () => {
  if (plan.completed) return;

  plan.completed = true;
  totalXP += 100;
  saveXP();
  localStorage.setItem(PLANNER_KEY, JSON.stringify(workoutPlans));

  renderPlans();
  renderLevel();
});

card.append(details, complete, remove);
    list.append(card);
  });
}

const plannerForm = document.getElementById("planner-form");

if (plannerForm) {
  plannerForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("plan-name").value.trim();
    const muscle = document.getElementById("plan-muscle").value;
    const exercises = document.getElementById("plan-exercises").value.trim();

    if (!name || !muscle || !exercises) return;

    workoutPlans.push({ name, muscle, exercises });
    localStorage.setItem(PLANNER_KEY, JSON.stringify(workoutPlans));

    plannerForm.reset();
    document.getElementById("planner-message").textContent =
      "Workout plan saved successfully!";
    renderPlans();
  });
}

renderPlans();


const DIET_KEY = "progresslab-diet-v1";

function loadMeals() {
  try {
    const meals = JSON.parse(localStorage.getItem(DIET_KEY) || "[]");
    return Array.isArray(meals) ? meals : [];
  } catch {
    return [];
  }
}

let dietMeals = loadMeals();

function renderDiet() {
  const today = new Date().toLocaleDateString("en-CA");
  const meals = dietMeals.filter(meal => meal.date === today);

  const totals = meals.reduce((sum, meal) => {
    sum.calories += meal.calories;
    sum.protein += meal.protein;
    sum.carbs += meal.carbs;
    sum.fats += meal.fats;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  document.getElementById("diet-calories").textContent = totals.calories;
  document.getElementById("diet-protein").textContent = `${totals.protein} g`;
  document.getElementById("diet-carbs").textContent = `${totals.carbs} g`;
  document.getElementById("diet-fats").textContent = `${totals.fats} g`;

  const list = document.getElementById("diet-meal-list");
  list.innerHTML = "";

  if (meals.length === 0) {
    list.textContent = "No meals logged yet.";
    return;
  }

  meals.forEach(meal => {
    const card = document.createElement("article");
    card.className = "history-item";

    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = meal.name;

    const info = document.createElement("p");
    info.textContent =
      `${meal.calories} kcal · P ${meal.protein} g · C ${meal.carbs} g · F ${meal.fats} g`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-btn";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      dietMeals = dietMeals.filter(item => item.id !== meal.id);
      localStorage.setItem(DIET_KEY, JSON.stringify(dietMeals));
      renderDiet();
    });

    details.append(name, info);
    card.append(details, remove);
    list.append(card);
  });
}

const dietForm = document.getElementById("diet-form");

dietForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("meal-name").value.trim();
  const calories = Number(document.getElementById("meal-calories").value);
  const protein = Number(document.getElementById("meal-protein").value);
  const carbs = Number(document.getElementById("meal-carbs").value);
  const fats = Number(document.getElementById("meal-fats").value);

  if (
    !name ||
    ![calories, protein, carbs, fats].every(Number.isFinite) ||
    [calories, protein, carbs, fats].some(value => value < 0)
  ) {
    document.getElementById("diet-message").textContent =
      "Please enter valid food and nutrition values.";
    return;
  }

  dietMeals.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now() + Math.random()),
    date: new Date().toLocaleDateString("en-CA"),
    name,
    calories,
    protein,
    carbs,
    fats
  });

  localStorage.setItem(DIET_KEY, JSON.stringify(dietMeals));
  dietForm.reset();
  document.getElementById("diet-message").textContent = "Meal added!";
  renderDiet();
});

renderDiet();



const BODY_PROGRESS_KEY = "progresslab-body-progress-v1";

function loadBodyProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(BODY_PROGRESS_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let bodyProgress = loadBodyProgress();

function renderBodyProgress() {
  const history = document.getElementById("body-progress-history");
  if (!history) return;

  history.replaceChildren();

  if (bodyProgress.length === 0) {
    history.textContent = "No measurements recorded yet.";
    return;
  }

  [...bodyProgress]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(entry => {
      const card = document.createElement("article");
      card.className = "history-item";

      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${entry.weight} kg · ${entry.date}`;

      const measurements = document.createElement("p");
      measurements.textContent = [
        entry.chest ? `Chest ${entry.chest} cm` : "",
        entry.waist ? `Waist ${entry.waist} cm` : "",
        entry.arms ? `Arms ${entry.arms} cm` : ""
      ].filter(Boolean).join(" · ") || "No extra measurements";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-btn";
      remove.textContent = "Delete";

      remove.addEventListener("click", () => {
        bodyProgress = bodyProgress.filter(item => item.id !== entry.id);
        localStorage.setItem(BODY_PROGRESS_KEY, JSON.stringify(bodyProgress));
        renderBodyProgress();
      });

      details.append(title, measurements);
      card.append(details, remove);
      history.append(card);
    });
}

const bodyProgressForm = document.getElementById("body-progress-form");

if (bodyProgressForm) {
  document.getElementById("body-date").value =
    new Date().getFullYear() + "-" +
    String(new Date().getMonth() + 1).padStart(2, "0") + "-" +
    String(new Date().getDate()).padStart(2, "0");

  bodyProgressForm.addEventListener("submit", event => {
    event.preventDefault();

    const value = id => document.getElementById(id).value;
    const weight = Number(value("body-weight"));
    const date = value("body-date");
    const chest = value("body-chest") ? Number(value("body-chest")) : null;
    const waist = value("body-waist") ? Number(value("body-waist")) : null;
    const arms = value("body-arms") ? Number(value("body-arms")) : null;

    if (
      !date ||
      !Number.isFinite(weight) || weight < 1 || weight > 500 ||
      [chest, waist, arms].some(v => v !== null && (!Number.isFinite(v) || v <= 0))
    ) {
      document.getElementById("body-progress-message").textContent =
        "Please check your entries and try again.";
      return;
    }

    bodyProgress.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date, weight, chest, waist, arms
    });

    localStorage.setItem(BODY_PROGRESS_KEY, JSON.stringify(bodyProgress));
    bodyProgressForm.reset();

    const now = new Date();
    document.getElementById("body-date").value =
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");

    document.getElementById("body-progress-message").textContent =
      "Progress saved successfully!";
    renderBodyProgress();
  });

  renderBodyProgress();
}



const PHOTO_STORAGE_KEY = "progresslab-photos-v1";

function loadProgressPhotos() {
  try {
    const data = JSON.parse(localStorage.getItem(PHOTO_STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let progressPhotos = loadProgressPhotos();

function renderProgressPhotos() {
  const gallery = document.getElementById("progress-photo-gallery");
  if (!gallery) return;

  gallery.replaceChildren();

  if (progressPhotos.length === 0) {
    gallery.textContent = "No progress photos yet. Add your first photo!";
    return;
  }

  [...progressPhotos]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(photo => {
      const card = document.createElement("article");
      card.className = "photo-card";

      const image = document.createElement("img");
      image.src = photo.data;
      image.alt = photo.note || `Progress photo from ${photo.date}`;

image.style.cursor = "zoom-in";
image.title = "Click to view full photo";

image.addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.className = "photo-lightbox";

  const fullImage = document.createElement("img");
  fullImage.src = photo.data;
  fullImage.alt = image.alt;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "photo-lightbox-close";
  closeButton.textContent = "✕";
  closeButton.setAttribute("aria-label", "Close photo");

  closeButton.addEventListener("click", () => overlay.remove());

  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove();
  });

  overlay.append(fullImage, closeButton);
  document.body.append(overlay);
});

      const info = document.createElement("div");
      info.className = "photo-info";

      const date = document.createElement("strong");
      date.textContent = photo.date;

      const note = document.createElement("p");
      note.textContent = photo.note || "Progress update";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-btn";
      remove.textContent = "Delete";

      remove.addEventListener("click", () => {
        progressPhotos = progressPhotos.filter(item => item.id !== photo.id);
        localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(progressPhotos));
        renderProgressPhotos();
      });

      info.append(date, note);
      card.append(image, info, remove);
      gallery.append(card);
    });
}

const progressPhotoForm = document.getElementById("progress-photo-form");

if (progressPhotoForm) {
  const photoDateInput = document.getElementById("progress-photo-date");
  const today = new Date();

  photoDateInput.value = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  progressPhotoForm.addEventListener("submit", event => {
    event.preventDefault();

    const fileInput = document.getElementById("progress-photo");
    const file = fileInput.files[0];
    const message = document.getElementById("progress-photo-message");

    if (!file) {
      message.textContent = "Please choose a photo first.";
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      message.textContent = "Choose a JPG, PNG, or WebP image.";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.textContent = "Choose a photo under 5 MB for local storage.";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const photo = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          date: photoDateInput.value,
          note: document.getElementById("progress-photo-note").value.trim(),
          data: reader.result
        };

        progressPhotos.push(photo);
        localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(progressPhotos));

        progressPhotoForm.reset();
        photoDateInput.value = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0")
        ].join("-");

        message.textContent = "Progress photo saved!";
        renderProgressPhotos();
      } catch {
        message.textContent = "Storage is full. Delete some photos or choose a smaller image.";
      }
    };

    reader.onerror = () => {
      message.textContent = "Could not read that photo. Please try again.";
    };

    reader.readAsDataURL(file);
  });

  renderProgressPhotos();
}




const generatorForm = document.getElementById("generator-form");

const generatorExercises = {
  chest: {
    gym: [
      ["Bench Press", 3, "8–10"],
      ["Incline Dumbbell Press", 3, "10–12"],
      ["Cable Fly", 2, "12–15"],
      ["Push-ups", 2, "As many good reps as possible"]
    ],
    dumbbells: [
      ["Dumbbell Floor Press", 3, "8–12"],
      ["Incline Dumbbell Press", 3, "10–12"],
      ["Dumbbell Fly", 2, "12–15"],
      ["Push-ups", 2, "Controlled reps"]
    ],
    bodyweight: [
      ["Push-ups", 3, "8–15"],
      ["Incline Push-ups", 3, "10–15"],
      ["Knee Push-ups", 2, "10–15"]
    ]
  },
  back: {
    gym: [
      ["Lat Pulldown", 3, "8–12"],
      ["Seated Cable Row", 3, "8–12"],
      ["Chest-Supported Row", 3, "10–12"],
      ["Face Pull", 2, "12–15"]
    ],
    dumbbells: [
      ["One-Arm Dumbbell Row", 3, "10 each side"],
      ["Dumbbell Bent-Over Row", 3, "10–12"],
      ["Dumbbell Reverse Fly", 3, "12–15"]
    ],
    bodyweight: [
      ["Prone Y Raises", 3, "10–12"],
      ["Reverse Snow Angels", 3, "12–15"],
      ["Superman Raises", 2, "10–15"]
    ]
  },
  shoulders: {
    gym: [
      ["Shoulder Press", 3, "8–10"],
      ["Lateral Raise", 3, "12–15"],
      ["Reverse Pec Deck", 3, "12–15"],
      ["Cable Lateral Raise", 2, "12–15"]
    ],
    dumbbells: [
      ["Dumbbell Shoulder Press", 3, "8–12"],
      ["Lateral Raise", 3, "12–15"],
      ["Rear Delt Fly", 3, "12–15"]
    ],
    bodyweight: [
      ["Pike Push-ups", 3, "6–12"],
      ["Wall Slides", 3, "10–15"],
      ["Prone Y Raises", 2, "10–12"]
    ]
  },
  arms: {
    gym: [
      ["EZ-Bar Curl", 3, "8–12"],
      ["Triceps Pushdown", 3, "10–15"],
      ["Hammer Curl", 3, "10–12"],
      ["Overhead Triceps Extension", 2, "10–12"]
    ],
    dumbbells: [
      ["Dumbbell Curl", 3, "10–12"],
      ["Hammer Curl", 3, "10–12"],
      ["Overhead Triceps Extension", 3, "10–12"]
    ],
    bodyweight: [
      ["Close-Grip Push-ups", 3, "6–12"],
      ["Knee Close-Grip Push-ups", 3, "8–12"],
      ["Plank Shoulder Taps", 2, "10 each side"]
    ]
  },
  legs: {
    gym: [
      ["Squat", 3, "8–10"],
      ["Romanian Deadlift", 3, "8–12"],
      ["Leg Press", 3, "10–12"],
      ["Leg Curl", 2, "12–15"],
      ["Calf Raise", 3, "12–15"]
    ],
    dumbbells: [
      ["Goblet Squat", 3, "10–12"],
      ["Dumbbell Romanian Deadlift", 3, "10–12"],
      ["Reverse Lunge", 3, "8 each leg"],
      ["Calf Raise", 3, "15"]
    ],
    bodyweight: [
      ["Bodyweight Squat", 3, "12–15"],
      ["Reverse Lunge", 3, "8 each leg"],
      ["Glute Bridge", 3, "12–15"],
      ["Calf Raise", 3, "15–20"]
    ]
  },
  "full-body": {
    gym: [
      ["Leg Press", 3, "10–12"],
      ["Chest Press", 3, "8–12"],
      ["Lat Pulldown", 3, "8–12"],
      ["Shoulder Press", 2, "10–12"],
      ["Plank", 3, "30 seconds"]
    ],
    dumbbells: [
      ["Goblet Squat", 3, "10–12"],
      ["Dumbbell Floor Press", 3, "8–12"],
      ["One-Arm Dumbbell Row", 3, "10 each side"],
      ["Dumbbell Romanian Deadlift", 3, "10–12"]
    ],
    bodyweight: [
      ["Bodyweight Squat", 3, "12–15"],
      ["Push-ups", 3, "8–12"],
      ["Reverse Lunges", 3, "10 each leg"],
      ["Glute Bridge", 3, "12–15"],
      ["Plank", 3, "30 seconds"]
    ]
  }
};

if (generatorForm) {
  generatorForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const goal = document.getElementById("generator-goal").value;
    const level = document.getElementById("generator-level").value;
    const equipment = document.getElementById("generator-equipment").value;
    const muscle = document.getElementById("generator-muscle").value;
    const duration = Number(document.getElementById("generator-duration").value);

    let exercises = [...generatorExercises[muscle][equipment]];

    if (level === "beginner") {
      exercises = exercises.slice(0, 3).map(([name]) => [name, 2, "8–12"]);
    } else if (level === "intermediate") {
      exercises = exercises.slice(0, 4);
    }

    if (duration <= 20) exercises = exercises.slice(0, 3);
    else if (duration <= 30) exercises = exercises.slice(0, 4);

    const muscleNames = {
      chest: "Chest",
      back: "Back",
      shoulders: "Shoulders",
      arms: "Arms",
      legs: "Legs",
      "full-body": "Full Body"
    };

    const goalNames = {
      muscle: "Muscle Building",
      strength: "Strength",
      "fat-loss": "Fat Loss",
      fitness: "General Fitness"
    };

    const equipmentNames = {
      gym: "Full gym",
      dumbbells: "Dumbbells",
      bodyweight: "Bodyweight"
    };

    const result = document.getElementById("generated-exercises");
    result.replaceChildren();

    exercises.forEach(([name, sets, reps]) => {
      const item = document.createElement("article");
      item.className = "history-item";

      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = name;

      const info = document.createElement("p");
      info.textContent = `${sets} sets × ${reps}`;

      details.append(title, info);
      item.append(details);
      result.append(item);
    });

    window.currentGeneratedWorkout = {
      name: `${muscleNames[muscle]} - ${goalNames[goal]}`,
      muscle: muscleNames[muscle],
      exercises: exercises
        .map(([name, sets, reps]) => `${name} — ${sets} sets × ${reps}`)
        .join("\n")
    };

    document.getElementById("generated-title").textContent =
      window.currentGeneratedWorkout.name;

    document.getElementById("generated-summary").textContent =
      `${level.charAt(0).toUpperCase() + level.slice(1)} · ${duration} minutes · ${equipmentNames[equipment]}`;

    document.getElementById("generated-workout").hidden = false;
    document.getElementById("generator-message").textContent =
      "Your workout is ready!";
  });

  document.getElementById("save-generated-workout").addEventListener("click", function() {
    const workout = window.currentGeneratedWorkout;
    if (!workout) return;

    let plans = [];
    try {
      plans = JSON.parse(localStorage.getItem("progresslab-plans-v1") || "[]");
      if (!Array.isArray(plans)) plans = [];
    } catch {
      plans = [];
    }

    plans.push({ ...workout, completed: false });
    localStorage.setItem("progresslab-plans-v1", JSON.stringify(plans));

    document.getElementById("generator-message").textContent =
      "Workout saved to your Workout Planner!";
  });
}

(() => {
  const select = document.getElementById("active-plan-select");
  const startBtn = document.getElementById("start-workout-btn");
  const finishBtn = document.getElementById("finish-workout-btn");
  const session = document.getElementById("active-workout-session");
  const exerciseList = document.getElementById("active-workout-exercises");
  const title = document.getElementById("active-workout-title");
  const progress = document.getElementById("active-workout-progress");
  const progressBar = document.getElementById("active-workout-progress-bar");
  const message = document.getElementById("active-workout-message");

  if (!select || !startBtn || !finishBtn || !session || !exerciseList) return;

  let plans = [];
  let activeExercises = [];
let workoutStartedAt = null;
let sessionRewardClaimed = false;
  function loadPlans() {
    try {
      plans = JSON.parse(localStorage.getItem("progresslab-plans-v1") || "[]");
      if (!Array.isArray(plans)) plans = [];
    } catch {
      plans = [];
    }

    select.innerHTML = '<option value="">Select a workout plan</option>';

    plans.forEach((plan, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = plan.name || plan.title || `Workout ${index + 1}`;
      select.appendChild(option);
    });

    if (plans.length === 0) {
      message.textContent = "No saved workouts yet. Generate and save a workout first.";
    } else {
      message.textContent = "";
    }
  }

  function updateProgress() {
    const done = exerciseList.querySelectorAll("input:checked").length;
    const total = activeExercises.length;
    progress.textContent = `${done} of ${total} exercises completed`;
    progressBar.style.width = total ? `${done / total * 100}%` : "0%";
  }

  startBtn.addEventListener("click", () => {
    const index = Number(select.value);

    if (select.value === "" || !plans[index]) {
      message.textContent = "Please choose a saved workout first.";
      return;
    }

    const plan = plans[index];
    const raw = plan.exercises;
    activeExercises = Array.isArray(raw)
      ? raw.map(item => typeof item === "string" ? item : item.name || JSON.stringify(item))
      : typeof raw === "string"
        ? raw.split("\n").map(line => line.trim()).filter(Boolean)
        : [];

    if (!activeExercises.length) {
      message.textContent = "This plan has no readable exercise list. Save a generated workout and try again.";
      return;
    }

    title.textContent = plan.name || plan.title || "Your workout";
    exerciseList.replaceChildren();

    activeExercises.forEach((exercise, index) => {
      const label = document.createElement("label");
      label.className = "history-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.addEventListener("change", updateProgress);

      const text = document.createElement("span");
      text.textContent = `${index + 1}. ${exercise}`;

      label.append(checkbox, text);
      exerciseList.appendChild(label);
    });
workoutStartedAt = Date.now();
sessionRewardClaimed = false;
    session.hidden = false;
    message.textContent = "Workout started. Check off each exercise as you finish.";
    updateProgress();
  });

  finishBtn.addEventListener("click", () => {
    const total = activeExercises.length;
    const done = exerciseList.querySelectorAll("input:checked").length;

    if (!total || done < total) {
      message.textContent = `Complete all exercises before finishing (${done}/${total} done).`;
      return;
    }

    
const elapsedSeconds = workoutStartedAt
  ? Math.floor((Date.now() - workoutStartedAt) / 1000)
  : 0;
const minutes = Math.floor(elapsedSeconds / 60);
const durationText = elapsedSeconds < 60
  ? `${elapsedSeconds} sec`
  : `${minutes} min`;
if (!sessionRewardClaimed) {
  totalXP += 50;
  saveXP();
  renderLevel();
  sessionRewardClaimed = true;
  if (typeof window.progressLabRecordWorkout === "function") {
  window.progressLabRecordWorkout();

if (typeof window.progressLabRenderAnalytics === "function") {
  window.progressLabRenderAnalytics();
}

}
  const completionCard = document.getElementById("workout-completion-card");
const completionXP = document.getElementById("completion-xp");
const completionExercises = document.getElementById("completion-exercises");
const completionDuration = document.getElementById("completion-duration");

if (completionCard) {
  completionCard.hidden = false;
  completionXP.textContent = "+50 XP earned ⚡";
  completionExercises.textContent = `${done}/${total}`;
  completionDuration.textContent = durationText;
}
  message.textContent =
    `🏆 Workout completed! +50 XP earned! ${done}/${total} exercises finished. Duration: ${minutes} min. Great work! 💪`;
}
  session.hidden = false;
select.value = "";
activeExercises = [];
const newWorkoutBtn = document.getElementById("new-workout-btn");

if (newWorkoutBtn) {
  newWorkoutBtn.addEventListener("click", () => {
    const completionCard = document.getElementById("workout-completion-card");
    if (completionCard) completionCard.hidden = true;

    session.hidden = false;
    select.value = "";
    exerciseList.replaceChildren();
    message.textContent = "Choose a workout to start your next session.";
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
exerciseList.replaceChildren();
  });

  loadPlans();
})();


(() => {
  const display = document.getElementById("rest-timer-display");
  const start = document.getElementById("rest-timer-start");
  const pause = document.getElementById("rest-timer-pause");
  const reset = document.getElementById("rest-timer-reset");
  const message = document.getElementById("rest-timer-message");

  if (!display || !start || !pause || !reset || !message) return;

  const REST_SECONDS = 90;
  let remaining = REST_SECONDS;
  let interval = null;

  function render() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    display.textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function stopTimer() {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  }

  start.addEventListener("click", () => {
    if (interval !== null) return;

    if (remaining <= 0) remaining = REST_SECONDS;

    message.textContent = "Rest timer running…";

    interval = setInterval(() => {
      remaining--;
      render();

      if (remaining <= 0) {
        stopTimer();
        remaining = 0;
        render();
        message.textContent = "Rest over! Let's go! 💪";
      }
    }, 1000);
  });

  pause.addEventListener("click", () => {
    stopTimer();
    message.textContent = "Timer paused.";
  });

  reset.addEventListener("click", () => {
    stopTimer();
    remaining = REST_SECONDS;
    render();
    message.textContent = "Reset to 90 seconds.";
  });

  render();
})();

(() => {
  const streakEl = document.getElementById("current-streak");
  const weeklyEl = document.getElementById("weekly-workouts");
  const calendarEl = document.getElementById("streak-week-calendar");
  const messageEl = document.getElementById("streak-message");

  if (!streakEl || !weeklyEl || !calendarEl || !messageEl) return;

  const STORAGE_KEY = "progresslab-workout-dates-v1";

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function getDates() {
    try {
      const dates = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(dates) ? [...new Set(dates)] : [];
    } catch {
      return [];
    }
  }

  function renderStreak() {
    const dates = getDates();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completed = new Set(dates);
    const todayKey = dateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let streak = 0;
    const cursor = completed.has(todayKey) ? today : yesterday;

    while (completed.has(dateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const weekStart = new Date(today);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);

    let weeklyCount = 0;
    calendarEl.replaceChildren();

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const key = dateKey(date);
      const done = completed.has(key);

      if (done) weeklyCount++;

      const item = document.createElement("div");
      item.className = `streak-day${done ? " is-complete" : ""}`;

      const name = document.createElement("span");
      name.textContent = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];

      const mark = document.createElement("strong");
      mark.textContent = done ? "✓" : String(date.getDate());

      item.append(name, mark);
      calendarEl.appendChild(item);
    }

    streakEl.textContent = String(streak);
    weeklyEl.textContent = `${weeklyCount}/4`;

    messageEl.textContent = weeklyCount >= 4
      ? "Weekly goal complete! Great consistency! 🏆"
      : `${4 - weeklyCount} more workout${4 - weeklyCount === 3 ? "s" : "s"} to reach your weekly goal.`;

    messageEl.textContent = weeklyCount >= 4
      ? "Weekly goal complete! Great consistency! 🏆"
      : `${4 - weeklyCount} more workout(s) to reach your weekly goal.`;
  }

  window.progressLabRecordWorkout = function () {
    const dates = getDates();
    const todayKey = dateKey(new Date());

    if (!dates.includes(todayKey)) {
      dates.push(todayKey);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
    }

    renderStreak();
  };

  renderStreak();
})();


(() => {
  const weekEl = document.getElementById("analytics-week");
  const totalEl = document.getElementById("analytics-total");
  const chartEl = document.getElementById("analytics-chart");
  const messageEl = document.getElementById("analytics-message");

  if (!weekEl || !totalEl || !chartEl || !messageEl) return;

  const STORAGE_KEY = "progresslab-workout-dates-v1";

  function renderAnalytics() {
    let dates = [];

    try {
      dates = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(dates)) dates = [];
    } catch {
      dates = [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const keys = dates.map(String);
    const completed = new Set(keys);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    let weeklyCount = 0;
    chartEl.replaceChildren();

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const done = completed.has(key);

      if (done) weeklyCount++;

      const column = document.createElement("div");
      column.className = "analytics-bar-column";

      const bar = document.createElement("div");
      bar.className = `analytics-bar${done ? " is-complete" : ""}`;
      bar.style.height = done ? "100%" : "12%";

      const label = document.createElement("span");
      label.textContent = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];

      column.append(bar, label);
      chartEl.appendChild(column);
    }

    weekEl.textContent = String(weeklyCount);
    totalEl.textContent = String(completed.size);
    messageEl.textContent = weeklyCount >= 4
      ? "Weekly goal achieved! Keep it going! 🏆"
      : `${4 - weeklyCount} more workout days to reach your weekly goal.`;
  }

  window.progressLabRenderAnalytics = renderAnalytics;
  renderAnalytics();
})();


/* ProgressLab tab navigation */
(() => {
  const nav = document.getElementById("bottom-nav");
  if (!nav) return;

  const tabs = {
  home: [
    "#home-screen",
    ".level-card",
    ".stats-grid",
    ".streak-panel",
    ".analytics-panel",
    ".achievements-panel",
    ".showdown-panel"
  ],
  train: [
    "#train-screen",
    "#train-history",
    "#train-planner",
    ".generator-panel",
    ".active-workout-panel"
  ],
  diet: [
    "#diet-screen"
  ],
  progress: [
    "#progress-screen",
    "#progress-photos"
  ],
  profile: [
    "#profile-screen",
    ".founder-card",
    ".privacy-note",
    "footer"
  ]
};

  nav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-item[data-tab]");
    if (!button || !nav.contains(button)) return;

    const selectors = tabs[button.dataset.tab];
    if (!selectors) return;

    document.querySelectorAll(".nav-item").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-current", active ? "page" : "false");
    });
   const allScreenSelectors = [
  ...new Set(Object.values(tabs).flat())
];

allScreenSelectors.forEach((selector) => {
  document.querySelectorAll(selector).forEach((section) => {
    section.hidden = true;
  });
});

selectors.forEach((selector) => {
  document.querySelectorAll(selector).forEach((section) => {
    section.hidden = false;
  });
});
  });
})();

