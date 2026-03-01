(function() {
  if (customElements.get('blog-like-button')) return;
  class LikeButton extends HTMLElement {
    constructor() {
      super();
      this._handleRouteChange = () => {
        this._render();
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
    _getStorageKey() {
      return `blog-liked-${window.location.pathname}`;
    }
    _render() {
      if (!this._isArticlePage()) {
        this.style.display = 'none';
        return;
      }
      this.style.display = '';
      
      const storageKey = this._getStorageKey();
      const hasLiked = localStorage.getItem(storageKey) === 'true';
      
      this.innerHTML = `
        <button class="blog-like-btn ${hasLiked ? 'liked' : ''}" style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--blog-color-border, #e5e7eb);
          background: ${hasLiked ? 'var(--blog-color-surface, #fef2f2)' : 'var(--blog-color-surface, #fff)'};
          cursor: ${hasLiked ? 'default' : 'pointer'};
          font-size: 14px;
          color: ${hasLiked ? 'var(--blog-color-primary, #ef4444)' : 'var(--blog-color-text-muted, #6b7280)'};
          transition: all 0.2s;
        " ${hasLiked ? 'disabled' : ''}>
          <span style="font-size:16px;">${hasLiked ? '❤️' : '🤍'}</span>
          <span>${hasLiked ? '已点赞' : '点赞'}</span>
        </button>`;
      
      if (!hasLiked) {
        const btn = this.querySelector('button');
        btn.addEventListener('click', () => {
          localStorage.setItem(storageKey, 'true');
          this._render();
        });
      }
    }
  }
  customElements.define('blog-like-button', LikeButton);
})();
