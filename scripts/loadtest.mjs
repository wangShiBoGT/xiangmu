// 静态服务压测：模拟多人同时访问页面与模型分片
// 用法：先 `npm run build && npx vite preview --port 4173`，再 `npm run loadtest`
import autocannon from "autocannon";

const base = process.env.TARGET ?? "https://localhost:4173";

async function bench(path, connections, duration) {
  const r = await autocannon({
    url: base + path,
    connections,
    duration,
    // 开发/预览服务用自签证书
    tlsOptions: { rejectUnauthorized: false },
  });
  const ok = r["2xx"];
  console.log(
    `${path}  并发${connections}  ${duration}s  请求${r.requests.total}  2xx=${ok}  错误=${r.errors}  平均延迟=${r.latency.average}ms  p99=${r.latency.p99}ms  吞吐=${(r.throughput.average / 1024 / 1024).toFixed(1)}MB/s`,
  );
  if (r.errors > 0 || r.non2xx > 0) process.exitCode = 1;
}

console.log(`压测目标：${base}`);
await bench("/", 50, 10);
await bench("/", 200, 10);
