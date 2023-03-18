FROM nvcr.io/nvidia/pytorch:22.12-py3

# Set the working directory
WORKDIR /root

# Copy the requirements file
COPY requirements.txt /root/requirements.txt

# Install the dependencies
RUN pip install -r /root/requirements.txt

# Copy the rest of the code
COPY ./app /root/app

# Expose the API port
EXPOSE 8040

# Set the working directory
WORKDIR /root/app

# Run the API server
CMD ["python", "main.py"]