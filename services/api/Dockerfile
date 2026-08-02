FROM golang:1.26.5-alpine3.24 AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates git
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go mod download && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/sakuplan-api ./cmd/api

FROM alpine:3.24.1
RUN apk add --no-cache ca-certificates tzdata && addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=build /out/sakuplan-api /usr/local/bin/sakuplan-api
USER app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/sakuplan-api"]
