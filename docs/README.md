# Edge-Utils Documentation

This directory contains the complete Mintlify documentation for Edge-Utils.

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Mintlify CLI

### Installation

1. Install Mintlify CLI globally:
```bash
npm install -g mintlify
```

2. Navigate to the docs directory:
```bash
cd docs
```

3. Start the development server:
```bash
mintlify dev
```

The documentation will be available at `http://localhost:3000`.

### Building for Production

To build the documentation for production:

```bash
mintlify build
```

This will generate a static site in the `build` directory.

### Deployment

#### Option 1: Mintlify Hosting
Deploy directly to Mintlify:

```bash
mintlify deploy
```

#### Option 2: Manual Deployment
Build the site and deploy the `build` directory to your preferred hosting platform (Netlify, Vercel, etc.).

## Documentation Structure

```
docs/
├── mint.json          # Mintlify configuration
├── introduction.md    # Getting started overview
├── quick-start.md     # Quick start guide
├── installation.md    # Installation instructions
├── core/              # Core utilities documentation
├── edge/              # Edge-specific features
├── security/          # Security and monitoring
├── api/               # API reference
├── examples/          # Usage examples
└── contributing/      # Contribution guidelines
```

## Writing Documentation

### File Naming
- Use `kebab-case` for file names (e.g., `quick-start.md`)
- Use descriptive names that match the navigation structure

### Frontmatter
All markdown files must include frontmatter:

```yaml
---
title: "Page Title"
description: "Brief description of the page content"
---
```

### Code Examples
Use fenced code blocks with language specification:

```js
// JavaScript example
const client = new GraphQLClient(endpoint);
```

```typescript
// TypeScript example
interface User {
  id: string;
  name: string;
}
```

### Links
Use relative paths for internal links:

```markdown
[Quick Start](../quick-start)
[API Reference](../api/graphql-client)
```

## Navigation

The navigation structure is defined in `mint.json`. To add new pages:

1. Create the markdown file in the appropriate directory
2. Add the page path to the navigation array in `mint.json`
3. Ensure the path matches the file location (without `.md` extension)

## Customization

### Colors and Branding
Update the colors in `mint.json`:

```json
{
  "colors": {
    "primary": "#0D9373",
    "light": "#07C983",
    "dark": "#0D9373"
  }
}
```

### Logo and Favicon
Add logo files to a `logo/` directory and update paths in `mint.json`.

## Best Practices

- Keep documentation up-to-date with code changes
- Include practical examples for all features
- Use consistent formatting and terminology
- Test all code examples
- Include TypeScript types where relevant
- Add cross-references between related topics

## Support

For documentation issues or questions:
- [GitHub Issues](https://github.com/ZFlareUI/Edge-Utils/issues)
- [GitHub Discussions](https://github.com/ZFlareUI/Edge-Utils/discussions)