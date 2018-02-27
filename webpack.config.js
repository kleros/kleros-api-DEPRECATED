const { resolve } = require('path')

const libraryName = 'kleros-api'
module.exports = env => ({
  entry: './src/index.js',
  output: {
    path: resolve(__dirname, 'lib/'),
    filename: env.NODE_ENV === 'production' ? libraryName + '.js' : undefined,
    libraryTarget: 'umd',
    umdNamedDefine: true,
    library: libraryName
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
})
