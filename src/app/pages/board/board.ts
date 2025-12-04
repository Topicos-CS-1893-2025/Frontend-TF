import { Component } from '@angular/core';
import { NgClass, NgIf, NgFor, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';

import { BoardState, Cage } from '../../shared/models/kenken';
import { ApiService } from '../../core/api.service';
import { Cell } from '../../shared/components/cell/cell';
import { CageLabel } from  '../../shared/components/cage-label/cage-label';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    NgStyle,
    FormsModule,
    Cell,
    CageLabel
  ],
  templateUrl: './board.html',
  styleUrl: './board.css' // Asegúrate que la extensión sea correcta (.css o .scss)
})
export class Board {
  // --- Estado del tablero ---
  state: BoardState = {
    size: 100,
    values: Array.from({ length: 9 }, () => Array(9).fill(0)),
    cages: [],
    conflicts: new Set<string>()
  };

  solution: number[][] | null = null;
  isSelectingGroup = false;

  // --- Selecciones temporales ---
  selectedGroup: { r: number; c: number }[] = [];

  // --- Props para el modal ---
  showModal = false;
  newOp: any = '+'; // Usamos any para facilitar el binding con el select
  newTarget: number = 0;

  constructor(private api: ApiService) {}

  // ==========================================
  //           LÓGICA VISUAL (Colores)
  // ==========================================

  getCageColor(r: number, c: number): string {
    const cages = this.getCages(r, c);
    if (cages.length === 0) return 'transparent';
    
    const id = cages[0].id;
    
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = Math.imul(31, hash) + id.charCodeAt(i) | 0;
    }

