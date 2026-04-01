const SIZE = 15;
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const aiSelect = document.getElementById('ai-level');
const newBtn = document.getElementById('new-game');


const winnerPopup = document.getElementById('winner-popup');
const winnerMessage = document.getElementById('winner-message');
const winnerClose = document.getElementById('winner-close');
const winnerPlayAgain = document.getElementById('winner-play-again');

let board = [];
let current = 1;
let gameOver = false;
let winningCells = [];

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

const SCORE = {
  FIVE: 1000000,
  OPEN_FOUR: 100000,
  FOUR: 20000,
  OPEN_THREE: 8000,
  THREE: 1500,
  OPEN_TWO: 400,
  TWO: 80,
  CENTER: 10
};

init();

function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  current = 1;
  gameOver = false;
  winningCells = [];
  statusEl.textContent = 'Svart börjar';
  hideWinnerPopup();
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
    setTimeout(aiMove, 90);
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

function endGame(text) {
  gameOver = true;
  statusEl.textContent = text;
  showWinnerPopup(text);
}

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
  for (const [dr, dc] of DIRECTIONS) {
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

function countStones() {
  let total = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) total++;
    }
  }
  return total;
}

// ---------------- AI ----------------
function aiMove() {
  if (gameOver) return;

  const level = aiSelect.value;
  let move = null;

  if (level === 'easy') {
    move = getEasyMove();
  } else if (level === 'medium') {
    move = getMediumMove();
  } else {
    move = getHardMove();
  }

  if (!move) move = randomMove();
  if (!move) return;

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

function getEasyMove() {
  const winNow = winningMove(2, 2);
  if (winNow) return winNow;

  const candidates = rankCandidates(2, 1, 12, 1.0, 0.25);

  if (candidates.length === 0) return randomMove();

  const poolSize = Math.min(6, candidates.length);
  return candidates[Math.floor(Math.random() * poolSize)].move;
}

function getMediumMove() {
  const winNow = winningMove(2, 2);
  if (winNow) return winNow;

  const blockNow = winningMove(1, 2);
  if (blockNow) return blockNow;

  return bestHeuristicMove(2, 2, 16, 1.15, 1.05);
}

function getHardMove() {
  const stones = countStones();

  const winNow = winningMove(2, 2);
  if (winNow) return winNow;

  const blockNow = winningMove(1, 2);
  if (blockNow) return blockNow;

  
  if (stones <= 2) {
    const opening = openingMove();
    if (opening) return opening;
  }

 
  const depth = stones < 10 ? 5 : 4;
  const width = stones < 14 ? 14 : 12;

  const best = searchBestMove(2, depth, width);
  if (best) return best;

  return bestHeuristicMove(2, 2, 18, 1.25, 1.2);
}

function openingMove() {
  const preferred = [
    { r: 7, c: 7 },
    { r: 7, c: 8 },
    { r: 8, c: 7 },
    { r: 7, c: 6 },
    { r: 6, c: 7 },
    { r: 8, c: 8 },
    { r: 6, c: 6 }
  ];

  for (const move of preferred) {
    if (board[move.r][move.c] === 0) return move;
  }

  return null;
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

function randomMove() {
  const candidates = getCandidates(2);
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function winningMove(p, radius = 2) {
  const moves = getCandidates(radius);

  for (const move of moves) {
    board[move.r][move.c] = p;
    const ok = checkWin(move.r, move.c, p);
    board[move.r][move.c] = 0;
    if (ok) return move;
  }

  return null;
}

function bestHeuristicMove(p, radius = 2, limit = 16, attackWeight = 1.2, defendWeight = 1.1) {
  const ranked = rankCandidates(p, radius, limit, attackWeight, defendWeight);
  return ranked.length ? ranked[0].move : null;
}

function rankCandidates(p, radius = 2, limit = 16, attackWeight = 1.2, defendWeight = 1.1) {
  const o = p === 1 ? 2 : 1;
  const candidates = getCandidates(radius);
  const ranked = [];

  for (const move of candidates) {
    const attack = evaluatePlacedMove(move.r, move.c, p);
    const defend = evaluatePlacedMove(move.r, move.c, o);
    const center = centerBonus(move.r, move.c);

    board[move.r][move.c] = p;
    const myThreats = countImmediateWinsFor(p, 2);
    board[move.r][move.c] = 0;

    board[move.r][move.c] = o;
    const oppThreats = countImmediateWinsFor(o, 2);
    board[move.r][move.c] = 0;

    let score =
      attack * attackWeight +
      defend * defendWeight +
      center +
      myThreats * 50000 +
      oppThreats * 45000;

    if (createsOpenFour(move.r, move.c, p)) score += 120000;
    if (createsOpenThree(move.r, move.c, p)) score += 12000;
    if (createsFork(move.r, move.c, p)) score += 90000;

    ranked.push({ move, score });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}

function searchBestMove(aiPlayer, depth, width) {
  const ranked = rankCandidates(aiPlayer, 2, width, 1.3, 1.25);
  if (!ranked.length) return null;

  let bestMove = ranked[0].move;
  let bestScore = -Infinity;

  for (const item of ranked) {
    const { r, c } = item.move;
    board[r][c] = aiPlayer;

    let score;
    if (checkWin(r, c, aiPlayer)) {
      score = SCORE.FIVE;
    } else {
      score = minimax(depth - 1, false, -Infinity, Infinity, width - 2, 1);
    }

    board[r][c] = 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = item.move;
    }
  }

  return bestMove;
}

function minimax(depth, maximizing, alpha, beta, width, ply) {
  const aiPlayer = 2;
  const humanPlayer = 1;

  if (depth <= 0) {
    return evaluateBoard(aiPlayer) - evaluateBoard(humanPlayer);
  }

  const forcedAi = winningMove(aiPlayer, 2);
  const forcedHuman = winningMove(humanPlayer, 2);

  if (forcedAi) return SCORE.FIVE - ply * 1000;
  if (forcedHuman) return -SCORE.FIVE + ply * 1000;

  const player = maximizing ? aiPlayer : humanPlayer;
  const ranked = rankCandidates(player, 2, Math.max(4, width), 1.25, 1.15);

  if (!ranked.length) {
    return evaluateBoard(aiPlayer) - evaluateBoard(humanPlayer);
  }

  if (maximizing) {
    let best = -Infinity;

    for (const item of ranked) {
      const { r, c } = item.move;
      board[r][c] = aiPlayer;

      let value;
      if (checkWin(r, c, aiPlayer)) {
        value = SCORE.FIVE - ply * 1000;
      } else {
        value = minimax(depth - 1, false, alpha, beta, Math.max(4, width - 1), ply + 1);
      }

      board[r][c] = 0;
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }

    return best;
  } else {
    let best = Infinity;

    for (const item of ranked) {
      const { r, c } = item.move;
      board[r][c] = humanPlayer;

      let value;
      if (checkWin(r, c, humanPlayer)) {
        value = -SCORE.FIVE + ply * 1000;
      } else {
        value = minimax(depth - 1, true, alpha, beta, Math.max(4, width - 1), ply + 1);
      }

      board[r][c] = 0;
      best = Math.min(best, value);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }

    return best;
  }
}

function evaluateBoard(p) {
  let total = 0;
  const candidates = getCandidates(2);

  for (const move of candidates) {
    total += evaluatePlacedMove(move.r, move.c, p) * 0.12;
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === p) {
        total += evaluateStonePosition(r, c, p);
      }
    }
  }

  return total;
}

function evaluateStonePosition(r, c, p) {
  let score = centerBonus(r, c) * 0.4;

  for (const [dr, dc] of DIRECTIONS) {
    const pattern = analyzeDirection(r, c, p, dr, dc);
    score += patternScore(pattern.count, pattern.openEnds);
  }

  return score;
}

function evaluatePlacedMove(r, c, p) {
  if (board[r][c] !== 0) return -Infinity;

  board[r][c] = p;
  let score = 0;

  for (const [dr, dc] of DIRECTIONS) {
    const pattern = analyzeDirection(r, c, p, dr, dc);
    score += patternScore(pattern.count, pattern.openEnds);

    if (pattern.count >= 5) {
      score += SCORE.FIVE;
    }
  }

  if (createsFork(r, c, p)) score += 80000;
  if (createsOpenFour(r, c, p)) score += 100000;
  if (createsOpenThree(r, c, p)) score += 8000;

  score += centerBonus(r, c);

  board[r][c] = 0;
  return score;
}

function analyzeDirection(r, c, p, dr, dc) {
  let count = 1;
  let openEnds = 0;

  let i = 1;
  while (inBounds(r + dr * i, c + dc * i) && board[r + dr * i][c + dc * i] === p) {
    count++;
    i++;
  }
  if (inBounds(r + dr * i, c + dc * i) && board[r + dr * i][c + dc * i] === 0) {
    openEnds++;
  }

  i = 1;
  while (inBounds(r - dr * i, c - dc * i) && board[r - dr * i][c - dc * i] === p) {
    count++;
    i++;
  }
  if (inBounds(r - dr * i, c - dc * i) && board[r - dr * i][c - dc * i] === 0) {
    openEnds++;
  }

  return { count, openEnds };
}

function patternScore(count, openEnds) {
  if (count >= 5) return SCORE.FIVE;
  if (count === 4 && openEnds === 2) return SCORE.OPEN_FOUR;
  if (count === 4 && openEnds === 1) return SCORE.FOUR;
  if (count === 3 && openEnds === 2) return SCORE.OPEN_THREE;
  if (count === 3 && openEnds === 1) return SCORE.THREE;
  if (count === 2 && openEnds === 2) return SCORE.OPEN_TWO;
  if (count === 2 && openEnds === 1) return SCORE.TWO;
  return 0;
}

function centerBonus(r, c) {
  const center = (SIZE - 1) / 2;
  const dist = Math.abs(r - center) + Math.abs(c - center);
  return Math.max(0, SCORE.CENTER - dist);
}

function countImmediateWinsFor(p, radius = 2) {
  let count = 0;
  const moves = getCandidates(radius);

  for (const move of moves) {
    board[move.r][move.c] = p;
    const wins = checkWin(move.r, move.c, p);
    board[move.r][move.c] = 0;
    if (wins) count++;
  }

  return count;
}

function createsOpenFour(r, c, p) {
  if (board[r][c] !== 0) return false;
  board[r][c] = p;

  let found = false;
  for (const [dr, dc] of DIRECTIONS) {
    const pattern = analyzeDirection(r, c, p, dr, dc);
    if (pattern.count === 4 && pattern.openEnds === 2) {
      found = true;
      break;
    }
  }

  board[r][c] = 0;
  return found;
}

function createsOpenThree(r, c, p) {
  if (board[r][c] !== 0) return false;
  board[r][c] = p;

  let found = false;
  for (const [dr, dc] of DIRECTIONS) {
    const pattern = analyzeDirection(r, c, p, dr, dc);
    if (pattern.count === 3 && pattern.openEnds === 2) {
      found = true;
      break;
    }
  }

  board[r][c] = 0;
  return found;
}

function createsFork(r, c, p) {
  if (board[r][c] !== 0) return false;
  board[r][c] = p;

  let strongThreats = 0;

  for (const [dr, dc] of DIRECTIONS) {
    const pattern = analyzeDirection(r, c, p, dr, dc);
    if (
      (pattern.count === 4 && pattern.openEnds >= 1) ||
      (pattern.count === 3 && pattern.openEnds === 2)
    ) {
      strongThreats++;
    }
  }

  board[r][c] = 0;
  return strongThreats >= 2;
}

newBtn.onclick = init;
winnerPlayAgain.onclick = init;
winnerClose.onclick = hideWinnerPopup;