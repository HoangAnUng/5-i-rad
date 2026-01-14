const SIZE = 15; // 15x15 board
const boardEl = document.getElementById('board'); // Board container
const statusEl = document.getElementById('status'); // Status text
const aiSelect = document.getElementById('ai-level'); // AI difficulty select
const newBtn = document.getElementById('new-game'); // New game button
const saveBtn = document.getElementById('save-game'); // Save game button
const loadBtn = document.getElementById('load-game'); // Load game button

// 0 empty, 1 black (human), 2 white (AI)
let board = []; 
let current = 1; 
let gameOver = false; // Game over flag

// Scoring constants for evaluating moves
// These values represent the importance of different patterns in the game
const SCORE = {
  FIVE: 100000,       // Five in a row (winning condition)
  OPEN_FOUR: 5000,   // Four in a row with both ends open
  FOUR: 2000,         // Four in a row with one end blocked
  OPEN_THREE: 1500,    // Three in a row with both ends open
  THREE: 150,         // Three in a row with one end blocked
  TWO: 30            // Two in a row
};

// ---------------- Start Game ----------------
init();
function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0)); // Create Board
  current = 1; // Black always starts
  gameOver = false; // Reset game state
  statusEl.textContent = 'Svart börjar'; 
  renderBoard();
}


function renderBoard() {
  boardEl.innerHTML = ''; // Clear previous board
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div'); // Create clickable cell
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.onclick = onCellClick;
      if (board[r][c]) {
        const s = document.createElement('div');
        s.className = 'stone ' + (board[r][c] === 1 ? 'black' : 'white');
        cell.appendChild(s);
      }
      boardEl.appendChild(cell);
    }
  }
}

function onCellClick(e) {
  if (gameOver) return; // Ignore clicks if game over
  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;
  if (board[r][c] !== 0) return;

  playMove(r, c, current);
  if (checkWin(r, c, current)) { // Check if next move wins (both white and black)
    return endGame(current === 1 ? 'Svart vinner!' : 'Vit vinner!'); // Check white or black win
  }

  // SWITCH TURN
  current = current === 1 ? 2 : 1; // Switch player

  // 2-PLAYER MODE (NO AI)
  if (aiSelect.value === 'none') {
    statusEl.textContent = current === 1 ? 'Svarts tur' : 'Vits tur';
    return;
  }

  // AI MODE
  if (current === 2) { 
    statusEl.textContent = 'Vits tur'; // AI turn
    setTimeout(aiMove, 30); // AI move delay
  } else {
    statusEl.textContent = 'Svarts tur'; // Human turn
  }
}


function playMove(r, c, p) { // Place stone on board and update UI
  board[r][c] = p; // Update board state
  const idx = r * SIZE + c; // Calculate index in boardEl
  const stone = document.createElement('div'); // Create stone element
  stone.className = 'stone ' + (p === 1 ? 'black' : 'white');// Set stone color
  boardEl.children[idx].appendChild(stone); // Add stone to cell
}
// ---------------- END GAME ----------------
function endGame(text) {
  gameOver = true; // Lock board state
  statusEl.textContent = text; // Display result
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

// ---------------- WIN CHECK ----------------
function checkWin(r, c, p) {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]]; // Directions: vertical, horizontal, diag1, diag2
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      if (inBounds(r+dr*i, c+dc*i) && board[r+dr*i][c+dc*i] === p) count++;
      else break;
    }
    for (let i = 1; i < 5; i++) {
      if (inBounds(r-dr*i, c-dc*i) && board[r-dr*i][c-dc*i] === p) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

// ---------------- AI MOVE ----------------
function aiMove() {
  if (gameOver) return;
  let move;

  if (aiSelect.value === 'easy') {
    move = Math.random() < 0.45 ? randomMove() : heuristicMove(2, 1);
  } else if (aiSelect.value === 'medium') {
    move = forcedMove(2) || heuristicMove(2, 2);
  } else {
    move = forcedMove(2) || minimaxRoot(2, 4);
  }

  if (!move) move = randomMove();

  playMove(move.r, move.c, 2);
  if (checkWin(move.r, move.c, 2)) return endGame('Vit vinner!');

  current = 1;
  statusEl.textContent = 'Svarts tur';
}

// ---------------- CANDIDATES ----------------
function getCandidates(radius) {
  const set = new Set();
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board[r][c] !== 0)
        for (let dr = -radius; dr <= radius; dr++)
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc) && board[nr][nc] === 0)
              set.add(nr + ',' + nc);
          }
  if (set.size === 0) return [{ r: 7, c: 7 }];
  return [...set].map(s => {
    const [r, c] = s.split(',').map(Number);
    return { r, c };
  });
}

