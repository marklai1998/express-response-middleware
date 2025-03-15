import dts from 'rollup-plugin-dts'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import esbuild from 'rollup-plugin-esbuild'

export default [
  {
    input: 'src/index.ts',
    plugins: [peerDepsExternal(), esbuild()],
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
    input: 'src/index.ts',
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
        entryFileNames: '[name].d.cts',
        chunkFileNames: '[name]-[hash].d.cts',
      },
    ],
  },
]
