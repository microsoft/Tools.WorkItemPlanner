(function(){
  async function readJSONFileByNameFromPublicFolder(jsonFilePath){
    const publicFolderPath = '';
    const origin = new URL(window.location.href).origin;
    const url = origin + '/' + publicFolderPath + '/' + jsonFilePath;
    try {
      const data = await new Promise((resolve, reject)=>{
        $.ajax({ url, dataType:'json', success: d=> resolve(d), error: (xhr,_s,err)=>{ if (xhr.status===401){ console.error('Unauthorized. Logging out'); logout(); } else if (xhr.status===404){ const message = "File with the given name wasn't found:" + jsonFilePath; console.error(message); hideLoadingIndicator(); showErrorPopup(message); } else { console.log(err); hideLoadingIndicator(); showErrorPopup('Error fetching the file. Check console log.'); } reject(err); }});
      });
      return data;
    } catch(e){ throw e; }
  }
  window.readJSONFileByNameFromPublicFolder = readJSONFileByNameFromPublicFolder;
})();
