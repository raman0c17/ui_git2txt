document.addEventListener('DOMContentLoaded', function() {
    const generateForm = document.getElementById('generateForm');
    const fileList = document.getElementById('fileList');
    const messageDiv = document.getElementById('message');

    function showMessage(text, isError = false) {
        messageDiv.textContent = text;
        messageDiv.style.color = isError ? 'red' : 'green';
        setTimeout(() => messageDiv.textContent = '', 3000);
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
        fetch('/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `repoUrl=${encodeURIComponent(repoUrl)}`
        })
        .then(response => {
            if (response.ok) {
                showMessage('File generated successfully');
                updateFileList();
            } else {
                showMessage('Error generating file', true);
            }
        })
        .catch(error => showMessage('Error generating file', true));
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

    updateFileList();
});
