const net = require('net');
const EventEmitter = require('events');


const SMFI_V1_ACTS     = 0x0F;
const SMFI_V2_ACTS     = 0x1F;
const SMFI_CURR_ACTS   = 0x1F;

const SMFIA_UNKNOWN    = 'U';
const SMFIA_UNIX       = 'L';
const SMFIA_INET       = '4';
const SMFIA_INET6      = '6';

const SMFIC_ABORT      = 'A';
const SMFIC_BODY       = 'B';
const SMFIC_CONNECT    = 'C';
const SMFIC_MACRO      = 'D';
const SMFIC_BODYEOB    = 'E';
const SMFIC_HELO       = 'H';
const SMFIC_HEADER     = 'L';
const SMFIC_MAIL       = 'M';
const SMFIC_EOH        = 'N';
const SMFIC_OPTNEG     = 'O';
const SMFIC_QUIT       = 'Q';
const SMFIC_RCPT       = 'R';
const SMFIC_DATA       = 'T';
const SMFIC_UNKNOWN    = 'U';

const SMFIR_ADDRCPT    = '+';
const SMFIR_DELRCPT    = '-';
const SMFIR_ACCEPT     = 'a';
const SMFIR_REPLBODY   = 'b';
const SMFIR_CONTINUE   = 'c';
const SMFIR_DISCARD    = 'd';
const SMFIR_ADDHEADER  = 'h';
const SMFIR_INSHEADER  = 'i'; // v3, or v2 and Sendmail 8.13+
const SMFIR_CHGHEADER  = 'm';
const SMFIR_PROGRESS   = 'p';
const SMFIR_QUARANTINE = 'q';
const SMFIR_REJECT     = 'r';
const SMFIR_SETSENDER  = 's';
const SMFIR_TEMPFAIL   = 't';
const SMFIR_REPLYCODE  = 'y';

const SMFIF_ADDHDRS    = 0x01;
const SMFIF_CHGBODY    = 0x02;
const SMFIF_ADDRCPT    = 0x04;
const SMFIF_DELRCPT    = 0x08;
const SMFIF_CHGHDRS    = 0x10;
const SMFIF_QUARANTINE = 0x20;
const SMFIF_SETSENDER  = 0x40;

const SMFIP_NOCONNECT  = 0x01;
const SMFIP_NOHELO     = 0x02;
const SMFIP_NOMAIL     = 0x04;
const SMFIP_NORCPT     = 0x08;
const SMFIP_NOBODY     = 0x10;
const SMFIP_NOHDRS     = 0x20;
const SMFIP_NOEOH      = 0x40;
const SMFIP_NONE       = 0x7F;


var uniqueID = 1;
const milter = module.exports = new EventEmitter();
milter.actions = SMFI_CURR_ACTS;

var writeErrorHandler = function(err) {
  if (err) {
    console.log(err);
  }
};

