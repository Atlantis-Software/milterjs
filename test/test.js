var milterjs = require('../index');
var mailx = require('mailx');
var assert = require('assert');

var message = mailx.message();
message.setFrom('me', 'me@example.net');
message.addTo('you', 'you@example.net');
message.setSubject('test');
message.setText('lorem ipsum dolor sit amet'); 

var transport = mailx.transport('127.0.0.1', 2525);

describe('milter events', function() {

  before(function() {
    milterjs.listen(8893);
  });

  beforeEach(function() {
    milterjs.removeAllListeners();
  });

  it('should emit `abort` event', function(done) {
    var isDone = false;
    milterjs.on('abort', function(ctx) {
      milterjs.removeAllListeners();
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `body` event', function(done) {
    milterjs.on('body', function(ctx, BodyChunk) {
      ctx.continue();
      assert(BodyChunk.includes('lorem ipsum dolor sit amet'));
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `connect` event', function(done) {
    milterjs.on('connect', function(ctx, hostname, connection_type, address, port) {
      ctx.continue();
      assert(hostname.includes('localhost'));
      assert.equal(connection_type, 'INET');
      assert.equal(address, '127.0.0.1');
      assert(port > 0 && port < 65535);
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `eom` event', function(done) {
    milterjs.on('eom', function(ctx) {
      ctx.continue();
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `helo` event', function(done) {
    milterjs.on('helo', function(ctx, heloName) {
      ctx.continue();
      assert.equal(heloName, '[127.0.0.1]');
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `envfrom` event', function(done) {
    milterjs.on('envfrom', function(ctx, sender) {
      ctx.continue();
      assert.equal(sender.length, 1);
      assert.equal(sender[0], '<me@example.net>');
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `header` event', function(done) {
    milterjs.on('header', function(ctx, header) {
      assert.equal(header.length, 2);
      assert.equal(typeof header[0], 'string');
      assert.equal(typeof header[1], 'string');
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `eoh` event', function(done) {
    milterjs.on('eoh', function(ctx) {
      ctx.continue();
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `envrcpt` event', function(done) {
    milterjs.on('envrcpt', function(ctx, recipient) {
      assert.equal(recipient[0], '<you@example.net>');
      ctx.continue();
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `data` event', function(done) {
    milterjs.on('data', function(ctx) {
      ctx.continue();
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });

  it('should emit `close` event', function(done) {
    milterjs.on('close', function(ctx) {
      done();
    });
    transport.send(message, function(err, result) {
      if (err) {
        done(err);
      }
    });
  });
});