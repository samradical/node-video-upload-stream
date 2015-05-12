function FileUpload() {
    var textEl = document.getElementById('fileUpload');
    var inputEl = document.getElementById('fileInput');
    inputEl.addEventListener('change', _fileSelected);
    textEl.addEventListener('click', function(e) {
        inputEl.click();
    });

    function _fileSelected(e) {
        var file = inputEl.files[0];
        var formData = new FormData();
        formData.append('photos[]', file, file.name);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:3000/fileupload', true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.addEventListener('readystatechange', function(e) {
            if (this.readyState === 4) {
                var res = JSON.parse(e.target.response);
                console.log(res);
            }
        });
        xhr.send(formData);
    }

}



var bpm = new FileUpload();