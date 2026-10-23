/**
 * @typedef {'tool_call' | 'tool_result' | 'reasoning' | 'routing'} AgentStepType
 */

/**
 * @typedef {Object} AgentStep
 * @property {AgentStepType} type
 * @property {string} label
 * @property {string} detail
 */

/**
 * @typedef {Object} DashboardChart
 * @property {string} [id]
 * @property {string} [title]
 * @property {string} [type]
 * @property {string} [xAxisKey]
 * @property {Array<{ key: string, name?: string, color?: string }>} [dataKeys]
 * @property {Array<Record<string, unknown>>} [data]
 */

/**
 * @typedef {Object} DashboardPage
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [icon]
 * @property {string} [summary]
 * @property {string[]} [insights]
 * @property {Array<{ label: string, value: string, change?: string, description?: string }>} [kpis]
 * @property {DashboardChart[]} [charts]
 */

/**
 * @typedef {Object} DashboardSpec
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {DashboardPage[]} [pages]
 * @property {DashboardChart[]} [charts]
 */

/**
 * @typedef {Object} QueryResponse
 * @property {string} answer
 * @property {string} [agent]
 * @property {string} [image]
 * @property {DashboardSpec} [dashboard]
 * @property {string} [thinking]
 * @property {AgentStep[]} [steps]
 * @property {string} [source_id]
 * @property {string} [source_name]
 * @property {boolean} [source_fallback]
 * @property {string} [source_requested_id]
 */

/**
 * Normalize axios payload into a consistent QueryResponse shape.
 * @param {unknown} data
 * @returns {QueryResponse}
 */
export function normalizeQueryResponse(data) {
  if (!data || typeof data !== "object") {
    return { answer: "" };
  }
  /** @type {Record<string, unknown>} */
  const raw = data;
  return {
    answer: typeof raw.answer === "string" ? raw.answer : String(raw.answer ?? ""),
    agent: typeof raw.agent === "string" ? raw.agent : undefined,
    image: typeof raw.image === "string" ? raw.image : undefined,
    dashboard:
      raw.dashboard && typeof raw.dashboard === "object"
        ? /** @type {DashboardSpec} */ (raw.dashboard)
        : undefined,
    thinking: typeof raw.thinking === "string" ? raw.thinking : undefined,
    steps: Array.isArray(raw.steps) ? /** @type {AgentStep[]} */ (raw.steps) : [],
    source_id: typeof raw.source_id === "string" ? raw.source_id : undefined,
    source_name: typeof raw.source_name === "string" ? raw.source_name : undefined,
    source_fallback: raw.source_fallback === true,
    source_requested_id:
      typeof raw.source_requested_id === "string"
        ? raw.source_requested_id
        : undefined,
  };
}
