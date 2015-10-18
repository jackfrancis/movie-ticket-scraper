var request = require('supertest'),
    require = require('really-need');

describe('loading express', function () {
  var server;
  beforeEach(function () {
    server = require('../index.js', { bustCache: true });
  });
  afterEach(function (done) {
    server.close(done);
  });
  it('GET /', function testSlash(done) {
    this.timeout(60000);
    request(server)
      .get('/')
      .expect(200, done);
  });
});