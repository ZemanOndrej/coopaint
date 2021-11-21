const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv').config( {
  path: path.join(__dirname, '.env')
} );

module.exports = (env, options) => ( {
  entry: {
    app: './ts/index.ts'
  },
  output: {
    path: path.join(__dirname, '..', '..', 'dist'),
    filename: 'app.bundle.js'
  },

	resolve: {
    extensions: ['.ts', '.js', '.json']
	},
  module: {
      rules: [
        {
          test: /\.ts?$/,
          loader: 'ts-loader',
          exclude: /node_modules/
        }
      ]
  },
	plugins: [
		new CopyWebpackPlugin({
				patterns: [
						{ from: 'static' }
				]
		}),
		new webpack.DefinePlugin({
      "process.env": JSON.stringify({...dotenv.parsed, mode: options.mode,port: options.port}),
    })
]
})