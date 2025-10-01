export interface Pos {
  r: number;
  c: number;
}

export interface Cage {
  id: string;
  target: number;
  op: '+' | '-' | '×' | '÷' | '=';
  cells: Pos[];
}

export interface BoardState {
  size: number;
  values: number[][];       // 0 = vacío
  cages: Cage[];
  selected?: Pos;
  conflicts: Set<string>;   // "r,c"
}
export interface SolveResponse {
  solution: number[][];
}

