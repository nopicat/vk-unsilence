FROM node:18-slim AS development

WORKDIR /usr/src/app

RUN apt-get -y update
RUN apt-get -y upgrade

RUN apt-get -y install python3 python3-pip python3-venv ffmpeg

RUN pip3 install pipx

RUN pipx install unsilence

RUN pipx ensurepath

COPY package*.json ./

RUN npm ci

COPY . .

FROM node:18-slim AS production

WORKDIR /usr/src/app

RUN apt-get -y update
RUN apt-get -y upgrade

RUN apt-get -y install python3 python3-pip python3-venv ffmpeg

RUN pip3 install pipx

RUN pipx install unsilence

RUN pipx ensurepath

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build
