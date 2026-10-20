import { ASSET_DOCUMENT_MAX_BYTES } from '@platlab/contracts';
import { describe, expect, it } from 'vitest';
import { formatFileSize, pdfFileError, pdfLimitText } from './pdf-file';

const pdf = (size: number) => ({ type: 'application/pdf', size });

describe('pdfFileError', () => {
  it('admite un PDF que cabe en el límite, justo en él', () => {
    expect(pdfFileError(pdf(1))).toBeNull();
    expect(pdfFileError(pdf(ASSET_DOCUMENT_MAX_BYTES))).toBeNull();
  });

  it('rechaza lo que no es PDF y dice cómo resolverlo', () => {
    expect(pdfFileError({ type: 'image/png', size: 1000 })).toBe('Solo se admite PDF: elige otro archivo o expórtalo a PDF.');
    expect(pdfFileError({ type: '', size: 1000 })).toContain('Solo se admite PDF');
  });

  it('rechaza el archivo vacío', () => {
    expect(pdfFileError(pdf(0))).toBe('El archivo está vacío: elige otro PDF.');
  });

  it('rechaza el que pasa del límite y dice cuál es', () => {
    expect(pdfLimitText).toBe('20 MiB');
    expect(pdfFileError(pdf(ASSET_DOCUMENT_MAX_BYTES + 1))).toBe('El PDF supera 20 MiB: comprímelo o elige otro.');
  });
});

describe('formatFileSize', () => {
  it('KB bajo un mebibyte y MB desde ahí, con coma decimal', () => {
    expect(formatFileSize(850 * 1024)).toBe('850 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(Math.round(1.2 * 1024 * 1024))).toBe('1,2 MB');
  });

  it('un archivo diminuto nunca dice 0 KB', () => {
    expect(formatFileSize(10)).toBe('1 KB');
  });
});
