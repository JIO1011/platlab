import { describe, expect, it } from 'vitest';
import { DOCUMENT_TITLE_MAX, documentFileError, titleFromFileName } from './document-file';

describe('documentFileError', () => {
  it('pide el archivo si falta', () => {
    expect(documentFileError(null)).toBe('Elige el PDF del documento.');
  });

  it('delega en la validación común del PDF si hay archivo', () => {
    expect(documentFileError({ type: 'application/pdf', size: 1 })).toBeNull();
    expect(documentFileError({ type: 'image/png', size: 1000 })).toContain('Solo se admite PDF');
  });
});

describe('titleFromFileName', () => {
  it('propone el nombre del archivo sin .pdf, sea cual sea su capitalización', () => {
    expect(titleFromFileName('Manual de usuario.pdf')).toBe('Manual de usuario');
    expect(titleFromFileName('FACTURA-001.PDF')).toBe('FACTURA-001');
    expect(titleFromFileName('informe.v2.pdf')).toBe('informe.v2');
  });

  it('lo recorta al máximo del nombre', () => {
    const proposed = titleFromFileName(`${'a'.repeat(200)}.pdf`);
    expect(proposed).toHaveLength(DOCUMENT_TITLE_MAX);
  });
});
