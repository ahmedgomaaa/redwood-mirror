FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && mkdir -p /app/data && chown node:node /app/data
COPY --chown=node:node server.mjs ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
USER node
ENV HOST=0.0.0.0 PORT=4173 DATA_DIR=/app/data
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
