FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js v18 and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy our git2txt source code into the container
COPY git2txt/ /app/git2txt/

# Install dependencies for git2txt locally first
WORKDIR /app/git2txt
RUN npm install

# Now install git2txt globally
# raman-TODO : dir issue aa rha hai abs vs rel 
RUN npm install .
RUN npm install -g .
# Move back to /app directory
WORKDIR /app
COPY docker/requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY app/ /app/

EXPOSE 5000
CMD ["python", "app.py"]
