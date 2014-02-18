/**
 * @fileOverview
 * Test basic streaming of JSON to Clarinet parse events.
 */

var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var ClarinetObjectStream = require('..');

describe('JSON transformed to parse events', function () {
  var clarinetObjectStream;
  var readStream;
  // Index in the array below.
  var index;
  // What should be generated from the sample JSON.
  var parseEvents = [
    { type: 'openobject', data: 'string' },
    { type: 'value', data: 'str' },
    { type: 'key', data: 'number' },
    { type: 'value', data: 3.14 },
    { type: 'key', data: 'subobject' },
    { type: 'openobject', data: 'boolean' },
    { type: 'value', data: false },
    { type: 'key', data: 'array' },
    { type: 'openarray' },
    { type: 'value', data: 1 },
    { type: 'value', data: 'str' },
    { type: 'closearray' },
    { type: 'closeobject' },
    { type: 'closeobject' }
  ];

  beforeEach(function () {
    clarinetObjectStream = new ClarinetObjectStream();
    readStream = fs.createReadStream(path.join(__dirname, 'sample.json'));
    readStream.pipe(clarinetObjectStream);
    index = 0;
  });

  it('in non-flowing mode', function (done) {
    clarinetObjectStream.on('readable', function () {
      var parseEvent;
      do {
        // Don't pass a size value to read, as an object stream always returns
        // one object from a read request.
        parseEvent = clarinetObjectStream.read();
        if(parseEvent) {
          expect(parseEvents[index]).to.deep.equal(parseEvent);
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
      expect(parseEvents[index]).to.deep.equal(parseEvent);
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
