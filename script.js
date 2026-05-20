const BOARD_SIZE = 7;
const BOARD_MIN_WORD_LENGTH = 4;
const BOARD_MAX_WORD_LENGTH = BOARD_SIZE;
const PREPLACE_WORD_MIN_LENGTH = 4;
const PREPLACE_WORD_MAX_LENGTH = 5;
const MAX_PLACED_WORDS = 4;
const MAX_PLACEMENT_ATTEMPTS = 100;
const BOARD_MIN_WORDS = 5;
const directions = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: -1 }
];

const WORDS_FILE = 'words.txt';
const WORD_LIST = [];
let boardWords = [];

const boardElement = document.getElementById('board');
const suggestionElement = document.getElementById('suggestions');
const statusElement = document.getElementById('status');
const newBoardButton = document.getElementById('newBoard');

let currentBoard = [];
let cellElements = [];
let activePath = [];
let foundWords = new Set();
let pointerDown = false;
let startTime = null;

function randomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters.charAt(Math.floor(Math.random() * letters.length));
}

function getPlaceableWords() {
  return WORD_LIST.filter(
    (word) => word.length >= PREPLACE_WORD_MIN_LENGTH && word.length <= PREPLACE_WORD_MAX_LENGTH
  );
}

function canPlaceWord(grid, word, x, y, dx, dy) {
  for (let i = 0; i < word.length; i += 1) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (!inBounds(nx, ny)) return false;
    const current = grid[ny][nx];
    if (current !== '' && current !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word, x, y, dx, dy) {
  for (let i = 0; i < word.length; i += 1) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    grid[ny][nx] = word[i];
  }
}

function shuffle(array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createBoard() {
  const grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''));
  const candidates = shuffle(getPlaceableWords()).slice(0, MAX_PLACED_WORDS);

  for (const word of candidates) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const x = Math.floor(Math.random() * BOARD_SIZE);
      const y = Math.floor(Math.random() * BOARD_SIZE);
      const maxX = x + direction.dx * (word.length - 1);
      const maxY = y + direction.dy * (word.length - 1);
      if (!inBounds(maxX, maxY)) continue;
      if (canPlaceWord(grid, word, x, y, direction.dx, direction.dy)) {
        placeWord(grid, word, x, y, direction.dx, direction.dy);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // 다음 단어로 넘어갑니다.
    }
  }

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (grid[y][x] === '') {
        grid[y][x] = randomLetter();
      }
    }
  }
  return grid;
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function existsWordAt(grid, word) {
  const target = word.toUpperCase();
  const reversed = [...target].reverse().join('');

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      for (const { dx, dy } of directions) {
        let forward = '';
        let backward = '';

        for (let i = 0; i < target.length; i += 1) {
          const nx = x + dx * i;
          const ny = y + dy * i;
          if (!inBounds(nx, ny)) break;
          forward += grid[ny][nx];
          backward += grid[ny][nx];
        }

        if (forward === target || backward.split('').reverse().join('') === target) {
          return true;
        }
      }
    }
  }
  return false;
}

function parseWordFileText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toUpperCase())
    .filter(
      (line) => /^[A-Z]+$/.test(line) && line.length >= BOARD_MIN_WORD_LENGTH && line.length <= BOARD_MAX_WORD_LENGTH
    );
}

function findableWords(grid) {
  const valid = new Set();
  for (const rawWord of WORD_LIST) {
    const word = rawWord.trim().toUpperCase();
    if (!word) continue;
    if (existsWordAt(grid, word)) {
      valid.add(word);
    }
  }
  return [...valid];
}

async function loadWordList() {
  statusElement.textContent = 'words.txt를 불러오는 중입니다...';
  try {
    const response = await fetch(WORDS_FILE);
    if (!response.ok) {
      throw new Error('words.txt 로드 실패');
    }
    const text = await response.text();
    const words = parseWordFileText(text);
    WORD_LIST.length = 0;
    for (const word of words) {
      WORD_LIST.push(word);
    }
  } catch (error) {
    statusElement.textContent = 'words.txt를 불러올 수 없습니다. 서버로 실행하거나 Live Server를 사용해 주세요.';
    throw error;
  }
}

function ensureBoard() {
  const grid = createBoard();
  const validWords = findableWords(grid);
  currentBoard = grid;
  boardWords = validWords.sort((a, b) => a.length - b.length || a.localeCompare(b));
  updateStatus(boardWords);
  renderBoard();
  updateSuggestions();
}

function updateStatus(validWords) {
  const foundCount = foundWords.size;
  const total = validWords.length;
  if (WORD_LIST.length === 0) {
    statusElement.textContent = 'words.txt를 불러오는 중입니다. 서버를 통해 실행하거나 Live Server를 사용해 주세요.';
    return;
  }
  statusElement.textContent = `목표: 모든 단어 찾기 · 가능한 단어: ${total}개 · 찾은 단어: ${foundCount}개`;
}

