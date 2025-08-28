// This script handles authentication and token acquisition using MSAL.js.
// It is authored as an ES module and also exposes globals for backwards compatibility.

// Create the main myMSALObj instance
// Configuration parameters are located at config.js
const myMSALObj = new msal.PublicClientApplication(msalConfig);
let username = "";

/**
 * Handles successful login by setting the user context in App Insights.
 * This function is called after the user has successfully logged in.
 */
function setAppInsightsUserContext() {
  // Ensure appInsights is available before calling setAuthenticatedUserContext
  if (window.appInsights) {
    window.appInsights.setAuthenticatedUserContext(username);
    console.log(`Set App Insights user context: ${username}`);
  } else {
    console.warn("App Insights is not yet initialized.");
  }
}

/**
 * Sets the user authentication context by determining the active account.
 * If multiple accounts are detected, it selects the one with a username ending in "@microsoft.com".
 */
function setUserAuthContext() {
  const currentAccounts = myMSALObj.getAllAccounts();
  if (!currentAccounts || currentAccounts.length < 1) {
    console.log("No accounts detected");
    return;
  } else if (currentAccounts.length > 1) {
    console.warn("Multiple accounts detected. Choosing the account where username ends with @microsoft.com");
    const msAccount = currentAccounts.find((account) => account.username && account.username.endsWith("@microsoft.com"));
    if (msAccount) {
      username = msAccount.username;
    } else {
      // Fallback to first account
      username = currentAccounts[0].username;
    }
  } else if (currentAccounts.length === 1) {
    console.log("Single account detected. Proceeding with that account.");
    username = currentAccounts[0].username;
  }
}

/**
 * Adds an event callback to handle login success events.
 * Sets the active account and updates the user authentication context.
 */
myMSALObj.addEventCallback((event) => {
  // Set active account after redirect
  if (event.eventType === msal.EventType.LOGIN_SUCCESS && event.payload.account) {
    const account = event.payload.account;
    myMSALObj.setActiveAccount(account);
    setUserAuthContext();
    onSuccessLogin();
  }
}, error => {
  console.log('error', error);
});

/**
 * Handles user sign-in.
 * If accounts are already available, it sets the user context and proceeds.
 * Otherwise, it handles the redirect flow for authentication.
 */
function signIn() {
  // Always process any pending redirect first before deciding what to show
  myMSALObj.handleRedirectPromise().then(() => {
    const currentAccounts = myMSALObj.getAllAccounts();
    if (currentAccounts.length >= 1) {
      setUserAuthContext();
      onSuccessLogin();
    } else {
      // No account -> go straight to redirect BEFORE showing UI
      myMSALObj.loginRedirect();
    }
  }).catch(error => {
    console.log('error', error);
    throw error;
  });
}

/**
 * Handles user sign-out.
 * Logs out the user from the account identified by the username.
 */
function signOut() {
  // Choose which account to logout from by passing a username.
  const logoutRequest = {
    account: myMSALObj.getAccountByUsername(username),
  };
  if (window.appInsights) {
    window.appInsights.clearAuthenticatedUserContext();
  }
  myMSALObj.logout(logoutRequest);
}

/**
 * Acquires a token silently or via redirect if interaction is required.
 * @param {Object} request - The token request object.
 * @returns {Promise} A promise that resolves with the token or falls back to redirect.
 */
function getTokenRedirect(request) {
  request.account = myMSALObj.getAccountByUsername(username);

  return myMSALObj.acquireTokenSilent(request).catch((error) => {
    console.warn("silent token acquisition fails. acquiring token using redirect");
    if (error instanceof msal.InteractionRequiredAuthError) {
      // Fallback to interaction when silent call fails
      return myMSALObj.acquireTokenRedirect(request);
    } else {
      console.warn(error);
    }
  });
}

/**
 * Acquires an access token and resolves it for API calls.
 * @returns {Promise} A promise that resolves with the access token.
 */
function getAccessToken() {
  return new Promise((resolve, reject) => {
    getTokenRedirect(tokenRequest)
      .then((response) => {
        resolve(response.accessToken);
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
  });
}

/**
 * Acquires an access token without scopes and resolves it for API calls.
 * @returns {Promise} A promise that resolves with the access token.
 */
function getAccessToken_NoScopes() {
  return new Promise((resolve, reject) => {
    getTokenRedirect(tokenRequest_noScopes)
      .then((response) => {
        resolve(response.accessToken);
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      });
  });
}

// Function to construct Auth Headers for Azure DevOps
async function generateAuthHeaders() {
  const headers = {};
  try {
    const accessToken = await getAccessToken();
    headers["Authorization"] = `Bearer ${accessToken}`;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
  return headers;
}