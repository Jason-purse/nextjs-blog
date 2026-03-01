(function() {
  if (customElements.get('blog-back-to-top')) return;
  class BackToTop extends HTMLElement {
    connectedCallback() {
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['back-to-top'] || {};
      const threshold = cfg.threshold ?? 300;
      const position = cfg.position ?? 'bottom-right';
      
      const style = document.createElement('style');
      style.textContent = `
        .btt-btn {
          position: fixed;
          ${position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
          bottom: 24px;
          width: var(--btt-size, 48px);
          height: var(--btt-size, 48px);
          background: var(--blog-color-primary, #3b82f6);
          color: var(--blog-color-surface, #fff);
          border: none;
          border-radius: var(--blog-radius-sm, 4px);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--blog-shadow, 0 4px 16px rgba(0,0,0,0.12));
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.3s, transform 0.3s;
          z-index: 9999;
          font-size: 20px;
        }
        .btt-btn.visible { opacity: 1; transform: translateY(0); }
        .btt-btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
      `;
      document.head.appendChild(style);
      
      const btn = document.createElement('button');
      btn.className = 'btt-btn';
      btn.setAttribute('aria-label', '回到顶部');
      btn.innerHTML = '↑';
      btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      document.body.appendChild(btn);
      
      const onScroll = () => btn.classList.toggle('visible', window.scrollY > threshold);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      
      this._cleanup = () => {
        window.removeEventListener('scroll', onScroll);
        btn.remove();
        style.remove();
      };
    }
    disconnectedCallback() { this._cleanup?.(); }
  }
  customElements.define('blog-back-to-top', BackToTop);
})();
