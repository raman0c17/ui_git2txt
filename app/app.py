from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for
import os
import subprocess
import zipfile

app = Flask(__name__)

# Get the absolute directory of the current file (app.py)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Define OUTPUT_DIR and UPLOAD_DIR relative to BASE_DIR
OUTPUT_DIR = os.path.join(BASE_DIR, 'output_files')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploaded_repos')

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route('/')
def index():
    # Initial page load: just render the template
    files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.txt')]
    return render_template('index.html', files=files)

@app.route('/files')
def files_list():
    # Return the list of files as JSON for the frontend to update dynamically
    files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.txt')]
    return jsonify(files)

@app.route('/generate', methods=['POST'])
def generate():
    repo_url = request.form['repoUrl']
    print(repo_url)
    filename = f"{repo_url.split('/')[-1]}.txt"
    print(filename)
    output_file = os.path.join(OUTPUT_DIR, filename)
    try:
        # Run git2txt for the provided GitHub URL
        subprocess.run(['git2txt', repo_url, '-o', output_file], check=True)
        return jsonify({"status": "success", "filename": filename})
    except subprocess.CalledProcessError:
        return jsonify({"status": "error", "message": "Error generating file"}), 500

@app.route('/upload', methods=['POST'])
def upload():
    if 'repoFile' not in request.files:
        return jsonify({"status":"error","message":"No file uploaded"}),400
    file = request.files['repoFile']
    if file.filename == '':
        return jsonify({"status":"error","message":"No selected file"}),400

    zip_path = os.path.join(UPLOAD_DIR, file.filename)
    file.save(zip_path)

    extract_dir = os.path.join(UPLOAD_DIR, os.path.splitext(file.filename)[0])
    os.makedirs(extract_dir, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    # If .git does not exist, initialize a git repo if needed
    git_path = os.path.join(extract_dir, '.git')
    if not os.path.exists(git_path):
        subprocess.run(['git', 'init'], cwd=extract_dir)

    filename = f"{os.path.basename(extract_dir)}.txt"
    output_file = os.path.join(OUTPUT_DIR, filename)
    try:
        print("processing will runn git2txt")
        subprocess.run(['git2txt', extract_dir, '-o', output_file], check=True)
        return jsonify({"status":"success","filename":filename})
    except subprocess.CalledProcessError:
        return jsonify({"status":"error","message":"Error processing uploaded repo"}),500

@app.route('/download/<filename>')
def download(filename):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return "File not found", 404

@app.route('/delete/<filename>', methods=['POST'])
def delete(filename):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return "File deleted", 200
    return "File not found", 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
