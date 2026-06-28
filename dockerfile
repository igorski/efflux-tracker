# Use official Node.js based on Alpine
FROM node:24-alpine

# Create dir for application
WORKDIR /usr/src/app

RUN chown node:node /usr/src/app

# Copy package.json
COPY --chown=node:node package.json ./

USER node

# Install dependencies
# NOTE git is needed for lamerjs dependency
RUN apk add --no-cache git && \
    yarn install --ignore-scripts && \
    apk del git

# Copy the rest of the application code
COPY --chown=node:node . .

# Prepare the fixtures
RUN yarn fixtures

# Expose the port the application will run on
EXPOSE 5173

# Run the application
CMD ["yarn", "dev", "--host", "0.0.0.0"]

