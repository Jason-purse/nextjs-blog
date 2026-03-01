(function() {
  if (customElements.get('blog-guestbook')) return;
  
  const styles = `
    .gb-container { 
      max-width: 720px; 
      margin: 0 auto; 
      padding: 48px 24px; 
      font-family: var(--blog-font-body, -apple-system, BlinkMacSystemFont, sans-serif);
    }
    .gb-header { 
      text-align: center; 
      margin-bottom: 40px; 
    }
    .gb-title { 
      font-size: 32px; 
      font-weight: 700; 
      color: var(--blog-color-text, #111); 
      margin: 0 0 8px;
      font-family: var(--blog-font-heading, serif);
    }
    .gb-subtitle {
      color: var(--blog-color-text-muted, #666);
      font-size: 15px;
    }
    .gb-form { 
      background: var(--blog-color-surface, #fff); 
      border: 1px solid var(--blog-color-border, #e5e7eb); 
      border-radius: 16px; 
      padding: 28px; 
      margin-bottom: 32px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    }
    .gb-input { 
      width: 100%; 
      box-sizing: border-box; 
      border: 1.5px solid var(--blog-color-border, #e5e7eb); 
      border-radius: 10px; 
      padding: 12px 16px; 
      font-size: 15px; 
      color: var(--blog-color-text, #111); 
      background: var(--blog-color-surface, #fff); 
      transition: all 0.2s ease;
      margin-bottom: 12px;
      font-family: inherit;
    }
    .gb-input:focus { 
      outline: none; 
      border-color: var(--blog-color-primary, #3b82f6); 
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .gb-input::placeholder { color: var(--blog-color-text-muted, #999); }
    .gb-textarea { 
      width: 100%; 
      box-sizing: border-box; 
      border: 1.5px solid var(--blog-color-border, #e5e7eb); 
      border-radius: 10px; 
      padding: 12px 16px; 
      font-size: 15px; 
      color: var(--blog-color-text, #111); 
      background: var(--blog-color-surface, #fff); 
      resize: vertical; 
      min-height: 100px; 
      font-family: inherit;
      transition: all 0.2s ease;
    }
    .gb-textarea:focus { 
      outline: none; 
      border-color: var(--blog-color-primary, #3b82f6); 
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .gb-btn { 
      background: var(--blog-color-primary, #3b82f6); 
      color: #fff; 
      border: none; 
      border-radius: 10px; 
      padding: 12px 28px; 
      font-size: 15px; 
      font-weight: 600; 
      cursor: pointer; 
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .gb-btn:hover { 
      opacity: 0.9; 
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59,130,246,0.25);
    }
    .gb-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .gb-btn-row { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
    .gb-status { font-size: 14px; margin-top: 8px; }
    .gb-list { display: flex; flex-direction: column; gap: 16px; }
    .gb-item { 
      background: var(--blog-color-surface, #fff); 
      border: 1px solid var(--blog-color-border, #e5e7eb); 
      border-radius: 14px; 
      padding: 20px 24px;
      transition: all 0.2s ease;
    }
    .gb-item:hover { border-color: var(--blog-color-primary, #3b82f6); box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
    .gb-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .gb-avatar { 
      width: 40px; height: 40px; border-radius: 50%; 
      background: linear-gradient(135deg, var(--blog-color-primary, #3b82f6), var(--blog-color-accent, #60a5fa)); 
      color: #fff; 
      display: flex; align-items: center; justify-content: center; 
      font-size: 16px; font-weight: 600; 
      flex-shrink: 0; 
    }
    .gb-name { font-weight: 600; font-size: 15px; color: var(--blog-color-text, #111); }
    .gb-time { font-size: 13px; color: var(--blog-color-text-muted, #999); margin-left: auto; }
    .gb-text { font-size: 14px; color: var(--blog-color-text, #333); line-height: 1.7; white-space: pre-wrap; }
    .gb-empty { 
      text-align: center; 
      padding: 48px; 
      color: var(--blog-color-text-muted, #999); 
      font-size: 15px;
      background: var(--blog-color-surface, #f9f9f9);
      border-radius: 14px;
    }
    .gb-form-row { display: flex; gap: 12px; }
    .gb-form-row .gb-input { flex: 1; margin-bottom: 0; }
    @media (max-width: 640px) {
      .gb-form-row { flex-direction: column; }
      .gb-container { padding: 32px 16px; }
      .gb-title { font-size: 26px; }
    }
  `;

  class Guestbook extends HTMLElement {
    constructor() { super(); this._messages = []; this._submitting = false; }
    connectedCallback() {
      this.innerHTML = `<style>${styles}</style><div class="gb-container"></div>`;
      this._render();
      this._loadMessages();
    }
    async _loadMessages() {
      try {
        const res = await fetch('/api/plugin-route/guestbook/data');
        const data = await res.json();
        this._messages = Array.isArray(data) ? data.reverse() : [];
        this._renderMessages();
      } catch (e) { console.error('[guestbook] load failed', e); }
    }
    _render() {
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['guestbook'] || {};
      const title = cfg.title || '留言板';
      const subtitle = cfg.subtitle || '留下你的足迹，一起交流吧';
      const placeholder = cfg.placeholder || '写下你的想法...';
      const requireName = cfg.requireName !== false;

      const container = this.querySelector('.gb-container');
      container.innerHTML = `
        <div class="gb-header">
          <h1 class="gb-title">${title}</h1>
          <p class="gb-subtitle">${subtitle}</p>
        </div>
        <div class="gb-form">
          ${requireName ? `
            <div class="gb-form-row">
              <input class="gb-input" id="gb-name" placeholder="昵称 *" maxlength="20">
              <input class="gb-input" id="gb-site" placeholder="网站（可选）" maxlength="100">
            </div>
          ` : `<input class="gb-input" id="gb-name" placeholder="昵称" maxlength="20" style="display:none">`}
          <textarea class="gb-textarea" id="gb-msg" placeholder="${placeholder}"></textarea>
          <div class="gb-btn-row">
            <span class="gb-status" id="gb-status"></span>
            <button class="gb-btn" id="gb-submit">
              <span>发布</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
        <div class="gb-list" id="gb-list"><div class="gb-empty">Loading...</div></div>`;

      this.querySelector('#gb-submit').addEventListener('click', () => this._submit(requireName));
    }
    async _submit(requireName) {
      const nameEl = this.querySelector('#gb-name');
      const msgEl = this.querySelector('#gb-msg');
      const statusEl = this.querySelector('#gb-status');
      const btnEl = this.querySelector('#gb-submit');

      const name = nameEl ? nameEl.value.trim() : '匿名';
      const msg = msgEl ? msgEl.value.trim() : '';
      const site = this.querySelector('#gb-site')?.value.trim() || '';

      if (requireName && !name) { statusEl.textContent = '请填写昵称'; statusEl.style.color = '#ef4444'; return; }
      if (!msg) { statusEl.textContent = '请输入留言'; statusEl.style.color = '#ef4444'; return; }

      btnEl.disabled = true;
      statusEl.textContent = '发布中...';
      statusEl.style.color = 'var(--blog-color-text-muted, #666)';

      try {
        const res = await fetch('/api/plugin-route/guestbook/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name || '匿名', message: msg, site })
        });
        const data = await res.json();
        if (data.success) {
          if (msgEl) msgEl.value = '';
          if (nameEl) nameEl.value = '';
          statusEl.textContent = '✓ 发布成功';
          statusEl.style.color = '#22c55e';
          await this._loadMessages();
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        } else {
          statusEl.textContent = data.error || '发布失败';
          statusEl.style.color = '#ef4444';
        }
      } catch {
        statusEl.textContent = '网络错误';
        statusEl.style.color = '#ef4444';
      } finally {
        btnEl.disabled = false;
      }
    }
    _renderMessages() {
      const listEl = this.querySelector('#gb-list');
      if (!listEl) return;
      if (this._messages.length === 0) {
        listEl.innerHTML = '<div class="gb-empty">暂无留言，快来成为第一个留言者吧 💬</div>';
        return;
      }
      listEl.innerHTML = this._messages.map((m, i) => {
        const initial = (m.name || '?')[0].toUpperCase();
        const time = m._createdAt ? new Date(m._createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) : '';
        const nameHtml = m.site ? `<a href="${m.site}" target="_blank" rel="noopener" class="gb-name" style="color:var(--blog-color-primary,#3b82f6);text-decoration:none;">${m.name}</a>` : `<span class="gb-name">${m.name}</span>`;
        return `<div class="gb-item">
          <div class="gb-meta">
            <div class="gb-avatar">${initial}</div>
            ${nameHtml}
            <span class="gb-time">${time}</span>
          </div>
          <div class="gb-text">${(m.message||'').replace(/</g,'&lt;')}</div>
        </div>`;
      }).join('');
    }
  }
  customElements.define('blog-guestbook', Guestbook);
})();
