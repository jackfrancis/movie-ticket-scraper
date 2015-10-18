'use strict';

var config = require('./config.json'), // config.json-sourced configuration
    express = require('express'),
    http = require('http'),
    https = require('https'),
    cheerio = require('cheerio'),
    app = express(),
    timeout = require('connect-timeout'),
    router = express.Router(),
    twilio = require('twilio')(config.twilio.ACCOUNT_SID, config.twilio.AUTH_TOKEN),
    server;

router.get('/', function (req, res) {
  if (req.url.indexOf('favico') === -1) {
    scrape(res);
  }
});

app.use('/', router);
app.use(timeout(60000));
app.use(function ignoreTimeout(req, res, next){
  next();
});

server = app.listen(8000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
  setInterval(function () {
    scrape();
  }, config.frequency * 60000); // config.frequency is in minutes
});

module.exports = server;

/**
 * Our main scraper, invokes an asynchronous HTTPS request for every page in the pages configuration array
 * @param res {Object} an incoming express response object, optional
 */
function scrape (res) {
  var res = res || null,
      requested = [],
      response = [],
      pages = getPageScraperConfigAray();

  pages.forEach(function (pageConfig) {
    var request = pageConfig.url.indexOf('https\:\/\/') !== -1 ?
      https.request(pageConfig.url, function (backEndResponse) {
          httpHtmlResponse(backEndResponse, res, pageConfig, pages.length, requested, response);
      }) :
      http.request(pageConfig.url, function (backEndResponse) {
        httpHtmlResponse(backEndResponse, res, pageConfig, pages.length, requested, response);
      });

    request.on('error', function (err) {
      console.log('got error on HTTPS request!');
      console.log(err);
    });

    request.end();
  });

}

/**
 *
 * @param httpResponse {Object} https response object
 * @param apiResponse {Object} the incoming express response object, optional
 * @param pageConfig {Object} a config object for a single page request
 * @param numRequests {Number} total number of page requests in configuration
 * @param requested {Array} an array to keep track of how many requests have come back
 * @param finalResponse {Array} an array that we'll populate with as the responses come back in asynchronously
 */
function httpHtmlResponse (httpResponse, apiResponse, pageConfig, numRequests, requested, finalResponse) {
  var data = '';

  httpResponse.on('data', function (dataStream) {
    data += dataStream;
  });

  httpResponse.on('end', function () {
    var $, query; // for jquery
    requested.push(pageConfig.url);
    var response = {
      name: pageConfig.name
    };
    if (pageConfig.searchFor) {
      response.found = pageConfig.searchFor.some(function (matchString) {
        return hasMovieReference(data, matchString)
      });
    } else if (pageConfig.jquery) {
      $ = cheerio.load(data);
      query = $(pageConfig.jquery.query);
      if (pageConfig.jquery.chains) {
        pageConfig.jquery.chains.forEach(function (chain) {
          query = query[chain.method](chain.query);
        });
      }
      response.found = query.html();
    }
    if (response.found) {
      sendAlert(pageConfig);
    }
    finalResponse.push(response);
    if (numRequests === requested.length) {
      if (apiResponse) {
        apiResponse.send(finalResponse);
      } else {
        console.log(finalResponse);
      }
    }
  });
}

/**
 * Sends an SMS message alert that a page match has occurred
 * Currently supports only twilio
 * https://www.twilio.com
 * @param pageConfig {Object} the config object we used to look for a page-specific string match
 */
function sendAlert (pageConfig) {
  var alertMessage = '';
  if (pageConfig.searchFor) {
    pageConfig.searchFor.forEach(function (searchString) {
      alertMessage += searchString + ' ';
    });
  } else if (pageConfig.jquery) {
    alertMessage += 'jquery search ';
  }
  alertMessage += 'found! at \n' + (pageConfig.actionUrl ? pageConfig.actionUrl : pageConfig.url);
  config.twilio.destinationNumbers.forEach(function (smsNumber) {
    twilio.sendMessage({
      to: smsNumber,
      from: config.twilio.twilioNumber,
      body: alertMessage

    }, function (err, responseData) {
      if (!err) {
        console.log(responseData.from);
        console.log(responseData.body);
      }
    });
  });
}

/**
 * Convenience function that returns whether or not an HTML string contains a substring
 * @param html {String}
 * @param matchStr {String} the substring to look for
 * @returns {boolean}
 */
function hasMovieReference (html, matchStr) {
  var regex = new RegExp(matchStr, 'i'); // case-sensitive string match
  return regex.test(html);
}

/**
 * Convenience function for constructing an array of page scraper objects
 * @returns {Array}
 */
function getPageScraperConfigAray () {
  var configArray = [],
      pages = config.pages;

  pages.forEach(function (pageConfig) {
    configArray.push({
      name: pageConfig.name,
      url: pageConfig.url,
      actionUrl: pageConfig.actionUrl,
      searchFor: pageConfig.searchFor,
      jquery: pageConfig.jquery
    })
  });

  return configArray;
}