'use strict';

const httpMock = require('node-mocks-http');

describe('cookies', () => {
  var middleware;
  var req;
  var res;
  var next;

  beforeEach(() => {
    res = httpMock.createResponse({
      eventEmitter: require('events').EventEmitter
    });
    middleware = require('../../lib/cookies')({
      'cookie-name': 'hof_cookie',
      'param-name': 'hof_param'
    });
    next = sinon.stub();
  });

  describe('middleware (testCookieSupport)', () => {

    beforeEach(() => {
      req = httpMock.createRequest({
        method: 'GET',
        url: '/my-hof-journey',
      });

      res.cookie = sinon.stub();
      res.redirect = sinon.stub();
    });

    it('passes to the next middleware when a cookie is set', () => {
      req.cookies = {
        foo: 'bar'
      };
      middleware(req, res, next);
      next.should.have.been.calledWith();
    });

    it('attempts to set a cookie if one is not available', () => {
      middleware(req, res);
      res.cookie.should.have.been.calledWith('hof_cookie', 1);
    });

    it('redirects to self with query parameter', () => {
      middleware(req, res);
      res.redirect.should.have.been.calledWith('/my-hof-journey?' + encodeURIComponent('hof_param'));
    });

    it('preserves existing query parameters on redirect', () => {
      req = httpMock.createRequest({
        method: 'GET',
        url: '/my-hof-journey?existing-query',
      });
      middleware(req, res);
      res.redirect.should.have.been.calledWith('/my-hof-journey?existing-query&' + encodeURIComponent('hof_param'));
    });

    it('raises an error when a cookie could not be set with cookies undefined', () => {
      req.cookies = undefined;
      req.query = {
        'hof_param': true
      };
      middleware(req, res, next);
      var err = new Error();
      err.code = 'NO_COOKIES';
      next.should.have.been.calledWith(err, req, res, next);
    });

    it('raises an error when a cookie could not be set with cookies empty object', () => {
      req.cookies = {};
      req.query = {
        'hof_param': true
      };
      middleware(req, res, next);
      var err = new Error();
      err.code = 'NO_COOKIES';
      next.should.have.been.calledWith(err, req, res, next);
    });

    it('redirects to self when there are no cookies and there is am attempt to redirect to malicious site', () => {
      req = httpMock.createRequest({
        method: 'GET',
        url: '//bbc.co.uk',
      });
      middleware(req, res);
      res.redirect.should.have.been.calledWith('/');
    });

    it('does not raise an error when is a default healthcheck url', () => {
      req.cookies = {};
      req.query = {
        'hof_param': true
      };

      const healthcheckPaths = [
          '/healthz',
          '/readyz',
          '/livez'
      ];

      healthcheckPaths.forEach(url => {
        req.path = url;
        middleware(req, res, next);

        next.should.have.been.calledWith();

        let err = new Error();
        err.code = 'NO_COOKIES';
        next.should.not.have.been.calledWith(err, req, res, next);
      });
    });
  });
});
