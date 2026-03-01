(function() {
  if (customElements.get('blog-view-count')) return;
  class ViewCount extends HTMLElement {
    constructor() {
      super();
      this._handleRouteChange = () => {
        setTimeout(() => this._fetchViews(), 200);
      };
    }
    connectedCallback() {
      window.addEventListener('blog:route-change', this._handleRouteChange);
      this._fetchViews();
    }
    disconnectedCallback() {
      window.removeEventListener('blog:route-change', this._handleRouteChange);
    }
    _isArticlePage() {
      const p = window.location.pathname;
      return p.startsWith('/blog/') && p.length > '/blog/'.length;
    }
    _getSlug() {
      const p = window.location.pathname;
      return p.split('/').filter(Boolean).pop() || '';
    }
    async _fetchViews() {
      if (!this._isArticlePage()) {
        this.style.display = 'none';
        return;
      }
      this.style.display = '';
      this.innerHTML = `<span style="color:#888;font-size:0.85em;">👁️ 加载中...</span>`;
      
      const slug = this._getSlug();
      if (!slug) {
        this.innerHTML = '';
        return;
      }
      
      try {
        const res = await fetch(`/api/views?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        const views = data.views || 0;
        this.innerHTML = `<span class="blog-view-count" style="color:var(--blog-color-text-muted,#888);font-size:0.85em;">👁️ ${views} 次阅读</span>`;
      } catch (e) {
        this.innerHTML = '';
      }
    }
  }
  customElements.define('blog-view-count', ViewCount);
})();
