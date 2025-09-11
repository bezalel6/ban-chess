const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['./server/ws-server.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: './server/dist/ws-server.js',
      external: ['bufferutil', 'utf-8-validate'], // Optional native dependencies
      minify: false, // Keep readable for debugging
      sourcemap: true,
      format: 'cjs',
      // Add alias resolution for @/ paths
      alias: {
        '@': path.resolve(__dirname, '..')
      }
    });
    
    console.log('✅ WebSocket server built successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();