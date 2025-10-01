---
title: "Development Guide"
description: "Detailed development setup and workflow guide"
---

# Development Guide

This guide provides detailed information about setting up a development environment and working with the Edge-Utils codebase.

## Environment Setup

### System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: Version 2.30.0 or higher
- **Operating System**: macOS, Linux, or Windows

### Development Tools

We recommend using:

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Jest
  - GitLens
- **GitHub Desktop** or similar Git GUI
- **Postman** or **Insomnia** for API testing

## Local Development Setup

### 1. Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/microsoft/edge-utils.git
cd edge-utils

# Or clone your fork
git clone https://github.com/your-username/edge-utils.git
cd edge-utils

# Add upstream remote if working from a fork
git remote add upstream https://github.com/microsoft/edge-utils.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm --version
node --version
```

### 3. Set Up Development Environment

```bash
# Set up git hooks (if available)
npm run prepare

# Verify setup
npm run setup
```

### 4. Run Initial Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development Workflow

### Daily Development Cycle

1. **Pull latest changes**
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test**
   ```bash
   # Make your changes
   # Run tests frequently
   npm test
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Branch Naming Convention

- `feature/description`: New features
- `fix/description`: Bug fixes
- `docs/description`: Documentation changes
- `refactor/description`: Code refactoring
- `test/description`: Test-related changes

### Commit Message Format

We follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

**Examples:**
```
feat(cache): add TTL support to memory backend
fix(auth): resolve JWT verification race condition
docs(api): update GraphQL client examples
```

## Code Organization

### Directory Structure

```
src/
├── cache/                 # Caching utilities
│   ├── index.js          # Main cache exports
│   ├── memory.js         # Memory backend
│   ├── edge.js           # Edge backend
│   └── strategies.js     # Cache strategies
├── core/                 # Core utilities
│   ├── index.js          # Core exports
│   ├── handler.js        # Request handlers
│   ├── platform.js       # Platform detection
│   └── utils.js          # Utility functions
├── errors/               # Error handling
│   └── index.js          # Error classes
├── geo/                  # Geographic utilities
│   ├── index.js          # Geo exports
│   ├── detection.js      # Location detection
│   ├── nearest.js        # Nearest endpoint routing
│   └── routing.js        # Geographic routing
├── performance/          # Performance utilities
│   ├── index.js          # Performance exports
│   ├── cold-start.js     # Cold start detection
│   ├── compression.js    # Response compression
│   └── streaming.js      # Streaming responses
└── index.js              # Main library entry point
```

### File Naming

- Use `kebab-case` for file names: `memory-backend.js`
- Use `camelCase` for variable and function names
- Use `PascalCase` for class names
- Use `.js` extension for all JavaScript files

### Import/Export Patterns

```js
// Named exports
export { CacheManager } from './cache-manager.js';
export { MemoryBackend } from './memory-backend.js';

// Default export
export default class GraphQLClient {
  // ...
}

// Importing
import { CacheManager, MemoryBackend } from './cache/index.js';
import GraphQLClient from './graphql-client.js';
```

## Testing

### Test Structure

Tests are located in the `tests/` directory and follow the naming pattern `*.test.js`.

```
tests/
├── cache.test.js         # Cache tests
├── geo.test.js           # Geographic tests
├── platform.test.js      # Platform tests
├── utils.test.js         # Utility tests
└── setup.js              # Test setup
```

### Writing Tests

```js
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CacheManager } from '../src/cache/index.js';
import { MemoryBackend } from '../src/cache/memory.js';

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({
      backend: new MemoryBackend()
    });
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('set()', () => {
    it('should store a value', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should handle TTL expiration', async () => {
      await cache.set('key', 'value', { ttl: 100 });
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/cache.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for changed files
npm run test:changed
```

### Test Coverage

We aim for >80% code coverage. Coverage reports are generated in `coverage/` directory.

```bash
# Generate coverage report
npm run coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Code Quality

### Linting

We use ESLint for code quality. Configuration is in `package.json`.

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check and fix formatting
npm run format
```

### Code Style Rules

- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Max line length: 100 characters
- Use trailing commas in multi-line objects/arrays

### Pre-commit Hooks

We use husky for git hooks. These run automatically:

- **pre-commit**: Lint and format code
- **pre-push**: Run tests

## Building and Packaging

### Build Process

```bash
# Build for production
npm run build

# Build in watch mode
npm run build:watch

# Clean build artifacts
npm run clean
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run analyze

# Check bundle composition
npm run bundle:analyze
```

### Publishing

Only maintainers can publish releases. The process is:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Push to main branch
5. GitHub Actions publishes to npm

## Debugging

### Local Debugging

```bash
# Run with debug logging
DEBUG=edge-utils:* npm test

# Debug specific module
DEBUG=edge-utils:cache npm test
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Browser Debugging

For client-side code, use browser dev tools or add:

```js
// Add to code for debugging
console.log('Debug info:', variable);

// Or use debugger statement
debugger;
```

## Performance Testing

### Benchmarking

```bash
# Run performance benchmarks
npm run bench

# Compare performance
npm run bench:compare
```

### Memory Leak Testing

```bash
# Run memory leak tests
npm run test:memory

# Profile memory usage
npm run profile:memory
```

## Platform-Specific Development

### Cloudflare Workers

```bash
# Test with wrangler
npm run test:cf

# Deploy to Cloudflare
npm run deploy:cf
```

### Vercel Edge Functions

```bash
# Test with vercel dev
npm run test:vercel

# Deploy to Vercel
npm run deploy:vercel
```

### Deno Deploy

```bash
# Test with deno
npm run test:deno

# Deploy to Deno Deploy
npm run deploy:deno
```

## Troubleshooting

### Common Issues

**Tests failing locally but passing in CI**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version`
- Update dependencies: `npm update`

**Build failing**
- Check for TypeScript errors: `npm run type-check`
- Clear build cache: `npm run clean`
- Check disk space

**Linting errors**
- Run auto-fix: `npm run lint:fix`
- Check ESLint configuration
- Update to latest ESLint rules

### Getting Help

- Check existing issues on GitHub
- Ask in GitHub Discussions
- Check the documentation
- Contact maintainers

## Advanced Topics

### Contributing to Core Modules

Core modules require extra care:

- Maintain backward compatibility
- Update TypeScript definitions
- Add comprehensive tests
- Update documentation
- Consider performance impact

### Adding New Modules

When adding new modules:

1. Create directory in `src/`
2. Add `index.js` with exports
3. Update main `src/index.js`
4. Add tests in `tests/`
5. Update documentation
6. Update `package.json` if needed

### Performance Considerations

- Minimize bundle size impact
- Use lazy loading when possible
- Optimize for edge environments
- Consider memory usage
- Test on target platforms

## Security

### Security Checklist

- [ ] No sensitive data in logs
- [ ] Input validation and sanitization
- [ ] Secure defaults
- [ ] No hardcoded secrets
- [ ] Regular dependency updates
- [ ] Security testing

### Reporting Security Issues

Report security issues via GitHub Security tab or email maintainers directly.

## Release Process

### Version Management

We follow semantic versioning:

- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Build and test bundles
- [ ] Update documentation
- [ ] Create git tag
- [ ] Publish to npm
- [ ] Announce release

This development guide should help you get started and work effectively with the Edge-Utils codebase. Remember to always test your changes and follow the established patterns and conventions.