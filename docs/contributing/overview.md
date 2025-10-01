---
title: "Contributing Overview"
description: "Guidelines and processes for contributing to Edge-Utils"
---

# Contributing to Edge-Utils

Welcome! We appreciate your interest in contributing to Edge-Utils. This document provides guidelines and processes for contributing to the project.

## Ways to Contribute

### Code Contributions

- **Bug Fixes**: Fix bugs and issues reported in the issue tracker
- **Features**: Implement new features from the roadmap or feature requests
- **Performance**: Optimize existing code for better performance
- **Documentation**: Improve documentation, add examples, or fix typos

### Non-Code Contributions

- **Bug Reports**: Report bugs with detailed reproduction steps
- **Feature Requests**: Suggest new features or improvements
- **Documentation**: Write or improve documentation
- **Testing**: Add test cases or improve test coverage
- **Reviews**: Review pull requests from other contributors

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- A code editor (VS Code recommended)

### Local Development

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/edge-utils.git
   cd edge-utils
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up development environment**
   ```bash
   npm run setup
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Project Structure

```
edge-utils/
├── src/                    # Source code
│   ├── cache/             # Caching utilities
│   ├── core/              # Core utilities
│   ├── errors/            # Error handling
│   ├── geo/               # Geographic utilities
│   ├── performance/       # Performance utilities
│   └── index.js           # Main entry point
├── tests/                 # Test files
├── examples/              # Usage examples
├── docs/                  # Documentation
├── package.json           # Package configuration
└── rollup.config.js       # Build configuration
```

## Development Workflow

### 1. Choose an Issue

- Check the [issue tracker](https://github.com/microsoft/edge-utils/issues) for open issues
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes

- Write clear, concise commit messages
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/cache.test.js

# Run tests in watch mode
npm run test:watch

# Check code coverage
npm run coverage
```

### 5. Submit a Pull Request

- Push your branch to your fork
- Create a pull request against the main branch
- Fill out the pull request template
- Wait for review and address feedback

## Code Guidelines

### JavaScript/TypeScript Style

- Use ES6+ features
- Use async/await for asynchronous code
- Use const/let instead of var
- Use template literals instead of string concatenation
- Use arrow functions when appropriate
- Use meaningful variable and function names

### Code Formatting

We use ESLint and Prettier for code formatting. The configuration is in `package.json`.

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

### Testing

- Write unit tests for all new functionality
- Aim for high test coverage (>80%)
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

### Example Test

```js
import { CacheManager } from '../src/cache/index.js';
import { MemoryBackend } from '../src/cache/memory.js';

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({
      backend: new MemoryBackend()
    });
  });

  describe('set()', () => {
    it('should store a value', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should handle TTL', async () => {
      await cache.set('key', 'value', { ttl: 100 });
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });
});
```

## Documentation

### API Documentation

- Document all public APIs with JSDoc comments
- Include parameter types and descriptions
- Document return values and possible errors
- Provide usage examples

### Example JSDoc

```js
/**
 * Sets a value in the cache
 * @param {string} key - The cache key
 * @param {*} value - The value to cache
 * @param {Object} [options] - Cache options
 * @param {number} [options.ttl] - Time to live in milliseconds
 * @returns {Promise<void>}
 */
async set(key, value, options = {}) {
  // implementation
}
```

### README Updates

- Update README.md for significant changes
- Add examples for new features
- Update installation instructions if needed

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally
- [ ] Code is formatted and linted
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main

### Pull Request Template

Please fill out the pull request template with:

- **Description**: What changes were made and why
- **Type of change**: Bug fix, feature, documentation, etc.
- **Testing**: How the changes were tested
- **Breaking changes**: Any breaking changes and migration guide

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainers review the code
3. **Feedback**: Address any feedback or requested changes
4. **Approval**: PR is approved and merged

## Community Guidelines

### Communication

- Be respectful and inclusive
- Use clear and concise language
- Provide constructive feedback
- Ask questions if something is unclear

### Issue Reporting

When reporting bugs, please include:

- **Description**: Clear description of the issue
- **Steps to reproduce**: Step-by-step reproduction guide
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, browser, etc.
- **Code sample**: Minimal code to reproduce the issue

### Feature Requests

When requesting features, please include:

- **Description**: What feature you want
- **Use case**: Why you need this feature
- **Proposed solution**: How you think it should work
- **Alternatives**: Other solutions you've considered

## Recognition

Contributors are recognized in:

- GitHub contributors list
- CHANGELOG.md for significant contributions
- Release notes
- Social media mentions (with permission)

## Getting Help

- **Documentation**: Check the docs folder and README
- **Issues**: Search existing issues or create new ones
- **Discussions**: Use GitHub Discussions for questions
- **Discord/Slack**: Join our community chat (if available)

Thank you for contributing to Edge-Utils! Your contributions help make edge computing more accessible and powerful for everyone.