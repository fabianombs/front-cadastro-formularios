import { EnderecoCep } from '../../core/services/cep.service';

/**
 * Regras do campo CEP compartilhadas entre o editor de formulário
 * (CreateFormTemplateComponent) e o formulário público (FormDynamicComponent).
 * Os dois PRECISAM concordar sobre quais rótulos são campos de endereço: o
 * editor cria os campos com esses nomes e o formulário público os encontra por eles.
 */

/**
 * Campos que a busca de CEP preenche, reconhecidos pelo rótulo (sem acento,
 * minúsculo).
 *
 * Comparação EXATA de propósito: com "começa com", um campo "Endereço de
 * e-mail" depois do CEP seria sobrescrito com o nome da rua.
 */
export const ALVOS_CEP: { campo: keyof EnderecoCep; rotulos: string[] }[] = [
  { campo: 'logradouro', rotulos: ['rua', 'logradouro', 'endereco', 'rua avenida', 'avenida'] },
  { campo: 'bairro', rotulos: ['bairro'] },
  { campo: 'cidade', rotulos: ['cidade', 'municipio'] },
  { campo: 'uf', rotulos: ['estado', 'uf'] },
];

/** Rótulos do campo que recebe o foco depois do preenchimento. */
export const ROTULOS_NUMERO = ['numero', 'n', 'no', 'nº'];

/** Campos que acompanham o CEP no "bloco de endereço" do editor, na ordem em que aparecem. */
export const CAMPOS_ENDERECO_APOS_CEP: { label: string; required: boolean; colSpan: number }[] = [
  { label: 'Rua', required: true, colSpan: 2 },
  { label: 'Número', required: true, colSpan: 1 },
  { label: 'Complemento', required: false, colSpan: 1 },
  { label: 'Bairro', required: true, colSpan: 1 },
  { label: 'Cidade', required: true, colSpan: 1 },
  { label: 'Estado', required: true, colSpan: 1 },
];

export function normalizarRotulo(label: string | null | undefined): string {
  return (label ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9º ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function rotuloCorresponde(label: string | null | undefined, rotulos: string[]): boolean {
  return rotulos.includes(normalizarRotulo(label));
}

/** Verdadeiro se o rótulo é de algum campo que a busca de CEP preenche (rua, bairro, cidade, estado). */
export function ehCampoDeEndereco(label: string | null | undefined): boolean {
  return ALVOS_CEP.some((alvo) => rotuloCorresponde(label, alvo.rotulos));
}
