from flask import Flask, render_template, request, send_file, redirect, url_for
import os
import subprocess
import uuid
from pprint import pprint

# Initialize Flask app
app = Flask(__name__)

# Directory to store generated files
OUTPUT_DIR = "app/output_files"
os.makedirs(OUTPUT_DIR, exist_ok=True)  # Ensure the directory exists
print(f"Output directory ready: {OUTPUT_DIR}")

@app.route('/')
def index():
    """
    Render the main index page.
    """
    print("\n[INFO] Accessed route: /")
    pprint(dict(request.headers), indent=4)
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    """
    Generate a .txt file using git2txt for a given GitHub repository URL.
    """
    print("\n[INFO] Accessed route: /generate [POST]")
    print("- Headers:")
    pprint(dict(request.headers), indent=4)
    print("- Form Data:")
    pprint(request.form, indent=4)

    # Extract repo_url from the form data
    repo_url = request.form.get('repoUrl')
    if not repo_url:
        print("[ERROR] No repository URL provided.")
        return "Error: No repository URL provided.", 400

    try:
        # Generate unique filename and output path
        output_filename = f"{uuid.uuid4()}.txt"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        print(f"[INFO] Generated output file path: {output_path}")

        # Run git2txt with the correct syntax
        print(f"[INFO] Running git2txt for URL: {repo_url}")
        subprocess.run(["git2txt", repo_url, "-o", output_path], check=True)
        print(f"[INFO] File generated successfully: {output_path}")

        print("check error here----------------------------------------------------------------------------------------------------")
        return send_file(output_path, as_attachment=True)
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] git2txt command failed: {e}")
        return f"Error generating file: {str(e)}", 500
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return f"Error generating file: {str(e)}", 500

@app.route('/files')
def list_files():
    """
    List all generated .txt files in the output directory.
    """
    print("we are in output dir")
    print("\n[INFO] Accessed route: /files")
    pprint(dict(request.headers), indent=4)

    # Fetch all .txt files from the output directory
    # files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.txt')]
    files = [f for f in os.listdir(OUTPUT_DIR) ]
    print(f"[INFO] Files in output directory: {files}")
    return render_template('files.html', files=files)

@app.route('/download/<filename>')
def download_file(filename):
    """
    Download a specific file from the output directory.
    """
    print(f"\n[INFO] Accessed route: /download/{filename}")
    pprint(dict(request.headers), indent=4)

    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        print(f"[INFO] File found: {file_path}")
        return send_file(file_path, as_attachment=True)
    else:
        print("[ERROR] File not found.")
        return "Error: File not found.", 404

@app.route('/delete/<filename>', methods=['POST'])
def delete_file(filename):
    """
    Delete a specific file from the output directory.
    """
    print(f"\n[INFO] Accessed route: /delete/{filename} [POST]")
    pprint(dict(request.headers), indent=4)

    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f"[INFO] File deleted: {file_path}")
        return redirect(url_for('list_files'))
    else:
        print("[ERROR] File not found.")
        return "Error: File not found.", 404

if __name__ == '__main__':
    print("[INFO] Starting Flask application...")
    app.run(debug=True, host='0.0.0.0', port=5000)