function renderBoard() {
  boardElement.innerHTML = '';
  cellElements = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.textContent = currentBoard[y][x];
      cell.addEventListener('pointerdown', handlePointerDown);
      cell.addEventListener('pointerenter', handlePointerEnter);
      cell.addEventListener('pointerleave', handlePointerLeave);
      boardElement.appendChild(cell);
      cellElements.push(cell);
    }
  }
}


function parseCell(element) {
  return {
    x: Number(element.dataset.x),
    y: Number(element.dataset.y)
  };
}

function isAdjacent(last, next) {
  return Math.max(Math.abs(last.x - next.x), Math.abs(last.y - next.y)) === 1;
}

function handlePointerDown(event) {
  event.preventDefault();
  pointerDown = true;
  clearSelection();
  addCellToPath(event.currentTarget);
}

function handlePointerEnter(event) {
  if (!pointerDown) return;
  const target = event.currentTarget;
  if (activePath.includes(target)) return;
  const next = parseCell(target);
  const last = parseCell(activePath[activePath.length - 1]);
  if (!isAdjacent(last, next)) return;
  addCellToPath(target);
}

function handlePointerUp() {
  if (!pointerDown) return;
  pointerDown = false;
  checkSelection();
  clearSelection();
}

function handlePointerLeave(event) {
  if (!pointerDown) return;
  if (event.currentTarget === activePath[activePath.length - 1]) {
    // Keep path while dragging across cells.
    return;
  }
}

function addCellToPath(cell) {
  cell.classList.add('selected');
  activePath.push(cell);
  updateSuggestions();
}

function clearSelection() {
  for (const cell of activePath) {
    cell.classList.remove('selected');
  }
  activePath = [];
  updateSuggestions();
}

function updateSuggestions() {
  const prefix = activePath.map((cell) => cell.textContent).join('').toUpperCase();
  const reversedPrefix = [...prefix].reverse().join('');
  const candidates = [];

  for (const word of boardWords) {
    candidates.push(word);
  }

  if (candidates.length === 0) {
    suggestionElement.innerHTML = '<li>찾을 수 있는 단어가 없습니다.</li>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const lineItem = document.createElement('li');
  lineItem.className = 'suggestion-line';

  candidates.forEach((candidate, index) => {
    const wordNode = document.createElement('span');
    wordNode.className = 'suggestion-word';
    if (foundWords.has(candidate)) {
      wordNode.classList.add('found');
    }

    const matchPrefix =
      prefix && candidate.startsWith(prefix)
        ? prefix
        : prefix && candidate.startsWith(reversedPrefix)
        ? reversedPrefix
        : '';
    const rest = candidate.slice(matchPrefix.length);

    if (matchPrefix) {
      const prefixNode = document.createElement('span');
      prefixNode.className = 'suggestion-highlight';
      prefixNode.textContent = matchPrefix;
      const restNode = document.createTextNode(rest);
      wordNode.appendChild(prefixNode);
      wordNode.appendChild(restNode);
    } else {
      wordNode.textContent = candidate;
    }

    lineItem.appendChild(wordNode);

    if (index < candidates.length - 1) {
      const comma = document.createElement('span');
      comma.textContent = ', ';
      lineItem.appendChild(comma);
    }
  });

  fragment.appendChild(lineItem);
  suggestionElement.innerHTML = '';
  suggestionElement.appendChild(fragment);
}

function checkSelection() {
  if (activePath.length === 0) return;

  const word = activePath.map((cell) => cell.textContent).join('').toUpperCase();
  const reverse = [...word].reverse().join('');
  const match = boardWords.find((item) => item === word || item === reverse);

  if (!match) {
    return;
  }

  if (foundWords.has(match)) {
    return;
  }

  foundWords.add(match);
  for (const cell of activePath) {
    cell.classList.add('found');
  }
  updateStatus(boardWords);
  updateSuggestions();
  maybeCompleteGame();
}

newBoardButton.addEventListener('click', async () => {
  foundWords.clear();
  if (WORD_LIST.length === 0) {
    await loadWordList();
  }
  startTime = Date.now();
  ensureBoard();
});

window.addEventListener('pointerup', handlePointerUp);

function maybeCompleteGame() {
  if (boardWords.length > 0 && foundWords.size === boardWords.length) {
    const durationMs = Date.now() - startTime;
    const totalSeconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const elapsed = `${minutes}분 ${seconds}초`;
    const restart = window.confirm(`축하합니다! 모든 단어를 찾았습니다. 걸린 시간: ${elapsed}. 다시 시작하시겠습니까?`);
    if (restart) {
      foundWords.clear();
      startTime = Date.now();
      ensureBoard();
    }
  }
}

async function startGame() {
  try {
    await loadWordList();
    startTime = Date.now();
    ensureBoard();
  } catch (error) {
    console.error(error);
  }
}

startGame();
