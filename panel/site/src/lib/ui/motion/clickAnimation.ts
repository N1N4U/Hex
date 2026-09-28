export function ripple(node: HTMLElement) {
  const handleClick = (e: MouseEvent) => {
    const rect = node.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.borderRadius = '50%';
    span.style.pointerEvents = 'none';
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.backgroundColor = 'currentColor';
    span.style.opacity = '0.25';
    span.style.transform = 'scale(0)';
    span.style.transition = 'transform 400ms ease-out, opacity 400ms ease-out';

    // Ensure relative positioning on parent
    const computed = window.getComputedStyle(node);
    if (computed.position === 'static') {
      node.style.position = 'relative';
    }
    node.style.overflow = 'hidden';

    node.appendChild(span);

    requestAnimationFrame(() => {
      span.style.transform = 'scale(2.5)';
      span.style.opacity = '0';
    });

    setTimeout(() => {
      span.remove();
    }, 450);
  };

  node.addEventListener('click', handleClick);

  return {
    destroy() {
      node.removeEventListener('click', handleClick);
    }
  };
}
