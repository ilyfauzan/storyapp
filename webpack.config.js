const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // Import plugin
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  mode: 'development',
  devServer: {
    static: './dist',
    open: true,
    port: 3000,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
 plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // Gunakan template HTML Anda
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' }, // Menyalin manifest.json ke dist
        { from: 'src/service-worker.js', to: 'service-worker.js' },
        { from: 'src/icons', to: 'icons' }, // Menyalin service-worker.js ke dist
      ],
    }),
  ],
};
