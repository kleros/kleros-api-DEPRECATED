const { resolve } = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: resolve(__dirname, 'lib/'),
    filename: 'kleros-api.js',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    library: 'kleros-api'
  },

  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  }
}
