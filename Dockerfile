# Use an official lightweight Node.js runtime
FROM node:18-bullseye-slim

# Create a non-root user named "user" with UID 1000 (Hugging Face Requirement)
RUN useradd -m -u 1000 user

# Switch to the newly created non-root user
USER user

# Define environment variables
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PORT=7860 \
    NODE_ENV=production

# Set the working directory inside the container
WORKDIR $HOME/app

# Copy package.json and package-lock.json, giving ownership to "user"
COPY --chown=user package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code, giving ownership to "user"
COPY --chown=user . .

# Expose the port Hugging Face expects
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
