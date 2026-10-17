import { ASSET_DOCUMENT_MAX_BYTES } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { DOCUMENT_TITLE_MAX, documentFileError, documentLimitText, formatFileSize, titleFromFileName } from './document-file';

const pdf = (size: number) => ({ type: 'application/pdf', size });

describe('documentFileError', () => {
  it('admite un PDF que cabe en el límite, justo en él', () => {
    expect(documentFileError(pdf(1))).toBeNull();
    expect(documentFileError(pdf(ASSET_DOCUMENT_MAX_BYTES))).toBeNull();
  });

  it('pide un archivo cuando no se eligió ninguno', () => {
    expect(documentFileError(null)).toBe('Elige el PDF del documento.');
  });

  it('rechaza lo que no es PDF y dice cómo resolverlo', () => {
    expect(documentFileError({ type: 'image/png', size: 1000 })).toBe('Solo se admite PDF: elige otro archivo o expórtalo a PDF.');
    expect(documentFileError({ type: '', size: 1000 })).toContain('Solo se admite PDF');
  });

  it('rechaza un archivo vacío', () => {
    expect(documentFileError(pdf(0))).toBe('El archivo está vacío: elige otro PDF.');
  });

  it('rechaza el que pasa del límite y dice cuál es', () => {
    expect(documentLimitText).toBe('20 MiB');
    expect(documentFileError(pdf(ASSET_DOCUMENT_MAX_BYTES + 1))).toBe('El PDF supera 20 MiB: comprímelo o elige otro.');
  });
});

describe('formatFileSize', () => {
  it('usa KB bajo 1 MiB y MB con un decimal desde ahí', () => {
    expect(formatFileSize(850 * 1024)).toBe('850 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(Math.round(1.2 * 1024 * 1024))).toBe('1,2 MB');
  });

  it('un archivo diminuto no se queda en 0 KB', () => {
    expect(formatFileSize(10)).toBe('1 KB');
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
