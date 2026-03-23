const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  mode: "development", // Change to 'production' for production builds
  devtool: "inline-source-map",
  devServer: {
    static: path.resolve(__dirname, "dist"),
    port: 8080,
    open: true,
    hot: true,
  },
  module: {
    rules: [
      // TypeScript Loader
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      // Babel Loader for JS
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      // Sass and CSS Loaders
      {
        test: /\.(scss|css)$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      // Asset Loader for Fonts and Images
      {
        test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "src/manifest.webmanifest",
          to: "manifest.webmanifest",
        },
        {
          from: "src/service-worker.js",
          to: "service-worker.js",
        },
        {
          from: "src/assets",
          to: "assets",
        },
        {
          from: "src/workers",
          to: "workers",
        },
      ],
    }),
  ],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "",
  },
};
