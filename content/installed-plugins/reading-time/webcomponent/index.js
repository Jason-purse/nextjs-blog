(function() {
  if (customElements.get('blog-reading-time')) return;
  class ReadingTime extends HTMLElement {
    constructor() {
      super();
      this._handleRouteChange = () => {
        setTimeout(() => this._render(), 200);
      };
    }
    connectedCallback() {
      window.addEventListener('blog:route-change', this._handleRouteChange);
      this._render();
    }
    disconnectedCallback() {
      window.removeEventListener('blog:route-change', this._handleRouteChange);
    }
    _isArticlePage() {
      const p = window.location.pathname;
      return p.startsWith('/blog/') && p.length > '/blog/'.length;
    }
    _render() {
      if (!this._isArticlePage()) {
        this.style.display = 'none';
        return;
      }
      this.style.display = '';
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['reading-time'] || {};
      const wpm = cfg.wpm ?? 300;
      const prefix = cfg.prefix ?? '预计阅读';
      const unit = cfg.unit ?? '分钟';
      
      const content = document.querySelector('article, .prose, main, .content');
      if (!content) {
        this.style.display = 'none';
        return;
      }
      
      const text = content.innerText || content.textContent || '';
      const words = text.trim().split(/\s+/).length;
      const minutes = Math.max(1, Math.ceil(words / wpm));
      
      this.innerHTML = `
        <span class="blog-reading-time" style="display:inline-flex;align-items:center;gap:4px;color:#888;font-size:0.85em;">
          <span>⏱</span><span>${prefix} ${minutes} ${unit}</span>
        </span>`;
    }
  }
  customElements.define('blog-reading-time', ReadingTime);
})();
