FROM python:3.11-slim

# Set the working directory in the container to /app
WORKDIR /app

# Add requirements.txt to the working directory
ADD requirements.txt /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Add the current directory contents into the container at /app
ADD . /app

# Run main.py when the container launches
CMD uvicorn main:app --host 0.0.0.0 --port $SELF_PORT