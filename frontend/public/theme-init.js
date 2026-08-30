// 首帧前应用主题，避免闪烁（完整逻辑见 hooks/useTheme；默认深色）
// 独立同源文件而非内联脚本：兼容生产 CSP default-src 'self'
try {
  var t = JSON.parse(localStorage.getItem('hotsearch_monitor_theme') || '"dark"')
  var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
} catch (e) {}
