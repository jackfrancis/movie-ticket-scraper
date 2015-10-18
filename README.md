# A simple page regex scraper

Created to figure out as quickly as possible when The Force Awakens tickets are available at the specific movie palaces I want to see the film at.

## Summary

A node.js / express API and background scraper that looks for substring references in a web page's HTML response.

Uses the following:

- express
- connect-timeout (to deal with long backend responses)
- mocha (for tests)
- really-need (for handling testing dependencies)
- supertest (for testing http(s) requests)
- twilio (for sending SMS messages)

## How to Run

Prerequisites

- node.js / npm

```
#
$ npm install
$ npm test
$ node index.js
#
# in another terminal window/tab
#
$ curl http://localhost:8000/
```