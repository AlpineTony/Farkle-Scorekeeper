const state = {
  players: [],
  activePlayerIndex: 0,
  currentRound: 1,
  gameStarted: false,
};

const STORAGE_KEY = "farkle-scorekeeper-state";

const playerForm = document.querySelector("#player-form");
const playerNameInput = document.querySelector("#player-name");
const playerList = document.querySelector("#player-list");
const startGameButton = document.querySelector("#start-game");
const resetGameButton = document.querySelector("#reset-game");
const scoreForm = document.querySelector("#score-form");
const turnScoreInput = document.querySelector("#turn-score");
const submitScoreButton = document.querySelector("#submit-score");
const activePlayerHeading = document.querySelector("#active-player");
const turnCount = document.querySelector("#turn-count");
const scoreboard = document.querySelector("#scoreboard");
const message = document.querySelector("#message");

function createPlayer(name) {
  return {
    id: window.crypto?.randomUUID?.() ?? `player-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    total: 0,
    turns: 0,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return;
  }

  try {
    const parsedState = JSON.parse(savedState);

    state.players = Array.isArray(parsedState.players) ? parsedState.players : [];
    state.activePlayerIndex = Number.isInteger(parsedState.activePlayerIndex)
      ? Math.max(0, Math.min(parsedState.activePlayerIndex, Math.max(state.players.length - 1, 0)))
      : 0;
    state.currentRound = Number.isInteger(parsedState.currentRound) && parsedState.currentRound > 0
      ? parsedState.currentRound
      : 1;
    state.gameStarted = Boolean(parsedState.gameStarted) && state.players.length >= 2;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function setMessage(text, isSuccess = false) {
  message.textContent = text;
  message.classList.toggle("success", isSuccess);
}

function canStartGame() {
  return state.players.length >= 2;
}

function renderPlayers() {
  playerList.innerHTML = "";

  if (state.players.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No players yet. Add everyone before the first roll.";
    playerList.append(emptyItem);
    startGameButton.disabled = true;
    return;
  }

  state.players.forEach((player) => {
    const item = document.createElement("li");
    item.className = "player-pill";

    const name = document.createElement("span");
    name.textContent = player.name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-player";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removePlayer(player.id));

    item.append(name, removeButton);
    playerList.append(item);
  });

  startGameButton.disabled = !canStartGame();
}

function renderScoreboard() {
  scoreboard.innerHTML = "";

  if (state.players.length === 0) {
    scoreboard.className = "scoreboard empty-state";
    scoreboard.innerHTML = "<p>No scores yet. Add players to get rolling.</p>";
    return;
  }

  scoreboard.className = "scoreboard";

  const rankedPlayers = [...state.players].sort((a, b) => b.total - a.total);

  rankedPlayers.forEach((player) => {
    const row = document.createElement("article");
    row.className = "score-row";

    const isActive = state.gameStarted && state.players[state.activePlayerIndex]?.id === player.id;
    if (isActive) {
      row.classList.add("active");
    }

    const name = document.createElement("div");
    name.className = "score-name";
    name.textContent = player.name;

    const meta = document.createElement("div");
    meta.className = "score-meta";
    meta.textContent = `${player.turns} turn${player.turns === 1 ? "" : "s"}`;

    const total = document.createElement("div");
    total.className = "score-total";
    total.textContent = player.total.toLocaleString();

    row.append(name, meta, total);
    scoreboard.append(row);
  });
}

function renderStatus() {
  if (!state.gameStarted) {
    activePlayerHeading.textContent = canStartGame()
      ? "Ready to start"
      : "Add at least two players to begin";
    turnCount.textContent = "Round 1";
    turnScoreInput.disabled = true;
    submitScoreButton.disabled = true;
    return;
  }

  const currentPlayer = state.players[state.activePlayerIndex];
  activePlayerHeading.textContent = currentPlayer.name;
  turnCount.textContent = `Round ${state.currentRound}`;
  turnScoreInput.disabled = false;
  submitScoreButton.disabled = false;
}

function render() {
  renderPlayers();
  renderScoreboard();
  renderStatus();
  saveState();
}

function addPlayer(name) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    setMessage("Type a player name first.");
    return;
  }

  const alreadyExists = state.players.some(
    (player) => player.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  if (alreadyExists) {
    setMessage("That player name is already on the list.");
    return;
  }

  state.players.push(createPlayer(normalizedName));
  playerNameInput.value = "";
  setMessage(`${normalizedName} added.`, true);
  render();
}

function removePlayer(playerId) {
  const indexToRemove = state.players.findIndex((player) => player.id === playerId);

  if (indexToRemove === -1) {
    return;
  }

  const [removedPlayer] = state.players.splice(indexToRemove, 1);

  if (indexToRemove < state.activePlayerIndex) {
    state.activePlayerIndex -= 1;
  } else if (state.activePlayerIndex >= state.players.length) {
    state.activePlayerIndex = 0;
  }

  if (state.players.length < 2) {
    state.gameStarted = false;
    state.currentRound = 1;
  }

  setMessage(`${removedPlayer.name} removed.`, true);
  render();
}

function startGame() {
  if (!canStartGame()) {
    setMessage("Add at least two players before starting.");
    return;
  }

  state.gameStarted = true;
  state.activePlayerIndex = 0;
  state.currentRound = 1;
  turnScoreInput.value = "";
  setMessage(`${state.players[0].name} is up first.`, true);
  render();
  turnScoreInput.focus();
}

function advanceTurn() {
  const wasLastPlayer = state.activePlayerIndex === state.players.length - 1;
  state.activePlayerIndex = wasLastPlayer ? 0 : state.activePlayerIndex + 1;

  if (wasLastPlayer) {
    state.currentRound += 1;
  }
}

function addScore(scoreValue) {
  if (!state.gameStarted) {
    setMessage("Start the game before adding scores.");
    return;
  }

  const numericScore = Number(scoreValue);

  if (!Number.isFinite(numericScore) || numericScore < 0) {
    setMessage("Enter a valid score of 0 or more.");
    return;
  }

  const currentPlayer = state.players[state.activePlayerIndex];
  currentPlayer.total += numericScore;
  currentPlayer.turns += 1;

  setMessage(
    `${currentPlayer.name} scored ${numericScore.toLocaleString()} points.`,
    true,
  );

  advanceTurn();
  turnScoreInput.value = "";
  render();
  turnScoreInput.focus();
}

function resetGame() {
  state.players = [];
  state.activePlayerIndex = 0;
  state.currentRound = 1;
  state.gameStarted = false;
  playerNameInput.value = "";
  turnScoreInput.value = "";
  setMessage("Game reset. Add players to start again.", true);
  render();
}

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addPlayer(playerNameInput.value);
});

startGameButton.addEventListener("click", startGame);
resetGameButton.addEventListener("click", resetGame);

scoreForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addScore(turnScoreInput.value);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setMessage("Offline mode could not be enabled on this browser.");
    });
  });
}

loadState();
render();
