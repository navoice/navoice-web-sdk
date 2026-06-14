const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'], 
  bundle: true,
  minify: true,
  outfile: 'dist/navoice.min.js',
  format: 'iife',
  globalName: 'NavoiceSDK',
}).catch(() => process.exit(1));