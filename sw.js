// 自杀式 Service Worker：清理旧版 PWA 遗留缓存后自动注销自己。
// 场景：旧版用 vite-plugin-pwa 注册过 SW，会从缓存返回旧页面（连新 HTML 都拿不到）。
// 浏览器每次导航都会检查 sw.js 更新 → 装到这个新版本 → 激活时：
// 1) 注销自己 2) 清空所有 caches 3) 强制所有客户端刷新（拿到真正的新版本）
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) { /* 忽略 */ }
    try {
      await self.registration.unregister();
    } catch (_) { /* 忽略 */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.navigate(c.url));
    } catch (_) { /* 忽略 */ }
  })());
});
