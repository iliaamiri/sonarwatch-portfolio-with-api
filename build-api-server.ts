import * as esbuild from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
// @ts-ignore - The error doesn't interfere with the build process and since
//              this is a building function, a non-significant TS error is not
//              noticeable and doesn't affect anything.
import swaggerJsdoc from 'swagger-jsdoc';

function generateSwaggerDocs() {
  const targetDir = path.resolve('dist/api')

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'API Documentation',
        version: '1.0.0',
      },
    },
    apis: ['./packages/api/src/*.ts'], // Path to API routes
  };

  const specs = swaggerJsdoc(options);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  fs.writeFileSync(
    path.join('dist/api', 'swagger.json'),
    JSON.stringify(specs, null, 2)
  )
  console.log('✓ Generated swagger.json')
}


async function build() {
  generateSwaggerDocs();

  try {
    const result = await esbuild.build({
      entryPoints: ['./packages/api/src/main.ts'],
      bundle: true,
      platform: 'node',
      target: 'node21',
      outfile: 'dist/api/api-server.js',
      format: 'cjs',
      sourcemap: true,
      banner: {
        js: `
        `
      },
      metafile: true,
      external: [
        '@triton-one/yellowstone-grpc',
        'swagger-ui-dist',
      ],
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
        'process.env.WASM_PATH': JSON.stringify(path.resolve('dist/api'))
      }
    })

    // Copy WASM files and their supporting files
    const sourceDir = path.resolve('node_modules/@triton-one/yellowstone-grpc/dist/encoding')
    const targetDir = path.resolve('dist/api')

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

    if (result.metafile) {
      const analysis = esbuild.analyzeMetafileSync(result.metafile)
      console.log('Bundle analysis:', analysis)
    }

    console.log('⚡ API Server build complete!')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}


build()
