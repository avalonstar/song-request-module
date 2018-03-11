const routes = require('./routes');
const globals = require('./globals');

module.exports = (db) => {
  globals.db = db;
  return routes;
};
