// DOM & jQuery convenience helpers (pure helpers, no side effects outside DOM)
window.DOMUtils = {
  getAssignedToSelect: () => $('#assigned-to-select'),
  showLoadingIndicator(message){
    $('.loading-indicator').show();
    $('.loading-overlay').show();
    if (message) {
      $('.loading-text').text(message).addClass('show');
    } else {
      $('.loading-text').removeClass('show');
    }
  },
  hideLoadingIndicator(){
    $('.loading-indicator').hide();
    $('.loading-overlay').hide();
    $('.loading-text').removeClass('show');
  },
  displayProgressBar(){ $('.progress-bar-container').show(); },
  hideProgressBar(){ $('.progress-bar-container').hide(); },
  setProgressBar(percentage){
    this.displayProgressBar();
    const progressBar = document.getElementById('progress-bar');
    if (percentage >=0 && percentage <=100){
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('aria-valuenow', percentage);
    }
  },
  stopProgressBar(isError){
    const progressBar = document.getElementById('progress-bar');
    if (isError) progressBar.classList.add('bg-danger');
    progressBar.classList.remove('progress-bar-animated');
  }
};

// Legacy global shims (removed with main.js) reintroduced for existing calls
window.showLoadingIndicator = window.showLoadingIndicator || function(message){ window.DOMUtils.showLoadingIndicator(message); };
window.hideLoadingIndicator = window.hideLoadingIndicator || function(){ window.DOMUtils.hideLoadingIndicator(); };
window.setProgressBar = window.setProgressBar || function(p){ window.DOMUtils.setProgressBar(p); };
window.stopProgressBar = window.stopProgressBar || function(err){ window.DOMUtils.stopProgressBar(err); };
window.displayProgressBar = window.displayProgressBar || function(){ window.DOMUtils.displayProgressBar(); };
window.hideProgressBar = window.hideProgressBar || function(){ window.DOMUtils.hideProgressBar(); };
