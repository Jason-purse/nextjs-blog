(function() {
  if (customElements.get('blog-toc')) return;
  class BlogTOC extends HTMLElement {
    constructor() {
      super();
      this._headings = [];
      this._handleRouteChange = () => this._scheduleRender();
      this._handleContentReady = () => this._tryRender();
      this._retryTimer = null;
      this._observer = null;
    }
    connectedCallback() {
      window.addEventListener('blog:route-change', this._handleRouteChange);
      window.addEventListener('blog:content-ready', this._handleContentReady);
      this._registerContext();
      this._render();
    }
    disconnectedCallback() {
      window.removeEventListener('blog:route-change', this._handleRouteChange);
      window.removeEventListener('blog:content-ready', this._handleContentReady);
      if (this._observer) { this._observer.disconnect(); this._observer = null; }
      if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
    }
    _registerContext() {
      if (window.__BLOG_CTX__?.plugins) {
        window.__BLOG_CTX__.plugins['toc'] = {
          ...(window.__BLOG_CTX__.plugins['toc'] || {}),
          api: { getHeadings: () => this._headings }
        };
      }
    }
    _isArticlePage() {
      const p = window.location.pathname;
      return p.startsWith('/blog/') && p.length > '/blog/'.length;
    }
    _scheduleRender() {
      if (this._retryTimer) clearTimeout(this._retryTimer);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!this._tryRender()) {
          this._retryTimer = setTimeout(() => {
            if (!this._tryRender()) {
              this._retryTimer = setTimeout(() => this._tryRender(), 1500);
            }
          }, 600);
        }
      }));
    }
    _tryRender() {
      if (!this._isArticlePage()) {
        this.style.display = 'none';
        this.innerHTML = '';
        return true;
      }
      // 优先从 __BLOG_CTX__ 读 TOC
      const ctxToc = window.__BLOG_CTX__?.content?.toc;
      let headings = [];
      if (ctxToc && ctxToc.length > 0) {
        headings = ctxToc;
        // 同步 DOM id（确保滚动锚点存在）
        headings.forEach(h => {
          const el = document.getElementById(h.id);
          if (!el) {
            const candidates = document.querySelectorAll('article h2, article h3');
            candidates.forEach(c => {
              if (c.innerText.trim() === h.text && !c.id) c.id = h.id;
            });
          }
        });
      } else {
        // fallback: 扫 DOM
        const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['toc'] || {};
        const maxDepth = cfg.maxDepth || 'h3';
        const sel = maxDepth === 'h2' ? 'article h2' : maxDepth === 'h4' ? 'article h2,article h3,article h4' : 'article h2,article h3';
        document.querySelectorAll(sel).forEach((el, idx) => {
          const level = parseInt(el.tagName.charAt(1));
          const text = el.innerText.trim();
          const id = el.id || `toc-h${level}-${idx}`;
          if (!el.id) el.id = id;
          headings.push({ id, text, level });
        });
      }
      if (headings.length === 0) { this.style.display = 'none'; return false; }
      this._headings = headings;
      this._registerContext();
      this.style.display = '';
      // 渲染 HTML（用 CSS 变量）
      this.innerHTML = `<nav style="
        position:fixed;right:24px;top:120px;width:220px;
        max-height:calc(100vh - 160px);overflow-y:auto;
        background:var(--blog-color-surface,#fff);
        border:1px solid var(--blog-color-border,#e5e7eb);
        border-radius:var(--blog-radius,8px);
        padding:16px;font-size:13px;line-height:1.6;z-index:100;
        box-shadow:var(--blog-shadow,0 4px 16px rgba(0,0,0,0.06));
        font-family:var(--blog-font-body,sans-serif);
      ">
        <div style="font-weight:600;margin-bottom:8px;color:var(--blog-color-text-muted,#6b7280);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">目录</div>
        <ul style="list-style:none;padding:0;margin:0;">
          ${headings.map(h => `<li style="padding-left:${(h.level-2)*10}px;margin:2px 0;">
            <a href="#${h.id}" data-toc-id="${h.id}" style="
              color:var(--blog-color-text-muted,#6b7280);
              text-decoration:none;display:block;padding:3px 6px;
              border-radius:var(--blog-radius-sm,4px);transition:all 0.15s;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            "
            onmouseenter="this.style.color='var(--blog-color-primary,#3b82f6)';this.style.background='rgba(0,0,0,0.04)'"
            onmouseleave="this.style.color='var(--blog-color-text-muted,#6b7280)';this.style.background=''"
            >${h.text}</a>
          </li>`).join('')}
        </ul>
      </nav>`;
      this._setupObserver(headings);
      return true;
    }
    _render() { this._tryRender(); }
    _setupObserver(headings) {
      if (this._observer) this._observer.disconnect();
      const links = this.querySelectorAll('[data-toc-id]');
      const linkMap = {};
      links.forEach(l => linkMap[l.dataset.tocId] = l);
      this._observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const link = linkMap[entry.target.id];
          if (!link || !entry.isIntersecting) return;
          links.forEach(l => { l.style.color = 'var(--blog-color-text-muted,#6b7280)'; l.style.background = ''; l.style.fontWeight = ''; });
          link.style.color = 'var(--blog-color-primary,#3b82f6)';
          link.style.background = 'rgba(var(--blog-color-primary-rgb,59,130,246),0.08)';
          link.style.fontWeight = '600';
        });
      }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
      headings.forEach(h => { const el = document.getElementById(h.id); if (el) this._observer.observe(el); });
    }
  }
  customElements.define('blog-toc', BlogTOC);
})();
