(function() {
  if (customElements.get('blog-reading-time')) return;
  class ReadingTime extends HTMLElement {
    connectedCallback() {
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['reading-time'] || {};
      const wpm = cfg.wpm ?? 300;
      const prefix = cfg.prefix ?? '预计阅读';
      const unit = cfg.unit ?? '分钟';
      
      const content = document.querySelector('article, .prose, main, .content');
      if (!content) return;
      
      const text = content.innerText || content.textContent || '';
      const words = text.trim().split(/\s+/).length;
      const minutes = Math.max(1, Math.ceil(words / wpm));
      
      const el = document.createElement('span');
      el.className = 'blog-reading-time';
      el.style.cssText = 'display:inline-flex;align-items:center;gap:4px;color:#888;font-size:0.85em;';
      el.innerHTML = `<span>⏱</span><span>${prefix} ${minutes} ${unit}</span>`;
      this.appendChild(el);
    }
  }
  customElements.define('blog-reading-time', ReadingTime);
})();
