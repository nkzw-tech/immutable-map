import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const packagePath = join(rootDir, 'publish/ImmutableMap.js');
const tmpDir = await mkdtemp(join(tmpdir(), 'immutable-map-types-'));

function runTypeScript(fileName, source) {
  const filePath = join(tmpDir, fileName);
  return writeFile(filePath, source).then(() =>
    spawnSync(
      'npx',
      [
        'tsc',
        '--strict',
        '--target',
        'es2022',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        '--skipLibCheck',
        filePath,
        '--noEmit',
      ],
      { cwd: rootDir, encoding: 'utf8' }
    )
  );
}

const allowed = await runTypeScript(
  'allowed.mts',
  `
    import Map, { type Collection, type Map as ImmutableMap, type MapOf } from ${JSON.stringify(packagePath)};

    const map = Map({ a: 1, b: 'x' });
    const a: number = map.get('a');
    const b: string = map.get('b');
    const sorted: typeof map = map.sort();
    type ConcreteMap = ImmutableMap<string, number>;
    type ConcreteCollection = Collection<string, number>;
    type ObjectMap = MapOf<{ a: number }>;
    const typed: ObjectMap = Map({ a: 1 });
    const value: number = typed.get('a');
    void a;
    void b;
    void sorted;
  `
);

assert.equal(
  allowed.status,
  0,
  `Expected public allowed types to compile:\n${allowed.stdout}\n${allowed.stderr}`
);

const forbidden = await runTypeScript(
  'forbidden.mts',
  `
    import Map, { Map as NamedMap, List } from ${JSON.stringify(packagePath)};

    const map = Map({ a: 1 });
    map.toList();
    map.toSet();
    map.toOrderedMap();
    NamedMap({ a: 1 });
    List([1]);
  `
);

assert.notEqual(forbidden.status, 0, 'Expected invalid public types to fail');
assert.match(
  forbidden.stderr + forbidden.stdout,
  /'NamedMap' only refers to a type/
);
assert.match(
  forbidden.stderr + forbidden.stdout,
  /'List' only refers to a type/
);
assert.match(
  forbidden.stderr + forbidden.stdout,
  /Property 'toList' does not exist/
);
assert.match(
  forbidden.stderr + forbidden.stdout,
  /Property 'toSet' does not exist/
);
assert.match(
  forbidden.stderr + forbidden.stdout,
  /Property 'toOrderedMap' does not exist/
);
