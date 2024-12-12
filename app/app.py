from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for
import os
import subprocess

app = Flask(__name__)

OUTPUT_DIR = 'app/output_files'
os.makedirs(OUTPUT_DIR, exist_ok=True)

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
