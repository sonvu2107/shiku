module.exports = {
  testEnvironment: "node",
  // Node ESM inference will treat .js as ESM when package.json has "type": "module"
  // Don't include '.js' here to avoid the validation error.
  extensionsToTreatAsEsm: [".jsx"],
  transform: {},
  verbose: true,
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setupEnv.js"]
};
