FROM 16.6

WORKDIR /mz-drn
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3000
CMD [ "npm", "run", "start" ]
