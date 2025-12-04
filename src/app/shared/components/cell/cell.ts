import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-cell',
  imports: [FormsModule, NgClass, NgIf],
  templateUrl: './cell.html',
  styleUrl: './cell.css'
})
export class Cell {
 @Input() value: number = 0;
  @Input() size: number = 9; // Para validar max valor
  @Input() selected = false;
  @Input() valid = true;     // Verde
  @Input() invalid = false;  // Rojo
  @Input() readonly = false;
  
  // Propiedades para bordes y colores (Disjoint visualization)
  @Input() cageColor: string = 'transparent'; 
  @Input() borders: { top: boolean; right: boolean; bottom: boolean; left: boolean } = { top: false, right: false, bottom: false, left: false };

  @Output() valueChange = new EventEmitter<number>();
  @Output() select = new EventEmitter<void>();
  @Output() blur = new EventEmitter<void>();

  onInput(val: number) {
    this.valueChange.emit(val);
  }
}
