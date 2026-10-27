import { Injectable, inject } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/** Endereço devolvido pela consulta de CEP, já com os nomes usados no formulário. */
export interface EnderecoCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Resultado da consulta: endereço, CEP inexistente, ou falha de rede/serviço. */
export type ResultadoCep =
  | { status: 'encontrado'; endereco: EnderecoCep }
  | { status: 'nao-encontrado' }
  | { status: 'erro' };

interface ViaCepResposta {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

/**
 * Consulta de endereço por CEP no ViaCEP (serviço público e gratuito).
 *
 * Usa um HttpClient construído sobre o HttpBackend de propósito: assim a
 * requisição NAO passa pelos interceptors da aplicação. Sem isso, o
 * authInterceptor anexaria o JWT do administrador logado (`Authorization:
 * Bearer ...`) numa chamada para um servidor de terceiros.
 */
@Injectable({ providedIn: 'root' })
export class CepService {
  private static readonly URL = 'https://viacep.com.br/ws';

  private http = new HttpClient(inject(HttpBackend));

  /** Mantém só os dígitos. Um CEP válido tem exatamente 8. */
  static somenteDigitos(valor: string | null | undefined): string {
    return (valor ?? '').replace(/\D/g, '');
  }

  buscar(cep: string): Observable<ResultadoCep> {
    const digitos = CepService.somenteDigitos(cep);
    if (digitos.length !== 8) return of({ status: 'nao-encontrado' });

    return this.http.get<ViaCepResposta>(`${CepService.URL}/${digitos}/json/`).pipe(
      map((r): ResultadoCep => {
        // O ViaCEP responde 200 com { "erro": true } para CEP inexistente.
        if (!r || r.erro) return { status: 'nao-encontrado' };
        return {
          status: 'encontrado',
          endereco: {
            cep: r.cep ?? '',
            logradouro: r.logradouro ?? '',
            bairro: r.bairro ?? '',
            cidade: r.localidade ?? '',
            uf: r.uf ?? '',
          },
        };
      }),
      // 400 = formato invalido; demais = rede/servico fora. Em nenhum caso o
      // formulario pode travar: a pessoa continua digitando o endereco a mao.
      catchError((e) => of<ResultadoCep>(e?.status === 400 ? { status: 'nao-encontrado' } : { status: 'erro' })),
    );
  }
}
