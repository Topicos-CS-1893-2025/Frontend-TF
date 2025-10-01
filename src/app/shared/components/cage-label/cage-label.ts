import { Component } from '@angular/core';
import { Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-cage-label',
  imports: [],
  templateUrl: './cage-label.html',
  styleUrl: './cage-label.css'
})
export class CageLabel {
  @Input() target!: number;
  @Input() op!: string; // '+', '-', '×', '÷', '='

}
