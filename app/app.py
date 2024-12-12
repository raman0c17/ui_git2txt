from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for
import os
import subprocess
import zipfile

app = Flask(__name__)

OUTPUT_DIR = 'app/output_files'
UPLOAD_DIR = 'app/uploaded_repos'
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route('/')
def index():
    files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.txt')]
    return render_template('index.html', files=files)

@app.route('/files')
def files_list():
    files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.txt')]
    return jsonify(files)

@app.route('/generate', methods=['POST'])
def generate():
    repo_url = request.form['repoUrl']
    try:
        output_file = os.path.join(OUTPUT_DIR, f"{repo_url.split('/')[-1]}.txt")
        subprocess.run(['git2txt', repo_url, '-o', output_file], check=True)
        return redirect(url_for('index'))
    except subprocess.CalledProcessError:
        return "Error generating file", 500

@app.route('/upload', methods=['POST'])
def upload():
    if 'repoFile' not in request.files:
        return "No file uploaded", 400
    file = request.files['repoFile']
    if file.filename == '':
        return "No selected file", 400

    zip_path = os.path.join(UPLOAD_DIR, file.filename)
    file.save(zip_path)

    extract_dir = os.path.join(UPLOAD_DIR, os.path.splitext(file.filename)[0])
    os.makedirs(extract_dir, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    # Check if .git exists, if not we can git init to ensure local repo format if desired
    git_path = os.path.join(extract_dir, '.git')
    if not os.path.exists(git_path):
        subprocess.run(['git', 'init'], cwd=extract_dir)

    output_file = os.path.join(OUTPUT_DIR, f"{os.path.basename(extract_dir)}.txt")
    try:
        subprocess.run(['git2txt', extract_dir, '-o', output_file], check=True)
        return redirect(url_for('index'))
    except subprocess.CalledProcessError:
        return "Error processing uploaded repo", 500

@app.route('/download/<filename>')
def download(filename):
    return send_file(os.path.join(OUTPUT_DIR, filename), as_attachment=True)

@app.route('/delete/<filename>', methods=['POST'])
def delete(filename):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return "File deleted", 200
    return "File not found", 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
