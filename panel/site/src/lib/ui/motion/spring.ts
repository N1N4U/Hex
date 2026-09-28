export function createSpring(
  initial: number,
  options: { stiffness?: number; damping?: number; precision?: number } = {}
) {
  const stiffness = options.stiffness ?? 0.15;
  const damping = options.damping ?? 0.8;
  const precision = options.precision ?? 0.001;

  let current = initial;
  let target = initial;
  let velocity = 0;
  let rafId: number | null = null;
  const listeners = new Set<(val: number) => void>();

  function update() {
    const force = (target - current) * stiffness;
    velocity = (velocity + force) * damping;
    current += velocity;

    if (Math.abs(target - current) < precision && Math.abs(velocity) < precision) {
      current = target;
      velocity = 0;
      rafId = null;
      notify();
      return;
    }

    notify();
    rafId = requestAnimationFrame(update);
  }

  function notify() {
    for (const fn of listeners) fn(current);
  }

  return {
    get value() {
      return current;
    },
    set(newTarget: number) {
      target = newTarget;
      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    },
    snap(newVal: number) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      current = newVal;
      target = newVal;
      velocity = 0;
      notify();
    },
    subscribe(fn: (val: number) => void) {
      listeners.add(fn);
      fn(current);
      return () => listeners.delete(fn);
    }
  };
}
