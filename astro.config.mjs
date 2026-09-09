import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://salimyoussefnajim.com',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  build: { format: 'directory' }
});
