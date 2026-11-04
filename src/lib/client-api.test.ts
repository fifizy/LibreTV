import { afterEach, expect, it, vi } from 'vitest';
import { api } from './client-api';
import type { SourceConfig } from './types';
afterEach(() => vi.unstubAllGlobals());
it('searches every source once while keeping requests and concurrency bounded', async () => {
  let active = 0;
  let peak = 0;
  const seen: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    const { sources } = JSON.parse(init.body);
    expect(sources.length).toBeLessThanOrEqual(5);
    seen.push(...sources.map((s: SourceConfig) => s.key));
    peak = Math.max(peak, ++active);
    await new Promise((r) => setTimeout(r, 1));
    active--;
    return new Response(JSON.stringify({list: [], failures: sources.map((s: SourceConfig) => ({sourceKey:s.key,error:'offline'}))}));
  }));
  const sources = Array.from({length: 17}, (_, i) => ({key:String(i),name:String(i),url:'https://example.com'}));
  const result = await api.search('test', sources, true);
  expect(new Set(seen).size).toBe(17);
  expect(seen.length).toBe(17);
  expect(peak).toBeLessThanOrEqual(2);
  expect(result.failures).toHaveLength(17);
});
