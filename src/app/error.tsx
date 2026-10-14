'use client';

import { Error500View } from 'src/sections/error/view/500-view';

// ----------------------------------------------------------------------
// Global error boundary — catches server/render errors (e.g. the backend API
// being unreachable on an article page) instead of Next's bare 500 screen.

export default function Error() {
  return <Error500View />;
}
