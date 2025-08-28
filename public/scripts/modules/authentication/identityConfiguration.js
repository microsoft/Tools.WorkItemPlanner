const hostname = window.location.hostname;
const port = window.location.port;
const isLocal = hostname === "localhost";

const msalConfig = {
  auth: {
    clientId: "67de02a2-79c0-46f6-9d32-6d4b602e0eed",
    authority: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47",
    redirectUri: isLocal ? `http://${hostname}:${port}` : "https://workitemplanner.codeapp.ms/",
    postLogoutRedirectUri: "https://dev.azure.com",
    navigateToLoginRequestUrl: false, // If "true", will navigate back to the original request location before processing the auth code response.
  },
  cache: {
    cacheLocation: "sessionStorage", // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO btw tabs.
    storeAuthStateInCookie: false, // If you wish to store cache items in cookies as well as browser cache, set this to "true".
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case msal.LogLevel.Error:
            console.error(message);
            return;
          case msal.LogLevel.Info:
            console.info(message);
            return;
          case msal.LogLevel.Verbose:
            console.debug(message);
            return;
          case msal.LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
    },
  },
};

const loginRequest = {
  scopes: ["openid", "profile", "User.Read", "offline_access"],
};

const apiConfig = {
  scopes: ["499b84ac-1321-427f-aa17-267ca6975798/.default"], // 499b84ac-1321-427f-aa17-267ca6975798 is the App Id of Azure DevOps Service
};

const tokenRequest = {
  scopes: apiConfig.scopes,
  forceRefresh: false,
};

const tokenRequest_noScopes = {
  scopes: ["User.Read"],
  forceRefresh: false,
};
