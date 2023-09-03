const path = require('path');
const webpack = require('webpack');
const parsedEnv = require('dotenv').config({ path: '../.env' }).parsed;

const envJson = {};

Object.keys(parsedEnv).forEach((key) => {
  envJson[key] = JSON.stringify(parsedEnv[key]);
});

module.exports = () => ({
  entry: {
    'bundle.js': [path.resolve(__dirname, './index.js')],
  },
  output: {
    filename: '[name]',
    path: path.resolve(__dirname, './dist'),
  },
  node: {
    Buffer: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': envJson,
    }),
  ],
});
