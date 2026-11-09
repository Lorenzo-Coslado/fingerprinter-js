import { cp, mkdir, rm } from 'node:fs/promises';

const destination = new URL('../docs/sdk/', import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(new URL('../dist/', import.meta.url), destination, { recursive: true });
console.log('Prepared GitHub Pages demo with the local SDK build.');
