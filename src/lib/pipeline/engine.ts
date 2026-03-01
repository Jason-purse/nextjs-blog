// ============================================================
// Pipeline Engine - 内容处理流水线核心
// ============================================================

import {
  DEFAULT_FAILURE_POLICY,
  type RawContent,
  type ContentNode,
  type PluginContext,
  type SourcePlugin,
  type ParserPlugin,
  type TransformerPlugin,
  type EmitterPlugin,
  type HookPlugin,
  type HookPoint,
  type HookEvent,
  type PipelineConfig,
  type FailurePolicy
} from '@/types/pipeline'

// 默认日志器
const defaultLogger = {
  info: (msg: string) => console.log(`[Pipeline] ${msg}`),
  warn: (msg: string) => console.warn(`[Pipeline] ${msg}`),
  error: (msg: string, err?: Error) => console.error(`[Pipeline] ${msg}`, err),
  debug: (msg: string) => console.debug(`[Pipeline] ${msg}`)
}

// 默认缓存
const defaultCache = new Map<string, unknown>()

export class ContentPipeline {
  private sources: SourcePlugin[] = []
  private parsers: ParserPlugin[] = []
  private transformers: TransformerPlugin[] = []
  private emitters: EmitterPlugin[] = []
  private hooks: HookPlugin[] = []
  private nodeCache = new Map<string, ContentNode>()
  private failurePolicy: FailurePolicy

