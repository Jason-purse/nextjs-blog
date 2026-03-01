(function() {
  if (customElements.get('blog-guestbook')) return;
  class Guestbook extends HTMLElement {
    constructor() {
      super();
      this._messages = [];
      this._submitting = false;
    }

    connectedCallback() {
      this._render();
      this._loadMessages();
    }

    async _loadMessages() {
      try {
        const res = await fetch('/api/plugin-route/guestbook/data');
        const data = await res.json();
        this._messages = Array.isArray(data) ? data.reverse() : [];
        this._renderMessages();
      } catch (e) {
        console.error('[guestbook] load failed', e);
      }
    }

    _render() {
      const cfg = (window.__BLOG_PLUGIN_CONFIG__ || {})['guestbook'] || {};
      const title = cfg.title || '留言板';
      const placeholder = cfg.placeholder || '留下你的足迹...';
      const requireName = cfg.requireName !== false;

      this.innerHTML = `
        <style>
          .gb-wrap { max-width: 680px; margin: 0 auto; font-family: var(--blog-font-body, sans-serif); }
          .gb-form { background: var(--blog-color-surface, #fff); border: 1px solid var(--blog-color-border, #e5e7eb); border-radius: var(--blog-radius, 8px); padding: 24px; margin-bottom: 32px; }
          .gb-form h2 { font-size: 18px; font-weight: 600; color: var(--blog-color-text, #111); margin: 0 0 16px; font-family: var(--blog-font-heading, sans-serif); }
          .gb-input { width: 100%; box-sizing: border-box; border: 1px solid var(--blog-color-border, #e5e7eb); border-radius: var(--blog-radius-sm, 4px); padding: 8px 12px; font-size: 14px; color: var(--blog-color-text, #111); background: var(--blog-color-surface, #fff); margin-bottom: 10px; font-family: var(--blog-font-body, sans-serif); }
          .gb-input:focus { outline: none; border-color: var(--blog-color-primary, #3b82f6); box-shadow: 0 0 0 2px rgba(var(--blog-color-primary-rgb, 59,130,246), 0.15); }
          .gb-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--blog-color-border, #e5e7eb); border-radius: var(--blog-radius-sm, 4px); padding: 8px 12px; font-size: 14px; color: var(--blog-color-text, #111); background: var(--blog-color-surface, #fff); resize: vertical; min-height: 80px; font-family: var(--blog-font-body, sans-serif); }
          .gb-textarea:focus { outline: none; border-color: var(--blog-color-primary, #3b82f6); box-shadow: 0 0 0 2px rgba(var(--blog-color-primary-rgb, 59,130,246), 0.15); }
          .gb-btn { background: var(--blog-color-primary, #3b82f6); color: #fff; border: none; border-radius: var(--blog-radius-sm, 4px); padding: 8px 20px; font-size: 14px; cursor: pointer; transition: opacity 0.15s; }
          .gb-btn:hover { opacity: 0.85; }
          .gb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .gb-list { display: flex; flex-direction: column; gap: 16px; }
          .gb-item { background: var(--blog-color-surface, #fff); border: 1px solid var(--blog-color-border, #e5e7eb); border-radius: var(--blog-radius, 8px); padding: 16px 20px; }
          .gb-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
          .gb-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--blog-color-primary, #3b82f6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
          .gb-name { font-weight: 600; font-size: 14px; color: var(--blog-color-text, #111); }
          .gb-time { font-size: 12px; color: var(--blog-color-text-muted, #6b7280); margin-left: auto; }
          .gb-text { font-size: 14px; color: var(--blog-color-text, #111); line-height: 1.6; white-space: pre-wrap; }
          .gb-empty { text-align: center; color: var(--blog-color-text-muted, #6b7280); padding: 40px; font-size: 14px; }
          .gb-status { font-size: 13px; margin-top: 8px; }
          .gb-row { display: flex; gap: 10px; }
          .gb-row .gb-input { flex: 1; margin-bottom: 0; }
        </style>
        <div class="gb-wrap">
          <div class="gb-form">
            <h2>${title}</h2>
            ${requireName ? `<div class="gb-row"><input class="gb-input" id="gb-name" placeholder="你的昵称" maxlength="20"><input class="gb-input" id="gb-site" placeholder="个人网站（可选）" maxlength="100"></div><br>` : ''}
            <textarea class="gb-textarea" id="gb-msg" placeholder="${placeholder}" maxlength="500"></textarea>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
              <span class="gb-status" id="gb-status"></span>
              <button class="gb-btn" id="gb-submit">留言</button>
            </div>
          </div>
          <div class="gb-list" id="gb-list"><div class="gb-empty">加载中...</div></div>
        </div>`;

      this.querySelector('#gb-submit').addEventListener('click', () => this._submit(requireName));
    }

    async _submit(requireName) {
      const nameEl = this.querySelector('#gb-name');
      const msgEl = this.querySelector('#gb-msg');
      const statusEl = this.querySelector('#gb-status');
      const btnEl = this.querySelector('#gb-submit');

      const name = nameEl ? nameEl.value.trim() : '匿名';
      const msg = msgEl ? msgEl.value.trim() : '';

      if (requireName && !name) { statusEl.textContent = '请填写昵称'; statusEl.style.color = '#ef4444'; return; }
      if (!msg) { statusEl.textContent = '请输入留言内容'; statusEl.style.color = '#ef4444'; return; }

      btnEl.disabled = true;
      statusEl.textContent = '提交中...';
      statusEl.style.color = 'var(--blog-color-text-muted, #6b7280)';

      try {
        const res = await fetch('/api/plugin-route/guestbook/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name || '匿名', message: msg, site: this.querySelector('#gb-site')?.value.trim() || '' })
        });
        const data = await res.json();
        if (data.success) {
          if (msgEl) msgEl.value = '';
          if (nameEl) nameEl.value = '';
          statusEl.textContent = '✅ 留言成功！';
          statusEl.style.color = '#22c55e';
          await this._loadMessages();
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        } else {
          statusEl.textContent = data.error || '提交失败，请稍后再试';
          statusEl.style.color = '#ef4444';
        }
      } catch {
        statusEl.textContent = '网络错误，请稍后再试';
        statusEl.style.color = '#ef4444';
      } finally {
        btnEl.disabled = false;
      }
    }

    _renderMessages() {
      const listEl = this.querySelector('#gb-list');
      if (!listEl) return;
      if (this._messages.length === 0) {
        listEl.innerHTML = '<div class="gb-empty">暂无留言，快来留下第一条吧 👋</div>';
        return;
      }
      listEl.innerHTML = this._messages.map((m, i) => {
        const initial = (m.name || '?')[0].toUpperCase();
        const time = m._createdAt ? new Date(m._createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        const nameHtml = m.site ? `<a href="${m.site}" target="_blank" rel="noopener" class="gb-name" style="color:var(--blog-color-primary,#3b82f6);text-decoration:none;">${m.name}</a>` : `<span class="gb-name">${m.name}</span>`;
        return `<div class="gb-item">
          <div class="gb-meta">
            <div class="gb-avatar">${initial}</div>
            ${nameHtml}
            <span class="gb-time">${time}</span>
          </div>
          <div class="gb-text">${m.message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        </div>`;
      }).join('');
    }
  }
  customElements.define('blog-guestbook', Guestbook);
})();
