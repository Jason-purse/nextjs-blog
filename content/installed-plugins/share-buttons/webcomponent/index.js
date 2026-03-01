(function() {
  if (customElements.get('blog-share-buttons')) return;
  class ShareButtons extends HTMLElement {
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
    _getSlug() {
      const p = window.location.pathname;
      return p.split('/').filter(Boolean).pop() || '';
    }
    async _render() {
      if (!this._isArticlePage()) {
        this.style.display = 'none';
        return;
      }
      this.style.display = '';
      const url = window.location.href;
      const title = document.title;
      
      this.innerHTML = `
        <div class="blog-share-buttons" style="
          display: flex;
          gap: 12px;
          justify-content: center;
          padding: 16px;
          margin-top: 24px;
          border-top: 1px solid var(--blog-color-border, #e5e7eb);
        ">
          <button class="share-btn copy-link" data-action="copy" title="复制链接" style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: var(--blog-color-border, #f3f4f6);
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          ">📋</button>
          <button class="share-btn twitter" data-action="twitter" title="分享到 X" style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: #000;
            color: #fff;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          ">𝕏</button>
          <button class="share-btn wechat" data-action="wechat" title="分享到微信" style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: #07c160;
            color: #fff;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          ">💬</button>
        </div>`;
      
      this.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
        btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        btn.addEventListener('click', () => this._handleShare(btn.dataset.action, url, title));
      });
    }
    async _handleShare(action, url, title) {
      switch(action) {
        case 'copy':
          try {
            await navigator.clipboard.writeText(url);
            alert('链接已复制！');
          } catch {
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
            alert('链接已复制！');
          }
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
          break;
        case 'wechat':
          // 使用微信分享需要二维码，引导用户扫码
          const wechatUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
          const modal = document.createElement('div');
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999;';
          modal.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;text-align:center;max-width:90%;">
              <p style="margin-bottom:16px;font-size:16px;color:#333;">扫码分享到微信</p>
              <img src="${wechatUrl}" alt="QR Code" style="width:150px;height:150px;">
              <p style="margin-top:16px;font-size:12px;color:#666;">链接: ${url.substring(0, 30)}...</p>
              <button onclick="this.closest('[style*=\\"position:fixed\\"]').remove()" style="margin-top:16px;padding:8px 24px;border:none;background:#07c160;color:#fff;border-radius:6px;cursor:pointer;">关闭</button>
            </div>`;
          document.body.appendChild(modal);
          break;
      }
    }
  }
  customElements.define('blog-share-buttons', ShareButtons);
})();
