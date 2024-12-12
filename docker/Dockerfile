FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Copy our git2txt source code into the container
WORKDIR /app
COPY git2txt/ /app/git2txt/

# Install git2txt globally from local source
WORKDIR /app/git2txt
RUN npm install -g .

# Move back to app directory
WORKDIR /app
COPY docker/requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY app/ /app/

EXPOSE 5000
CMD ["python", "app.py"]
