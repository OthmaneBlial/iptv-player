const path = require("path");
const webpack = require("webpack");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const requestedPort = Number(process.env.PORT);
const devServerPort =
  Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : "auto";
const STREAM_PROXY_PATH = "/__stream_proxy__";

function copyProxyHeaders(upstreamResponse, response) {
  upstreamResponse.headers.forEach((value, key) => {
    if (
      [
        "connection",
        "content-encoding",
        "content-length",
        "keep-alive",
        "transfer-encoding",
      ].includes(key)
    ) {
      return;
    }

    response.setHeader(key, value);
  });
}

function createStreamProxyMiddleware() {
  return async (request, response, next) => {
    if (!request.url || !request.url.startsWith(STREAM_PROXY_PATH)) {
      next();
      return;
    }

    try {
      const requestUrl = new URL(request.url, "http://localhost");
      const targetUrl = requestUrl.searchParams.get("url");

      if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        response.statusCode = 400;
        response.end("Missing or invalid target URL.");
        return;
      }

      const upstreamHeaders = {};
      [
        "accept",
        "accept-language",
        "cache-control",
        "if-match",
        "if-modified-since",
        "if-none-match",
        "if-unmodified-since",
        "range",
      ].forEach((headerName) => {
        const headerValue = request.headers[headerName];
        if (headerValue) {
          upstreamHeaders[headerName] = headerValue;
        }
      });

      const upstreamResponse = await fetch(targetUrl, {
        headers: upstreamHeaders,
        method: request.method === "HEAD" ? "HEAD" : "GET",
        redirect: "follow",
      });

      response.statusCode = upstreamResponse.status;
      copyProxyHeaders(upstreamResponse, response);
      response.setHeader("Access-Control-Allow-Origin", "*");

      if (!upstreamResponse.body || request.method === "HEAD") {
        response.end();
        return;
      }

      const proxyStream = Readable.fromWeb(upstreamResponse.body);

      response.on("close", () => {
        if (!proxyStream.destroyed) {
          proxyStream.destroy();
        }
      });

      try {
        await pipeline(proxyStream, response);
      } catch (error) {
        const errorCode =
          error && typeof error === "object" && "code" in error
            ? error.code
            : null;

        if (
          errorCode !== "ERR_STREAM_PREMATURE_CLOSE" &&
          errorCode !== "UND_ERR_RES_CONTENT_LENGTH_MISMATCH"
        ) {
          console.warn("Stream proxy pipeline failed.", error);
        }

        if (!response.headersSent) {
          response.statusCode = 502;
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end("Stream proxy request failed.");
          return;
        }

        if (!response.destroyed) {
          response.destroy();
        }
      }
    } catch (error) {
      response.statusCode = 502;
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end("Stream proxy request failed.");
    }
  };
}

module.exports = (_, argv = {}) => {
  const isDevelopment = argv.mode !== "production";

  return {
    entry: "./src/index.ts",
    mode: isDevelopment ? "development" : "production",
    devtool: isDevelopment ? "inline-source-map" : false,
    devServer: {
      static: path.resolve(__dirname, "dist"),
      port: devServerPort,
      open: true,
      hot: true,
      setupMiddlewares(middlewares, devServer) {
        if (devServer?.app) {
          const proxyMiddleware = createStreamProxyMiddleware();
          devServer.app.get(STREAM_PROXY_PATH, proxyMiddleware);
          devServer.app.head(STREAM_PROXY_PATH, proxyMiddleware);
        }

        return middlewares;
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
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
        {
          test: /\.(scss|css)$/,
          use: ["style-loader", "css-loader", "sass-loader"],
        },
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
      new webpack.DefinePlugin({
        __ENABLE_PWA__: JSON.stringify(!isDevelopment),
        __ENABLE_STREAM_PROXY__: JSON.stringify(isDevelopment),
      }),
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
          {
            from: "iptv-wasm/pkg",
            to: "iptv-wasm/pkg",
            noErrorOnMissing: true,
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
};
