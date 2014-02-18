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

Events returned from clarinetObjectStream.read() have the form:

```
{
  type: 'openobject',
  data: 'first-key'
}
```

See the [Clarinet documentation][0] for the list of events that can be generated
by the stream.

[0]: https://github.com/dscape/clarinet
