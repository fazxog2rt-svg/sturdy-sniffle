# Gunakan base image yang sudah ada Node.js dan Puppeteer/Chrome terinstall
FROM ghcr.io/puppeteer/puppeteer:latest

# Atur folder kerja di server
WORKDIR /app

# Switch ke User root untuk instalasi (jika perlu)
USER root

# Copy package info dulu agar caching lebih cepat
COPY package*.json ./

# Install dependensi (skipping puppeteer browser download karena sudah ada di image)
RUN npm install

# Copy semua file ke server
COPY . .

# Pastikan folder database bisa ditulis
RUN chmod 777 .

# Gunakan port dari environment (Render/Koyeb butuh ini)
ENV PORT=3000
EXPOSE 3000

# Jalankan bot
CMD ["node", "index.js"]
