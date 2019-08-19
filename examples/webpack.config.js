const path = require('path');
const webpack = require('webpack');

module.exports = (env) => ({
  entry: {
    'bundle.js': [
      path.resolve(__dirname, './index.js'),
    ],
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
      'process.env': {},
    }),
  ],
});
