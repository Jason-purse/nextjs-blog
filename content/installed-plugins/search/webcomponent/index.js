(function() {
  if (customElements.get('blog-search')) return;
  class BlogSearch extends HTMLElement {
    constructor() { super(); this._query = ''; this._results = []; }
    connectedCallback() { this._render(); this._load(); }
    
    async _load() {
      try {
        const res = await fetch('/api/content/posts?limit=100');
        const data = await res.json();
        this._allPosts = data.items || [];
      } catch { this._allPosts = []; }
    }
    
    _render() {
      const q = new URLSearchParams(window.location.search).get('q') || '';
      this._query = q;
      
      this.innerHTML = `
        <style>
          .bs-wrap { max-width: 800px; margin: 0 auto; padding: 48px 24px; font-family: var(--blog-font-body, sans-serif); }
          .bs-title { font-size: 28px; font-weight: 700; margin-bottom: 24px; color: var(--blog-color-text, #111); }
          .bs-input { width: 100%; padding: 14px 20px; font-size: 16px; border: 2px solid var(--blog-color-border, #e5e7eb); border-radius: var(--blog-radius, 8px); outline: none; transition: border-color 0.2s; box-sizing: border-box; }
          .bs-input:focus { border-color: var(--blog-color-primary, #3b82f6); }
          .bs-results { margin-top: 32px; }
          .bs-item { padding: 20px; border-bottom: 1px solid var(--blog-color-border, #e5e7eb); }
          .bs-item:last-child { border-bottom: none; }
          .bs-item-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
          .bs-item-title a { color: var(--blog-color-text, #111); text-decoration: none; }
          .bs-item-title a:hover { color: var(--blog-color-primary, #3b82f6); }
          .bs-item-desc { font-size: 14px; color: var(--blog-color-text-muted, #666); line-height: 1.6; }
          .bs-item-meta { font-size: 12px; color: var(--blog-color-text-muted, #999); margin-top: 8px; }
          .bs-empty { text-align: center; padding: 48px; color: var(--blog-color-text-muted, #666); }
          .bs-highlight { background: #fef08a; padding: 0 2px; }
        </style>
        <div class="bs-wrap">
          <h1 class="bs-title">🔍 搜索</h1>
          <input type="text" class="bs-input" id="bs-input" placeholder="输入关键词搜索文章..." value="${q}">
          <div class="bs-results" id="bs-results"></div>
        </div>`;
      
      const input = this.querySelector('#bs-input');
      input.addEventListener('input', (e) => {
        this._query = e.target.value;
        this._search();
      });
      
      if (q) this._search();
    }
    
    _search() {
      const results = document.querySelector('#bs-results');
      if (!results) return;
      
      if (!this._query.trim()) {
        results.innerHTML = '';
        return;
      }
      
      const q = this._query.toLowerCase();
      const posts = (this._allPosts || []).filter(p => 
        p.title.toLowerCase().includes(q) || 
        (p.description || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
      
      if (posts.length === 0) {
        results.innerHTML = '<div class="bs-empty">没有找到相关文章</div>';
        return;
      }
      
      results.innerHTML = posts.map(p => `
        <div class="bs-item">
          <div class="bs-item-title"><a href="/blog/${p.slug}">${this._highlight(p.title, q)}</a></div>
          <div class="bs-item-desc">${this._highlight(p.description || '', q)}</div>
          <div class="bs-item-meta">${p.date ? new Date(p.date).toLocaleDateString('zh-CN') : ''} · ${p.readingTime || ''}</div>
        </div>
      `).join('');
    }
    
    _highlight(text, q) {
      if (!q) return text;
      const re = new RegExp(`(${q})`, 'gi');
      return text.replace(re, '<span class="bs-highlight">$1</span>');
    }
  }
  customElements.define('blog-search', BlogSearch);
})();
