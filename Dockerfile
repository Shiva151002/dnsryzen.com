# Use the lightweight Nginx image
FROM nginx:alpine

# Copy all website files to Nginx's default HTML folder
COPY . /usr/share/nginx/html

# Expose port 80 inside the container
EXPOSE 80
