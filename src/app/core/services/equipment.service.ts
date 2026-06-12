import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EquipmentOption {
  id: number;
  label: string;
  totalQty: number;
  usedCount: number;
  available: number;
}

export interface EquipmentCatalog {
  id: number;
  templateId: number;
  name: string;
  columnKey?: string;
  sourceColumn?: string;
  stockControl: boolean;
  visible: boolean;
  optionsCount: number;
}

export interface EquipmentSelection {
  recordId: number;
  columnKey: string;
  label: string | null;
}

export interface OptionInput {
  label: string;
  quantity?: number | null;
}

export interface ImportEquipmentRequest {
  name: string;
  columnKey?: string | null;
  sourceColumn?: string;
  stockControl: boolean;
  visible: boolean;
  options: OptionInput[];
}

// Estrutura paginada do Spring Data (subset usado pelo autocomplete)
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class EquipmentService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  importCatalog(templateId: number, req: ImportEquipmentRequest): Observable<EquipmentCatalog> {
    return this.http.post<EquipmentCatalog>(`${this.api}/equipment/template/${templateId}/import`, req);
  }

  listCatalogs(templateId: number): Observable<EquipmentCatalog[]> {
    return this.http.get<EquipmentCatalog[]>(`${this.api}/equipment/template/${templateId}/catalogs`);
  }

  // Busca paginada para o autocomplete (server-side: nunca traz tudo de uma vez)
  searchOptions(
    catalogId: number,
    q: string,
    onlyAvailable: boolean,
    page: number,
    size: number,
  ): Observable<SpringPage<EquipmentOption>> {
    const params = new HttpParams()
      .set('q', q ?? '')
      .set('onlyAvailable', String(onlyAvailable))
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<SpringPage<EquipmentOption>>(
      `${this.api}/equipment/catalog/${catalogId}/options`,
      { params },
    );
  }

  setStockControl(catalogId: number, enabled: boolean): Observable<EquipmentCatalog> {
    const params = new HttpParams().set('enabled', String(enabled));
    return this.http.patch<EquipmentCatalog>(
      `${this.api}/equipment/catalog/${catalogId}/stock-control`, {}, { params },
    );
  }

  setVisible(catalogId: number, visible: boolean): Observable<EquipmentCatalog> {
    const params = new HttpParams().set('visible', String(visible));
    return this.http.patch<EquipmentCatalog>(
      `${this.api}/equipment/catalog/${catalogId}/visible`, {}, { params },
    );
  }

  // label vazio/null limpa a selecao (devolve a unidade ao estoque)
  select(recordId: number, catalogId: number, columnKey: string, label: string | null): Observable<EquipmentSelection> {
    return this.http.post<EquipmentSelection>(`${this.api}/equipment/select`, {
      recordId, catalogId, columnKey, label,
    });
  }

  deleteCatalog(catalogId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/equipment/catalog/${catalogId}`);
  }

  // Regra de negocio: a 2a planilha vira opcoes pelos valores DISTINTOS de uma coluna,
  // usando a contagem de ocorrencias como quantidade inicial de estoque.
  aggregateColumn(rows: Record<string, string>[], column: string): OptionInput[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = (row[column] ?? '').toString().trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, quantity]) => ({ label, quantity }));
  }
}
