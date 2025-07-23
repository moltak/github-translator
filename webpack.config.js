const path = require('path');
module.exports = {
  mode: 'production',
  entry: {
    content: './src/content.ts',
    popup: './src/popup/popup.ts',
    background: './src/background.ts'
  },
  output: {
    path: path.join(__dirname, 'dist/js'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
