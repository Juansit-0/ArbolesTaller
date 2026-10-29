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

const NODE_GAP = 150;
const LEVEL_GAP = 110;

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
  node.y = node.depth * LEVEL_GAP + 50;
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

function drawTree() {
  const columns = layout(tree);
  const nodes = flatten(tree);
  const height = Math.max(...nodes.map((n) => n.y)) + 80;
  const root = svg("svg", { width: columns * NODE_GAP + 30, height, role: "img", "aria-label": "Infection tree" });

  nodes.forEach((node) => {
    node.children.forEach((child) => {
      const midY = (node.y + child.y) / 2;
      root.append(svg("path", {
        class: "edge",
        "data-to": child.name,
        d: `M${node.x},${node.y} C${node.x},${midY} ${child.x},${midY} ${child.x},${child.y}`,
      }));
    });
  });

  nodes.forEach((node) => {
    const group = svg("g", {
      class: `node ${node.status}`,
      "data-name": node.name,
      tabindex: 0,
      role: "button",
      "aria-label": `${node.name}, ${node.status}`,
    });
    group.append(svg("circle", { class: "ring", cx: node.x, cy: node.y, r: 17 }));
    group.append(svg("circle", { cx: node.x, cy: node.y, r: node.depth === 0 ? 13 : 10 }));
    const label = svg("text", { x: node.x, y: node.y + 32, "text-anchor": "middle" });
    label.textContent = node.name;
    const meta = svg("text", { class: "meta", x: node.x, y: node.y + 47, "text-anchor": "middle" });
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
      nodeEl(name)?.classList.add("hot");
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
  render(await api("/api/reset", { method: "POST" }));
  notify("Case file restored.");
});

api("/api/state").then(render);
