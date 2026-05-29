/* global Immutable */
describe('Map core operations', function () {
  var sizes = [8, 32, 1024];

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

  sizes.forEach(function (size) {
    var object = objectOf(size);
    var entries = entriesOf(size);
    var getMap = Immutable.Map(object);
    var setMap = Immutable.Map(object);
    var transientSetMap = Immutable.Map(object);
    var removeMap = Immutable.Map(object);
    var iterateMap = Immutable.Map(object);
    var keys = Object.keys(object);

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

      it('sets existing keys persistently', function () {
        var result = setMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.set(keys[ii], ii + 1);
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

      it('removes every key', function () {
        var result = removeMap;
        for (var ii = 0; ii < size; ii++) {
          result = result.remove(keys[ii]);
        }
        if (result.size !== 0) {
          throw new Error('Unexpected size');
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
