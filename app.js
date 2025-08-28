var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var { ClientSecretCredential } = require('@azure/identity');

var azureDevOpsRouter = require('./routes/azureDevOps');
var indexRouter = require('./routes/index');

var app = express();

/// Azure Application Insights
// Initialize Application Insights only when a connection string is provided via
// the APPLICATIONINSIGHTS_CONNECTION_STRING environment variable. This avoids
// startup failures in local/dev environments where the env var is not set.
const appInsightsConnectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

//#region AzureDevOps Authentication with Service Principal
const tenantId = '72f988bf-86f1-41af-91ab-2d7cd011db47';
const clientId = '67de02a2-79c0-46f6-9d32-6d4b602e0eed';
const clientSecret = 'CLIENT_SECRET_HERE';
const azureDevOpsScopes = ['499b84ac-1321-427f-aa17-267ca6975798/.default'];

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

// Helper function to get the access token
async function getAccessToken() {
  const token = await credential.getToken(azureDevOpsScopes);
  return token.token;
}

// Middleware to add the access token to the headers of each API request
app.use(async (req, res, next) => {
  // const token = await getAccessToken();
  // console.log(token);
  // req.headers['Authorization'] = `Bearer ${token}`;
  next();
});
//#endregion

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true, // Enable strong ETag
  lastModified: true, // Enable Last-Modified
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=600, must-revalidate');
    }
  }
}));


// #region ViewEngine & Routers 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/ado', azureDevOpsRouter);
// #endregion


// #region ErrorHanlder
// Middleware to catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
// #endregion


// #region Monitoring
if (appInsightsConnectionString) {
  try {
    // require only when needed to avoid module side-effects during non-telemetry runs
    const appInsights = require('applicationinsights');
    appInsights.setup()
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true)
      .setUseDiskRetryCaching(true)
      .setSendLiveMetrics(true)
      .setDistributedTracingMode(appInsights.DistributedTracingModes.AI)
      .start();
    console.info('Application Insights initialized.');
  } catch (err) {
    console.error('Failed to initialize Application Insights:', err);
  }
} else {
  console.info('APPLICATIONINSIGHTS_CONNECTION_STRING not set; Application Insights disabled.');
}
// connection string is set in the environment variable APPLICATIONINSIGHTS_CONNECTION_STRING

module.exports = app;