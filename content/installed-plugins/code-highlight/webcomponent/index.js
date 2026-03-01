(function() {
  if (customElements.get('blog-code-highlight')) return;

  class CodeHighlight extends HTMLElement {
    connectedCallback() {
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['code-highlight'] || {};
      const theme = cfg.theme || 'github';

      // 本地缓存路径（安装时已下载到 installed-plugins/code-highlight/cdn/）
      const base = '/api/registry/asset?path=plugins/content/code-highlight/cdn';

      const loadHLJS = () => {
        return new Promise((resolve) => {
          // 加载主题 CSS
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = `${base}/styles/${theme}.min.css`;
          document.head.appendChild(link);

          // 加载 highlight.js core（只加载一次）
          if (window.hljs) { resolve(null); return; }
          const script = document.createElement('script');
          script.src = `${base}/highlight.min.js`;
          script.onload = resolve;
          script.onerror = () => {
            console.warn('[code-highlight] hljs 本地缓存加载失败，请重新安装插件');
            resolve(null);
          };
          document.head.appendChild(script);
        });
      };

      loadHLJS().then(() => {
        if (window.hljs) window.hljs.highlightAll();
      });
    }
  }

  customElements.define('blog-code-highlight', CodeHighlight);
})();
