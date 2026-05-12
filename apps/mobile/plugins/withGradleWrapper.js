const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin to pin the Gradle wrapper version.
 * EAS build servers have Gradle 8.10.2 cached; newer versions (e.g. 8.14.3)
 * cause timeout errors when downloaded from scratch.
 */
module.exports = function withGradleWrapper(
  config,
  { version = "8.10.2" } = {},
) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const gradleWrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties",
      );

      if (fs.existsSync(gradleWrapperPath)) {
        let content = fs.readFileSync(gradleWrapperPath, "utf8");
        content = content.replace(
          /distributionUrl=.*/,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${version}-bin.zip`,
        );
        fs.writeFileSync(gradleWrapperPath, content);
        console.log(`[withGradleWrapper] Pinned Gradle wrapper to ${version}`);
      } else {
        console.warn(
          `[withGradleWrapper] gradle-wrapper.properties not found at: ${gradleWrapperPath}`,
        );
      }

      return config;
    },
  ]);
};
