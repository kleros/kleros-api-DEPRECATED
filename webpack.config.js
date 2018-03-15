const { resolve } = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    path: resolve(__dirname, 'umd/'),
    filename: 'kleros-api.js',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    library: 'KlerosAPI'
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
