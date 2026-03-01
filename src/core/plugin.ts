// src/core/plugin.ts
// ============================================================
// Blog Transformer 核心：Plugin 接口 + Pipeline Runner
// 大道至简：input → [plugins] → transform → output
// ============================================================

export type Awaitable<T> = T | Promise<T>

// ── Context：Plugin 之间共享的运行时状态 ──────────────────────
export interface BlogContext {
  /** 已注册的所有 plugin */
  plugins: BlogPlugin[]
  /** Plugin 间共享的 KV 存储，避免全局变量 */
  store: Map<string, unknown>
  /** 工具方法 */
  set<T>(key: string, value: T): void
  get<T>(key: string): T | undefined
}

// ── Input / Output：pipeline 流转的数据单元 ──────────────────
export interface BlogInput {
  /** 文章 slug */
  slug?: string
  /** 原始 MDX 内容 */
  raw?: string
  /** frontmatter 解析后的 meta */
  meta: Record<string, unknown>
  /** Plugin 可以往这里挂载任意产物 */
  artifacts: Record<string, unknown>
}

export type BlogOutput = BlogInput  // transform 后仍是同一形状，只是更丰富

// ── Plugin 接口：实现任意 hook 即可 ──────────────────────────
export interface BlogPlugin {
  /** plugin 唯一标识，用于调试和依赖声明 */
  name: string

  /**
   * setup：服务/构建启动时调用一次
   * 用于：注册能力到 ctx、预加载资源、校验配置
   */
  setup?(ctx: BlogContext): Awaitable<void>

  /**
   * transform：每篇文章/每次请求时调用
   * 接收当前 input，返回（可能被修改的）新 input
   * 不需要修改时直接返回原 input 即可
   */
  transform?(input: BlogInput, ctx: BlogContext): Awaitable<BlogInput>

  /**
   * teardown：服务关闭时调用
   * 用于：清理连接、刷新缓存等
   */
  teardown?(ctx: BlogContext): Awaitable<void>
}

// ── Pipeline Runner ───────────────────────────────────────────
export class BlogPipeline {
  private plugins: BlogPlugin[] = []
  private ctx: BlogContext

  constructor() {
    const store = new Map<string, unknown>()
    this.ctx = {
      plugins: this.plugins,
      store,
      set: (key, value) => store.set(key, value),
      get: (key) => store.get(key) as never,
    }
  }

  /** 注册 plugin，支持链式调用 */
  use(plugin: BlogPlugin): this {
    this.plugins.push(plugin)
    return this
  }

  /** 启动：依次调用所有 plugin 的 setup */
  async setup(): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.setup?.(this.ctx)
    }
  }

  /** 核心：input 线性流过所有 plugin 的 transform */
  async transform(input: BlogInput): Promise<BlogOutput> {
    let current = input
    for (const plugin of this.plugins) {
      current = await plugin.transform?.(current, this.ctx) ?? current
    }
    return current
  }

  /** 关闭：依次调用所有 plugin 的 teardown */
  async teardown(): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.teardown?.(this.ctx)
    }
  }

  /** 便捷方法：创建空 BlogInput */
  static createInput(partial?: Partial<BlogInput>): BlogInput {
    return {
      meta: {},
      artifacts: {},
      ...partial,
    }
  }
}
