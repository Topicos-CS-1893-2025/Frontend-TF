import {Component, EventEmitter, Output,Input} from '@angular/core';

@Component({
  selector: 'app-cell',
  imports: [],
  templateUrl: './cell.html',
  styleUrl: './cell.css'
})
export class Cell {
  @Input() value: number | null = null;
  @Input() selected = false;
  @Input() conflict = false;
  @Input() r!: number;
  @Input() c!: number;
  @Output() select = new EventEmitter<{ r: number; c: number }>();

}
