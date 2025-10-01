import { Component } from '@angular/core';
import {BoardState, Cage, SolveResponse} from '../../shared/models/kenken';
import {NgClass, NgIf} from '@angular/common';
import {ApiService} from '../../core/api.service';
import {FormsModule} from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-board',
  imports: [
    NgIf,
    FormsModule,
    NgClass

  ],
  templateUrl: './board.html',
  styleUrl: './board.css'
})
export class Board {
  // --- Estado del tablero ---
  state: BoardState = {
    size: 9,
    values: Array.from({ length: 9 }, () => Array(9).fill(0)),
    cages: [],
    conflicts: new Set<string>()
  };

  solution=null;
  isSelectingGroup = false;

  // --- Selecciones temporales ---
  selected: { r: number; c: number } | null = null;
  selectedGroup: { r: number; c: number }[] = [];

  // --- Props para el modal ---
  showModal = false;
  newOp: '+' | '-' | '×' | '÷' | '=' = '+';
  newTarget: number = 0;

  constructor(private api: ApiService) {}

  // Seleccionar celda individual
  selectCell(r: number, c: number) {
    this.state.selected = { r, c };
  }

  // Alternar celda en grupo
  toggleCellInGroup(r: number, c: number) {
    const idx = this.selectedGroup.findIndex(p => p.r === r && p.c === c);
    if (idx >= 0) {
      this.selectedGroup.splice(idx, 1);
    } else {
      this.selectedGroup.push({ r, c });
    }
  }

  startSelection() {
    this.isSelectingGroup = true;
    this.selectedGroup = [];
  }

  applyRules() {
    if (this.selectedGroup.length > 0) {
      this.showModal = true;
      this.isSelectingGroup = false; // ya no seleccionas más
    }
  }


  isCellInSelectedGroup(r: number, c: number): boolean {
    return this.selectedGroup.some(p => p.r === r && p.c === c);
  }

  // Abrir modal para definir cage
  openCageModal() {
    if (this.selectedGroup.length > 0) {
      this.showModal = true;
    }
  }

  // Guardar cage
  addCage(op: '+' | '-' | '×' | '÷' | '=', target: number) {
    if (this.selectedGroup.length === 0) return;

    const cage: Cage = {
      id: uuidv4(),
      target,
      op, // ahora typescript lo acepta
      cells: [...this.selectedGroup]
    };

    this.state.cages.push(cage);
    this.selectedGroup = [];
    this.showModal = false;
    this.newOp = '+';
    this.newTarget = 0;
  }
  // Cancelar modal
  cancelCage() {
    this.showModal = false;
    this.newOp = '+';
    this.newTarget = 0;
  }

  // Limpiar selección actual
  clearSelection() {
    this.selectedGroup = [];
  }

  // Etiqueta de cage en celda
  getCageLabel(r: number, c: number): Cage | null {
    return this.state.cages.find(cage =>
      cage.cells.some(cell => cell.r === r && cell.c === c)
    ) || null;
  }

  // Random desde backend
  createRandomCages() {
    this.api.randomCages(this.state.size).subscribe((cages) => {
      this.state.cages = cages;
    });
  }

  // Resolver puzzle
  solve() {
    this.api.solve(this.state).subscribe((res) => {
      if (res.solution) {
        this.state.values = res.solution;
      }
    });
  }

  // Validar puzzle
  validate() {
    this.api.validate(this.state).subscribe((res: { valid: boolean; conflicts: string[] }) => {
      this.state.conflicts = new Set(res.conflicts);
    });
  }

