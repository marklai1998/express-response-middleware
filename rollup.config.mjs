import dts from 'rollup-plugin-dts'
import typescript from '@rollup/plugin-typescript'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'

export default [
  {
    input: 'src/main.ts',
    plugins: [peerDepsExternal(), typescript()],
    output: [
      {
        dir: 'dist/esm',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs',
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
        interop: 'auto',
        sourcemap: true,
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name]-[hash].cjs',
      },
    ],
  },
  {
    input: 'src/main.ts',
    plugins: [
      dts({
        compilerOptions: {
          // https://github.com/Swatinem/rollup-plugin-dts/issues/143
          preserveSymlinks: false,
        },
      }),
    ],
    output: [
      {
        dir: 'dist/esm',
        format: 'es',
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
        interop: 'auto',
      },
    ],
  },
]
