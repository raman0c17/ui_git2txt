# Use Python as the base image
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm (Node.js 18)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy the git2txt source code into the container
COPY ./git2txt /app/git2txt

# Install git2txt globally using npm
RUN cd /app/git2txt &&  npm install -g .

# Copy Python requirements file
COPY ./docker/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install -r /app/requirements.txt

# Copy the Flask app source code
COPY ./app /app

# Expose the Flask application port
EXPOSE 5000

# Run the Flask application
CMD ["python", "app.py"]
