/* global Immutable */
describe('Map core operations', function () {
  var sizes = [1, 8, 32, 1024];

  function objectOf(size) {
    var object = {};
    for (var ii = 0; ii < size; ii++) {
      object['k' + ii] = ii;
    }
    return object;
  }

  function entriesOf(size) {
    var entries = new Array(size);
    for (var ii = 0; ii < size; ii++) {
      entries[ii] = ['k' + ii, ii];
    }
    return entries;
  }

  function updateObjectOf(size) {
    var object = {};
    for (var ii = 0; ii < size; ii++) {
      object['k' + ii] = ii + 1;
    }
    return object;
  }

  function updateEntriesOf(size) {
    var entries = new Array(size);
    for (var ii = 0; ii < size; ii++) {
      entries[ii] = ['k' + ii, ii + 1];
    }
    return entries;
  }

  sizes.forEach(function (size) {
    var object = objectOf(size);
    var entries = entriesOf(size);
    var updateObject = updateObjectOf(size);
    var updateEntries = updateEntriesOf(size);
    var getMap = Immutable.Map(object);
    var nestedGetMap = Immutable.Map({
      root: Immutable.Map({
        child: Immutable.Map({
          leaf: size,
        }),
      }),
    });
    var mergeMap = Immutable.Map(object);
    var updateMap = Immutable.Map(updateObject);
    var setMap = Immutable.Map(object);
    var transientSetMap = Immutable.Map(object);
    var removeMap = Immutable.Map(object);
    var iterateMap = Immutable.Map(object);
    var keys = Object.keys(object);
    var firstValue = getMap.valueSeq().first();
    var lastValue = getMap.valueSeq().last();

    describe('of ' + size, function () {
      it('builds from object', function () {
        var result = Immutable.Map(object);
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('builds from entries', function () {
        var result = Immutable.Map(entries);
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('gets every key', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          total += getMap.get(keys[ii]);
        }
        if (total !== ((size - 1) * size) / 2) {
          throw new Error('Unexpected total');
        }
      });

      it('gets missing keys', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          if (getMap.get('missing:' + keys[ii]) === undefined) {
            total++;
          }
        }
        if (total !== size) {
          throw new Error('Unexpected total');
        }
      });

      it('gets a single-key path', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          total += getMap.getIn([keys[ii]]);
        }
        if (total !== ((size - 1) * size) / 2) {
          throw new Error('Unexpected total');
        }
      });

      it('gets a nested path', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          total += nestedGetMap.getIn(['root', 'child', 'leaf']);
        }
        if (total !== size * size) {
          throw new Error('Unexpected total');
        }
      });

      it('gets a missing nested path', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          if (nestedGetMap.getIn(['root', 'missing', 'leaf']) === undefined) {
            total++;
          }
        }
        if (total !== size) {
          throw new Error('Unexpected total');
        }
      });

      it('has every key', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          if (getMap.has(keys[ii])) {
            total++;
          }
        }
        if (total !== size) {
          throw new Error('Unexpected total');
        }
      });

      it('misses every key', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          if (getMap.has('missing:' + keys[ii])) {
            total++;
          }
        }
        if (total !== 0) {
          throw new Error('Unexpected total');
        }
      });

      it('sets existing keys persistently', function () {
        var result = setMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.set(keys[ii], ii + 1);
        }
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('updates existing keys persistently', function () {
        var result = setMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.update(keys[ii], function (value) {
            return value + 1;
          });
        }
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('updates missing keys persistently', function () {
        var result = setMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.update('missing:' + keys[ii], 0, function (value) {
            return value + 1;
          });
        }
        if (result.size !== size * 2) {
          throw new Error('Unexpected size');
        }
      });

      it('updates keys without changes', function () {
        var result = setMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.update(keys[ii], function (value) {
            return value;
          });
        }
        if (result !== setMap) {
          throw new Error('Unexpected result');
        }
      });

      it('sets new keys persistently', function () {
        var result = Immutable.Map();
        for (var ii = 0; ii < size; ii++) {
          result = result.set(keys[ii], ii);
        }
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('sets existing keys transiently', function () {
        var result = transientSetMap.withMutations(function (mutable) {
          for (var ii = 0; ii < size; ii++) {
            mutable.set(keys[ii], ii + 1);
          }
        });
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('sets new keys transiently', function () {
        var result = Immutable.Map().withMutations(function (mutable) {
          for (var ii = 0; ii < size; ii++) {
            mutable.set(keys[ii], ii);
          }
        });
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('merges a map', function () {
        var result = mergeMap.merge(updateMap);
        if (result.size !== size || result.get(keys[0]) !== 1) {
          throw new Error('Unexpected merge result');
        }
      });

      it('merges a map with merger', function () {
        var result = mergeMap.mergeWith(function (left, right) {
          return left + right;
        }, updateMap);
        if (result.size !== size || result.get(keys[0]) !== 1) {
          throw new Error('Unexpected merge result');
        }
      });

      it('merges an object', function () {
        var result = mergeMap.merge(updateObject);
        if (result.size !== size || result.get(keys[0]) !== 1) {
          throw new Error('Unexpected merge result');
        }
      });

      it('merges an object with merger', function () {
        var result = mergeMap.mergeWith(function (left, right) {
          return left + right;
        }, updateObject);
        if (result.size !== size || result.get(keys[0]) !== 1) {
          throw new Error('Unexpected merge result');
        }
      });

      it('merges entries', function () {
        var result = mergeMap.merge(updateEntries);
        if (result.size !== size || result.get(keys[0]) !== 1) {
          throw new Error('Unexpected merge result');
        }
      });

      it('merges entries with merger', function () {
        var result = mergeMap.mergeWith(function (left, right) {
          return left + right;
        }, updateEntries);
        if (result.size !== size || result.get(keys[0]) !== 1) {
          throw new Error('Unexpected merge result');
        }
      });

      it('maps changed values', function () {
        var result = getMap.map(function (value) {
          return value + 1;
        });
        if (result.size !== size || result.get(keys[0]) !== 1) {
          throw new Error('Unexpected map result');
        }
      });

      it('maps unchanged values', function () {
        var result = getMap.map(function (value) {
          return value;
        });
        if (result !== getMap) {
          throw new Error('Unexpected map result');
        }
      });

      it('maps changed keys', function () {
        var result = getMap.mapKeys(function (key) {
          return key + ':mapped';
        });
        if (result.size !== size || result.get(keys[0] + ':mapped') !== 0) {
          throw new Error('Unexpected mapKeys result');
        }
      });

      it('maps unchanged keys', function () {
        var result = getMap.mapKeys(function (key) {
          return key;
        });
        if (result.size !== size || result.get(keys[0]) !== 0) {
          throw new Error('Unexpected mapKeys result');
        }
      });

      it('maps changed entries', function () {
        var result = getMap.mapEntries(function (entry) {
          return [entry[0] + ':mapped', entry[1] + 1];
        });
        if (result.size !== size || result.get(keys[0] + ':mapped') !== 1) {
          throw new Error('Unexpected mapEntries result');
        }
      });

      it('maps unchanged entries', function () {
        var result = getMap.mapEntries(function (entry) {
          return entry;
        });
        if (result.size !== size || result.get(keys[0]) !== 0) {
          throw new Error('Unexpected mapEntries result');
        }
      });

      it('flips keys and values', function () {
        var result = getMap.flip();
        if (result.size !== size || result.get(0) !== keys[0]) {
          throw new Error('Unexpected flip result');
        }
      });

      it('filters half the values', function () {
        var result = getMap.filter(function (value) {
          return value % 2 === 0;
        });
        if (result.size !== Math.ceil(size / 2)) {
          throw new Error('Unexpected filter result');
        }
      });

      it('filters all values', function () {
        var result = getMap.filter(function () {
          return true;
        });
        if (result.size !== size) {
          throw new Error('Unexpected filter result');
        }
      });

      it('filterNots half the values', function () {
        var result = getMap.filterNot(function (value) {
          return value % 2 === 0;
        });
        if (result.size !== Math.floor(size / 2)) {
          throw new Error('Unexpected filter result');
        }
      });

      it('counts values', function () {
        var result = getMap.count();
        if (result !== size) {
          throw new Error('Unexpected count result');
        }
      });

      it('counts matching values', function () {
        var result = getMap.count(function (value) {
          return value % 2 === 0;
        });
        if (result !== Math.ceil(size / 2)) {
          throw new Error('Unexpected count result');
        }
      });

      it('hashes values', function () {
        var total = 0;
        for (var ii = 0; ii < size; ii++) {
          getMap.__hash = undefined;
          total += getMap.hashCode();
        }
        if (typeof total !== 'number') {
          throw new Error('Unexpected hash result');
        }
      });

      it('reduces values', function () {
        var result = getMap.reduce(function (total, value) {
          return total + value;
        }, 0);
        if (result !== ((size - 1) * size) / 2) {
          throw new Error('Unexpected reduce result');
        }
      });

      it('reduceRights values', function () {
        var result = getMap.reduceRight(function (total, value) {
          return total + value;
        }, 0);
        if (result !== ((size - 1) * size) / 2) {
          throw new Error('Unexpected reduceRight result');
        }
      });

      it('checks every value', function () {
        var result = getMap.every(function (value) {
          return value < size;
        });
        if (!result) {
          throw new Error('Unexpected every result');
        }
      });

      it('checks some values', function () {
        var result = getMap.some(function (value) {
          return value === size - 1;
        });
        if (!result) {
          throw new Error('Unexpected some result');
        }
      });

      it('finds a value', function () {
        var result = getMap.find(function (value) {
          return value === size - 1;
        });
        if (result !== size - 1) {
          throw new Error('Unexpected find result');
        }
      });

      it('finds an entry', function () {
        var result = getMap.findEntry(function (value) {
          return value === size - 1;
        });
        if (result[0] !== keys[size - 1] || result[1] !== size - 1) {
          throw new Error('Unexpected findEntry result');
        }
      });

      it('finds a key', function () {
        var result = getMap.findKey(function (value) {
          return value === size - 1;
        });
        if (result !== keys[size - 1]) {
          throw new Error('Unexpected findKey result');
        }
      });

      it('finds a last value', function () {
        var result = getMap.findLast(function (value) {
          return value === size - 1;
        });
        if (result !== size - 1) {
          throw new Error('Unexpected findLast result');
        }
      });

      it('finds a last entry', function () {
        var result = getMap.findLastEntry(function (value) {
          return value === size - 1;
        });
        if (result[0] !== keys[size - 1] || result[1] !== size - 1) {
          throw new Error('Unexpected findLastEntry result');
        }
      });

      it('finds a last key', function () {
        var result = getMap.findLastKey(function (value) {
          return value === size - 1;
        });
        if (result !== keys[size - 1]) {
          throw new Error('Unexpected findLastKey result');
        }
      });

      it('includes a value', function () {
        var result = getMap.includes(size - 1);
        if (!result) {
          throw new Error('Unexpected includes result');
        }
      });

      it('misses a value', function () {
        var result = getMap.includes(-1);
        if (result) {
          throw new Error('Unexpected includes result');
        }
      });

      it('finds a key of a value', function () {
        var result = getMap.keyOf(size - 1);
        if (result !== keys[size - 1]) {
          throw new Error('Unexpected keyOf result');
        }
      });

      it('finds a last key of a value', function () {
        var result = getMap.lastKeyOf(0);
        if (result !== keys[0]) {
          throw new Error('Unexpected lastKeyOf result');
        }
      });

      it('gets the first value', function () {
        var result = getMap.first();
        if (result !== firstValue) {
          throw new Error('Unexpected first result');
        }
      });

      it('gets the last value', function () {
        var result = getMap.last();
        if (result !== lastValue) {
          throw new Error('Unexpected last result');
        }
      });

      it('converts to object', function () {
        var result = getMap.toObject();
        if (result[keys[0]] !== 0) {
          throw new Error('Unexpected object result');
        }
      });

      it('converts to JS', function () {
        var result = getMap.toJS();
        if (result[keys[0]] !== 0) {
          throw new Error('Unexpected JS result');
        }
      });

      it('converts to array', function () {
        var result = getMap.toArray();
        if (result.length !== size) {
          throw new Error('Unexpected array result');
        }
      });

      it('removes every key', function () {
        var result = removeMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.remove(keys[ii]);
        }
        if (result.size !== 0) {
          throw new Error('Unexpected size');
        }
      });

      it('removes missing keys', function () {
        var result = removeMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.remove('missing:' + keys[ii]);
        }
        if (result.size !== size) {
          throw new Error('Unexpected size');
        }
      });

      it('deletes all keys from array', function () {
        var result = removeMap.deleteAll(keys);
        if (result.size !== 0) {
          throw new Error('Unexpected size');
        }
      });

      it('deletes missing keys from array', function () {
        var missingKeys = new Array(size);
        for (var ii = 0; ii < size; ii++) {
          missingKeys[ii] = 'missing:' + keys[ii];
        }
        var result = removeMap.deleteAll(missingKeys);
        if (result !== removeMap) {
          throw new Error('Unexpected result');
        }
      });

      it('iterates every entry', function () {
        var total = 0;
        iterateMap.forEach(function (value) {
          total += value;
        });
        if (total !== ((size - 1) * size) / 2) {
          throw new Error('Unexpected total');
        }
      });
    });
  });
});
