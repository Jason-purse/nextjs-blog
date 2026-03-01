(function() {
  if (customElements.get('blog-toc')) return;
  class BlogTOC extends HTMLElement {
    constructor() {
      super();
      this._handleRouteChange = () => {
        // 路由切换后等 DOM 更新再渲染，用双重 rAF 确保新页面内容已挂载
        this._scheduleRender();
      };
      this._retryTimer = null;
    }

    connectedCallback() {
      window.addEventListener('blog:route-change', this._handleRouteChange);
      this._render();
    }

    disconnectedCallback() {
      window.removeEventListener('blog:route-change', this._handleRouteChange);
      if (this._observer) { this._observer.disconnect(); this._observer = null; }
      if (this._retryTimer) { clearTimeout(this._retryTimer); this._retryTimer = null; }
    }

    _isArticlePage() {
      const p = window.location.pathname;
      return p.startsWith('/blog/') && p.length > '/blog/'.length;
    }

    _scheduleRender() {
      if (this._retryTimer) clearTimeout(this._retryTimer);
      // 第一次尝试：双重 rAF（等两帧让 React 渲染完成）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!this._tryRender()) {
            // 如果找不到标题，在 600ms 和 1500ms 再重试（应对慢速 RSC 响应）
            this._retryTimer = setTimeout(() => {
              if (!this._tryRender()) {
                this._retryTimer = setTimeout(() => this._tryRender(), 1500);
              }
            }, 600);
          }
        });
      });
    }

    // 返回是否成功渲染（有标题则 true）
    _tryRender() {
      if (!this._isArticlePage()) {
        this.style.display = 'none';
        this.innerHTML = '';
        return true; // 非文章页算成功（隐藏即可）
      }
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['toc'] || {};
      const maxDepth = cfg.maxDepth || 'h3';
      const sel = maxDepth === 'h2' ? 'h2' : maxDepth === 'h4' ? 'h2,h3,h4' : 'h2,h3';
      const headings = [];
      document.querySelectorAll(sel).forEach((el, idx) => {
        // 只采集 <article> 内的标题，避免把导航/首页 h2 当正文标题
        if (!el.closest('article') && !el.closest('[data-blog-slot]')) return;
        const level = parseInt(el.tagName.charAt(1));
        const id = el.id || `toc-h${level}-${idx}`;
        if (!el.id) el.id = id;
        headings.push({ id, text: el.innerText.trim(), level });
      });

      if (headings.length === 0) {
        this.style.display = 'none';
        return false; // 告知调用方需要重试
      }

      this.style.display = '';
      this.innerHTML = `
        <nav class="blog-toc-widget" style="
          position: fixed;
          right: 24px;
          top: 120px;
          width: 220px;
          max-height: calc(100vh - 160px);
          overflow-y: auto;
          background: rgba(255,255,255,0.95);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          font-size: 13px;
          line-height: 1.6;
          z-index: 100;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        ">
          <div style="font-weight:600;margin-bottom:8px;color:#374151;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;">目录</div>
          <ul style="list-style:none;padding:0;margin:0;">
            ${headings.map(h => `
              <li style="padding-left:${(h.level-2)*12}px;margin:3px 0;">
                <a href="#${h.id}"
                  data-toc-id="${h.id}"
                  style="color:#6b7280;text-decoration:none;display:block;padding:2px 6px;border-radius:4px;transition:all 0.15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
                  onmouseenter="this.style.color='#111827';this.style.background='#f3f4f6'"
                  onmouseleave="this.style.color='#6b7280';this.style.background=''"
                >${h.text}</a>
              </li>`).join('')}
          </ul>
        </nav>`;

      this._setupObserver(headings);
      return true;
    }

    _render() {
      this._tryRender();
    }

    _setupObserver(headings) {
      if (this._observer) this._observer.disconnect();
      const links = this.querySelectorAll('[data-toc-id]');
      const linkMap = {};
      links.forEach(l => linkMap[l.dataset.tocId] = l);

      this._observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const link = linkMap[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(l => { l.style.color = '#6b7280'; l.style.background = ''; l.style.fontWeight = ''; });
            link.style.color = '#111827';
            link.style.background = '#f3f4f6';
            link.style.fontWeight = '600';
          }
        });
      }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

      headings.forEach(h => {
        const el = document.getElementById(h.id);
        if (el) this._observer.observe(el);
      });
    }
  }
  customElements.define('blog-toc', BlogTOC);
})();
