import { environment } from '../../../environments/environment';

const FONT_PATH = /^\/quizzes\/fonts\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/;

/** Nome do arquivo de uma fonte enviada, para mostrar no editor. */
export function quizFontName(path: string | null | undefined): string {
  return path?.split('/').pop() ?? '';
}

/**
 * Carrega a fonte do quiz e devolve o nome da família para usar no CSS.
 * Devolve null (fonte padrão) quando não há fonte ou ela não carrega.
 */
export async function loadQuizFont(
  regular: string | null | undefined,
  bold: string | null | undefined,
): Promise<string | null> {
  if (!regular || !FONT_PATH.test(regular) || typeof FontFace === 'undefined') return null;
  const family = `quiz-${regular.split('/')[3]}${bold ? '-' + bold.split('/')[3] : ''}`;
  const load = async (path: string, weight: string) => {
    const face = new FontFace(family, `url("${environment.apiUrl}${path}")`, { weight, display: 'swap' });
    document.fonts.add(await face.load());
  };
  try {
    await load(regular, '400');
  } catch {
    return null;
  }
  if (bold && FONT_PATH.test(bold)) {
    // Sem o negrito, o navegador engrossa a fonte normal
    await load(bold, '600 900').catch(() => undefined);
  }
  return family;
}
