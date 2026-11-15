import { TriangleAlert } from 'lucide-react';
import { noticesOf } from './request-detail';
import type { RequestView } from './request-draft';

/** Los avisos de una solicitud recibida, compactos y solo si los hay: lo que quien revisa debe mirar antes de responder. */
export function RequestNotices({ request }: { request: RequestView }) {
  const notices = noticesOf(request);
  if (notices.length === 0) return null;
  return (
    <ul aria-label="Avisos" className="grid gap-1.5 rounded-control bg-warning-soft px-3 py-2.5 text-sm print:hidden">
      {notices.map((notice) => (
        <li key={notice} className="flex items-start gap-2 text-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          {notice}
        </li>
      ))}
    </ul>
  );
}
