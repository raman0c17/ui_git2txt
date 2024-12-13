document.addEventListener('DOMContentLoaded', function() {
    const generateForm = document.getElementById('generateForm');
    const uploadForm = document.getElementById('uploadForm');
    const fileList = document.getElementById('fileList');
    const messageDiv = document.getElementById('message');

    function showMessage(text, isError = false) {
        messageDiv.textContent = text;
        messageDiv.style.color = isError ? 'red' : 'green';
    }

    function updateFileList() {
        fetch('/files')
            .then(response => response.json())
            .then(files => {
                fileList.innerHTML = '';
                files.forEach(file => {
                    const row = fileList.insertRow();
                    row.innerHTML = `
                        <td>${file}</td>
                        <td class="file-actions">
                            <button onclick="downloadFile('${file}')">Download</button>
                            <button onclick="deleteFile('${file}')">Delete</button>
                        </td>
                    `;
                });
            })
            .catch(error => showMessage('Error fetching file list', true));
    }

    generateForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const repoUrl = document.getElementById('repoUrl').value;
        showMessage('Processing...');
        fetch('/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `repoUrl=${encodeURIComponent(repoUrl)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                showMessage(`File generated: ${data.filename}`);
                updateFileList();
            } else {
                showMessage(data.message || 'Error generating file', true);
            }
        })
        .catch(error => showMessage('Error generating file', true));
    });

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        showMessage('Uploading and processing...');
        const formData = new FormData(uploadForm);
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                showMessage(`File processed: ${data.filename}`);
                updateFileList();
            } else {
                showMessage(data.message || 'Error processing uploaded repo', true);
            }
        })
        .catch(error => showMessage('Error processing uploaded repo', true));
    });

    window.downloadFile = function(filename) {
        window.location.href = `/download/${filename}`;
    };

    window.deleteFile = function(filename) {
        fetch(`/delete/${filename}`, { method: 'POST' })
            .then(response => {
                if (response.ok) {
                    showMessage('File deleted successfully');
                    updateFileList();
                } else {
                    showMessage('Error deleting file', true);
                }
            })
            .catch(error => showMessage('Error deleting file', true));
    };

    // Initial file list load
    updateFileList();
});