var server = net.createServer(function(socket) {

  uniqueID === Number.MAX_SAFE_INTEGER ? 1 : uniqueID++;

  var ctx = {
    socket: socket,
    version: null,
    hook: null,
    macros: {},
    uniqueID: uniqueID
  };

  ctx.send = function(code, data) {
    if (!this.socket) {
      return;
    }
    data = data || Buffer.alloc(0);
    var len = Buffer.alloc(4);
    len.writeUInt32BE(data.length + 1);
    this.socket.write(len, writeErrorHandler);
    this.socket.write(code, writeErrorHandler);
    this.socket.write(data, writeErrorHandler);
  }

  // Add header HEADER with value VALUE to this mail.  Does not change any
  // existing headers with the same name.  Only callable from the "eom" callback.

  ctx.addheader = function(header, value) {
    if (!header) {
      return milter.emit('error', new Error('addheader: no header name'));
    }
    if (!value) {
      return milter.emit('error', new Error('addheader: no header value'));
    }
    if (this.hook !== 'eom') {
      return milter.emit('error', new Error('addheader: called outside of EOM'));
    }
    if (milter.actions & SMFIF_ADDHDRS) {
      this.send(SMFIR_ADDHEADER, Buffer.from(header + '\0' + value + '\0'));
    } else {
      milter.emit('error', new Error('addheader: SMFIF_ADDHDRS not in capability list'));
    }
  };

  // Add address ADDRESS to the list of recipients for this mail.  Only callable
  // from the "eom" callback.

  ctx.addrcpt = function(rcpt) {
    if (!rcpt) {
      return milter.emit('error', new Error('addrcpt: no recipient specified'));
    }
    if (this.hook !== 'eom') {
      return milter.emit('error', new Error('addrcpt: called outside of EOM'));
    }
    if (milter.actions & SMFIF_ADDRCPT) {
      this.send(SMFIR_ADDRCPT, Buffer.from(rcpt + '\0'));   
    } else {
      milter.emit('error', new Error('addrcpt: SMFIF_ADDRCPT not in capability list'));
    }
  };

  // Change the INDEX'th header of name HEADER to the value VALUE.  Only callable
  // from the "eom" callback.

  ctx.chgheader = function(header, num, value) {
    if (!header) {
      return milter.emit('error', new Error('chgheader: no header name'));
    }
    num = num || 0;
    value = value || '';
    if (this.hook !== 'eom') {
      return milter.emit('error', new Error('chgheader: called outside of EOM'));
    }
    if (milter.actions & SMFIF_CHGHDRS) {
      var data = Buffer.alloc(6 + header.length + value.length);
      data.writeUInt32BE(num, 0);
      data.write(header + '\0' + value + '\0', 5);
      this.send(SMFIR_CHGHEADER, data);
    } else {
      milter.emit('error', new Error('chgheader: SMFIF_CHGHDRS not in capability list'));
    }
  };

  // Remove address ADDRESS from the list of recipients for this mail.  The
  // ADDRESS argument must match a prior argument to the "envrcpt" callback
  // exactly (case sensitive, and including angle brackets if present).  Only
  // callable from the "eom" callback.

  ctx.delrcpt = function(rcpt) {
    if (!rcpt) {
      return milter.emit('error', new Error('delrcpt: no recipient specified'));
    }
    if (this.hook !== 'eom') {
      return milter.emit('error', new Error('delrcpt: called outside of EOM'));
    }
    if (milter.actions & SMFIF_DELRCPT) {
      this.send(SMFIR_DELRCPT, Buffer.from(rcpt + '\0'));
    } else {
      milter.emit('error', new Error('delrcpt: SMFIF_DELRCPT not in capability list'));
    }
  };

  // Sends an asynchronous "progress" message to the MTA, which should reset 
  // the MTA's internal communications timer.  This can allow longer than 
  // normal operations, such as a deliberate delay, to continue running without 
  // dropping the milter-MTA connection.  This command can be issued at any 
  // time during any callback, although issuing it during a "close" callback 
  // may trigger socket connection warnings.

  ctx.progress = function() {
    this.send(SMFIR_PROGRESS);
  };

  // Quarantine the current message in the MTA-defined quarantine area, using 
  // the given REASON as a text string describing the quarantine status.  Only 
  // callable from the "eom" callback.

  ctx.quarantine = function(reason) {
    if (this.hook !== 'eom') {
      return milter.emit('error', new Error('quarantine: called outside of EOM'));
    }
    if (milter.actions & SMFIF_QUARANTINE) {
      reason = reason || '';
      this.send(SMFIR_QUARANTINE, Buffer.from(reason + '\0'));
    } else {
      milter.emit('error', new Error('quarantine: SMFIF_QUARANTINE not in capability list'));
    }
  };

  // Replace the message body with the data in BUFFER (a scalar).  This method
  // may be called multiple times, each call appending to the replacement buffer.  
  // End-of-line should be represented by CR-LF ("\r\n").  Only callable from the
  // "eom" callback.

  ctx.replacebody = function(chunk) {
    chunk = chunk || '';
    if (this.hook !== 'eom') {
      return milter.emit('error', new Error('replacebody: called outside of EOM'));
    }
    if (milter.actions & SMFIF_CHGBODY) {
      this.send(SMFIR_REPLBODY, Buffer.from(chunk));
    } else {
      milter.emit('error', new Error('replacebody: SMFIF_CHGBODY not in capability list'));
    }
  };

  // Replace the envelope sender address for the given mail message.  This
  // method provides an implementation to access the mlfi_setsender method
  // added to the libmilter library as part of the mlfi-setsender project 
  // (http://www.sourceforge.net/projects/mlfi-setsender).

  ctx.setsender = function(sender) {
    if (!sender) {
      return milter.emit('error', new Error('setsender: no sender specified'));
    }
    // TODO check enable_setsender
    if (this.hook !== 'eom') {
     return  milter.emit('error', new Error('setsender: called outside of EOM'));
    }
    if (milter.actions & SMFIF_SETSENDER) {
      this.send(SMFIR_SETSENDER, Buffer.from(sender + '\0'));
    } else {
      milter.emit('error', new Error('setsender: SMFIF_SETSENDER not in capability list'));
    }
  };

  ctx.replycode = function(code, message) {
    if (!code) {
      return milter.emit('error', new Error('replycode: no code specified'));
    }
    if (code.length !== 3) {
      return milter.emit('error', new Error('replycode: code specified must be 3 caracter length'));
    }
    if (!message) {
      return milter.emit('error', new Error('replycode: no message specified'));
    }
    message = message.replace(/%/g, '%%');
    this.send(SMFIR_REPLYCODE, Buffer.from(code + ' ' + message + '\0'));
  };

  ctx.accept = function() {
    this.send(SMFIR_ACCEPT);
  };

  ctx.continue = function() {
    this.send(SMFIR_CONTINUE);
  };

  ctx.discard = function() {
    this.send(SMFIR_DISCARD);
  };

  ctx.reject = function() {
    this.send(SMFIR_REJECT);
  };

  ctx.tempfail = function() {
    this.send(SMFIR_TEMPFAIL);
  };

  var call_hooks = function(hook) {
    ctx.hook = hook;
    if (milter.listenerCount(hook) === 0) {
      return ctx.continue();
    }
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift(hook, ctx);
    milter.emit.apply(milter, args);
  };

  var queue = Buffer.alloc(0);

  var check_packets = function() {
    if (queue.length <= 4) {
      return;
    }
    var len = queue.readInt32BE();
    if (queue.length < (len + 4)) {
      return;
    }
    var command = queue.toString('ascii', 4, 5);
    var end = 5 + len - 1;
    var data = queue.slice(5, end);
    queue = queue.slice(end);
    parse_packet(command, data);
    check_packets();
  };


  var parse_packet = function(command, data) {
    switch (command) {
      case SMFIC_ABORT:
        // Abort (cancel current message and get ready to process a new one).
        // An abort packet doesn't need a response.
        if (ctx.socket) {
          ctx.socket.end();
          ctx.socket = null;
        }
        ctx.hook = 'abort';
        milter.emit('abort', ctx);
        break;
      case SMFIC_BODY:
        call_hooks('body', data.toString('ascii'));
        break;
      case SMFIC_CONNECT:
        var hostname = '';
        for (var i = 0; data.length < i && data[i] != null; i++) {
          hostname += data.toString('ascii', i, i + 1);
        }
        var family = data.toString('ascii', i + 1, i + 2);
        if (family === SMFIA_UNKNOWN) {
          return call_hooks('connect', hostname);
        }
        var port = data.readUInt16BE(i + 3);
        var address = data.toString('ascii', i + 5, data.length - 2);
        if (family === SMFIA_UNIX) {
          call_hooks('connect', hostname, 'UNIX', address);
        }
        if (family === SMFIA_INET) {
          call_hooks('connect', hostname, 'INET', address, port);
        }
        if (family === SMFIA_INET6) {
          call_hooks('connect', hostname, 'INET6', address, port);
        }
        call_hooks('connect');
        break;
      case SMFIC_MACRO:
        var cmdcode = data.toString('ascii', 0, 1);
        var nameval = data.toString('ascii', 1).split('\0');
        nameval.pop();
        ctx.macros[cmdcode] = ctx.macros[cmdcode] || {};
        if (cmdcode && nameval.length) {
          for (let i = 0; i < nameval.length; i += 2) {
            if (nameval[i] && nameval[i + 1]) {
              ctx.macros[cmdcode][nameval[i]] = nameval[i + 1];
            }
          }
        }
        break;
      case SMFIC_BODYEOB:
        // the end of the body
        call_hooks('eom');
        break;
      case SMFIC_HELO:
        var helo = data.toString('ascii').split('\0')[0];
        call_hooks('helo', helo);
        break;
      case SMFIC_HEADER:
        var header = data.toString('ascii').split('\0');
        header.pop();
        // empty value: ensure an empty string
        if (header.length === 1) {
          header.push('');
        }
        call_hooks('header', header);
        break;
      case SMFIC_MAIL:
        var envfrom = data.toString('ascii').split('\0');
        envfrom.pop();
        call_hooks('envfrom', envfrom);
        break;
      case SMFIC_EOH:
        call_hooks('eoh');
        break;
      case SMFIC_OPTNEG:
        ctx.version = data.readUInt32BE();
        var actions = data.readUInt32BE(4);
        var protocol = data.readUInt32BE(8);

        var requiredProtocol = SMFIP_NONE & ~(SMFIP_NOCONNECT | SMFIP_NOMAIL);
        if (milter.listenerCount('helo') > 0) {
          requiredProtocol &= ~SMFIP_NOHELO;
        }
        if (milter.listenerCount('envrcpt') > 0) {
          requiredProtocol &= ~SMFIP_NORCPT;
        }
        if (milter.listenerCount('body') > 0) {
          requiredProtocol &= ~SMFIP_NOBODY;
        }
        if (milter.listenerCount('header') > 0) {
          requiredProtocol &= ~SMFIP_NOHDRS;
        }
        if (milter.listenerCount('eoh') > 0) {
          requiredProtocol &= ~SMFIP_NOEOH;
        }

        var res = Buffer.alloc(17);
        res.writeUInt32BE(13, 0);
        res.write('O', 4, 1, 'ascii');
        // protocol version
        res.writeUInt32BE(6, 5);
        // actions
        res.writeUInt32BE(milter.actions & actions, 9);
        // required protocol
        res.writeUInt32BE(requiredProtocol & protocol, 13);

        socket.write(res, writeErrorHandler);
        break;
      case SMFIC_RCPT:
        var envrcpt = data.toString('ascii').split('\0');
        envrcpt.pop();
        call_hooks('envrcpt', envrcpt);
        break;
      case SMFIC_DATA:
        // DATA.
        call_hooks('data');
        break;
      case SMFIC_QUIT:
        if (ctx.socket) {
          ctx.socket.end();
          ctx.socket = null;
        }
        ctx.hook = 'close';
        milter.emit('close', ctx);
        break;
      case SMFIC_UNKNOWN:
        // this is not an unknown packet, but a packet
        // to tell the milter that an unknown smtp command
        // has been received.
        ctx.hook = 'unknown';
        milter.emit('unknown', ctx, data.toString('ascii').split('\0')[0]);
        break;
      default:
        milter.emit('error', new Error('unknown milter packet type ' + command));
    }
  };

  socket.on('data', function(data) {
    queue = Buffer.concat([queue, data]);
    check_packets();
  });

  socket.on('error', function(error) {
    milter.emit('error', error);
  });
});

milter.listen = function(port, host) {
  server.listen(port, host);
};

