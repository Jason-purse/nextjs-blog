(function() {
  if (customElements.get('blog-toc')) return;
  
  const styles = `
    .toc-nav {
      position: fixed;
      right: 24px;
      top: 120px;
      width: 240px;
      max-height: calc(100vh - 180px);
      overflow-y: auto;
      background: var(--blog-color-surface, #fff);
      border: 1px solid var(--blog-color-border, #e5e7eb);
      border-radius: 16px;
      padding: 20px;
      font-size: 13px;
      line-height: 1.6;
      z-index: 100;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      font-family: var(--blog-font-body, -apple-system, BlinkMacSystemFont, sans-serif);
      scrollbar-width: thin;
      scrollbar-color: var(--blog-color-border, #e5e7eb) transparent;
    }
    .toc-nav::-webkit-scrollbar { width: 4px; }
    .toc-nav::-webkit-scrollbar-track { background: transparent; }
    .toc-nav::-webkit-scrollbar-thumb { background: var(--blog-color-border, #e5e7eb); border-radius: 2px; }
    .toc-title {
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--blog-color-text-muted, #9ca3af);
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--blog-color-border, #f3f4f6);
    }
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .toc-item {
      margin: 4px 0;
    }
    .toc-link {
      display: block;
      padding: 6px 10px;
      color: var(--blog-color-text-muted, #6b7280);
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.15s ease;
      font-size: 13px;
      line-height: 1.4;
      border-left: 2px solid transparent;
    }
    .toc-link:hover {
      color: var(--blog-color-text, #374151);
      background: var(--blog-color-border, #f3f4f6);
    }
    .toc-link.active {
      color: var(--blog-color-primary, #3b82f6);
      background: rgba(59, 130, 246, 0.08);
      border-left-color: var(--blog-color-primary, #3b82f6);
      font-weight: 500;
    }
    .toc-level-3 {
      padding-left: 20px;
      font-size: 12px;
    }
    @media (max-width: 1280px) {
      .toc-nav { display: none; }
    }
  `;

  class BlogTOC extends HTMLElement {
    constructor() {
      super();
      this._headings = [];
      this._observer = null;
      this._retryTimer = null;
    }

    connectedCallback() {
      this.innerHTML = `<style>${styles}</style>`;
      window.addEventListener('blog:route-change', () => this._scheduleRender());
      window.addEventListener('blog:content-ready', () => this._tryRender());
      this._render();
    }

    disconnectedCallback() {
      window.removeEventListener('blog:route-change', () => this._scheduleRender());
      window.removeEventListener('blog:content-ready', () => this._tryRender());
      if (this._observer) { this._observer.disconnect(); this._observer = null; }
      if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
    }

    _isArticlePage() {
      const p = window.location.pathname;
      return p.startsWith('/blog/') && p.length > '/blog/'.length;
    }

    _scheduleRender() {
      if (this._retryTimer) clearTimeout(this._retryTimer);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!this._tryRender()) {
          this._retryTimer = setTimeout(() => this._tryRender(), 600);
        }
      }));
    }

    _tryRender() {
      if (!this._isArticlePage()) {
        this.style.display = 'none';
        this.innerHTML = `<style>${styles}</style>`;
        return true;
      }

      // 优先从 context 读
      const ctxToc = window.__BLOG_CONTENT_CTX__?.toc;
      let headings = [];
      
      if (ctxToc && ctxToc.length > 0) {
        headings = ctxToc;
      } else {
        // fallback: 扫 DOM
        const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['toc'] || {};
        const maxDepth = cfg.maxDepth || 'h3';
        const sel = maxDepth === 'h2' ? 'article h2' : maxDepth === 'h4' ? 'article h2,article h3,article h4' : 'article h2,article h3';
        document.querySelectorAll(sel).forEach((el, idx) => {
          const level = parseInt(el.tagName.charAt(1));
          const text = el.innerText.trim();
          const id = el.id || `heading-${idx}`;
          if (!el.id) el.id = id;
          headings.push({ id, text, level });
        });
      }

      if (headings.length === 0) {
        this.style.display = 'none';
        return false;
      }

      this._headings = headings;
      this.style.display = '';
      
      // 渲染
      const html = `
        <nav class="toc-nav">
          <div class="toc-title">目录</div>
          <ul class="toc-list">
            ${headings.map(h => `
              <li class="toc-item">
                <a href="#${h.id}" class="toc-link toc-level-${h.level}" data-toc-id="${h.id}">
                  ${h.text}
                </a>
              </li>
            `).join('')}
          </ul>
        </nav>`;
      
      this.innerHTML = `<style>${styles}</style>${html}`;
      this._setupObserver(headings);
      return true;
    }

    _render() { this._tryRender(); }

    _setupObserver(headings) {
      if (this._observer) this._observer.disconnect();
      const links = this.querySelectorAll('.toc-link');
      const linkMap = {};
      links.forEach(l => linkMap[l.dataset.tocId] = l);

      this._observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const link = linkMap[entry.target.id];
          if (!link) return;
          
          // 移除所有 active
          links.forEach(l => l.classList.remove('active'));
          
          if (entry.isIntersecting) {
            link.classList.add('active');
            // 平滑滚动到
            link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        });
      }, { rootMargin: '-80px 0px -65% 0px', threshold: 0 });

      headings.forEach(h => {
        const el = document.getElementById(h.id);
        if (el) this._observer.observe(el);
      });
    }
  }
  customElements.define('blog-toc', BlogTOC);
})();