// ---------------- PATTERN EVAL ----------------
function evaluateMove(r, c, p) {
  let score = 0;
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];

  for (const [dr, dc] of dirs) {
    let count = 1;
    let open = 0;

    let i = 1;
    while (inBounds(r+dr*i, c+dc*i) && board[r+dr*i][c+dc*i] === p) { count++; i++; }
    if (inBounds(r+dr*i, c+dc*i) && board[r+dr*i][c+dc*i] === 0) open++;

    i = 1;
    while (inBounds(r-dr*i, c-dc*i) && board[r-dr*i][c-dc*i] === p) { count++; i++; }
    if (inBounds(r-dr*i, c-dc*i) && board[r-dr*i][c-dc*i] === 0) open++;

    if (count >= 5) score += SCORE.FIVE;
    else if (count === 4 && open === 2) score += SCORE.OPEN_FOUR;
    else if (count === 4) score += SCORE.FOUR;
    else if (count === 3 && open === 2) score += SCORE.OPEN_THREE;
    else if (count === 3) score += SCORE.THREE;
    else if (count === 2) score += SCORE.TWO;
  }
  return score;
}

function heuristicMove(p, radius) {
  const o = p === 1 ? 2 : 1;
  let best = null;
  let bestScore = -Infinity;

  for (const { r, c } of getCandidates(radius)) {
    board[r][c] = p;
    let score = evaluateMove(r, c, p);
    board[r][c] = 0;

    board[r][c] = o;
    score += evaluateMove(r, c, o) * 0.9;
    board[r][c] = 0;

    if (score > bestScore) {
      bestScore = score;
      best = { r, c };
    }
  }
  return best;
}


// ---------------- FORCED MOVES ----------------
function forcedMove(p) {
  const o = p === 1 ? 2 : 1;

  //Win immediately
  for (const m of getCandidates(2)) {
    board[m.r][m.c] = p; 
    if (checkWin(m.r, m.c, p)) { // Check if move wins
      board[m.r][m.c] = 0; // Reset cell
      return m; // Return winning move
    }
    board[m.r][m.c] = 0; // Reset cell
  }

  //Block opponent OPEN FOUR
  for (const m of getCandidates(2)) {
    board[m.r][m.c] = o;
    if (checkWin(m.r, m.c, o)) {
      board[m.r][m.c] = 0;
      return m;
    }
    board[m.r][m.c] = 0;
  }


  //Block OPEN THREE (player gets 3 in a open row → Ai next move must block)
  for (const m of getCandidates(2)) {
    board[m.r][m.c] = o;
    const threat = evaluateMove(m.r, m.c, o);
    board[m.r][m.c] = 0;

    if (threat >= SCORE.OPEN_THREE) {
      return m;
    }
  }

  return null;
}

// ---------------- MINIMAX (FAST) ----------------
function minimaxRoot(p, depth) {
  let best = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  const moves = getCandidates(2).slice(0, 10);

  for (const m of moves) {
    board[m.r][m.c] = p;
    const score = minimax(depth - 1, alpha, beta, false, p);
    board[m.r][m.c] = 0;

    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

function minimax(depth, alpha, beta, isMax, p) {
  if (depth === 0) return boardEvalFast(p);

  const player = isMax ? p : (p === 1 ? 2 : 1);
  const moves = getCandidates(2).slice(0, 8);

  if (isMax) {
    let maxEval = -Infinity;
    for (const m of moves) {
      board[m.r][m.c] = player;
      const evalScore = minimax(depth - 1, alpha, beta, false, p);
      board[m.r][m.c] = 0;
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      board[m.r][m.c] = player;
      const evalScore = minimax(depth - 1, alpha, beta, true, p);
      board[m.r][m.c] = 0;
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function boardEvalFast(p) {
  let score = 0;
  for (const { r, c } of getCandidates(2)) {
    board[r][c] = p;
    score += evaluateMove(r, c, p);
    board[r][c] = 0;
  }
  return score;
}

// ---------------- UTILS ----------------
function randomMove() {
  const e = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board[r][c] === 0) e.push({ r, c });
  return e[Math.floor(Math.random() * e.length)];
}

// ---------------- SAVE / LOAD ----------------
saveBtn.onclick = () => {
  localStorage.setItem('gomoku-save', JSON.stringify({ board, current, ai: aiSelect.value }));
  statusEl.textContent = 'Spelet sparat';
};

loadBtn.onclick = () => {
  const d = JSON.parse(localStorage.getItem('gomoku-save'));
  if (!d) return;
  board = d.board;
  current = d.current;
  aiSelect.value = d.ai;
  gameOver = false;
  renderBoard();
  statusEl.textContent = 'Spelet laddat';
};

newBtn.onclick = init;
