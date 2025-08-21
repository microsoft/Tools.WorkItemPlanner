var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET App Insights Connection String */
router.get('/api/app-insights-connection', function(req, res) {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    return res.status(500).json({ error: 'Application Insights connection string is not set.' });
  }

  res.json({ connectionString });
});

module.exports = router;
