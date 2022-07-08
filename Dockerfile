FROM node:16

RUN apt-get -y update \ 
    && apt-get -y upgrade \
    && apt-get install -y ffmpeg

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
    
WORKDIR /app

COPY . .


WORKDIR /app/node_modules/puppeteer
RUN npm run install

WORKDIR /app
RUN npm install

EXPOSE 3000
CMD [ "node", "index.js" ]