import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {BoardState, Cage, SolveResponse} from '../shared/models/kenken';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:8000'; // backend en Python/Flask

  constructor(private http: HttpClient) {}

  solve(board: BoardState): Observable<SolveResponse> {
    return this.http.post<SolveResponse>(`${this.baseUrl}/solve`, board);
  }


  validate(board: BoardState): Observable<{ valid: boolean; conflicts: string[] }> {
    return this.http.post<{ valid: boolean; conflicts: string[] }>(
      `${this.baseUrl}/validate`,
      board
    );
  }

  randomCages(size: number): Observable<Cage[]> {
    return this.http.get<Cage[]>(`${this.baseUrl}/random/${size}`);
  }
}