    // PALETA VIBRANTE (Tonos medios, tipo Tailwind 300/400)
    // Son más oscuros que los pastel, pero permiten leer el texto negro.
    const palette = [
      '#fca5a5', // Rojo suave
      '#fdba74', // Naranja
      '#fcd34d', // Ámbar/Amarillo fuerte
      '#86efac', // Verde Esmeralda
      '#93c5fd', // Azul Cielo intenso
      '#c4b5fd', // Violeta
      '#f9a8d4', // Rosa fuerte
      '#5eead4', // Teal/Turquesa
      '#d1d5db', // Gris medio
      '#a5b4fc', // Índigo
      '#67e8f9', // Cyan
      '#e2e8f0', // Blanco grisáceo (para descanso visual)
      '#d8b4fe'  // Púrpura
    ];

    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }


  // Calcula bordes inteligentes para grupos disjuntos
  getBorders(r: number, c: number) {
    const myCages = this.getCages(r, c);
    // Si no tiene jaula, no dibujamos bordes internos especiales
    if (myCages.length === 0) return { top: false, right: false, bottom: false, left: false };

    // Función auxiliar: ¿Debo dibujar borde contra el vecino (nr, nc)?
    const checkBorder = (nr: number, nc: number) => {
       // Si es borde del tablero, siempre dibujar
       if (nr < 0 || nc < 0 || nr >= this.state.size || nc >= this.state.size) return true;
       
       const neighborCages = this.getCages(nr, nc);
       
       // Si compartimos AL MENOS UNA jaula, NO hay borde (estamos conectados)
       // Si no compartimos ninguna, SÍ hay borde.
       const shareAnyCage = myCages.some(mc => neighborCages.some(nc => nc.id === mc.id));
       return !shareAnyCage;
    };

    return {
        top: checkBorder(r - 1, c),
        right: checkBorder(r, c + 1),
        bottom: checkBorder(r + 1, c),
        left: checkBorder(r, c - 1)
    };
  }

  // ==========================================
  //        LÓGICA DE DATOS (Multi-Regla)
  // ==========================================

  // Retorna TODAS las jaulas a las que pertenece una celda
  getCages(r: number, c: number): Cage[] {
    return this.state.cages.filter(cage => 
      cage.cells.some(cell => cell.r === r && cell.c === c)
    );
  }

  // Validación matemática completa
  validateCell(r: number, c: number) {
    const val = this.state.values[r][c];
    if (val === 0) return; // Si está vacío, no validamos aún

    const myCages = this.getCages(r, c);
    let cellHasConflict = false;

    // La celda debe cumplir con TODAS sus jaulas asignadas
    for (const cage of myCages) {
        const currentVals = cage.cells.map(p => this.state.values[p.r][p.c]);
        const isFull = currentVals.every(v => v > 0);
        let isValid = false;

        switch (cage.op) {
            case '+':
                // Suma parcial: si ya nos pasamos, es error.
                isValid = currentVals.filter(v => v > 0).reduce((a, b) => a + b, 0) <= cage.target;
                break;
            case '×':
                isValid = currentVals.filter(v => v > 0).reduce((a, b) => a * b, 1) <= cage.target;
                break;
            case '-':
                if (isFull) {
                    const [a, b] = currentVals; // Asumimos 2 celdas para resta
                    isValid = Math.abs(a - b) === cage.target;
                } else { isValid = true; } // Si falta llenar, asumimos válido
                break;
            case '÷':
                if (isFull) {
                    const [a, b] = currentVals;
                    isValid = (a / b === cage.target) || (b / a === cage.target);
                } else { isValid = true; }
                break;
            case '=':
                isValid = val === cage.target;
                break;
            
            // --- NUEVAS OPERACIONES ---
            case 'mod':
                if (isFull && currentVals.length === 2) {
                    const [a, b] = currentVals;
                    isValid = (a % b === cage.target) || (b % a === cage.target);
                } else { isValid = true; }
                break;
            case '^':
                if (isFull && currentVals.length === 2) {
                    const [a, b] = currentVals;
                    isValid = (Math.pow(a, b) === cage.target) || (Math.pow(b, a) === cage.target);
                } else { isValid = true; }
                break;
            case 'range':
                if (isFull) {
                    const max = Math.max(...currentVals);
                    const min = Math.min(...currentVals);
                    isValid = (max - min) === cage.target;
                } else { isValid = true; }
                break;
            case 'sum_sq':
                 const currentSumSq = currentVals.reduce((acc, curr) => acc + (curr * curr), 0);
                 isValid = currentSumSq <= cage.target;
                 break;
        }

        if (!isValid) cellHasConflict = true;
    }

    // Actualizamos el Set de conflictos
    const key = `${r},${c}`;
    if (cellHasConflict) {
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
    return val > 0 && !this.isCellInvalid(r, c);
  }

  // ==========================================
  //           INTERACCIÓN UX
  // ==========================================

  startSelection() {
    this.isSelectingGroup = true;
    this.selectedGroup = [];
  }

  toggleCellInGroup(r: number, c: number) {
    if (!this.isSelectingGroup) return; // Solo selecciona si está en modo selección
    
    const idx = this.selectedGroup.findIndex(p => p.r === r && p.c === c);
    if (idx >= 0) {
      this.selectedGroup.splice(idx, 1);
    } else {
      this.selectedGroup.push({ r, c });
    }
  }

  isCellInSelectedGroup(r: number, c: number): boolean {
    return this.selectedGroup.some(p => p.r === r && p.c === c);
  }

  clearSelection() {
    this.selectedGroup = [];
    this.isSelectingGroup = false;
  }

  applyRules() {
    if (this.selectedGroup.length > 0) {
      this.showModal = true;
      this.isSelectingGroup = false;
    }
  }

  // ==========================================
  //           GESTIÓN DE CAGES (MODAL)
  // ==========================================

  addCage() {
    if (this.selectedGroup.length === 0) return;

    const cage: Cage = {
      id: uuidv4(),
      target: this.newTarget,
      op: this.newOp,
      cells: [...this.selectedGroup]
    };

    this.state.cages.push(cage);
    
    // Limpieza post-guardado
    this.selectedGroup = [];
    this.showModal = false;
    this.newOp = '+';
    this.newTarget = 0;
  }

  cancelCage() {
    this.showModal = false;
    this.newOp = '+';
    this.newTarget = 0;
  }

  // ==========================================
  //              API BACKEND
  // ==========================================

  createRandomCages() {
    console.log("Generando tablero aleatorio...");
    this.api.randomCages(this.state.size).subscribe({
      next: (cages) => {
        // Limpiamos el tablero actual
        this.state.values = Array.from({ length: this.state.size }, () => Array(this.state.size).fill(0));
        this.state.cages = cages;
        this.state.conflicts.clear();
        this.solution = null;
      },
      error: (err) => alert('Error generando: Asegúrate que el backend esté corriendo en puerto 8000')
    });
  }

 solve() {
    this.api.solve(this.state).subscribe({
      next: (res) => {
        if (res.solution) {
          this.state.values = res.solution;
          this.solution = res.solution;
          this.state.conflicts.clear();
        } else {
          alert('No hay solución para esta configuración 😢');
        }
      },
      error: (err) => console.error(err)
    });
  }

  validate() {
    this.api.validate(this.state).subscribe({
      next: (res) => {
        this.state.conflicts = new Set(res.conflicts);
        if (res.valid) {
          alert('¡El tablero parece válido hasta ahora! 🎉');
        } else {
          alert(`Se encontraron ${res.conflicts.length} conflictos.`);
        }
      },
      error: (err) => console.error('Error validando:', err)
    });
  }
}