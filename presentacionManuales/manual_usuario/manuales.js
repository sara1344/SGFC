/**
 * SGFC — Interactividad de la portada de manuales
 */
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.manual-card');

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.setProperty('--hover', '1');
    });

    card.addEventListener('keydown', e => {
      const link = card.querySelector('.btn');
      if ((e.key === 'Enter' || e.key === ' ') && link) {
        e.preventDefault();
        link.click();
      }
    });

    card.setAttribute('tabindex', '0');
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[style*="animation"]').forEach(el => {
      el.style.animation = 'none';
    });
  }
});
