import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import Map from '../publish/ImmutableMap.js';

const publishedPackage = JSON.parse(
  await readFile(new URL('../publish/package.json', import.meta.url), 'utf8')
);

assert.equal(publishedPackage.name, '@nkzw/immutable-map');
assert.equal(publishedPackage.type, 'module');
assert.equal(publishedPackage.main, './ImmutableMap.js');
assert.equal(publishedPackage.module, './ImmutableMap.js');
assert.equal(publishedPackage.types, './ImmutableMap.d.ts');

const map = Map({ b: 2, a: 1 });

assert.equal(typeof Map, 'function');
assert.equal(Map.of, undefined);
assert.equal(map.get('a'), 1);
assert.equal(map.set('a', 1), map);
assert.equal(map.toList, undefined);
assert.equal(map.toSet, undefined);
assert.equal(map.toOrderedMap, undefined);
assert.equal(map.sort().toString(), 'Map { "a": 1, "b": 2 }');

const protoResult = Map().set('__proto__', { admin: true }).toJS();
assert.equal(Object.hasOwn(protoResult, '__proto__'), false);
assert.equal(protoResult.admin, undefined);
assert.equal(Object.getPrototypeOf(protoResult).admin, undefined);

const constructorResult = Map()
  .set('constructor', { prototype: { admin: true } })
  .toObject();
assert.equal(Object.hasOwn(constructorResult, 'constructor'), false);
