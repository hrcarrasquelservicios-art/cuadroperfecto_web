/* Lightweight progressive motion. The site remains complete without it. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selector = '.result-copy > *, .result-hero figure, .home-vision > *, .vision-grid article, .home-archive .card, .home-cta > *';

  function prepare() {
    const items = [...document.querySelectorAll(selector)].filter(item => !item.dataset.motionReady);
    items.forEach((item, index) => {
      item.dataset.motionReady = 'true';
      item.style.setProperty('--motion-delay', `${Math.min(index % 6, 5) * 70}ms`);
      item.classList.add('motion-item');
    });
    if (reduce.matches) {
      items.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const observer = new window.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .14, rootMargin: '0px 0px -5% 0px' });
    items.forEach(item => observer.observe(item));
  }

  function pointerGlow(event) {
    const hero = event.target.closest('.result-hero');
    if (!hero || reduce.matches) return;
    const box = hero.getBoundingClientRect();
    hero.style.setProperty('--pointer-x', `${event.clientX - box.left}px`);
    hero.style.setProperty('--pointer-y', `${event.clientY - box.top}px`);
    const figure = hero.querySelector('figure');
    if (figure && window.innerWidth > 900) {
      const x = ((event.clientX - box.left) / box.width - .5) * 7;
      const y = ((event.clientY - box.top) / box.height - .5) * -5;
      figure.style.transform = `perspective(1100px) rotateY(${x}deg) rotateX(${y}deg)`;
    }
  }

  document.addEventListener('pointermove', pointerGlow, { passive: true });
  document.addEventListener('pointerleave', () => document.querySelector('.result-hero figure')?.removeAttribute('style'));
  window.addEventListener('popstate', () => window.requestAnimationFrame(prepare));
  new window.MutationObserver(() => window.requestAnimationFrame(prepare)).observe(document.getElementById('main'), { childList: true });
  prepare();
})();
