import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default [
  // Main bundle
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.umd.js',
        format: 'umd',
        name: 'EdgeUtils',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // Cache module
  {
    input: 'src/cache/index.js',
    output: [
      {
        file: 'dist/cache.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/cache.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // Rate limiting module
  {
    input: 'src/rate-limiting/index.js',
    output: [
      {
        file: 'dist/rate-limiting.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/rate-limiting.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // Security module
  {
    input: 'src/security/index.js',
    output: [
      {
        file: 'dist/security.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/security.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // Auth module
  {
    input: 'src/auth/index.js',
    output: [
      {
        file: 'dist/auth.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/auth.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // Monitoring module
  {
    input: 'src/monitoring/index.js',
    output: [
      {
        file: 'dist/monitoring.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/monitoring.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // Load balancing module
  {
    input: 'src/load-balancing/index.js',
    output: [
      {
        file: 'dist/load-balancing.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/load-balancing.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // Content negotiation module
  {
    input: 'src/content-negotiation/index.js',
    output: [
      {
        file: 'dist/content-negotiation.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/content-negotiation.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // WebSocket module
  {
    input: 'src/websocket/index.js',
    output: [
      {
        file: 'dist/websocket.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/websocket.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  },
  // GraphQL module
  {
    input: 'src/graphql/index.js',
    output: [
      {
        file: 'dist/graphql.esm.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/graphql.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      terser()
    ],
    external: []
  }]
