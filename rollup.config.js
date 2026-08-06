import commonjs from '@rollup/plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const libName = 'sqsptemplate2';
const isProd = process.env.NODE_ENV == 'production';

const plugins = [
  json({
    esModule: true,
    compact: true,
    preferConst: true,
    namedExports: true
  }),
  resolve({
    mainFields: ['module'],
    extension: ['.js', '.json']
  }),
  commonjs({
    extensions: ['.json', '.js'],
  }),
];

if (isProd) {
  plugins.push(terser({
    output: {
      ecma: 5
    }
  }));
}

plugins.push(filesize({
  showBrotliSize: true
}));

const tasks = [
  {
    input: 'lib-es/index.js',
    output: {
      name: libName,
      file: `dist/${libName}.umd.js`,
      format: 'umd',
      exports: 'named',
      sourcemap: true,
    },
    plugins,
    external: [
      '@phensley/cldr-core',
      '@phensley/timezone',
      'utf8'
    ]
  },
];

export default tasks;
