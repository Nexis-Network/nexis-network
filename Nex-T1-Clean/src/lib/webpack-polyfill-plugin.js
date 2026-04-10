// Webpack plugin to inject global polyfills
class GlobalPolyfillPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('GlobalPolyfillPlugin', (compilation) => {
      compilation.hooks.runtimeRequirementInTree.tap('GlobalPolyfillPlugin', (chunk, set) => {
        // Add runtime requirement for global polyfills
        set.add('webpack/runtime/global');
      });
    });

    compiler.hooks.thisCompilation.tap('GlobalPolyfillPlugin', (compilation) => {
      compilation.hooks.runtimeRequirementInTree.tap('GlobalPolyfillPlugin', (chunk, set) => {
        // Ensure self is available
        set.add('webpack/runtime/global');
      });
    });
  }
}

module.exports = GlobalPolyfillPlugin;






