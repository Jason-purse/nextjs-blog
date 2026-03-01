(function() {
  if (customElements.get('blog-code-highlight')) return;

  const styles = `
    pre {
      background: #1e1e2e !important;
      border-radius: 12px;
      padding: 20px !important;
      overflow-x: auto;
      margin: 1.5em 0;
      font-size: 14px;
      line-height: 1.6;
      font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace !important;
    }
    code {
      font-family: inherit !important;
    }
    pre code {
      background: transparent !important;
      padding: 0 !important;
    }
    :not(pre) > code {
      background: rgba(99, 110, 123, 0.1) !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-size: 0.9em;
      color: #cdd6f4 !important;
    }
    /* 行号样式 */
    pre code ol {
      counter-reset: line;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    pre code ol li {
      counter-increment: line;
      padding-left: 3em;
      position: relative;
    }
    pre code ol li::before {
      content: counter(line);
      position: absolute;
      left: 0;
      color: #6c7086;
      font-size: 0.85em;
      user-select: none;
    }
  `;

  class CodeHighlight extends HTMLElement {
    constructor() { super(); this._processed = false; }
    
    connectedCallback() {
      // 只处理一次
      if (this._processed) return;
      this._processed = true;

      this.innerHTML = `<style>${styles}</style>`;
      
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['code-highlight'] || {};
      const theme = cfg.theme || 'catppuccin-mocha';
      const showLineNumbers = cfg.lineNumbers !== false;

      // 本地缓存路径
      const base = '/api/registry/asset?path=plugins/content/code-highlight/cdn';

      const loadHLJS = async () => {
        // 加载主题 CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${base}/styles/${theme}.min.css`;
        document.head.appendChild(link);

        // 等待 CSS 加载
        await new Promise(r => setTimeout(r, 100));

        // 加载 highlight.js
        if (window.hljs) return;
        
        const script = document.createElement('script');
        script.src = `${base}/highlight.min.js`;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        document.head.appendChild(script);
      };

      loadHLJS().then(() => {
        if (!window.hljs) {
          console.warn('[code-highlight] hljs 加载失败');
          return;
        }
        
        // 高亮所有代码块
        window.hljs.highlightAll();

        // 添加行号
        if (showLineNumbers) {
          document.querySelectorAll('pre code').forEach(block => {
            if (block.querySelector('ol')) return; // 已处理
            const lines = block.innerHTML.split('\n');
            block.innerHTML = '<ol>' + lines.map(line => 
              `<li>${line}</li>`
            ).join('') + '</ol>';
          });
        }
      }).catch(e => {
        console.warn('[code-highlight] 加载失败:', e);
      });
    }
  }

  customElements.define('blog-code-highlight', CodeHighlight);
})();
