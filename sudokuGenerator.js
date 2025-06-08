// sudokuGenerator.js

function isValid(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (
      board[row][x] === num ||
      board[x][col] === num ||
      board[3 * Math.floor(row / 3) + Math.floor(x / 3)]
           [3 * Math.floor(col / 3) + (x % 3)] === num
    ) {
      return false;
    }
  }
  return true;
}

function generateCompleteBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const nums = [...Array(9).keys()].map(i => i + 1);

  function fill(row, col) {
    if (row === 9) return true;
    const nextRow = col === 8 ? row + 1 : row;
    const nextCol = col === 8 ? 0 : col + 1;

    const shuffled = nums.slice().sort(() => Math.random() - 0.5);
    for (const num of shuffled) {
      if (isValid(board, row, col, num)) {
        board[row][col] = num;
        if (fill(nextRow, nextCol)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  fill(0, 0);
  return board;
}

function removeCells(board, count = 30) {
  const puzzle = board.map(row => row.slice());
  let removed = 0;
  while (removed < count) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed++;
    }
  }
  return puzzle;
}

export function generateSudoku() {
  const answer = generateCompleteBoard();
  const puzzle = removeCells(answer, 30);
  return { puzzle, answer };
}
