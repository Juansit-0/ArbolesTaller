const canvas = document.getElementById("canvas");
const metricsBox = document.getElementById("metrics");
const dossier = document.getElementById("dossier");
const sequence = document.getElementById("sequence");
const toast = document.getElementById("toast");
const biterSelect = document.getElementById("biter");
const namesList = document.getElementById("names");

let tree = null;
let selected = null;
let timer = null;
let fresh = null;
let firstDraw = true;

const NODE_GAP = 150;
const LEVEL_GAP = 140;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

function notify(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
}

function flatten(node, list = []) {
  list.push(node);
  node.children.forEach((child) => flatten(child, list));
  return list;
}

function layout(node, state = { x: 0 }) {
  node.y = node.depth * LEVEL_GAP + 60;
  if (!node.children.length) {
    node.x = state.x * NODE_GAP + 90;
    state.x += 1;
  } else {
    node.children.forEach((child) => layout(child, state));
    node.x = (node.children[0].x + node.children[node.children.length - 1].x) / 2;
  }
  return state.x;
}

function svg(tag, attrs) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

const ZOMBIE_DEFS = `
<defs>
  <filter id="grime"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="multiply"/></filter>
  <g id="zombie-body">
    <path class="z-shirt" d="M-17 34 C-16 20 -9 16 0 16 C9 16 16 20 17 34 Z"/>
    <path class="z-tear" d="M-6 24 L-2 30 L-5 34 M7 22 L4 28"/>
    <path class="z-neck" d="M-5 10 L-5 18 L5 18 L5 10 Z"/>
    <path class="z-skin" d="M-15 -6 C-16 -20 -8 -27 1 -27 C11 -27 17 -19 15 -5 C15 2 12 9 6 12 C2 14 -3 14 -7 12 C-13 9 -15 2 -15 -6 Z"/>
    <path class="z-hair" d="M-15 -9 C-16 -22 -6 -29 3 -27 C10 -26 16 -21 15 -10 C11 -17 6 -15 2 -19 C-2 -14 -9 -17 -15 -9 Z"/>
    <path class="z-scar" d="M5 -20 L11 -12 M7 -19 L5 -17 M9 -15 L7 -13"/>
    <path class="z-mouth" d="M-7 6 L-4 4 L-2 7 L1 4 L3 7 L6 4 L8 6"/>
  </g>
</defs>`;

function zombie(node) {
  const place = svg("g", { transform: `translate(${node.x} ${node.y}) scale(${node.depth === 0 ? 1.15 : 0.9})` });
  place.innerHTML = `<g class="zombie"><use href="#zombie-body" filter="url(#grime)"/>
    <g class="z-eyes"><circle class="z-eye" cx="-6" cy="-5" r="3.4"/><circle class="z-eye" cx="6" cy="-6" r="2.6"/></g>
    <path class="z-x" d="M-9 -8 L-3 -2 M-3 -8 L-9 -2 M3 -9 L9 -3 M9 -9 L3 -3"/></g>`;
  return place;
}

function drawTree() {
  const columns = layout(tree);
  const nodes = flatten(tree);
  const height = Math.max(...nodes.map((n) => n.y)) + 90;
  const root = svg("svg", { width: columns * NODE_GAP + 30, height, role: "img", "aria-label": "Infection tree" });
  root.innerHTML = ZOMBIE_DEFS;

  nodes.forEach((node) => {
    node.children.forEach((child) => {
      const midY = (node.y + child.y) / 2;
      root.append(svg("path", {
        class: child.name === fresh ? "edge fresh" : "edge",
        "data-to": child.name,
        pathLength: 1,
        style: `--delay:${child.depth * 140}ms`,
        d: `M${node.x},${node.y + 30} C${node.x},${midY} ${child.x},${midY} ${child.x},${child.y - 26}`,
      }));
    });
  });

  nodes.forEach((node) => {
    const group = svg("g", {
      class: `node ${node.status}${node.name === fresh ? " fresh" : ""}${firstDraw ? " rise" : ""}`,
      "data-name": node.name,
      tabindex: 0,
      role: "button",
      "aria-label": `${node.name}, ${node.status}`,
      style: `--delay:${node.depth * 140 + 80}ms; --sway:${(node.name.length % 5) * 0.37}s; transform-origin:${node.x}px ${node.y + 34}px`,
    });
    group.append(svg("ellipse", { class: "ring", cx: node.x, cy: node.y + 4, rx: 30, ry: 36 }));
    group.append(svg("ellipse", { class: "shadow", cx: node.x, cy: node.y + 36, rx: 20, ry: 4 }));
    group.append(zombie(node));
    const label = svg("text", { x: node.x, y: node.y + 54, "text-anchor": "middle" });
    label.textContent = node.name;
    const meta = svg("text", { class: "meta", x: node.x, y: node.y + 69, "text-anchor": "middle" });
    meta.textContent = node.bitten_at;
    group.append(label, meta);
    group.addEventListener("click", () => select(node.name));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(node.name);
      }
    });
    root.append(group);
  });

  canvas.replaceChildren(root);
  firstDraw = false;
  fresh = null;
}

function drawMetrics(metrics) {
  const items = [
    ["Subjects", metrics.total],
    ["Generations deep", metrics.height],
    ["Still infected", metrics.infected, true],
    ["Cured", metrics.cured],
    ["Eliminated", metrics.eliminated],
    ["Dead ends", metrics.leaves.length],
    [`Bites by ${metrics.top_biter}`, metrics.top_bites],
  ];
  metricsBox.replaceChildren(...items.map(([label, value, alert]) => {
    const item = document.createElement("div");
    item.className = alert ? "metric alert" : "metric";
    item.innerHTML = "<b></b><span></span>";
    item.querySelector("b").textContent = value;
    item.querySelector("span").textContent = label;
    return item;
  }));
}

