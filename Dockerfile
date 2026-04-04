FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_FRAPPE_URL
ARG VITE_FRAPPE_API_KEY
ARG VITE_FRAPPE_API_SECRET

ENV VITE_FRAPPE_URL=$VITE_FRAPPE_URL
ENV VITE_FRAPPE_API_KEY=$VITE_FRAPPE_API_KEY
ENV VITE_FRAPPE_API_SECRET=$VITE_FRAPPE_API_SECRET

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
