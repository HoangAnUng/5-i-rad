const SIZE = 15;
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const aiSelect = document.getElementById('ai-level');
const newBtn = document.getElementById('new-game');


// 👇 POPUP
const winnerPopup = document.getElementById('winner-popup');
const winnerMessage = document.getElementById('winner-message');
const winnerClose = document.getElementById('winner-close');

let board = [];
let current = 1;
let gameOver = false;
let winningCells = [];

// 0 = tom, 1 = svart, 2 = vit
const SCORE = {
  FIVE: 1000000,
  OPEN_FOUR: 100000,
  FOUR: 15000,
  OPEN_THREE: 8000,
  THREE: 1200,
  OPEN_TWO: 300,
  TWO: 80,
  CENTER: 12
};

init();

function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  current = 1;
  gameOver = false;
  winningCells = [];
  statusEl.textContent = 'Svart börjar';

  hideWinnerPopup(); // 👈 reset popup

  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.onclick = onCellClick;

      if (board[r][c]) {
        const piece = document.createElement('div');
        piece.className = 'stone ' + (board[r][c] === 1 ? 'black' : 'white');

        if (winningCells.some(pos => pos.r === r && pos.c === c)) {
          piece.classList.add('win');
        }

        cell.appendChild(piece);
      }

      boardEl.appendChild(cell);
    }
  }
}

function onCellClick(e) {
  if (gameOver) return;
  if (current !== 1 && aiSelect.value !== 'none') return;

  const r = +e.currentTarget.dataset.r;
  const c = +e.currentTarget.dataset.c;

  if (board[r][c] !== 0) return;

  playMove(r, c, current);

  const winLine = getWinningLine(r, c, current);
  if (winLine) {
    winningCells = winLine;
    renderBoard();
    return endGame(current === 1 ? 'Svart vinner!' : 'Vit vinner!');
  }

  current = current === 1 ? 2 : 1;

  if (aiSelect.value === 'none') {
    statusEl.textContent = current === 1 ? 'Svarts tur' : 'Vits tur';
    return;
  }

  if (current === 2) {
    statusEl.textContent = 'Vits tur...';
    setTimeout(aiMove, 80);
  } else {
    statusEl.textContent = 'Svarts tur';
  }
}

function playMove(r, c, p) {
  board[r][c] = p;
  const idx = r * SIZE + c;
  const piece = document.createElement('div');
  piece.className = 'stone ' + (p === 1 ? 'black' : 'white');
  boardEl.children[idx].appendChild(piece);
}

// 👇 MODIFIERAD
function endGame(text) {
  gameOver = true;
  statusEl.textContent = text;
  showWinnerPopup(text); // 👈 popup visas här
}

// 👇 POPUP FUNKTIONER
function showWinnerPopup(text) {
  winnerMessage.textContent = text;
  winnerPopup.classList.remove('hidden');
}

function hideWinnerPopup() {
  winnerPopup.classList.add('hidden');
}

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function getWinningLine(r, c, p) {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];

  for (const [dr, dc] of dirs) {
    const line = [{ r, c }];

    for (let i = 1; i < 5; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (inBounds(nr, nc) && board[nr][nc] === p) line.push({ r: nr, c: nc });
      else break;
    }

    for (let i = 1; i < 5; i++) {
      const nr = r - dr * i;
      const nc = c - dc * i;
      if (inBounds(nr, nc) && board[nr][nc] === p) line.unshift({ r: nr, c: nc });
      else break;
    }

    if (line.length >= 5) return line.slice(0, 5);
  }

  return null;
}

function checkWin(r, c, p) {
  return !!getWinningLine(r, c, p);
}

// ---------------- AI ----------------
function aiMove() {
  if (gameOver) return;

  let move = forcedMove(2) || bestHeuristicMove(2, 2);

  if (!move) move = randomMove();

  playMove(move.r, move.c, 2);

  const winLine = getWinningLine(move.r, move.c, 2);
  if (winLine) {
    winningCells = winLine;
    renderBoard();
    return endGame('Vit vinner!');
  }

  current = 1;
  statusEl.textContent = 'Svarts tur';
}

function getCandidates(radius = 2) {
  const set = new Set();

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) {
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (inBounds(nr, nc) && board[nr][nc] === 0) {
              set.add(nr + ',' + nc);
            }
          }
        }
      }
    }
  }

  if (set.size === 0) return [{ r: 7, c: 7 }];

  return [...set].map(s => {
    const [r, c] = s.split(',').map(Number);
    return { r, c };
  });
}

function evaluateMove(r, c, p) {
  let score = 0;
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];

  for (const [dr, dc] of dirs) {
    let count = 1;
    let open = 0;

    let i = 1;
    while (inBounds(r + dr * i, c + dc * i) && board[r + dr * i][c + dc * i] === p) {
      count++;
      i++;
    }
    if (inBounds(r + dr * i, c + dc * i) && board[r + dr * i][c + dc * i] === 0) open++;

    i = 1;
    while (inBounds(r - dr * i, c - dc * i) && board[r - dr * i][c - dc * i] === p) {
      count++;
      i++;
    }
    if (inBounds(r - dr * i, c - dc * i) && board[r - dr * i][c - dc * i] === 0) open++;

    if (count >= 5) score += SCORE.FIVE;
    else if (count === 4 && open === 2) score += SCORE.OPEN_FOUR;
    else if (count === 3 && open === 2) score += SCORE.OPEN_THREE;
  }

  return score;
}

function bestHeuristicMove(p, radius) {
  const o = p === 1 ? 2 : 1;
  let best = null;
  let bestScore = -Infinity;

  for (const { r, c } of getCandidates(radius)) {
    board[r][c] = p;
    const attack = evaluateMove(r, c, p);
    board[r][c] = 0;

    board[r][c] = o;
    const defend = evaluateMove(r, c, o);
    board[r][c] = 0;

    const score = attack + defend * 1.2;

    if (score > bestScore) {
      bestScore = score;
      best = { r, c };
    }
  }

  return best;
}

function forcedMove(p) {
  const o = p === 1 ? 2 : 1;
  const moves = getCandidates(2);

  for (const m of moves) {
    board[m.r][m.c] = p;
    if (checkWin(m.r, m.c, p)) {
      board[m.r][m.c] = 0;
      return m;
    }
    board[m.r][m.c] = 0;
  }

  for (const m of moves) {
    board[m.r][m.c] = o;
    if (checkWin(m.r, m.c, o)) {
      board[m.r][m.c] = 0;
      return m;
    }
    board[m.r][m.c] = 0;
  }

  return null;
}

function randomMove() {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) empty.push({ r, c });
    }
  }
  return empty[Math.floor(Math.random() * empty.length)];
}



newBtn.onclick = init;
winnerClose.onclick = hideWinnerPopup;