module.exports = {
  moduleFileExtensions: ["ts", "js"],
  moduleNameMapper: {
    "\\.(css|scss)$": "<rootDir>/tests/styleMock.js",
    "\\.(gif|jpg|jpeg|png|svg)$": "<rootDir>/tests/fileMock.js",
  },
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
};
