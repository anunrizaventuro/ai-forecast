'use client';

import { LazyMotion, MotionConfig } from 'framer-motion';

// ----------------------------------------------------------------------

export type MotionLazyProps = {
  children: React.ReactNode;
};

const loadFeaturesAsync = async () => import('./features').then((res) => res.default);

export function MotionLazy({ children }: MotionLazyProps) {
  return (
    <LazyMotion strict features={loadFeaturesAsync}>
      {/* Semua animasi m.* menghormati preferensi OS reduced-motion (WCAG 2.3.3) */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
