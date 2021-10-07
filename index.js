const t = require('@babel/types');

const CssImport = require('./css-import-visitor');
const { jsToAst, jsStringToAst, constAst, postcss } = require('./helpers');

module.exports = function () {
  const pluginApi = {
    manipulateOptions(options) {
      return options;
    },

    visitor: {
      ImportDeclaration: {
        exit: CssImport(({ src, css, options, importNode, babelData }) => {
          const postcssOptions = {
            generateScopedName: options.generateScopedName,
          };
          const { code, classesMap } = postcss.process(css, src, postcssOptions, options.configPath);

          if (importNode.local) {
            babelData.replaceWithMultiple([
              classesMapConstAst({ classesMap, importNode }),
              putStyleIntoHeadAst({ code }),
            ]);
          } else {
            babelData.replaceWithMultiple([putStyleIntoHeadAst({ code })]);
          }
        }),
      },
    },
  };
  return pluginApi;
};

function classesMapConstAst({ importNode, classesMap }) {
  const classesMapAst = jsToAst(classesMap);
  const classesMapVarNameAst = t.identifier(importNode.local.name);
  return constAst(classesMapVarNameAst, classesMapAst);
}

function putStyleIntoHeadAst({ code }) {
  // need to sanitize backslashes and remove backticks to not break generated code
  const sanitizedCode = code.replace(/`/g, '').replace(/\\/g, '\\\\');
  return jsStringToAst(`require('load-styles')(\`${sanitizedCode}\`)`);
}
