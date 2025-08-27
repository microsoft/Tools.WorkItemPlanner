// User related simple UI helpers extracted from main.js
(function(){
  function displayUserName(name){
    const el = document.getElementById('profile-dropdown');
    if(el){ el.innerHTML = name; }
  }
  window.UserUI = { displayUserName };
  // Backward compatibility global
  window.displayUserName = displayUserName;
})();
