# Contributing to Fingerprinter.js

Thank you for your interest in contributing to Fingerprinter.js! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 14+
- npm 6+
- Git

### Setup Development Environment

1. Fork the repository
2. Clone your fork:

```bash
git clone https://github.com/Lorenzo-Coslado/fingerprinter-js.git
cd fingerprinter-js
```

3. Install dependencies:

```bash
npm install
```

4. Run tests to ensure everything works:

```bash
npm test
```

## 🛠️ Development Workflow

### Project Structure

```
src/
├── collectors/          # Data collection modules
│   ├── basic.ts        # Basic collectors (userAgent, language, etc.)
│   ├── canvas.ts       # Canvas and WebGL collectors
│   └── advanced.ts     # Audio and font collectors
├── __tests__/          # Test files
├── types.ts           # TypeScript interfaces
├── utils.ts           # Utility functions
├── fingerprint.ts     # Main fingerprint class
├── suspect-analyzer.ts # Suspect analysis functionality
└── index.ts           # Main export file
```

### Available Scripts

- `npm run build` - Build the library
- `npm run dev` - Build in watch mode
- `npm test` - Run tests
- `npm test:watch` - Run tests in watch mode
- `npm run lint` - Lint the code
- `npm run lint:fix` - Fix linting issues

### Making Changes

1. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass:

```bash
npm test
```

5. Lint your code:

```bash
npm run lint:fix
```

6. Build the project:

```bash
npm run build
```

## 📝 Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide proper type definitions
- Document public APIs with JSDoc comments
- Follow existing code style

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multiline objects/arrays
- Keep lines under 100 characters when possible

### Example Code Style

```typescript
/**
 * Example collector implementation
 */
export class ExampleCollector implements ComponentCollector {
  readonly name = "example";

  async collect(): Promise<any> {
    try {
      // Implementation here
      return {
        property: "value",
        timestamp: Date.now(),
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
}
```

## 🧪 Testing

### Writing Tests

- Place tests in `src/__tests__/` directory
- Use Jest testing framework
- Test both success and error cases
- Mock browser APIs when necessary

### Test Example

```typescript
describe("ExampleCollector", () => {
  it("should collect example data", async () => {
    const collector = new ExampleCollector();
    const result = await collector.collect();

    expect(result).toHaveProperty("property");
    expect(result.property).toBe("value");
  });

  it("should handle errors gracefully", async () => {
    // Test error handling
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx jest fingerprint.test.ts
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to reproduce**: Minimal steps to reproduce the bug
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**: Browser, version, OS
6. **Code example**: Minimal code that demonstrates the issue

### Bug Report Template

````markdown
**Bug Description**
A clear description of the bug.

**To Reproduce**
Steps to reproduce:

1. Create fingerprint with options: `{ excludeCanvas: true }`
2. Call `generate()`
3. See error

**Expected Behavior**
Fingerprint should generate successfully.

**Actual Behavior**
Error thrown: "Canvas is required"

**Environment**

- Browser: Chrome 91
- OS: macOS 11.4
- Package version: 1.0.0

**Code Example**

```javascript
const fp = new Fingerprint({ excludeCanvas: true });
const result = await fp.generate(); // Error occurs here
```
````

## 💡 Feature Requests

For new features:

1. Check existing issues first
2. Describe the use case clearly
3. Explain why it would be beneficial
4. Provide implementation ideas if possible

## 🔒 Security Issues

For security-related issues:

1. **DO NOT** open public issues
2. Email security concerns to: [your-email@domain.com]
3. Include detailed description and steps to reproduce
4. We'll respond within 48 hours

## 📋 Pull Request Process

### Before Submitting

1. Ensure your code follows the coding standards
2. Add or update tests as needed
3. Update documentation if necessary
4. Verify all tests pass
5. Check that the build succeeds

### Pull Request Guidelines

1. **Title**: Clear, descriptive title
2. **Description**: Explain what changes were made and why
3. **Testing**: Describe how the changes were tested
4. **Breaking Changes**: Note any breaking changes
5. **Issue Link**: Link to related issues

### Pull Request Template

```markdown
## Description

Brief description of changes made.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe how this was tested:

- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] All existing tests pass

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new functionality
```

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:

### New Collectors

- Additional browser APIs
- Mobile-specific detection
- Performance optimizations

### Suspect Analysis

- New bot detection techniques
- Machine learning integration
- Improved accuracy

### Documentation

- Usage examples
- API documentation
- Performance guides

### Testing

- Cross-browser testing
- Edge case coverage
- Performance benchmarks

## 📚 Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Rollup Bundler](https://rollupjs.org/guide/en/)

## 🤝 Community

- **Issues**: Use GitHub issues for bugs and features
- **Discussions**: Use GitHub discussions for questions
- **Code of Conduct**: Be respectful and constructive

## ❓ Questions

If you have questions about contributing:

1. Check existing documentation
2. Search closed issues and discussions
3. Open a new discussion
4. Ask in the issue comments

Thank you for contributing to Fingerprinter.js! 🎉
