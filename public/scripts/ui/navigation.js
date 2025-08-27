// Navigation / URL helpers extracted from main.js
(function(){
  function getFeatureUrl(){
    const featureIdVal = $('#feature-id').val();
    const organization = $('#organization-select').val();
    const project = $('#project-select').val();
    return `https://dev.azure.com/${organization}/${project}/_workitems/edit/${featureIdVal}`;
  }
  window.getFeatureUrl = getFeatureUrl;
})();
