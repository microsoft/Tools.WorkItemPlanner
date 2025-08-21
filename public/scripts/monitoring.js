fetch('/api/app-insights-connection')
  .then(response => response.json())
  .then(data => {
    if (!data.connectionString) {
      throw new Error("Failed to retrieve App Insights connection string.");
    }

    var appInsights = window.appInsights || (function(config){
      var instance = { config: config };
      var script = document.createElement("script");
      script.src = "https://js.monitor.azure.com/scripts/b/ai.2.min.js"; 
      document.head.appendChild(script);
      
      instance.queue = []; 
      instance.trackPageView = function() { instance.queue.push(["trackPageView"]); };
      
      window.appInsights = instance;
      return instance;
    })({
      connectionString: data.connectionString
    });

    window.appInsights.trackPageView();
  })
  .catch(error => console.error("Failed to initialize App Insights:", error));
