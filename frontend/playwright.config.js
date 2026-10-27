import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: 0,
  timeout: 30000,
  globalTimeout: 180000,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:5173', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'cd ../backend && python -m uvicorn main:app --host 127.0.0.1 --port 8081', url: 'http://127.0.0.1:8081/api/ready', timeout: 30000 },
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', timeout: 30000 },
  ],
});
