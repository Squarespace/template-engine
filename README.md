
# template-engine

This is a port of the Squarespace Java [template-compiler](https://github.com/squarespace/template-compiler) project to JavaScript.

[![Build Status](https://travis-ci.org/Squarespace/template-engine.svg?branch=master)](https://travis-ci.org/Squarespace/template-engine)
[![Coverage Status](https://coveralls.io/repos/github/Squarespace/template-engine/badge.svg?branch=master)](https://coveralls.io/github/Squarespace/template-engine?branch=master)

### Rationale

The need for compilation of Squarespace templates in the browser has grown over time. The existing projects that enable browser compilation of Squarespace templates are incomplete, incompatible and have maintenance issues.

This project is a new implementation of the Squarespace template syntax with the following goals:

 * Provide a sound foundation for current and future development.
 * Meet frontend application performance criteria.
 * Support all current server-side functionality, including all plugins.
 * Full compatibility with server compiler.
 * Separate the parsing and execution phases to support repeated executions of a template efficiently.
 * Organized and modular codebase.
 * Follow same basic design as Java compiler.
 * High test coverage.

### License

[Apache 2.0](https://tldrlegal.com/license/apache-license-2.0-(apache-2.0))
