FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Run ETL job on container start
CMD ["node", "etl_job.js"]
