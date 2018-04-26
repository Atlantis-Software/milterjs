# milterjs

[![npm version](https://badge.fury.io/js/milterjs.svg)](https://www.npmjs.com/milterjs)
[![Build Status](https://travis-ci.org/Atlantis-Software/milterjs.svg?branch=master)](https://travis-ci.org/Atlantis-Software/milterjs)
[![Coverage Status](https://coveralls.io/repos/github/Atlantis-Software/milterjs/badge.svg?branch=master)](https://coveralls.io/github/Atlantis-Software/milterjs?branch=master)
[![NSP Status](https://nodesecurity.io/orgs/atlantis/projects/513e7252-f706-4b97-992c-3328b4559391/badge)](https://nodesecurity.io/orgs/atlantis/projects/513e7252-f706-4b97-992c-3328b4559391)
[![Dependencies Status](https://david-dm.org/Atlantis-Software/milterjs.svg)](https://david-dm.org/Atlantis-Software/milterjs)

sendmail milter protocol javscript client library

help you write a sendmail/postfix milter in javascript

## EXEMPLE
```javascript
var milterjs = require('milterjs');

milterjs.on('helo', function(ctx) {
  console.log('helo event !');
  ctx.continue();
});

milterjs.listen(9568, '127.0.0.1');
```

## METHODS
### on(eventName, listener)
Call a function on a specified event.

* eventName: The name of the event.
* listener: The callback function called on event previously specified.
### listen(port, [host])
Start listening for sendmail/postfix connections on the given port and host.

* port: number of port
* host: ipv4 or ipv6 string address, default is `0.0.0.0`

## EVENTS
| EventName | Parameters | accept/reject Action | Description |
| --------- | ---------- | -------------------- | ----------- |
| abort | ctx | no | cancel current message and get ready to process a new one. |
| body | ctx, BodyChunk | yes | Body chunk (up to MILTER_CHUNK_SIZE (65535) bytes.)
| connect | ctx, hostname, connection_type, address, port | yes | SMTP connection information. |
| eom | ctx | yes | the end of the body. |
| helo | ctx, heloName | yes | HELO/EHLO name |
| envfrom | ctx, sender | yes | array[0] sender, with <> qualification. array[1] and beyond are ESMTP arguments, if any. |
| header | ctx, header | no | array[0] header, array[1] value |
| eoh | ctx | yes | the end of headers. |
| envrcpt | ctx, recipient | yes | array[0] recipient, with <> qualification. array[1] and beyond are ESMTP arguments, if any. |
| data | ctx | yes | end of data. |
| close | ctx | no | close milter connection. |
| unknown | ctx, command | no | tell the milter that an unknown smtp command has been received. |
| error | error | no | an error has occur. |

## CTX
ctx is the Milter context object.
### ATTRIBUTES
* `version`: the milter protocol version of MTA.
* `macros`: object containing all macros.
* `uniqueID`: unique identifier for milter connection.
### METHODS
#### `accept()`: Accept message completely (accept/reject action)
This will skip to the end of the milter sequence, and recycle back to
the state before SMFIC_MAIL.  The MTA may, instead, close the connection
at that point.
#### `continue()`: Accept and keep processing (accept/reject action)
If issued at the end of the milter conversation, functions the same as `accept()`.
#### `discard()`: Set discard flag for entire message (accept/reject action)
Note that message processing MAY continue afterwards, but the mail will
not be delivered even if accepted with `accept()`.
#### `reject()`: Reject command/recipient with a 5xx (accept/reject action)
#### `tempfail()`: Reject command/recipient with a 4xx (accept/reject action)
#### `replycode(code, message)`: Send specific Nxx reply message (accept/reject action)
  * `code`: string with length of 3 characters. [see](https://tools.ietf.org/html/rfc5321#page-48)
  * `message`: string
#### `progress()`: Progress (asynchronous action)
This is an asynchronous response which is sent to the MTA to reset the
communications timer during long operations.  The MTA should consume
as many of these responses as are sent, waiting for the real response
for the issued command.
#### `quarantine(reason)`: Quarantine message (modification action)
  * `reason`: string
This quarantines the message into a holding pool defined by the MTA.
#### `addheader(header, value)`: Add header (modification action)
  * `header`: string
  * `value`: string
#### `addrcpt(rcpt)`: Add recipient (modification action)
  * `rcpt`: string email of new recipient
#### `chgheader(header, num, value)`: Change a header (modification action)
  * `header`: string
  * `num`: number (integer value)
  * `value`: string
Change the `num`'th header of name `header` to the value `value`
#### `delrcpt(rcpt)`: Remove address `rcpt` from the list of recipients for this mail (modification action)
  * `rcpt`: string
#### `replacebody(chunk)`: Replace the message body (modification action)
  * `chunk`: string
Replace the message body with the `chunk`. This method may be called multiple times, each call appending to the replacement buffer.
End-of-line should be represented by CR-LF ("\r\n").
#### `setsender(sender)`: Replace the envelope sender address (modification action)
This method provides an implementation to access the mlfi_setsender method added to the libmilter library as part of the [mlfi-setsender project](http://www.sourceforge.net/projects/mlfi-setsender)
