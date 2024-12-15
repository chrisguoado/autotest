FROM docker.io/linuxserver/chromium:latest
COPY ./dist /autotest
WORKDIR /autotest
ENTRYPOINT ["node", "autotest.js"]
