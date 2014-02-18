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
  this.END = 'end';
  this.ERROR = 'error';
  this.KEY = 'key';
  this.OPENARRAY = 'openarray';
  this.OPENOBJECT = 'openobject';
  this.VALUE = 'value';

  // ------------------------------------------------------------------------
  // Manage write streaming to the Clarinet parseStream.
  // ------------------------------------------------------------------------

  this.parseStream.on('data', function () {
    // Invoke the associated callback passed in to self.write() with the data
    // in question.
    var callback = self.transformCallbackQueue.shift();
    // Should always exist, as Clarinet only emits this event once done with
    // the data passed in to this.parseStream.write().
    callback();
  });

  // ------------------------------------------------------------------------
  // React to parser events by passing them on as objects.
  // ------------------------------------------------------------------------


  // Done with the array, so move back up to the parent level of the JSON tree.
  this.parseStream.on(this.CLOSEARRAY, function () {
    self._pushToParseEventQueue({
      type: self.CLOSEARRAY
    });
  });

  // Done with an object, meaning store it and bump the state up to the parent
  // level of the JSON tree.
  this.parseStream.on(this.CLOSEOBJECT, function () {
    self._pushToParseEventQueue({
      type: self.CLOSEOBJECT
    });
  });

  // We're done.
  this.parseStream.on(this.END, function () {
    self._pushToParseEventQueue({
      type: self.END
    });
    // Signifying the end to pipes.
    self._pushToParseEventQueue(null);
  });

  this.parseStream.on(this.ERROR, function (error) {
    // This will cleanup and then invoke cleanupAfterHandleError().
    self._pushToParseEventQueue({
      type: self.ERROR,
      data: error
    });
  });

  // Found a key in the current object.
  this.parseStream.on(this.KEY, function (key) {
    self._pushToParseEventQueue({
      type: self.KEY,
      data: key
    });
  });

  // A new array is opened. The key it is under in the parent object is stored
  // as self.key at this point.
  this.parseStream.on(this.OPENARRAY, function () {
    self._pushToParseEventQueue({
      type: self.OPENARRAY
    });
  });

  // Opened a new object. The key argument is the first key in the object,
  // not the key of the parent object, if it exists. That is stored as
  // self.key by this point.
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
}
util.inherits(ClarinetObjectStream, Transform);

//---------------------------------------------------------------------------
// Methods
//---------------------------------------------------------------------------


/**
 * Feed written data directly into the clarinet stream.
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
