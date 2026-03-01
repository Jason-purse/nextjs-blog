// ============================================================
// Pipeline Core - Input → Transformers → Output
// ============================================================

import type { PipelineInput, PipelineOutput, PipelineContext, PipelinePhase, PipelineInjection } from '@/types/plugin'

/** Pipeline 配置 */
export interface PipelineConfig {
  phases: PipelinePhaseConfig[]
  context: PipelineContext
}

/** 阶段配置 */
interface PipelinePhaseConfig {
  phase: PipelinePhase
  plugins: PipelinePlugin[]
}

/** Pipeline 插件实例 */
interface PipelinePlugin {
  id: string
  source: string
  config?: Record<string, any>
  enabled?: boolean
  // Source 插件
  fetch?: (context: PipelineContext) => Promise<PipelineInput>
  // Transform 插件  
  transform?: (input: PipelineInput) => Promise<PipelineInput>
  // Output 插件
  output?: (output: PipelineOutput) => Promise<PipelineOutput>
}

/** Pipeline 类 */
export class Pipeline {
  private plugins: Map<PipelinePhase, PipelinePlugin[]> = new Map()
  private context: PipelineContext

  constructor(config: PipelineConfig) {
    this.context = config.context
    for (const phaseConfig of config.phases) {
      this.plugins.set(phaseConfig.phase, phaseConfig.plugins)
    }
  }

  /** 设置上下文 */
  setContext(context: PipelineContext) {
    this.context = context
  }

  /** 获取上下文 */
  getContext(): PipelineContext {
    return this.context
  }

  /** 执行完整 Pipeline */
  async run(): Promise<PipelineOutput> {
    // 1. Source 阶段 - 获取输入
    let input = await this.runSourcePhase()

    // 2. Transform 阶段 - 处理转换
    input = await this.runTransformPhase(input)

    // 3. Output 阶段 - 输出
    return this.runOutputPhase(input)
  }

  /** 执行 Source 阶段 */
  private async runSourcePhase(): Promise<PipelineInput> {
    const sourcePlugins = this.plugins.get('source') || []
    
    let input: PipelineInput = {
      contentType: 'mdx',
      content: '',
      metadata: {},
      context: this.context
    }

    for (const plugin of sourcePlugins) {
      if (!plugin.enabled) continue
      try {
        if (plugin.fetch) {
          input = await plugin.fetch(this.context)
        }
      } catch (e) {
        console.warn(`[Pipeline] Source plugin ${plugin.id} failed:`, e)
      }
    }

    return input
  }

  /** 执行 Transform 阶段 */
  private async runTransformPhase(input: PipelineInput): Promise<PipelineInput> {
    const transformPlugins = this.plugins.get('transform') || []
    
    let currentInput = { ...input }

    for (const plugin of transformPlugins) {
      if (!plugin.enabled) continue
      try {
        if (plugin.transform) {
          currentInput = await plugin.transform(currentInput)
        }
      } catch (e) {
        console.warn(`[Pipeline] Transform plugin ${plugin.id} failed:`, e)
      }
    }

    return currentInput
  }

  /** 执行 Output 阶段 */
  private async runOutputPhase(input: PipelineInput): Promise<PipelineOutput> {
    const outputPlugins = this.plugins.get('output') || []
    
    let output: PipelineOutput = {
      content: input.content,
      metadata: input.metadata,
      injections: []
    }

    for (const plugin of outputPlugins) {
      if (!plugin.enabled) continue
      try {
        if (plugin.output) {
          output = await plugin.output(output)
        }
      } catch (e) {
        console.warn(`[Pipeline] Output plugin ${plugin.id} failed:`, e)
      }
    }

    return output
  }

  /** 添加注入脚本 */
  addInjection(injection: PipelineInjection) {
    // 在 run 中会收集
  }
}

/** 便捷函数: 创建 Pipeline */
export function createPipeline(
  plugins: PipelinePlugin[],
  context: PipelineContext
): Pipeline {
  // 按阶段分组
  const phaseConfigs: PipelinePhaseConfig[] = [
    { phase: 'source', plugins: plugins.filter(p => p.fetch) },
    { phase: 'transform', plugins: plugins.filter(p => p.transform) },
    { phase: 'output', plugins: plugins.filter(p => p.output) }
  ]

  return new Pipeline({ phases: phaseConfigs, context })
}

/** 便捷函数: 创建 Markdown Pipeline */
export async function processMarkdown(
  content: string,
  metadata: Record<string, any>,
  transformers: Array<(input: PipelineInput) => Promise<PipelineInput>>,
  context?: PipelineContext
): Promise<PipelineOutput> {
  let input: PipelineInput = {
    contentType: 'mdx',
    content,
    metadata,
    context: context || {}
  }

  // 执行所有 transformers
  for (const transform of transformers) {
    input = await transform(input)
  }

  return {
    content: input.content,
    metadata: input.metadata,
    injections: []
  }
}
