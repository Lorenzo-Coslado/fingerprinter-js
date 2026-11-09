import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

const compile = () =>
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
  });

export default [
  {
    input: { index: 'src/index.ts', collectors: 'src/collectors/index.ts', utils: 'src/utils.ts' },
    plugins: [compile()],
    output: [
      {
        dir: 'dist',
        format: 'esm',
        sourcemap: true,
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        entryFileNames: '[name].cjs',
        chunkFileNames: 'chunks/[name]-[hash].cjs',
      },
    ],
  },
  {
    input: 'src/index.ts',
    plugins: [compile()],
    output: {
      file: 'dist/index.umd.cjs',
      format: 'umd',
      name: 'FingerprinterJS',
      exports: 'named',
      sourcemap: true,
    },
  },
  ...['index', 'collectors', 'utils'].map((name) => ({
    input: `.cache/types/${name === 'collectors' ? 'collectors/index' : name}.d.ts`,
    plugins: [dts()],
    output: [
      { file: `dist/${name}.d.ts`, format: 'esm' },
      { file: `dist/${name}.d.cts`, format: 'esm' },
    ],
  })),
];
