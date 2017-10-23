const webpack = require('webpack')
const path = require('path')


const plugins = [
  new webpack.DefinePlugin({
    '"process.env.NODE_ENV"': 'development'
  })
]

const config = {
  target: 'web',
  entry: './demo/index.js',
  output: {
    path: path.resolve(__dirname, 'demo'),
    filename: 'bundle.js'
  },
  plugins: plugins,
  module: {
    rules: [{
      test: /\.js$/,
      include: [path.resolve(__dirname, 'src'), path.resolve(__dirname, 'demo')],
      loader: 'babel-loader'
    }]
  },
  devtool: 'source-map',
  devServer: {
    contentBase: [path.join(__dirname, 'demo'), __dirname],
    host: '0.0.0.0'
  }
}

module.exports = config
