// reading-progress: WebComponent 完整版
// Shadow DOM 隔离，支持配置 color / height，兼容所有现代浏览器

class BlogReadingProgress extends HTMLElement {
  static get observedAttributes() { return ['color', 'height'] }

  #bar = null
  #raf = null

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'closed' })
    const color  = this.getAttribute('color')  ?? 'var(--blog-color-primary, #3b82f6)'
    const height = this.getAttribute('height') ?? '3'

    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .bar {
          position: fixed;
          top: 0; left: 0;
          width: 0%;
          height: ${height}px;
          background: ${color};
          transition: width 0.1s linear;
          z-index: 9999;
          pointer-events: none;
        }
      </style>
      <div class="bar"></div>
    `

    this.#bar = shadow.querySelector('.bar')
    this.#onScroll()
    window.addEventListener('scroll', this.#onScroll, { passive: true })
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.#onScroll)
    cancelAnimationFrame(this.#raf)
  }

  #onScroll = () => {
    this.#raf = requestAnimationFrame(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const progress = scrollTop / (scrollHeight - clientHeight) * 100
      if (this.#bar) this.#bar.style.width = `${Math.min(progress, 100)}%`
    })
  }
}

customElements.define('blog-reading-progress', BlogReadingProgress)
