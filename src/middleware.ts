import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

// ----------------------------------------------------------------------

/**
 * Gate galeri referensi /components (living docs untuk programmer & AI).
 *
 * Selalu tampil saat `yarn dev`; di build production hanya tampil bila
 * NEXT_PUBLIC_SHOW_COMPONENTS=true. Deploy client tidak men-set flag →
 * seluruh /components/* di-rewrite ke route yang tidak ada → 404.
 *
 * Penegakan HARUS di middleware: halaman galeri di-prerender statis, jadi
 * notFound() di layout segmen tidak menggate HTML yang sudah jadi.
 * `matcher` di bawah membuat middleware ini tidak berjalan untuk route lain.
 */
const SHOW_COMPONENTS =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SHOW_COMPONENTS === 'true';

export function middleware(request: NextRequest) {
  if (!SHOW_COMPONENTS) {
    return NextResponse.rewrite(new URL('/__components-disabled', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/components/:path*',
};
