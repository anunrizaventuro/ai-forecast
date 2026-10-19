// ----------------------------------------------------------------------
// Global registry of module-level cache invalidators. Each reference-data
// hook self-registers its invalidator on module load; AuthProvider calls
// `invalidateAllCompanyCaches()` on company switch so caches scoped to the
// previous company are cleared without creating a backwards dependency
// from core/auth to feature modules.
// ----------------------------------------------------------------------

type Invalidator = () => void;

const invalidators = new Set<Invalidator>();

export function registerCompanyCacheInvalidator(fn: Invalidator): void {
  invalidators.add(fn);
}

export function invalidateAllCompanyCaches(): void {
  invalidators.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('[cache-registry] invalidator failed:', err);
    }
  });
}
