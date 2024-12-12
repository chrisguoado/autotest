FROM repos01-522a1580.ecis.jinan-1.cmecloud.cn/library/chromium
COPY ./dist /autotest
RUN chown -R 1000 /autotest
WORKDIR /autotest
ENTRYPOINT ["node", "autotest.js"]