function fillOptions() {
  const nodes = flatten(tree);
  biterSelect.replaceChildren(...nodes.filter((n) => n.status === "infected").map((n) => new Option(n.name, n.name)));
  namesList.replaceChildren(...nodes.map((n) => new Option(n.name)));
}

function render(data) {
  tree = data.tree;
  drawTree();
  drawMetrics(data.metrics);
  fillOptions();
  if (selected && flatten(tree).some((n) => n.name === selected)) {
    select(selected);
  } else {
    selected = null;
    dossier.innerHTML = '<h2>Dossier</h2><p class="empty">Select a subject on the map or trace a name.</p>';
  }
}

function clearHighlight() {
  clearInterval(timer);
  canvas.querySelectorAll(".hot, .selected").forEach((el) => el.classList.remove("hot", "selected"));
}

function nodeEl(name) {
  return canvas.querySelector(`.node[data-name="${CSS.escape(name)}"]`);
}

async function select(name) {
  try {
    const { chain } = await api(`/api/chain/${encodeURIComponent(name)}`);
    const node = flatten(tree).find((n) => n.name === chain[chain.length - 1]);
    selected = node.name;
    clearHighlight();
    chain.forEach((link, index) => {
      nodeEl(link)?.classList.add("hot");
      if (index > 0) canvas.querySelector(`.edge[data-to="${CSS.escape(link)}"]`)?.classList.add("hot");
    });
    nodeEl(node.name).classList.add("selected");
    drawDossier(node, chain);
  } catch (error) {
    notify(error.message, true);
  }
}

function drawDossier(node, chain) {
  dossier.innerHTML = `
    <h2></h2>
    <dl>
      <dt>Status</dt><dd class="d-status"></dd>
      <dt>Bitten at</dt><dd class="d-place"></dd>
      <dt>When</dt><dd class="d-time"></dd>
      <dt>Generation</dt><dd class="d-depth"></dd>
      <dt>Bitten others</dt><dd class="d-children"></dd>
    </dl>
    <div class="chain" aria-label="Chain to patient zero"></div>
    <div class="actions">
      <button data-status="infected">Mark infected</button>
      <button data-status="cured">Mark cured</button>
      <button data-status="eliminated">Mark eliminated</button>
      <button class="danger" data-remove>Remove branch</button>
    </div>`;
  dossier.querySelector("h2").textContent = node.name;
  dossier.querySelector(".d-status").textContent = node.status;
  dossier.querySelector(".d-place").textContent = node.place;
  dossier.querySelector(".d-time").textContent = node.bitten_at;
  dossier.querySelector(".d-depth").textContent = node.depth === 0 ? "Patient zero" : node.depth;
  dossier.querySelector(".d-children").textContent = node.children.length;
  dossier.querySelector(".chain").replaceChildren(...chain.map((link) => {
    const span = document.createElement("span");
    span.textContent = link;
    return span;
  }));
  dossier.querySelectorAll("[data-status]").forEach((button) => {
    button.disabled = button.dataset.status === node.status;
    button.addEventListener("click", () => changeStatus(node.name, button.dataset.status));
  });
  const removeButton = dossier.querySelector("[data-remove]");
  removeButton.disabled = node.depth === 0;
  removeButton.addEventListener("click", () => removeBranch(node.name));
}

async function changeStatus(name, status) {
  try {
    render(await api("/api/status", { method: "POST", body: JSON.stringify({ name, status }) }));
    notify(`${name} marked ${status}.`);
  } catch (error) {
    notify(error.message, true);
  }
}

async function removeBranch(name) {
  if (!confirm(`Remove ${name} and everyone they infected?`)) return;
  try {
    const data = await api(`/api/zombie/${encodeURIComponent(name)}`, { method: "DELETE" });
    selected = null;
    render(data);
    notify(`Removed ${data.removed.length}: ${data.removed.join(", ")}.`);
  } catch (error) {
    notify(error.message, true);
  }
}

async function runTraversal(kind) {
  try {
    const { order } = await api(`/api/traverse/${kind}`);
    clearHighlight();
    sequence.replaceChildren();
    let step = 0;
    timer = setInterval(() => {
      if (step >= order.length) return clearInterval(timer);
      const name = order[step];
      const el = nodeEl(name);
      el?.classList.add("hot", "pulse");
      el?.addEventListener("animationend", () => el.classList.remove("pulse"), { once: true });
      const item = document.createElement("li");
      item.textContent = name;
      sequence.append(item);
      step += 1;
    }, 380);
  } catch (error) {
    notify(error.message, true);
  }
}

document.querySelectorAll(".traverse button").forEach((button) => {
  button.addEventListener("click", () => runTraversal(button.dataset.kind));
});

document.getElementById("bite-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const body = Object.fromEntries(new FormData(form));
  try {
    selected = body.victim.trim();
    fresh = selected;
    render(await api("/api/bite", { method: "POST", body: JSON.stringify(body) }));
    notify(`${body.biter} bit ${body.victim}.`);
    form.reset();
  } catch (error) {
    selected = null;
    notify(error.message, true);
  }
});

document.getElementById("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  select(new FormData(event.target).get("name").trim());
});

document.getElementById("reset").addEventListener("click", async () => {
  selected = null;
  sequence.replaceChildren();
  firstDraw = true;
  render(await api("/api/reset", { method: "POST" }));
  notify("Case file restored.");
});

api("/api/state").then(render);
