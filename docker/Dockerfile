# Use Python as the base image
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Install git2txt globally
RUN npm install -g git2txt

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY docker/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install -r requirements.txt

# Copy application files
COPY app/ /app/

# Expose the port
EXPOSE 5000

# Run the Flask application
CMD ["python", "app.py"]

