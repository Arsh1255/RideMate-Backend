# Use an official lightweight Node.js runtime
FROM node:20-bullseye-slim

# The official Node image already includes a user named "node" with UID 1000.
# Hugging Face requires UID 1000, so we just switch to this existing user!
USER node

# Define environment variables
ENV HOME=/home/node \
    PATH=/home/node/.local/bin:$PATH \
    PORT=7860 \
    NODE_ENV=production

# Set the working directory inside the container
WORKDIR $HOME/app

# Copy package.json and package-lock.json, giving ownership to "node"
COPY --chown=node package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code, giving ownership to "node"
COPY --chown=node . .

# Expose the port Hugging Face expects
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