  // Encontrar el cage al que pertenece una celda
  findCage(r: number, c: number): Cage | null {
    return this.state.cages.find(cage =>
      cage.cells.some(cell => cell.r === r && cell.c === c)
    ) || null;
  }

// Saber si la celda es la "principal" (arriba-izquierda) del cage
  isCageLabelCell(r: number, c: number): boolean {
    const cage = this.findCage(r, c);
    if (!cage) return false;

    const minCell = cage.cells.reduce((min, p) =>
      p.r < min.r || (p.r === min.r && p.c < min.c) ? p : min
    );
    return minCell.r === r && minCell.c === c;
  }

// Saber si esta celda necesita borde en un lado
  isCageBorder(r: number, c: number, dir: 'top' | 'right' | 'bottom' | 'left'): boolean {
    const cage = this.findCage(r, c);
    if (!cage) return false;

    if (dir === 'top') {
      return r === 0 || !cage.cells.some(p => p.r === r - 1 && p.c === c);
    }
    if (dir === 'bottom') {
      return r === this.state.size - 1 || !cage.cells.some(p => p.r === r + 1 && p.c === c);
    }
    if (dir === 'left') {
      return c === 0 || !cage.cells.some(p => p.r === r && p.c === c - 1);
    }
    if (dir === 'right') {
      return c === this.state.size - 1 || !cage.cells.some(p => p.r === r && p.c === c + 1);
    }
    return false;
  }

// ¿Es frontera entre cages?
  private isBoundaryBetweenCages(r: number, c: number, dir: 'top'|'right'|'bottom'|'left'): boolean {
    const thisCage = this.findCage(r, c);
    if (!thisCage) return false;

    const n = this.state.size;
    let nr = r, nc = c;
    if (dir === 'top') nr = r - 1;
    if (dir === 'bottom') nr = r + 1;
    if (dir === 'left') nc = c - 1;
    if (dir === 'right') nc = c + 1;

    // Si está fuera del tablero, no dibujamos (evita borde externo global)
    if (nr < 0 || nr >= n || nc < 0 || nc >= n) return false;

    const neighborCage = this.findCage(nr, nc);
    // frontera si el vecino no pertenece al mismo cage
    return !neighborCage || neighborCage.id !== thisCage.id;
  }

// Dibuja solo en un lado de la frontera para evitar doble grosor.
// Convención: dibujamos en 'top' y 'left'; para 'right'/'bottom' solo dibujamos si el vecino está fuera (no lo usamos aquí).
  isCageBorderInner(r: number, c: number, dir: 'top'|'right'|'bottom'|'left'): boolean {
    // Solo fronteras internas tablero y entre cages
    if (!this.isBoundaryBetweenCages(r, c, dir)) return false;

    // Evitar duplicado: solo pintamos 'top' y 'left'
    if (dir === 'top') return true;
    if (dir === 'left') return true;

    // No pintamos 'right' ni 'bottom' (el vecino de la derecha/abajo pintará su 'left' o 'top')
    return false;
  }
  validateCell(r: number, c: number) {
    const cage = this.findCage(r, c);
    const val = this.state.values[r][c];

    if (!cage || val === 0) return;

    // valores que ya tiene el grupo
    const currentVals = cage.cells.map(p => this.state.values[p.r][p.c]);

    // validar operación
    let isValid = false;
    switch (cage.op) {
      case '+':
        isValid = currentVals.filter(v => v > 0).reduce((a,b)=>a+b,0) <= cage.target;
        break;
      case '×':
        isValid = currentVals.filter(v => v > 0).reduce((a,b)=>a*b,1) <= cage.target;
        break;
      case '-':
        if (currentVals.every(v => v > 0)) {
          const [a, b] = currentVals;
          isValid = Math.abs(a - b) === cage.target;
        }
        break;
      case '÷':
        if (currentVals.every(v => v > 0)) {
          const [a, b] = currentVals;
          isValid = (a / b === cage.target) || (b / a === cage.target);
        }
        break;
      case '=':
        isValid = val === cage.target;
        break;
    }

    // guardar conflicto
    const key = `${r},${c}`;
    if (!isValid) {
      this.state.conflicts.add(key);
    } else {
      this.state.conflicts.delete(key);
    }
  }

  isCellInvalid(r: number, c: number): boolean {
    return this.state.conflicts.has(`${r},${c}`);
  }

  isCellValid(r: number, c: number): boolean {
    const val = this.state.values[r][c];
    if (val === 0) return false; // vacío no cuenta como válido
    return !this.state.conflicts.has(`${r},${c}`);
  }


}