  constructor(
    private config: PipelineConfig,
    private context: PluginContext
  ) {
    this.failurePolicy = DEFAULT_FAILURE_POLICY
    
    // 注册插件
    for (const plugin of config.sources) this.sources.push(plugin)
    for (const plugin of config.parsers) this.parsers.push(plugin)
    for (const plugin of config.transformers) this.transformers.push(plugin)
    for (const plugin of config.emitters) this.emitters.push(plugin)
    for (const plugin of config.hooks) this.hooks.push(plugin)
    
    // 排序 transformers by priority
    this.transformers.sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50))
  }

  /** 执行完整流水线 */
  async run(): Promise<ContentNode[]> {
    this.context.logger.info('Pipeline starting...')
    
    // Phase 1: Source
    await this.fireHook('pipeline:start', null)
    const allRaw = await this.runSources()
    this.context.logger.info(`Fetched ${allRaw.length} raw contents`)

    // Phase 2: Parse
    const allNodes = await this.runParsers(allRaw)
    this.context.logger.info(`Parsed ${allNodes.length} nodes`)

    // 构建 slug → node 查找表
    allNodes.forEach(n => this.nodeCache.set(n.slug, n))
    this.context.getAllNodes = () => Array.from(this.nodeCache.values())
    this.context.getNode = (slug: string) => this.nodeCache.get(slug)

    // Phase 3: Transform
    const transformed = await this.runTransformers(allNodes)
    this.context.logger.info(`Transformed ${transformed.length} nodes`)

    // Phase 4: Emit
    await this.runEmitters(transformed)
    
    await this.fireHook('pipeline:end', transformed)
    this.context.logger.info('Pipeline completed!')
    
    return transformed
  }

  /** 获取单个节点 */
  getNode(slug: string): ContentNode | undefined {
    return this.nodeCache.get(slug)
  }

  /** 获取所有节点 */
  getAllNodes(): ContentNode[] {
    return Array.from(this.nodeCache.values())
  }

  // ============================================================
  // Phase 1: Source
  // ============================================================
  private async runSources(): Promise<RawContent[]> {
    await this.fireHook('source:before', null)
    
    const results = await Promise.allSettled(
      this.sources.map(s => s.fetch(this.context))
    )
    
    const allRaw: RawContent[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        allRaw.push(...r.value)
      } else {
        this.context.logger.error(`Source ${this.sources[i].name} failed:`, r.reason)
        this.fireHook('error', { source: this.sources[i].name, error: r.reason })
      }
    })
    
    await this.fireHook('source:after', allRaw)
    return allRaw
  }

  // ============================================================
  // Phase 2: Parse
  // ============================================================
  private async runParsers(raws: RawContent[]): Promise<ContentNode[]> {
    await this.fireHook('parse:before', raws)
    
    const nodes: ContentNode[] = []
    
    for (const raw of raws) {
      const parser = this.findParser(raw)
      if (!parser) {
        this.context.logger.warn(`No parser for mimeType: ${raw.mimeType}, skipping ${raw.id}`)
        continue
      }
      
      try {
        const node = await parser.parse(raw, this.context)
        nodes.push(node)
      } catch (err) {
        this.context.logger.error(`Parser ${parser.name} failed on ${raw.id}:`, err as Error)
        await this.fireHook('error', { parser: parser.name, raw, error: err })
      }
    }
    
    await this.fireHook('parse:after', nodes)
    return nodes
  }

  private findParser(raw: RawContent): ParserPlugin | undefined {
    return this.parsers.find(p => {
      if (typeof p.accept === 'function') return p.accept(raw)
      if (Array.isArray(p.accept)) return p.accept.includes(raw.mimeType)
      return p.accept === raw.mimeType
    })
  }

  // ============================================================
  // Phase 3: Transform
  // ============================================================
  private async runTransformers(nodes: ContentNode[]): Promise<ContentNode[]> {
    await this.fireHook('transform:before', nodes)
    
    const results: ContentNode[] = []
    
    for (const node of nodes) {
      let current = node
      
      for (const transformer of this.transformers) {
        // filter 检查
        if (transformer.filter && !transformer.filter(current)) {
          continue
        }
        
        try {
          current = await transformer.transform(current, this.context)
        } catch (err) {
          this.context.logger.error(`Transformer ${transformer.name} failed:`, err as Error)
          
          // 失败处理策略
          if (this.failurePolicy.onError === 'throw') {
            throw err
          }
          // skip: 继续用当前状态
          // fallback: 可以添加 fallback 逻辑
        }
      }
      
      results.push(current)
    }
    
    await this.fireHook('transform:after', results)
    return results
  }

  // ============================================================
  // Phase 4: Emit
  // ============================================================
  private async runEmitters(nodes: ContentNode[]): Promise<void> {
    await this.fireHook('emit:before', nodes)
    
    for (const emitter of this.emitters) {
      try {
        await Promise.all(nodes.map(node => emitter.emit(node, this.context)))
      } catch (err) {
        this.context.logger.error(`Emitter ${emitter.name} failed:`, err as Error)
        await this.fireHook('error', { emitter: emitter.name, error: err })
      }
    }
    
    await this.fireHook('emit:after', nodes)
  }

  // ============================================================
  // Hooks
  // ============================================================
  private async fireHook(point: HookPoint, payload: unknown): Promise<void> {
    const matchingHooks = this.hooks.filter(h => {
      if (typeof h.on === 'string') return h.on === point
      return h.on.includes(point)
    })
    
    for (const hook of matchingHooks) {
      try {
        const event: HookEvent = {
          point,
          payload,
          timestamp: Date.now()
        }
        await hook.handler(event, this.context)
      } catch (err) {
        // Hook 失败不阻塞主流程
        this.context.logger.warn(`Hook ${hook.name} failed at ${point}: ${err}`)
      }
    }
  }
}

// ============================================================
// 便捷函数: 创建 Pipeline
// ============================================================

export function createPipeline(config: Omit<PipelineConfig, 'context'>, logger?: Partial<typeof defaultLogger>): ContentPipeline {
  const context: PluginContext = {
    logger: { ...defaultLogger, ...logger } as any,
    config: config as any,
    cache: {
      get: (key: string) => defaultCache.get(key),
      set: (key: string, value: unknown) => defaultCache.set(key, value),
      delete: (key: string) => defaultCache.delete(key)
    },
    getNode: () => undefined,
    getAllNodes: () => []
  }
  
  return new ContentPipeline(config as PipelineConfig, context)
}
