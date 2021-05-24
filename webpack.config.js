"use strict";
const path = require("path");

module.exports = {
    mode: "production",
    devtool: "source-map",
    entry: "./src/index.ts",
    output: {
        filename: "arbeit.min.js",
        path: path.resolve(__dirname, "dist/browser/"),
        library: "arbeit",
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    transpileOnly: true,
                    configFile: "tsconfig.json",
                },
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
};
