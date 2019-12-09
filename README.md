# Team Hub API

## Description

Web Sockets API built to work with the team-hub-ui project. This server is built with the [Nest](https://github.com/nestjs/nest) framework.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Running the app in Docker

Build:
```bash
docker build -t team-hub-api:dev .
```

Run:
```bash
docker run --name team-hub-api -p 3000:3000 -p 5005:5005 team-hub-api:dev
```

Run in background:
```bash
docker run -d --name team-hub-api -p 3000:3000 -p 5005:5005 team-hub-api:dev
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

  Nest is [MIT licensed](LICENSE).
