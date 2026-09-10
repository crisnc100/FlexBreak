import { withAppBuildGradle } from 'expo/config-plugins.js';

const start = '// @flexbreak release-signing-guard start';
const end = '// @flexbreak release-signing-guard end';
export const signingGuard = `${start}
// Resolve after all Gradle/EAS signing configuration and task creation, before any task executes.
gradle.taskGraph.whenReady { graph ->
    android.applicationVariants.all { variant ->
        def variantName = variant.name.toLowerCase(java.util.Locale.ROOT)
        def packagesVariant = graph.allTasks.any { task ->
            def taskName = task.name.toLowerCase(java.util.Locale.ROOT)
            task.project == project && taskName.contains(variantName) &&
                (taskName.startsWith('assemble') || taskName.startsWith('bundle') ||
                 taskName.startsWith('package') || taskName.startsWith('sign'))
        }
        if (variant.buildType.name == 'release' && packagesVariant) {
            def signing = variant.signingConfig
            def metadata = [ready: signing != null && signing.isSigningReady(),
                name: signing?.name, keyAlias: signing?.keyAlias,
                storeFile: signing?.storeFile?.absolutePath]
            def validator = rootProject.file('../scripts/check-android-signing.mjs')
            def builder = new ProcessBuilder('node', validator.absolutePath).inheritIO()
            builder.environment().put('FLEXBREAK_SIGNING_METADATA', groovy.json.JsonOutput.toJson(metadata))
            if (builder.start().waitFor() != 0) {
                throw new GradleException('FlexBreak release signing rejected. Configure real release credentials; debug builds remain available.')
            }
        }
    }
}
${end}`;

export function addSigningGuard(source) {
  const starts = source.split(start).length - 1;
  const ends = source.split(end).length - 1;
  if (starts || ends) {
    if (starts !== 1 || ends !== 1 || !source.includes(signingGuard)) throw new Error('Unexpected existing release signing guard; review before updating.');
    return source;
  }
  if (!/apply plugin: ["']com\.android\.application["']/.test(source) || !/\bandroid\s*\{/.test(source)) {
    throw new Error('Unsupported Android app Gradle template.');
  }
  return `${source.trimEnd()}\n\n${signingGuard}\n`;
}
export default function withReleaseSigningGuard(config) {
  return withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') throw new Error('Release signing guard requires Groovy app Gradle.');
    mod.modResults.contents = addSigningGuard(mod.modResults.contents);
    return mod;
  });
}
