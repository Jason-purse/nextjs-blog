(function() {
  if (customElements.get('blog-dark-mode')) return;
  
  class DarkModeToggle extends HTMLElement {
    connectedCallback() {
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['dark-mode'] || {};
      const followSystem = cfg.followSystem ?? true;
      const position = cfg.position || 'top-right';
      
      const getInitialTheme = () => {
        const stored = localStorage.getItem('blog-dark-mode');
        if (stored) return stored;
        if (followSystem && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
        return 'light';
      };
      
      const currentTheme = getInitialTheme();
      document.documentElement.setAttribute('data-dark', currentTheme === 'dark' ? 'true' : 'false');
      
      const btn = document.createElement('button');
      btn.className = 'blog-dark-mode-btn';
      btn.setAttribute('aria-label', '切换深色/浅色模式');
      btn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
      
      const style = document.createElement('style');
      style.textContent = `
        .blog-dark-mode-btn {
          position: fixed;
          ${position === 'top-left' ? 'left: 24px;' : 'right: 24px;'}
          top: 24px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .blog-dark-mode-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        [data-dark="true"] .blog-dark-mode-btn {
          background: #1e293b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        [data-dark="true"] {
          color-scheme: dark;
          background-color: #0f172a;
          color: #e2e8f0;
        }
        [data-dark="true"] body {
          background-color: #0f172a;
          color: #e2e8f0;
        }
        [data-dark="true"] a { color: #7dd3fc; }
        [data-dark="true"] code { background: #1e293b; color: #7dd3fc; }
        [data-dark="true"] pre { background: #020617; }
        [data-dark="true"] blockquote { border-color: #334155; color: #94a3b8; }
        [data-dark="true"] h1,[data-dark="true"] h2,[data-dark="true"] h3 { color: #f1f5f9; }
        [data-dark="true"] h2 { border-color: #334155; }
      `;
      document.head.appendChild(style);
      document.body.appendChild(btn);
      
      btn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-dark') === 'true';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-dark', newTheme === 'dark' ? 'true' : 'false');
        localStorage.setItem('blog-dark-mode', newTheme);
        btn.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
      });
      
      if (followSystem) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
          if (!localStorage.getItem('blog-dark-mode')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-dark', newTheme === 'dark' ? 'true' : 'false');
            btn.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
          }
        });
      }
      
      this._cleanup = () => {
        btn.remove();
        style.remove();
      };
    }
    
    disconnectedCallback() {
      this._cleanup?.();
    }
  }
  
  customElements.define('blog-dark-mode', DarkModeToggle);
})();
