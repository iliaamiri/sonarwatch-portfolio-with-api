import * as esbuild from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['./packages/plugins/scripts/serve-cache.ts'],
      bundle: true,
      platform: 'node',
      target: 'node21',
      outfile: 'dist/cache-server/serve-cache.js',
      format: 'cjs',
      sourcemap: true,
      external: [
        '@triton-one/yellowstone-grpc',
        'bigint-buffer',
        'node-gyp-builder'
      ],
      define: {
        'process.env.WASM_PATH': JSON.stringify(path.resolve('dist/cache-server'))
      },
      banner: {
        js: `
        `
      }
    })

    // Copy WASM files and their supporting files
    const sourceDir = path.resolve('node_modules/@triton-one/yellowstone-grpc/dist/encoding')
    const targetDir = path.resolve('dist/cache-server')

    // Create dist directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // Copy all necessary WASM-related files
    const files = fs.readdirSync(sourceDir)
    files.forEach(file => {
      if (file.includes('wasm')) {
        fs.copyFileSync(
          path.join(sourceDir, file),
          path.join(targetDir, file)
        )
      }
    })

    console.log('⚡ Build complete!')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

build()

