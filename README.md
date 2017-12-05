
# template-engine

This is a port of the Squarespace template-compiler project to JavaScript.

### Rationale

The need for full compilation of Squarespace templates in the browser has grown over time. As such I surveyed the existing `@sqs/template-js` project and found several problems which make it unsuitable for future development.

 * Missing many of the key features and plugins.
 * What is implemented is incorrect / incompatible.
 * Code is not well-organized, modular.
 * Test cases are overly complex, coverage unknown.

For these reasons the `@sqs/template-js` library should be abandoned and replaced with a new library.
