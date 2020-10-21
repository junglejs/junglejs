module.exports = {
  clearMocks: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text"],
  notify: true,
  notifyMode: "always",
  roots: ["<rootDir>packages"],
  testMatch: ["**/__tests__/*.+(ts|js)", "**/*.test.+(ts|js)"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  }
};
