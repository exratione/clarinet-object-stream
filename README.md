# Clarinet Object Stream

[Clarinet][0] is a streaming JSON parser, but it is only streaming when
reading in and writing out JSON string data. The very useful parse events are
emitted only, not streamed - so it if you want a stream of parse events then
you'll have to assemble that yourself.

Hence this small package: Clarinet Object Stream is a stream that lets you pipe
JSON in and pipe Clarinet parse events out.

## Installation

```
npm install clarinet-object-stream
```

## Usage

```
var ClarinetObjectStream = require('clarinet-object-stream');
var clarinetObjectStream = new ClarinetObjectStream({
  // The number of parse events to accumulate in the buffer before ceasing
  // to read piped-in JSON.
  highWaterMark: 16
});
var readStream = fs.createReadStream('path/to/my.json');
readStream.pipe(clarinetObjectStream);
```

In non-flowing mode:

```
clarinetObjectStream.on('readable', function () {
  // Start reading. e.g.:
  var parseEvent;
  do {
    parseEvent = clarinetObjectStream.read();
    if(parseEvent) {
      // doSomethingWith(parseEvent);
    }
  } while (parseEvent);
});
```

In flowing mode:

```
clarinetObjectStream.on('data', function (parseEvent) {
  // doSomethingWith(parseEvent);
});
```

Either way, an `end` event is emitted once the stream is complete:

```
clarinetObjectStream.on('end', function () {
  // Done!
});
```

## Events

Events returned from `clarinetObjectStream.read()` have the form:

```
{ type: 'closearray' }
{ type: 'closeobject' }
{ type: 'error', data: new Error('parse error description') }
{ type: 'key', data: 'string' }
{ type: 'openarray' }
{ type: 'openobject', data: 'first key name' }
{ type: 'value', data: 'string|number|boolean' }
```

See the [Clarinet documentation][0] for more on the events that can be generated
by the stream.

## Error Events

Syntax errors in JSON will add error events to the object stream - usually quite
a large number of error events.

It is up to you as to what is done when an error occurs - either stop the stream
and abandon parsing, or continue. If there is syntactically correct JSON further
on in the stream, then it will be parsed following the errors and useful parse
events will be emitted once again.

[0]: https://github.com/dscape/clarinet
