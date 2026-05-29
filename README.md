# Immutable Map

This is a fork of [Immutable.js](https://immutable-js.com) that only exports
`Map` as an ESM package. It keeps Immutable.js' persistent hash-array mapped
trie implementation, v5 runtime fixes, and v5 TypeScript type improvements.

Documentation for `Map` can be found on the
[Immutable.js website](https://immutable-js.com/docs/v5/Map/).

## Installation

```bash
pnpm install @nkzw/immutable-map
```

## Usage

```js
import ImmutableMap from '@nkzw/immutable-map';

const map = ImmutableMap({ a: 1 });
map.get('a');
```
