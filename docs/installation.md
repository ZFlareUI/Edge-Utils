---
title: "Installation"
description: "How to install and set up Edge-Utils in your project"
---

# Installation

Learn how to install Edge-Utils and integrate it into your edge computing project.

## Package Installation

### npm

```bash
npm install edge-utils
```

### yarn

```bash
yarn add edge-utils
```

### pnpm

```bash
pnpm add edge-utils
```

### Deno

```bash
# For Deno projects
deno add https://deno.land/x/edge_utils/mod.ts
```

## Platform-Specific Setup

### Cloudflare Workers

1. **Install Wrangler CLI** (if not already installed):
```bash
npm install -g wrangler
```

2. **Create a new project**:
```bash
wrangler init my-edge-app
cd my-edge-app
```

3. **Install Edge-Utils**:
```bash
npm install edge-utils
```

4. **Configure wrangler.toml**:
```toml
name = "my-edge-app"
main = "src/index.js"
compatibility_date = "2023-01-01"

[vars]
GRAPHQL_ENDPOINT = "https://api.example.com/graphql"
JWT_SECRET = "your-secret-key"
```

5. **Example usage in src/index.js**:
```js
import { GraphQLClient, AuthManager } from 'edge-utils';

export default {
  async fetch(request, env) {
    const auth = new AuthManager({
      jwtSecret: env.JWT_SECRET
    });

    const client = new GraphQLClient(env.GRAPHQL_ENDPOINT, {
      headers: {
        'Authorization': request.headers.get('Authorization')
      }
    });

    // Your application logic here
  }
};
```

### Vercel Edge Functions

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Create a new project**:
```bash
vercel init
```

3. **Install Edge-Utils**:
```bash
npm install edge-utils
```

4. **Create an edge function in api/graphql.js**:
```js
import { GraphQLClient } from 'edge-utils';

export const config = {
  runtime: 'edge'
};

export default async function handler(request) {
  const client = new GraphQLClient(process.env.GRAPHQL_ENDPOINT);

  try {
    const data = await client.query(`
      query GetData {
        items {
          id
          name
        }
      }
    `);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

5. **Set environment variables**:
```bash
vercel env add GRAPHQL_ENDPOINT
```

### Deno Deploy

1. **Install Deno CLI** (if not already installed):
```bash
# macOS
brew install deno

# Or download from https://deno.com/
```

2. **Create a new project**:
```bash
mkdir my-deno-app
cd my-deno-app
```

3. **Create deno.json**:
```json
{
  "imports": {
    "edge-utils": "https://deno.land/x/edge_utils/mod.ts"
  }
}
```

4. **Create main.ts**:
```ts
import { GraphQLClient } from 'edge-utils';

Deno.serve(async (request) => {
  const client = new GraphQLClient(Deno.env.get('GRAPHQL_ENDPOINT')!);

  try {
    const data = await client.query(`
      query GetData {
        items {
          id
          name
        }
      }
    `);

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

5. **Deploy to Deno Deploy**:
```bash
deno deploy
```

## TypeScript Support

Edge-Utils comes with full TypeScript support. If you're using TypeScript, the types will be automatically available.

### TypeScript Configuration

For optimal TypeScript experience, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## Bundle Size Optimization

Edge-Utils is designed to be lightweight. You can import only the utilities you need:

```js
// Import specific utilities (recommended)
import { GraphQLClient, CacheManager } from 'edge-utils';

// Import everything
import * as EdgeUtils from 'edge-utils';
```

## Environment Variables

Set up the following environment variables for your deployment:

### Required
- `GRAPHQL_ENDPOINT` - Your GraphQL API endpoint
- `JWT_SECRET` - Secret key for JWT token signing

### Optional
- `REDIS_URL` - Redis URL for distributed caching
- `DATABASE_URL` - Database connection string
- `API_KEYS` - Comma-separated list of API keys

## Testing Your Installation

Create a simple test file to verify your installation:

```js
// test.js
import { GraphQLClient } from 'edge-utils';

async function test() {
  const client = new GraphQLClient('https://api.github.com/graphql', {
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
    }
  });

  try {
    const data = await client.query(`
      query {
        viewer {
          login
        }
      }
    `);

    console.log('Installation successful!', data);
  } catch (error) {
    console.error('Installation failed:', error.message);
  }
}

test();
```

Run the test:
```bash
node test.js
```

## Troubleshooting

### Common Issues

**Module not found error**
- Ensure you've installed the package correctly
- Check that your import paths are correct
- For Deno, verify the import URL in deno.json

**TypeScript errors**
- Update your TypeScript version to 4.5+
- Check your tsconfig.json configuration
- Ensure you're importing types correctly

**Runtime errors**
- Verify environment variables are set
- Check network connectivity to external APIs
- Ensure your edge platform supports all Web APIs used

### Getting Help

- [Documentation](https://edge-utils.dev)
- [GitHub Discussions](https://github.com/ZFlareUI/Edge-Utils/discussions)
- [GitHub Issues](https://github.com/ZFlareUI/Edge-Utils/issues)

## Next Steps

Now that you have Edge-Utils installed, check out:

- [Quick Start](quick-start) - Basic usage examples
- [Core Utilities](core/graphql) - Detailed guides for each utility
- [Examples](examples/basic-usage) - More comprehensive examples