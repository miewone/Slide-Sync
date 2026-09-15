/** Forward chart creation at call time so a later chart deck can load ECharts. */
export function init(...args) {
  if (!globalThis.echarts?.init) throw Error('차트 렌더러를 먼저 불러와야 합니다.');
  return globalThis.echarts.init(...args);
}
