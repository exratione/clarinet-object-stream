/**
 * @fileOverview
 *
 * Class definition for the ClarinetObjectStream.
 */

var Transform = require('stream').Transform;
var util = require('util');
var clarinet = require('clarinet');


//---------------------------------------------------------------------------
// Class constructor.
//---------------------------------------------------------------------------

/**
 * @class
 * A wrapper for the Clarinet JSON parser that transforms streaming JSON
 * input to streaming Clarinet parse events as output.
 *
 * An example of usage:
 *
 * var ClarinetObjectStream = require('clarinet-object-stream');
 * var clarinetObjectStream = new ClarinetObjectStream({
 *   // The default number of parse events to accumulate in the buffer before
 *   // ceasing to read from the piped-in JSON.
 *   highWaterMark: 16
 * });
 * var readStream = fs.createReadStream('path/to/my.json');
 * readStream.pipe(clarinetObjectStream);
 *
 * clarinetObjectStream.on('readable', function () {
 *   // Start reading. e.g.:
 *   var parseEvent;
 *   do {
 *     parseEvent = clarinetObjectStream.read();
 *     if(parseEvent) {
 *       // doSomethingWith(parseEvent);
 *     }
 *   } while (parseEvent);
 * });
 *
 * Events returned from clarinetObjectStream.read() have the form:
 *
 * {
 *   type: 'openobject',
 *   data: 'first-key'
 * }
 *
 * See the Clarinet documentation for the list of events.
 *
 * @see BaseImporter
 */
function ClarinetObjectStream (options) {
  options = options || {};
  options.objectMode = true;
  ClarinetObjectStream.super_.call(this, options);

  this.parseStream = clarinet.createStream();
  // We keep track of callbacks passed to this._write(), and call them when
  // this.parseStream emits a "data" event, which it should only do when it has
  // finished chewing over a data chunk.
  this.transformCallbackQueue = [];

  var self = this;

  // ------------------------------------------------------------------------
  // Clarinet parse event names.
  // ------------------------------------------------------------------------

  this.CLOSEARRAY = 'closearray';
  this.CLOSEOBJECT = 'closeobject';
  this.KEY = 'key';
  this.OPENARRAY = 'openarray';
  this.OPENOBJECT = 'openobject';
  this.VALUE = 'value';

  // Clarinet only emits an "end" event after parseStream.close() is called and
  // any remaining processing takes place. This is not the standard usage of
  // "end" in a stream, and we can ignore it. Since we never invoke
  // parseStream.close() here, this event will never be emitted.
  //
  // Nonetheless, an instance of ClarinetObjectStream will correctly emit an
  // "end" event in the right circumstances, such as when the input from a piped
  // ReadStream instance has ended.
  //
  // this.END = 'end';

  // Clarinet emits an error event on JSON syntax errors. It can work its way
  // through to syntactically correct JSON on the other side of the error, but
  // will likely emit many error events first.
  this.ERROR = 'error';

  // ------------------------------------------------------------------------
  // Manage write streaming to the Clarinet parseStream.
  // ------------------------------------------------------------------------

  this.parseStream.on('data', function () {
    // Invoke the associated callback passed in to self.write() with the data
    // in question.
    var callback = self.transformCallbackQueue.shift();
    // Should always exist, as Clarinet only emits the "data" event once done
    // with the data passed in to self.parseStream.write().
    callback();
  });

  // ------------------------------------------------------------------------
  // React to parser events by passing them on as objects.
  // ------------------------------------------------------------------------

  // Done with the array.
  this.parseStream.on(this.CLOSEARRAY, function () {
    self._pushToParseEventQueue({
      type: self.CLOSEARRAY
    });
  });

  // Done with an object.
  this.parseStream.on(this.CLOSEOBJECT, function () {
    self._pushToParseEventQueue({
      type: self.CLOSEOBJECT
    });
  });

  // See the inline notes on this.END as to why this is not needed.
  //
  // this.parseStream.on(this.END, function () {
  //   self._pushToParseEventQueue({
  //     type: self.END
  //   });
  // });

  // Found a key in the current object.
  this.parseStream.on(this.KEY, function (key) {
    self._pushToParseEventQueue({
      type: self.KEY,
      data: key
    });
  });

  // A new array is opened.
  this.parseStream.on(this.OPENARRAY, function () {
    self._pushToParseEventQueue({
      type: self.OPENARRAY
    });
  });

  // Opened a new object. The key argument is the first key in the object,
  // not the key of the parent object, if it exists.
  this.parseStream.on(this.OPENOBJECT, function (key) {
    self._pushToParseEventQueue({
      type: self.OPENOBJECT,
      data: key
    });
  });

  // Found a value: could be in an array or an object.
  this.parseStream.on(this.VALUE, function (value) {
    self._pushToParseEventQueue({
      type: self.VALUE,
      data: value
    });
  });

  // ------------------------------------------------------------------------
  // React to an error emitted by the Clarinet parser.
  // ------------------------------------------------------------------------

  // Treat an error the same way as any other event, and push it to the
  // queue. Any syntax errors in JSON will generally result in a lot of error
  // events before it works its way back to any following correct JSON.
  this.parseStream.on(this.ERROR, function (error) {
    self._pushToParseEventQueue({
      type: self.ERROR,
      data: error
    });
  });

}
util.inherits(ClarinetObjectStream, Transform);

//---------------------------------------------------------------------------
// Methods
//---------------------------------------------------------------------------

/**
 * Feed written data directly into the clarinet stream.
 *
 * @see Transform#_transform
 */
ClarinetObjectStream.prototype._transform = function(chunk, encoding, callback) {
  // Set the callback so that it can be invoked when parseStream says that it
  // is done.
  this.transformCallbackQueue[this.transformCallbackQueue.length] = callback;
  this.parseStream.write(chunk);
};

/**
 * Push an event to the parse event queue. A layer of abstraction to allow for
 * testing and debugging.
 *
 * @param {Object} parseEvent
 *   An event emitted by the Clarinet parseStream.
 */
ClarinetObjectStream.prototype._pushToParseEventQueue = function (parseEvent) {
  this.push(parseEvent);
};

//---------------------------------------------------------------------------
// Export class constructor.
//---------------------------------------------------------------------------

module.exports = ClarinetObjectStream;
