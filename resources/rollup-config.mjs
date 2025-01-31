import fs from 'fs';
import path from 'path';
import { minify } from 'uglify-js';
import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import saveLicense from 'uglify-save-license';
import stripBanner from 'rollup-plugin-strip-banner';

import copyright from './copyright.mjs';

const SRC_DIR = path.resolve('src');
const DIST_DIR = path.resolve('dist');

function uglify() {
  return {
    name: 'uglify',
    async renderChunk(code) {
      const result = minify(code, {
        mangle: { toplevel: true },
        output: { max_line_len: 2048, comments: saveLicense },
        compress: { comparisons: true, pure_getters: true, unsafe: true },
      });

      if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR);
      }

      fs.writeFileSync(
        path.join(DIST_DIR, 'immutable.min.js'),
        result.code,
        'utf8'
      );
      return code;
    },
  };
}

export default {
  input: path.join(SRC_DIR, 'Immutable.js'),
  output: {
    banner: copyright,
    name: 'Immutable',
    exports: 'named',
    file: path.join(DIST_DIR, 'immutable.js'),
    format: 'umd',
    sourcemap: false,
    plugins: [uglify()],
  },
  plugins: [commonjs(), json(), stripBanner(), buble()],
};
