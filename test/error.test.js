/**
 * @fileOverview
 * Test broken JSON streaming. This should result in a flow of parse error
 * events.
 */

var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var ClarinetObjectStream = require('..');

describe('JSON with errors', function () {
  var clarinetObjectStream;
  var readStream;
  // Index in the array below.
  var index;
  // What should be generated from the sample JSON.
  var parseEvents = [
    { type: 'openobject', data: 'string' },
    {
      type: 'error',
      data: {
        message: [
          'Bad value',
          'Line: 2',
          'Column: 7',
          'Char: \''
        ].join('\n')
      }
    },
    {
      type: 'error',
      data: {
        message: [
          'Bad value',
          'Line: 2',
          'Column: 8',
          'Char: \''
        ].join('\n')
      }
    },
    {
      type: 'error',
      data: {
        message: [
          'Bad value',
          'Line: 2',
          'Column: 9',
          'Char: ,'
        ].join('\n')
      }
    },
    { type: 'openobject', data: 'number' },
    { type: 'value', data: 3.14 },
    { type: 'closeobject' }
  ];
  beforeEach(function () {
    clarinetObjectStream = new ClarinetObjectStream();
    readStream = fs.createReadStream(path.join(__dirname, 'sample-error.json'));
    readStream.pipe(clarinetObjectStream);
    index = 0;
  });

  function checkEvent(index, parseEvent) {
    if (parseEvent.type === 'error') {
      expect(parseEvents[index].data.message).to.equal(parseEvent.data.message);
    } else {
      expect(parseEvents[index]).to.deep.equal(parseEvent);
    }
  }

  it('in non-flowing mode', function (done) {
    clarinetObjectStream.on('readable', function () {
      var parseEvent;
      do {
        // Don't pass a size value to read, as an object stream always returns
        // one object from a read request.
        parseEvent = clarinetObjectStream.read();
        if(parseEvent) {
          checkEvent(index, parseEvent);
          index++;
        }
      } while (parseEvent);
    });

    clarinetObjectStream.on('end', function () {
      // We should only see the end event emitted at the end, after running
      // through all of the parseEvents.
      expect(index).to.equal(parseEvents.length);
      done();
    });
  });

  it('in flowing mode', function (done) {
    clarinetObjectStream.on('data', function (parseEvent) {
      checkEvent(index, parseEvent);
      index++;
    });
    clarinetObjectStream.on('end', function () {
      // We should only see the end event emitted at the end, after running
      // through all of the parseEvents.
      expect(index).to.equal(parseEvents.length);
      done();
    });
  });

});
