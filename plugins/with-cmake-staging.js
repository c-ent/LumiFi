const { withProjectBuildGradle } = require('expo/config-plugins');

// Reanimated's CMake object paths embed the full source path and pass 260
// characters under this repo on Windows, where the build then fails. Staging
// native library builds in a short directory keeps them under the limit.
// Both the Gradle wrapper version and the AGP opt-outs in gradle.properties
// already ship in the Expo SDK 58 template, so only this needs reapplying.
const STAGING_ROOT = 'C:/rn';

const MARKER = '// wickglow: short CMake staging path for Windows long-path limits.';

const BLOCK = `
${MARKER}
subprojects { subproject ->
  subproject.plugins.withId("com.android.library") {
    if (!new File(subproject.projectDir, "CMakeLists.txt").exists()) {
      return
    }
    subproject.android.externalNativeBuild.cmake.buildStagingDirectory = new File("${STAGING_ROOT}/\${subproject.name}")
  }
}
`;

module.exports = function withCmakeStaging(config) {
  return withProjectBuildGradle(config, (gradle) => {
    if (process.platform !== 'win32') return gradle;
    if (gradle.modResults.contents.includes(MARKER)) return gradle;
    gradle.modResults.contents += BLOCK;
    return gradle;
  });
};
