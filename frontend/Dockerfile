FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

COPY package.json .

RUN npm i

COPY . .

RUN npm run build

CMD ["npm", "run", "preview", "--", "--host", "--port", "3000"]