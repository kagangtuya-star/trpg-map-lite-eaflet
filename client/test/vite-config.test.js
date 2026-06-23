import { describe, expect, it } from 'vitest';

import viteConfig from '../../vite.config.js';

describe('vite config', () => {
  it('proxies uploaded cursor assets to the server during dev', () => {
    expect(viteConfig.server.proxy).toMatchObject({
      '/uploads': 'http://localhost:3000'
    });
  });
});
