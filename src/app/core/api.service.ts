import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BoardState, Cage, SolveResponse } from '../shared/models/kenken';

@Injectable({ providedIn: 'root' })
export class ApiService {
  // Asegúrate que esta URL sea correcta (sin la barra al final a veces ayuda)
  private baseUrl = 'https://backend-tf-tj5e.onrender.com'; 

  constructor(private http: HttpClient) {}

  // --- HELPER PARA LIMPIAR DATOS ---
  private preparePayload(board: BoardState) {
    return {
      size: board.size,
      values: board.values,
      // Convertimos el Set a Array para que Python lo entienda
      conflicts: Array.from(board.conflicts || []), 
      cages: board.cages.map(c => ({
        id: c.id,
        target: c.target,
        op: c.op,
        cells: c.cells // Ya son {r, c}, Python lo entenderá con el Schema correcto
      }))
    };
  }

  solve(board: BoardState): Observable<SolveResponse> {
    const payload = this.preparePayload(board);
    return this.http.post<SolveResponse>(`${this.baseUrl}/solve`, payload);
  }

  validate(board: BoardState): Observable<{ valid: boolean; conflicts: string[] }> {
    const payload = this.preparePayload(board);
    return this.http.post<{ valid: boolean; conflicts: string[] }>(
      `${this.baseUrl}/validate`,
      payload
    );
  }

  randomCages(size: number): Observable<Cage[]> {
    return this.http.get<Cage[]>(`${this.baseUrl}/random/${size}`);
  }
}